import { describe, expect, test } from '@jest/globals';
import { PdfService } from './pdf.service.js';
import type { ContractPdfInput } from './pdf.types.js';
import {
  buildDriverContractPartyFields,
  CONTRACT_VERSION,
  DRIVER_CONTRACT_DOCUMENT_TITLE,
  DRIVER_CONTRACT_SECTIONS_V1,
} from '../drivers/driver-contract-template.js';

// Minimal valid 1x1 transparent PNG, used only to exercise the
// signature-image embedding path without depending on a real upload.
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const LONG_VIETNAMESE_NAME =
  'Nguyễn Thị Phương Thảo Ngọc Trần Đặng Hoàng Bảo Châu Vũ Thị Kim Ngân Đại Diện Đối Tác Vận Chuyển';
const LONG_LICENSE_PLATE_NOTE =
  '59H1-123.45 (xe tải nhẹ, thùng bạt, biển số phụ 51C-678.90, đã đăng kiểm định kỳ tại trung tâm đăng kiểm số 50-03V)';

function buildContractFields() {
  return {
    driverName: LONG_VIETNAMESE_NAME,
    driverPhone: '0987 654 321',
    vehicleTypeLabel: 'Xe tải nhỏ dưới 1.5 tấn, thùng kín chống thấm nước, phù hợp giao hàng dễ vỡ',
    licensePlate: LONG_LICENSE_PLATE_NOTE,
    licenseNumber: '123456789012',
  };
}

function buildBaseInput(): Omit<ContractPdfInput, 'signature'> {
  return {
    documentTitle: DRIVER_CONTRACT_DOCUMENT_TITLE,
    version: CONTRACT_VERSION,
    generatedAt: new Date('2026-09-05T10:00:00.000Z'),
    partyFields: buildDriverContractPartyFields(buildContractFields()),
    sections: DRIVER_CONTRACT_SECTIONS_V1,
  };
}

function expectValidPdfBuffer(buffer: Buffer): void {
  expect(buffer.length).toBeGreaterThan(0);
  expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
}

describe('PdfService', () => {
  const service = new PdfService();

  test('renders the unsigned contract template as a non-empty PDF buffer', async () => {
    const buffer = await service.renderContract(buildBaseInput());

    expectValidPdfBuffer(buffer);
  });

  test('renders a typed-name signed contract as a non-empty PDF buffer', async () => {
    const input: ContractPdfInput = {
      ...buildBaseInput(),
      signature: {
        signedByName: LONG_VIETNAMESE_NAME,
        signedAt: new Date('2026-09-05T10:05:00.000Z'),
      },
    };

    const buffer = await service.renderContract(input);

    expectValidPdfBuffer(buffer);
  });

  test('renders an image-signed contract as a non-empty PDF buffer', async () => {
    const input: ContractPdfInput = {
      ...buildBaseInput(),
      signature: {
        signedByName: 'Trần Văn Linh',
        signedAt: new Date('2026-09-05T10:10:00.000Z'),
        signatureImage: ONE_PIXEL_PNG,
      },
    };

    const buffer = await service.renderContract(input);

    expectValidPdfBuffer(buffer);
  });

  test('does not throw when Vietnamese diacritics and very long field values would overflow a single line', async () => {
    const input: ContractPdfInput = {
      ...buildBaseInput(),
      partyFields: [
        ...buildBaseInput().partyFields,
        { label: 'Ghi chú', value: LONG_LICENSE_PLATE_NOTE.repeat(3) },
      ],
    };

    await expect(service.renderContract(input)).resolves.toBeInstanceOf(Buffer);
  });
});
