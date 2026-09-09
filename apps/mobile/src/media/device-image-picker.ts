import * as ImagePicker from 'expo-image-picker';

export type DeviceImageAsset = Readonly<{
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  file?: File | Blob;
}>;

function deriveFileName(uri: string): string {
  const segments = uri.split('/');
  return segments[segments.length - 1] || `image-${Date.now()}.jpg`;
}

export async function pickDeviceImage(): Promise<DeviceImageAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? deriveFileName(asset.uri),
    mimeType: asset.mimeType ?? 'image/jpeg',
    size: asset.fileSize ?? 0,
    file: (asset as { file?: File | Blob }).file,
  };
}
