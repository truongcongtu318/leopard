import type { Role } from '@leopard/shared';

import type { CustomerProfileView } from './model';
import type { CustomerProfilePort } from './port';
import { appendFileToFormData } from '@leopard/mobile-core';

const FILES_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1').replace(/\/api\/v1\/?$/, '');

export interface ProfileHttpClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown): Promise<T>;
  postForm<T = unknown>(path: string, form: FormData): Promise<T>;
}

interface AuthUserResponse {
  id: string;
  phone: string;
  role: Role;
  status: string;
  name: string | null;
  email: string | null;
  avatarStorageKey: string | null;
}

const APP_VERSION = '0.0.0';

function getDefaultHttpClient(): ProfileHttpClient {
  const { httpClient } = require('@leopard/mobile-core');
  return httpClient as ProfileHttpClient;
}

function roleLabel(role: Role): string {
  return role === 'DRIVER' ? 'Tài xế' : 'Khách hàng';
}

function statusView(status: string): Readonly<{ label: string; tone: 'active' | 'danger' }> {
  if (status === 'DISABLED') {
    return { label: 'Đã vô hiệu hóa', tone: 'danger' };
  }
  return { label: 'Đang hoạt động', tone: 'active' };
}

function avatarUrl(key: string | null): string | null {
  return key ? `${FILES_BASE_URL}/files/${key}` : null;
}

export function createCustomerProfileHttpAdapter(
  client?: ProfileHttpClient,
): CustomerProfilePort {
  const getClient = (): ProfileHttpClient => client ?? getDefaultHttpClient();

  return {
    async getProfileView(): Promise<CustomerProfileView> {
      try {
        const user = await getClient().get<AuthUserResponse>('/me');
        const status = statusView(user.status);
        return {
          scenarioId: 'CP-PROFILE-SUCCESS',
          kind: 'content',
          phone: user.phone,
          name: user.name,
          email: user.email,
          avatarUrl: avatarUrl(user.avatarStorageKey),
          roleLabel: roleLabel(user.role),
          statusLabel: status.label,
          statusTone: status.tone,
          appVersion: APP_VERSION,
          isLoggingOut: false,
        };
      } catch (error) {
        return {
          scenarioId: 'CP-PROFILE-ERROR',
          kind: 'error',
          title: 'Không thể tải hồ sơ',
          message:
            error instanceof Error && error.message ? error.message : 'Hãy thử lại sau.',
        };
      }
    },

    async logout(): Promise<void> {
      try {
        await getClient().post('/auth/logout');
      } catch {
        // Logout must always succeed on the client even if the server call fails
      }
    },

    async updateProfile(input: { name: string; email: string }): Promise<void> {
      await getClient().patch('/users/me', {
        name: input.name,
        email: input.email,
        consentTerms: true,
        consentService: true,
      });
    },

    async uploadAvatar(
      file: { uri: string; name: string; type: string; file?: File | Blob },
    ): Promise<{ avatarStorageKey: string }> {
      const form = new FormData();
      await appendFileToFormData(form, 'file', file);
      return getClient().postForm('/users/me/avatar', form);
    },
  };
}
