import { ApiError } from './api-error';
import { browserClient } from './browser-client';
import { serverClient } from './server-client';

export type ApiClient = {
  get<T = unknown>(path: string): Promise<T>;
  post?<T = unknown>(path: string, body?: unknown): Promise<T>;
  put?<T = unknown>(path: string, body?: unknown): Promise<T>;
  delete?<T = unknown>(path: string): Promise<T>;
  setHeader?(key: string, value: string): void;
};

export { browserClient, serverClient, ApiError };
