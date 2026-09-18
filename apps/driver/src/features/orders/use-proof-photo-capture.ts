import { useCallback, useRef, useState } from 'react';

import {
  DeviceCameraPermissionError,
  captureDeviceImage,
  pickDeviceImage,
} from '@leopard/mobile-core';

/**
 * A captured proof photo. `uri` is the real on-device URI returned by the
 * camera/library — never a synthesized path — so the preview renders the photo
 * the driver actually took.
 */
export type CapturedProofPhoto = Readonly<{
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  /**
   * The picker's own File/Blob, when the platform provides one (web does).
   * Carrying it lets the upload send the real bytes directly instead of
   * re-reading `uri`, which is the step that could fail and produce an
   * unusable empty part.
   */
  file?: File | Blob;
  /** Wall-clock time of capture, for the on-photo watermark. */
  capturedAt: Date;
}>;

export type CaptureOutcome =
  | Readonly<{ kind: 'captured'; photo: CapturedProofPhoto }>
  | Readonly<{ kind: 'canceled' }>
  | Readonly<{ kind: 'permission-denied' }>
  | Readonly<{ kind: 'error'; message: string }>;

export type PodCaptureDeps = Readonly<{
  capture?: typeof captureDeviceImage;
  pick?: typeof pickDeviceImage;
}>;

/**
 * POD photo capture: opens the real camera first, and falls back to the photo
 * library only when the device cannot provide a camera shot (permission denied,
 * simulator, hardware failure). A driver standing at a dock must still be able
 * to attach proof if the camera refuses to open, otherwise the order is stuck.
 */
export function useProofPhotoCapture(deps: PodCaptureDeps = {}) {
  const capture = deps.capture ?? captureDeviceImage;
  const pick = deps.pick ?? pickDeviceImage;

  const [isCapturing, setIsCapturing] = useState(false);
  const inFlightRef = useRef(false);

  const captureProofPhoto = useCallback(async (): Promise<CaptureOutcome> => {
    // Guard against a double-tap opening two camera sessions; the second
    // session's asset would otherwise win and silently discard the first photo.
    if (inFlightRef.current) return { kind: 'canceled' };
    inFlightRef.current = true;
    setIsCapturing(true);

    try {
      let asset = null;

      try {
        asset = await capture();
      } catch (error) {
        // Only a permission denial justifies the library fallback; any other
        // camera failure is surfaced so the driver knows the shot was not taken.
        if (!(error instanceof DeviceCameraPermissionError)) {
          return {
            kind: 'error',
            message: 'Không mở được máy ảnh. Vui lòng thử lại.',
          };
        }
        asset = await pick();
        if (!asset) return { kind: 'permission-denied' };
      }

      if (!asset) return { kind: 'canceled' };

      return {
        kind: 'captured',
        photo: {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          size: asset.size,
          file: asset.file,
          capturedAt: new Date(),
        },
      };
    } catch {
      return { kind: 'error', message: 'Không chụp được ảnh. Vui lòng thử lại.' };
    } finally {
      inFlightRef.current = false;
      setIsCapturing(false);
    }
  }, [capture, pick]);

  return { captureProofPhoto, isCapturing };
}
