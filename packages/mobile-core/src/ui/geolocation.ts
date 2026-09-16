/**
 * Helpers for the browser Geolocation API.
 *
 * The API reports why it failed through `GeolocationPositionError.code`. The
 * named constants (`PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, `TIMEOUT`) are
 * only present on the `navigator.geolocation` object, not on the error passed to
 * the callback, and React Native's web shim does not expose them there at all —
 * so comparing `error.code === error.PERMISSION_DENIED` silently never matches
 * and a denied permission is reported as a generic failure.
 */
const GEOLOCATION_PERMISSION_DENIED = 1;
const GEOLOCATION_POSITION_UNAVAILABLE = 2;
const GEOLOCATION_TIMEOUT = 3;

export function isGeolocationPermissionDenied(error: { code?: unknown } | null | undefined): boolean {
  return error?.code === GEOLOCATION_PERMISSION_DENIED;
}

export function describeGeolocationFailure(error: { code?: unknown } | null | undefined): string {
  switch (error?.code) {
    case GEOLOCATION_PERMISSION_DENIED:
      return 'Trình duyệt chặn quyền vị trí. Hãy bật quyền vị trí cho trang này, hoặc chọn địa chỉ trên bản đồ.';
    case GEOLOCATION_POSITION_UNAVAILABLE:
      return 'Chưa lấy được vị trí hiện tại. Vui lòng chọn địa chỉ trên bản đồ.';
    case GEOLOCATION_TIMEOUT:
      return 'Quá thời gian lấy vị trí. Vui lòng thử lại hoặc chọn địa chỉ trên bản đồ.';
    default:
      return 'Không lấy được vị trí hiện tại. Vui lòng chọn địa chỉ trên bản đồ.';
  }
}
