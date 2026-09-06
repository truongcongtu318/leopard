import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { StorageProvider } from '../media/storage.provider.js';
import { PdfService } from '../pdf/pdf.service.js';
import {
  CONTRACT_VERSION,
  DRIVER_CONTRACT_DOCUMENT_TITLE,
  DRIVER_CONTRACT_PREVIEW_PARTY_DETAILS,
  DRIVER_CONTRACT_SECTIONS_V1,
  buildDriverContractPartyFields,
  type DriverContractPartyDetails,
} from './driver-contract-template.js';
import { parseSignatureInput } from './driver-signature.js';

const SIGNED_URL_TTL_SECONDS = 3600;

export interface DriverContractPreviewView {
  readonly version: string;
  readonly pdfUrl: string;
}

export interface SignedContractInput {
  readonly profileId: string;
  readonly partyDetails: DriverContractPartyDetails;
  /** Raw `signature` field from `ApplyDriverDto` — parsed/validated here. */
  readonly signature?: string | undefined;
}

export interface PreparedSignedContract {
  readonly signedByName: string;
  readonly signedAt: Date;
  readonly pdfStorageKey: string;
  readonly signatureStorageKey: string | null;
}

export interface SupersededContractFiles {
  readonly pdfStorageKey: string;
  readonly signatureStorageKey: string | null;
}

export interface AdminDriverContractView {
  readonly version: string;
  readonly signedByName: string;
  readonly signedAt: string;
  readonly pdfUrl: string;
  readonly signatureUrl: string | null;
}

/**
 * Owns everything storage/PDF/DB related for the driver contract: the
 * generic unsigned preview render, the personalised signed PDF + signature
 * upload, persisting the `DriverContract` row, best-effort cleanup around
 * the caller's transaction, and the admin-facing signed-URL projection.
 *
 * Never holds a DB transaction open while uploading — `DriverApplicationService`
 * runs `prepareSignedContract` first, then its own `$transaction` (calling
 * back into `persistSignedContract`), then (on failure) `cleanupUploaded`,
 * or (on success, for a re-apply) `deleteSupersededFiles`.
 */
@Injectable()
export class DriverContractService {
  private readonly logger = new Logger(DriverContractService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageProvider,
    private readonly pdf: PdfService,
  ) {}

  getContractPreview(): DriverContractPreviewView {
    return {
      version: CONTRACT_VERSION,
      pdfUrl: `/driver/contract/pdf?version=${CONTRACT_VERSION}`,
    };
  }

  /** Generic, unsigned template PDF. No DB row — a pure read-only preview. */
  async renderUnsignedTemplatePdf(version: string | undefined): Promise<Buffer> {
    this.assertSupportedVersion(version);

    return this.pdf.renderContract({
      documentTitle: DRIVER_CONTRACT_DOCUMENT_TITLE,
      version: CONTRACT_VERSION,
      generatedAt: new Date(),
      partyFields: buildDriverContractPartyFields(DRIVER_CONTRACT_PREVIEW_PARTY_DETAILS),
      sections: DRIVER_CONTRACT_SECTIONS_V1,
    });
  }

  /**
   * Validates the signature, uploads it (if an image), renders the
   * personalised signed PDF, and uploads that too. Pure I/O — the caller is
   * responsible for the DB transaction and for cleanup on failure.
   */
  async prepareSignedContract(input: SignedContractInput): Promise<PreparedSignedContract> {
    const parsed = parseSignatureInput(input.signature, input.partyDetails.driverName);
    const signedAt = new Date();

    let signatureStorageKey: string | null = null;
    if (parsed.kind === 'image') {
      signatureStorageKey = `contracts/${input.profileId}/signature/${randomUUID()}.${parsed.ext}`;
      await this.storage.put(signatureStorageKey, parsed.buffer, parsed.mime);
    }

    try {
      const pdfBuffer = await this.pdf.renderContract({
        documentTitle: DRIVER_CONTRACT_DOCUMENT_TITLE,
        version: CONTRACT_VERSION,
        generatedAt: signedAt,
        partyFields: buildDriverContractPartyFields(input.partyDetails),
        sections: DRIVER_CONTRACT_SECTIONS_V1,
        signature: {
          signedByName: parsed.signedByName,
          signedAt,
          ...(parsed.kind === 'image' ? { signatureImage: parsed.buffer } : {}),
        },
      });

      const pdfStorageKey = `contracts/${input.profileId}/pdf/${randomUUID()}.pdf`;
      await this.storage.put(pdfStorageKey, pdfBuffer, 'application/pdf');

      return { signedByName: parsed.signedByName, signedAt, pdfStorageKey, signatureStorageKey };
    } catch (error) {
      if (signatureStorageKey) {
        await this.storage.delete(signatureStorageKey).catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Upserts the `DriverContract` row inside the caller's transaction. Must
   * be called with the same `tx` the caller uses for its `user`/
   * `driverProfile` writes, so all three commit or roll back together.
   */
  persistSignedContract(
    tx: Prisma.TransactionClient,
    params: {
      readonly driverProfileId: string;
      readonly version: string;
      readonly prepared: PreparedSignedContract;
    },
  ) {
    return tx.driverContract.upsert({
      where: {
        driverProfileId_version: {
          driverProfileId: params.driverProfileId,
          version: params.version,
        },
      },
      create: {
        driverProfileId: params.driverProfileId,
        version: params.version,
        pdfStorageKey: params.prepared.pdfStorageKey,
        signatureStorageKey: params.prepared.signatureStorageKey,
        signedByName: params.prepared.signedByName,
        signedAt: params.prepared.signedAt,
      },
      update: {
        pdfStorageKey: params.prepared.pdfStorageKey,
        signatureStorageKey: params.prepared.signatureStorageKey,
        signedByName: params.prepared.signedByName,
        signedAt: params.prepared.signedAt,
      },
    });
  }

  /** Best-effort delete of freshly-uploaded evidence after a failed DB write. */
  async cleanupUploaded(evidence: PreparedSignedContract): Promise<void> {
    const keys = [evidence.pdfStorageKey, evidence.signatureStorageKey].filter(
      (key): key is string => key !== null,
    );

    await Promise.all(keys.map((key) => this.storage.delete(key).catch(() => {})));
  }

  /**
   * Deletes files superseded by a re-signed contract of the same version.
   * Only ever called after the DB commit succeeds — a delete failure here
   * must never lose the already-committed record, so it is logged, not
   * thrown.
   */
  async deleteSupersededFiles(
    previous: SupersededContractFiles,
    current: PreparedSignedContract,
    context: { readonly driverProfileId: string; readonly version: string },
  ): Promise<void> {
    const stale = [
      previous.pdfStorageKey !== current.pdfStorageKey ? previous.pdfStorageKey : null,
      previous.signatureStorageKey && previous.signatureStorageKey !== current.signatureStorageKey
        ? previous.signatureStorageKey
        : null,
    ].filter((key): key is string => key !== null);

    await Promise.all(
      stale.map((key) =>
        this.storage.delete(key).catch((error: unknown) => {
          this.logger.error(
            `Failed to delete superseded contract file (profile=${context.driverProfileId}, version=${context.version})`,
            error instanceof Error ? error.stack : String(error),
          );
        }),
      ),
    );
  }

  /**
   * Admin projection of a driver's signed contract evidence: metadata plus
   * short-lived read URLs. Never exposes raw storage keys, and 404s rather
   * than leaking whether a profile exists without signed evidence.
   */
  async getSignedContractForAdmin(userId: string): Promise<AdminDriverContractView> {
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId } });
    const contract =
      profile?.contractVersion &&
      (await this.prisma.driverContract.findUnique({
        where: {
          driverProfileId_version: {
            driverProfileId: profile.id,
            version: profile.contractVersion,
          },
        },
      }));

    if (!contract) {
      throw new DomainError(
        'RESOURCE_NOT_FOUND',
        404,
        'Không tìm thấy hợp đồng đã ký của tài xế',
      );
    }

    const pdfUrl = await this.storage.createReadUrl(contract.pdfStorageKey, SIGNED_URL_TTL_SECONDS);
    const signatureUrl = contract.signatureStorageKey
      ? await this.storage.createReadUrl(contract.signatureStorageKey, SIGNED_URL_TTL_SECONDS)
      : null;

    return {
      version: contract.version,
      signedByName: contract.signedByName,
      signedAt: contract.signedAt.toISOString(),
      pdfUrl,
      signatureUrl,
    };
  }

  private assertSupportedVersion(version: string | undefined): void {
    if (version !== undefined && version !== CONTRACT_VERSION) {
      throw new DomainError(
        'RESOURCE_NOT_FOUND',
        404,
        'Không tìm thấy phiên bản hợp đồng',
      );
    }
  }
}
