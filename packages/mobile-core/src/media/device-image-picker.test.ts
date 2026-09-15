import { describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  CameraType: { back: 'back' },
  MediaTypeOptions: { Images: 'Images' },
}));

import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import {
  captureDeviceImage,
  DeviceCameraPermissionError,
  pickDeviceImage,
} from './device-image-picker';

describe('captureDeviceImage', () => {
  it('reports permission denial without opening the camera', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock<any>).mockResolvedValue({
      granted: false,
    });

    await expect(captureDeviceImage()).rejects.toBeInstanceOf(DeviceCameraPermissionError);
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('opens the rear camera and maps the captured image', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock<any>).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchCameraAsync as jest.Mock<any>).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/license.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          fileName: 'license.jpg',
        },
      ],
    });

    expect(await captureDeviceImage()).toEqual({
      uri: 'file:///tmp/license.jpg',
      name: 'license.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    });
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
      cameraType: ImagePicker.CameraType.back,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
  });

  it('opens the web capture UI directly so browser user activation is preserved', async () => {
    jest.clearAllMocks();
    const platform = jest.replaceProperty(Platform, 'OS', 'web');
    (ImagePicker.launchCameraAsync as jest.Mock<any>).mockResolvedValue({ canceled: true });

    try {
      await captureDeviceImage();
      expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    } finally {
      platform.restore();
    }
  });
});

describe('pickDeviceImage', () => {
  it('returns null when permission is denied', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock<any>).mockResolvedValue({
      granted: false,
    });

    const result = await pickDeviceImage();

    expect(result).toBeNull();
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns null when the user cancels the picker', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock<any>).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock<any>).mockResolvedValue({ canceled: true });

    const result = await pickDeviceImage();

    expect(result).toBeNull();
  });

  it('maps the selected asset to a DeviceImageAsset', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock<any>).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock<any>).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/photo.jpg',
          mimeType: 'image/jpeg',
          fileSize: 204800,
          fileName: 'photo.jpg',
        },
      ],
    });

    const result = await pickDeviceImage();

    expect(result).toEqual({
      uri: 'file:///tmp/photo.jpg',
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: 204800,
    });
  });

  it('falls back to a generated name and default size when the asset omits them', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock<any>).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock<any>).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/x.jpg', mimeType: 'image/jpeg' }],
    });

    const result = await pickDeviceImage();

    expect(result?.name).toBe('x.jpg');
    expect(result?.size).toBe(0);
  });
});
