import { act, renderHook } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { DeviceCameraPermissionError } from '@leopard/mobile-core';

import { useProofPhotoCapture } from './use-proof-photo-capture';

const REAL_ASSET = {
  uri: 'file:///var/mobile/real-cargo-photo.jpg',
  name: 'real-cargo-photo.jpg',
  mimeType: 'image/jpeg',
  size: 240_000,
};

describe('useProofPhotoCapture', () => {
  it('returns the real captured URI from the camera', async () => {
    const capture = jest.fn(async () => REAL_ASSET);
    const pick = jest.fn(async () => null);
    const { result } = await renderHook(() => useProofPhotoCapture({ capture, pick }));

    let outcome;
    await act(async () => {
      outcome = await result.current.captureProofPhoto();
    });

    expect(outcome).toMatchObject({
      kind: 'captured',
      photo: { uri: REAL_ASSET.uri, name: REAL_ASSET.name, mimeType: 'image/jpeg' },
    });
    expect(capture).toHaveBeenCalledTimes(1);
    expect(pick).not.toHaveBeenCalled();
  });

  it('falls back to the library when the camera permission is denied', async () => {
    const capture = jest.fn(async () => {
      throw new DeviceCameraPermissionError();
    });
    const pick = jest.fn(async () => REAL_ASSET);
    const { result } = await renderHook(() => useProofPhotoCapture({ capture, pick }));

    let outcome;
    await act(async () => {
      outcome = await result.current.captureProofPhoto();
    });

    expect(outcome).toMatchObject({ kind: 'captured', photo: { uri: REAL_ASSET.uri } });
    expect(pick).toHaveBeenCalledTimes(1);
  });

  it('reports permission-denied when the library fallback yields nothing', async () => {
    const capture = jest.fn(async () => {
      throw new DeviceCameraPermissionError();
    });
    const pick = jest.fn(async () => null);
    const { result } = await renderHook(() => useProofPhotoCapture({ capture, pick }));

    let outcome;
    await act(async () => {
      outcome = await result.current.captureProofPhoto();
    });

    expect(outcome).toEqual({ kind: 'permission-denied' });
  });

  it('surfaces a non-permission camera failure instead of silently substituting', async () => {
    const capture = jest.fn(async () => {
      throw new Error('camera hardware unavailable');
    });
    const pick = jest.fn(async () => REAL_ASSET);
    const { result } = await renderHook(() => useProofPhotoCapture({ capture, pick }));

    let outcome;
    await act(async () => {
      outcome = await result.current.captureProofPhoto();
    });

    expect(outcome).toMatchObject({ kind: 'error' });
    // The library must NOT be used as a cover for an unknown camera failure.
    expect(pick).not.toHaveBeenCalled();
  });

  it('treats a canceled picker as canceled', async () => {
    const capture = jest.fn(async () => null);
    const pick = jest.fn(async () => null);
    const { result } = await renderHook(() => useProofPhotoCapture({ capture, pick }));

    let outcome;
    await act(async () => {
      outcome = await result.current.captureProofPhoto();
    });

    expect(outcome).toEqual({ kind: 'canceled' });
  });

  it('ignores a second capture while one is already in flight', async () => {
    let release: (() => void) | null = null;
    const capture = jest.fn(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return REAL_ASSET;
    });
    const pick = jest.fn(async () => null);
    const { result } = await renderHook(() => useProofPhotoCapture({ capture, pick }));

    let second: unknown;
    let first: Promise<unknown> | null = null;
    await act(async () => {
      // Kick off the first capture without awaiting, then immediately attempt a
      // second one. The guard must reject the second before it reaches the camera.
      first = result.current.captureProofPhoto();
      second = await result.current.captureProofPhoto();
      release?.();
      await first;
    });

    expect(second).toEqual({ kind: 'canceled' });
    expect(capture).toHaveBeenCalledTimes(1);
  });
});

