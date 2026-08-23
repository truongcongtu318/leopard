import { pickDeviceImage, type DeviceImageAsset } from '../../../media/device-image-picker';
import { getDefaultHttpClient, parseCustomerOrderId } from './adapter';
import type { CustomerHttpClient } from './adapter';
import type { CustomerOrderDetailDataView } from './model';
import type { CustomerMediaPickerPort } from './port';

function generateClientRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createCustomerMediaPickerAdapter(
  client?: CustomerHttpClient,
): CustomerMediaPickerPort {
  const getClient = (): CustomerHttpClient => client ?? getDefaultHttpClient();
  let selectedFile: DeviceImageAsset | null = null;

  return {
    async pickCargoImage() {
      const file = await pickDeviceImage();
      selectedFile = file;
      return file;
    },

    async uploadCargoImage(orderId): Promise<CustomerOrderDetailDataView['media']> {
      const validId = parseCustomerOrderId(orderId);
      if (!validId || !selectedFile) {
        return {
          kind: 'error',
          label: 'Ảnh hàng hóa',
          description: 'Chưa chọn ảnh hoặc mã đơn không hợp lệ.',
          mediaId: null,
        };
      }

      const form = new FormData();
      form.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType,
      } as unknown as Blob);
      form.append('clientRequestId', generateClientRequestId());

      try {
        const response = await getClient().postForm<{ id: string }>(
          `/orders/${validId}/media/cargo`,
          form,
        );
        selectedFile = null;
        return {
          kind: 'available',
          label: 'Ảnh hàng hóa',
          description: 'Ảnh hàng hóa đã tải lên.',
          mediaId: response.id,
        };
      } catch {
        return {
          kind: 'error',
          label: 'Ảnh hàng hóa',
          description: 'Chưa thể tải ảnh; hãy thử lại.',
          mediaId: null,
        };
      }
    },
  };
}
