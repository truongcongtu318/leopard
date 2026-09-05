export type DriverDocumentType = 'LICENSE' | 'VEHICLE_REGISTRATION' | 'ID_CARD' | 'VEHICLE_PHOTO';

export interface DriverDocumentItem {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly createdAt: string;
}

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

const DOCUMENT_TITLE: Record<DriverDocumentType, string> = {
  LICENSE: 'Giấy phép lái xe (GPLX)',
  VEHICLE_REGISTRATION: 'Giấy đăng ký xe (Cà vẹt)',
  ID_CARD: 'Căn cước công dân (CCCD)',
  VEHICLE_PHOTO: 'Ảnh phương tiện',
};

function getDefaultHttpClient(): KycHttpClient {
  const { httpClient } = require('../../../api/http-client');
  return httpClient as KycHttpClient;
}

export function createDriverKycHttpAdapter(client?: KycHttpClient) {
  const getClient = (): KycHttpClient => client ?? getDefaultHttpClient();

  return {
    async listDocuments(): Promise<DriverDocumentItem[]> {
      try {
        const docs = await getClient().get<DriverDocumentResponse[]>('/driver/documents');
        return docs.map((d) => ({
          id: d.id,
          title: DOCUMENT_TITLE[d.type] ?? d.type,
          url: d.url,
          createdAt: d.createdAt,
        }));
      } catch {
        return [];
      }
    },
  };
}
