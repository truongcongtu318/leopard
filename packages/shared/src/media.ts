import type { MediaType, ProviderSource } from './enums.js';

export interface MediaObjectDto {
  id: string;
  orderId: string;
  uploaderId: string;
  type: MediaType;
  provider: ProviderSource;
  contentType: string;
  sizeBytes: number;
  clientRequestId?: string;
  createdAt: string;
}

export interface MediaUploadRequest {
  readonly clientRequestId: string;
}

export interface SignedUrlResponse {
  readonly url: string;
  readonly expiresAt: string;
}
