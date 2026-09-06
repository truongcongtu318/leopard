import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { DriverContractService } from './driver-contract.service.js';
import { CONTRACT_VERSION } from './driver-contract-template.js';

const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

function toPngDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

function createMocks() {
  const storage = {
    put: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
    createReadUrl: jest.fn(async (key: string) => `https://signed.example/${key}`),
  };
  const pdf = {
    renderContract: jest.fn(async () => Buffer.from('%PDF-fake')),
  };
  const prisma = {
    driverProfile: { findUnique: jest.fn(async () => null as unknown) },
    driverContract: {
      findUnique: jest.fn(async () => null as unknown),
      upsert: jest.fn(async () => ({ id: 'contract-1' })),
    },
  };

  return { storage, pdf, prisma };
}

const partyDetails = {
  driverName: 'Nguyễn Văn A',
  driverPhone: '0900000000',
  vehicleTypeLabel: 'Xe van',
  licensePlate: '59D-123.45',
  licenseNumber: 'GPLX-1',
};

describe('DriverContractService', () => {
  let mocks: ReturnType<typeof createMocks>;
  let service: DriverContractService;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMocks();
    service = new DriverContractService(
      mocks.prisma as never,
      mocks.storage as never,
      mocks.pdf as never,
    );
  });

  describe('getContractPreview', () => {
    it('returns the supported version and its authenticated pdf route', () => {
      expect(service.getContractPreview()).toEqual({
        version: CONTRACT_VERSION,
        pdfUrl: `/driver/contract/pdf?version=${CONTRACT_VERSION}`,
      });
    });
  });

  describe('renderUnsignedTemplatePdf', () => {
    it('renders the generic template with no version specified', async () => {
      const buffer = await service.renderUnsignedTemplatePdf(undefined);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(mocks.pdf.renderContract).toHaveBeenCalledWith(
        expect.objectContaining({ version: CONTRACT_VERSION }),
      );
      expect(mocks.pdf.renderContract.mock.calls[0][0]).not.toHaveProperty('signature');
    });

    it('renders when the requested version matches the supported version', async () => {
      await expect(service.renderUnsignedTemplatePdf(CONTRACT_VERSION)).resolves.toBeInstanceOf(
        Buffer,
      );
    });

    it('rejects an unsupported version with 404', async () => {
      await expect(service.renderUnsignedTemplatePdf('v99')).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
        status: 404,
      });
      expect(mocks.pdf.renderContract).not.toHaveBeenCalled();
    });
  });

  describe('prepareSignedContract', () => {
    it('uploads only the PDF for a typed (non-image) signature', async () => {
      const result = await service.prepareSignedContract({
        profileId: 'profile-1',
        partyDetails,
        signature: 'Nguyễn Văn A',
      });

      expect(mocks.storage.put).toHaveBeenCalledTimes(1);
      expect(mocks.storage.put).toHaveBeenCalledWith(
        expect.stringMatching(/^contracts\/profile-1\/pdf\/.+\.pdf$/),
        expect.any(Buffer),
        'application/pdf',
      );
      expect(result.signatureStorageKey).toBeNull();
      expect(result.signedByName).toBe('Nguyễn Văn A');
      expect(result.pdfStorageKey).toMatch(/^contracts\/profile-1\/pdf\//);
    });

    it('uploads both the signature image and the PDF', async () => {
      const result = await service.prepareSignedContract({
        profileId: 'profile-1',
        partyDetails,
        signature: toPngDataUri(PNG_BUFFER),
      });

      expect(mocks.storage.put).toHaveBeenCalledTimes(2);
      expect(mocks.storage.put).toHaveBeenCalledWith(
        expect.stringMatching(/^contracts\/profile-1\/signature\/.+\.png$/),
        expect.any(Buffer),
        'image/png',
      );
      expect(result.signatureStorageKey).toMatch(/^contracts\/profile-1\/signature\//);
      expect(result.signedByName).toBe(partyDetails.driverName);
    });

    it('rejects an invalid signature before any upload happens', async () => {
      await expect(
        service.prepareSignedContract({
          profileId: 'profile-1',
          partyDetails,
          signature: 'x'.repeat(200),
        }),
      ).rejects.toMatchObject({ code: 'SIGNATURE_INVALID' });

      expect(mocks.storage.put).not.toHaveBeenCalled();
    });

    it('cleans up the uploaded signature image when PDF rendering fails', async () => {
      mocks.pdf.renderContract.mockRejectedValueOnce(new Error('render exploded'));

      await expect(
        service.prepareSignedContract({
          profileId: 'profile-1',
          partyDetails,
          signature: toPngDataUri(PNG_BUFFER),
        }),
      ).rejects.toThrow('render exploded');

      expect(mocks.storage.delete).toHaveBeenCalledTimes(1);
      expect(mocks.storage.delete).toHaveBeenCalledWith(
        expect.stringMatching(/^contracts\/profile-1\/signature\//),
      );
    });
  });

  describe('persistSignedContract', () => {
    it('upserts the DriverContract row on the given transaction client, keyed by profile + version', async () => {
      const tx = { driverContract: { upsert: jest.fn(async () => ({})) } };
      const prepared = {
        signedByName: 'Nguyễn Văn A',
        signedAt: new Date('2026-09-05T10:00:00.000Z'),
        pdfStorageKey: 'contracts/p-1/pdf/x.pdf',
        signatureStorageKey: null,
      };

      await service.persistSignedContract(tx as never, {
        driverProfileId: 'p-1',
        version: CONTRACT_VERSION,
        prepared,
      });

      expect(tx.driverContract.upsert).toHaveBeenCalledWith({
        where: {
          driverProfileId_version: { driverProfileId: 'p-1', version: CONTRACT_VERSION },
        },
        create: expect.objectContaining({
          driverProfileId: 'p-1',
          version: CONTRACT_VERSION,
          pdfStorageKey: prepared.pdfStorageKey,
          signatureStorageKey: null,
          signedByName: prepared.signedByName,
        }),
        update: expect.objectContaining({
          pdfStorageKey: prepared.pdfStorageKey,
          signedByName: prepared.signedByName,
        }),
      });
    });
  });

  describe('cleanupUploaded', () => {
    it('deletes both keys and swallows delete failures', async () => {
      mocks.storage.delete.mockRejectedValueOnce(new Error('boom'));

      await service.cleanupUploaded(
        {
          signedByName: 'x',
          signedAt: new Date(),
          pdfStorageKey: 'contracts/p-1/pdf/a.pdf',
          signatureStorageKey: 'contracts/p-1/signature/a.png',
        },
        { driverProfileId: 'p-1', version: CONTRACT_VERSION },
      );

      expect(mocks.storage.delete).toHaveBeenCalledTimes(2);
    });

    it('never throws when a delete fails — only logs with profile/version context', async () => {
      const loggerErrorSpy = jest.spyOn(
        (service as unknown as { logger: { error: (...args: unknown[]) => void } }).logger,
        'error',
      );
      mocks.storage.delete.mockRejectedValueOnce(new Error('disk gone'));

      await expect(
        service.cleanupUploaded(
          {
            signedByName: 'x',
            signedAt: new Date(),
            pdfStorageKey: 'contracts/p-1/pdf/a.pdf',
            signatureStorageKey: 'contracts/p-1/signature/a.png',
          },
          { driverProfileId: 'p-1', version: CONTRACT_VERSION },
        ),
      ).resolves.toBeUndefined();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('profile=p-1'),
        expect.anything(),
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`version=${CONTRACT_VERSION}`),
        expect.anything(),
      );
    });
  });

  describe('deleteSupersededFiles', () => {
    it('deletes only the files that actually changed', async () => {
      await service.deleteSupersededFiles(
        { pdfStorageKey: 'old.pdf', signatureStorageKey: 'old.png' },
        {
          signedByName: 'x',
          signedAt: new Date(),
          pdfStorageKey: 'new.pdf',
          signatureStorageKey: 'old.png',
        },
        { driverProfileId: 'p-1', version: CONTRACT_VERSION },
      );

      expect(mocks.storage.delete).toHaveBeenCalledTimes(1);
      expect(mocks.storage.delete).toHaveBeenCalledWith('old.pdf');
    });

    it('never throws when a delete fails — only logs', async () => {
      mocks.storage.delete.mockRejectedValueOnce(new Error('disk gone'));

      await expect(
        service.deleteSupersededFiles(
          { pdfStorageKey: 'old.pdf', signatureStorageKey: null },
          {
            signedByName: 'x',
            signedAt: new Date(),
            pdfStorageKey: 'new.pdf',
            signatureStorageKey: null,
          },
          { driverProfileId: 'p-1', version: CONTRACT_VERSION },
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('getSignedContractForAdmin', () => {
    it('404s when the user has no driver profile', async () => {
      await expect(service.getSignedContractForAdmin('u-1')).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
      });
    });

    it('404s when the profile has no signed contract version', async () => {
      mocks.prisma.driverProfile.findUnique.mockResolvedValueOnce({
        id: 'p-1',
        contractVersion: null,
      } as never);

      await expect(service.getSignedContractForAdmin('u-1')).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
      });
      expect(mocks.prisma.driverContract.findUnique).not.toHaveBeenCalled();
    });

    it('404s when the profile references a version with no contract row', async () => {
      mocks.prisma.driverProfile.findUnique.mockResolvedValueOnce({
        id: 'p-1',
        contractVersion: CONTRACT_VERSION,
      } as never);

      await expect(service.getSignedContractForAdmin('u-1')).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
      });
    });

    it('returns metadata plus short-lived URLs, never raw storage keys', async () => {
      mocks.prisma.driverProfile.findUnique.mockResolvedValueOnce({
        id: 'p-1',
        contractVersion: CONTRACT_VERSION,
      } as never);
      mocks.prisma.driverContract.findUnique.mockResolvedValueOnce({
        version: CONTRACT_VERSION,
        signedByName: 'Nguyễn Văn A',
        signedAt: new Date('2026-09-05T10:00:00.000Z'),
        pdfStorageKey: 'contracts/p-1/pdf/x.pdf',
        signatureStorageKey: 'contracts/p-1/signature/x.png',
      } as never);

      const result = await service.getSignedContractForAdmin('u-1');

      expect(result).toEqual({
        version: CONTRACT_VERSION,
        signedByName: 'Nguyễn Văn A',
        signedAt: '2026-09-05T10:00:00.000Z',
        pdfUrl: 'https://signed.example/contracts/p-1/pdf/x.pdf',
        signatureUrl: 'https://signed.example/contracts/p-1/signature/x.png',
      });
      expect(JSON.stringify(result)).not.toContain('storageKey');
    });

    it('returns null signatureUrl when there is no signature image (typed signature only)', async () => {
      mocks.prisma.driverProfile.findUnique.mockResolvedValueOnce({
        id: 'p-1',
        contractVersion: CONTRACT_VERSION,
      } as never);
      mocks.prisma.driverContract.findUnique.mockResolvedValueOnce({
        version: CONTRACT_VERSION,
        signedByName: 'Nguyễn Văn A',
        signedAt: new Date('2026-09-05T10:00:00.000Z'),
        pdfStorageKey: 'contracts/p-1/pdf/x.pdf',
        signatureStorageKey: null,
      } as never);

      const result = await service.getSignedContractForAdmin('u-1');

      expect(result.signatureUrl).toBeNull();
    });
  });
});
