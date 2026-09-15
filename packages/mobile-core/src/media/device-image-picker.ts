import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type DeviceImageAsset = Readonly<{
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  file?: File | Blob;
}>;

export class DeviceCameraPermissionError extends Error {
  constructor() {
    super('Camera permission is required');
    this.name = 'DeviceCameraPermissionError';
  }
}

function deriveFileName(uri: string): string {
  const segments = uri.split('/');
  return segments[segments.length - 1] || `image-${Date.now()}.jpg`;
}

function mapImageAsset(asset: ImagePicker.ImagePickerAsset): DeviceImageAsset {
  return {
    uri: asset.uri,
    name: asset.fileName ?? deriveFileName(asset.uri),
    mimeType: asset.mimeType ?? 'image/jpeg',
    size: asset.fileSize ?? 0,
    file: (asset as { file?: File | Blob }).file,
  };
}

/** Opens the device camera for a camera-first document capture flow. */
export async function captureDeviceImage(): Promise<DeviceImageAsset | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new DeviceCameraPermissionError();
    }
  }

  const result = await ImagePicker.launchCameraAsync({
    cameraType: ImagePicker.CameraType.back,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return mapImageAsset(result.assets[0]);
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

  return mapImageAsset(result.assets[0]);
}
