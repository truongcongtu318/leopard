import { Linking } from 'react-native';

// Base URL from environment variable, falls back to local backend API in dev.
// Duplicated from `src/api/http-client.ts` (not exported there) so this
// module can build the absolute PDF URL and attach the bearer token itself.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/**
 * Opens the driver contract PDF returned by `GET /driver/contract`.
 *
 * `pdfUrl` (e.g. `/driver/contract/pdf?version=v1`) is a *relative* path and
 * the endpoint is auth-guarded (`AccessTokenGuard` + `RoleGuard`) — a plain
 * `Linking.openURL(pdfUrl)` or `<a href>` would send no bearer token and
 * 401. This fetches the PDF through an authenticated request, converts the
 * response to a `data:` URI (React Native has no stable cross-platform
 * `URL.createObjectURL` for a fetched Blob), then opens that URI.
 */
export async function openDriverContractPdf(
  pdfUrl: string,
  accessToken: string | null,
): Promise<void> {
  const url = `${BASE_URL}${pdfUrl}`;
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Không tải được hợp đồng (HTTP ${response.status})`);
  }

  const blob = await response.blob();
  const dataUri = await blobToDataUri(blob);
  await Linking.openURL(dataUri);
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(reader.error ?? new Error('Không đọc được nội dung hợp đồng'));
    };
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Không đọc được nội dung hợp đồng'));
      }
    };
    reader.readAsDataURL(blob);
  });
}
