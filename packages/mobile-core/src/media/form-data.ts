import { Platform } from 'react-native';

export type UploadableFile = {
  uri: string;
  name?: string | null;
  type?: string | null;
  mimeType?: string | null;
  file?: File | Blob;
};

/**
 * Appends a file to a FormData instance cross-platform:
 * - On Web: converts uri (blob:, data:, or URL) to a Blob/File if not already a Blob,
 *   so browser FormData creates a real multipart file part with filename.
 * - On Native (iOS/Android): uses React Native's { uri, name, type } object convention
 *   for its custom FormData polyfill.
 */
export async function appendFileToFormData(
  form: FormData,
  fieldName: string,
  file: UploadableFile,
): Promise<void> {
  const fileName = file.name || 'upload.jpg';
  const mimeType = file.type || file.mimeType || 'image/jpeg';

  if (Platform.OS === 'web') {
    if (file.file instanceof Blob) {
      form.append(fieldName, file.file, fileName);
      return;
    }

    if (file.uri) {
      try {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        if (blob.size > 0) {
          form.append(fieldName, blob, fileName);
          return;
        }
      } catch {
        // Fall through to the error below when the URI cannot be read.
      }
    }

    // Never append an empty placeholder. The API validates magic bytes, so a
    // zero-byte part is rejected as an unsupported type — which reported a
    // confusing format error while the real cause (an unreadable image) stayed
    // hidden, and left the driver stuck on a confirm button that never worked.
    throw new Error(
      `Không đọc được dữ liệu ảnh${file.uri ? ` từ ${file.uri.slice(0, 60)}` : ''}.`,
    );
  }

  form.append(fieldName, {
    uri: file.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
}
