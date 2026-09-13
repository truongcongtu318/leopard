export type DriverDocumentType = 'LICENSE' | 'VEHICLE_REGISTRATION' | 'ID_CARD' | 'VEHICLE_PHOTO';

export interface DriverDocumentItem {
  readonly id: string;
  readonly type: DriverDocumentType;
  readonly title: string;
  readonly url: string;
  readonly createdAt: string;
}

export const REQUIRED_DOCUMENT_TYPES: readonly DriverDocumentType[] = [
  'LICENSE',
  'VEHICLE_REGISTRATION',
  'ID_CARD',
];

interface DriverDocumentResponse {
  id: string;
  type: DriverDocumentType;
  contentType: string;
  url: string;
  createdAt: string;
}

interface KycHttpClient {
  get<T = unknown>(path: string): Promise<T>;
}

export const DOCUMENT_TITLE: Record<DriverDocumentType, string> = {
  LICENSE: 'Giấy phép lái xe (GPLX)',
  VEHICLE_REGISTRATION: 'Giấy đăng ký xe (Cà vẹt)',
  ID_CARD: 'Căn cước công dân (CCCD)',
  VEHICLE_PHOTO: 'Ảnh phương tiện',
};

function getDefaultHttpClient(): KycHttpClient {
  const { httpClient } = require('@leopard/mobile-core');
  return httpClient as KycHttpClient;
}

export function createDriverKycHttpAdapter(client?: KycHttpClient) {
  const getClient = (): KycHttpClient => client ?? getDefaultHttpClient();

  return {
    async listDocuments(): Promise<DriverDocumentItem[]> {
      const docs = await getClient().get<DriverDocumentResponse[]>('/driver/documents');
      return docs.map((d) => ({
        id: d.id,
        type: d.type,
        title: DOCUMENT_TITLE[d.type] ?? d.type,
        url: d.url,
        createdAt: d.createdAt,
      }));
    },
  };
}
