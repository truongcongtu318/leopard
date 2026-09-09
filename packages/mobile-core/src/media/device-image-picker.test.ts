import { describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

import * as ImagePicker from 'expo-image-picker';
import { pickDeviceImage } from './device-image-picker';

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
