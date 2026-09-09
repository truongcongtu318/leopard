import type { Role } from '@leopard/shared';

import type { DriverProfileView } from './model';
import type { DriverProfilePort } from './port';
import { appendFileToFormData } from '../../../media/form-data';

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

interface DriverApplicationResponse {
  status: string;
  vehicleType: 'MOTORBIKE' | 'VAN' | 'TRUCK' | null;
  licensePlate: string | null;
  licenseNumber: string | null;
}

const APP_VERSION = '0.0.0';
const VEHICLE_TYPE_LABEL: Record<string, string> = {
  MOTORBIKE: 'Xe máy',
  VAN: 'Xe van',
  TRUCK: 'Xe tải',
};

function getDefaultHttpClient(): ProfileHttpClient {
  const { httpClient } = require('../../../api/http-client');
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

function vehicleLabel(app: DriverApplicationResponse | null): string | null {
  if (!app || !app.vehicleType || !app.licensePlate) return null;
  return `${VEHICLE_TYPE_LABEL[app.vehicleType] ?? app.vehicleType} · ${app.licensePlate}`;
}

export function createDriverProfileHttpAdapter(client?: ProfileHttpClient): DriverProfilePort {
  const getClient = (): ProfileHttpClient => client ?? getDefaultHttpClient();

  return {
    async getProfileView(): Promise<DriverProfileView> {
      try {
        const user = await getClient().get<AuthUserResponse>('/me');
        const status = statusView(user.status);

        let application: DriverApplicationResponse | null = null;
        try {
          application = await getClient().get<DriverApplicationResponse>('/driver/application');
        } catch {
          // No application yet (e.g. brand new account) — vehicleLabel stays null.
        }

        return {
          scenarioId: 'DP-PROFILE-SUCCESS',
          kind: 'content',
          phone: user.phone,
          name: user.name,
          email: user.email,
          avatarUrl: avatarUrl(user.avatarStorageKey),
          vehicleLabel: vehicleLabel(application),
          roleLabel: roleLabel(user.role),
          statusLabel: status.label,
          statusTone: status.tone,
          appVersion: APP_VERSION,
          isLoggingOut: false,
        };
      } catch (error) {
        return {
          scenarioId: 'DP-PROFILE-ERROR',
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
        // Logout must always succeed on the client even if the server call fails.
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
