export interface MobileApiClient {
  baseUrl: string;
}

export function createApiClient(baseUrl: string): MobileApiClient {
  return {
    baseUrl: baseUrl.replace(/\/+$/, "")
  };
}
