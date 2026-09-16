// apps/driver/src/features/contract/adapter.ts
export interface DriverContractHttpClient {
  get<T = unknown>(path: string): Promise<T>;
}

export interface DriverContractStatusResponse {
  signed: boolean;
  version?: string;
  signedByName?: string;
  signedAt?: string;
  pdfUrl?: string;
  signatureUrl?: string | null;
}

function getDefaultHttpClient(): DriverContractHttpClient {
  const { httpClient } = require('@leopard/mobile-core');
  return httpClient as DriverContractHttpClient;
}

export function createDriverContractHttpAdapter(client?: DriverContractHttpClient) {
  const getClient = (): DriverContractHttpClient => client ?? getDefaultHttpClient();

  return {
    async getContractStatus(): Promise<DriverContractStatusResponse> {
      return getClient().get<DriverContractStatusResponse>('/driver/contract/status');
    },
  };
}
