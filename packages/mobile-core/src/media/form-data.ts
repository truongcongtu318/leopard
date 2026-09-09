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
        form.append(fieldName, blob, fileName);
        return;
      } catch {
        // Fall through to fallback if fetch is not supported (e.g. non-browser test environment)
      }
    }

    try {
      const blob = new Blob([], { type: mimeType });
      form.append(fieldName, blob, fileName);
      return;
    } catch {
      // In environments where Blob is not constructible
    }
  }

  form.append(fieldName, {
    uri: file.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
}
