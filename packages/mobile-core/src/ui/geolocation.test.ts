import { describe, expect, it } from '@jest/globals';

import { describeGeolocationFailure, isGeolocationPermissionDenied } from './geolocation';

describe('geolocation failure helpers', () => {
  it('treats code 1 as a denied permission', () => {
    // The browser exposes PERMISSION_DENIED=1 on navigator.geolocation, never on
    // the error object handed to the callback, so the code is the only reliable
    // signal.
    expect(isGeolocationPermissionDenied({ code: 1 })).toBe(true);
    expect(isGeolocationPermissionDenied({ code: 2 })).toBe(false);
    expect(isGeolocationPermissionDenied({})).toBe(false);
    expect(isGeolocationPermissionDenied(null)).toBe(false);
    expect(isGeolocationPermissionDenied(undefined)).toBe(false);
  });

  it('explains a denied permission in terms of what the user can do', () => {
    expect(describeGeolocationFailure({ code: 1 })).toMatch(/Trình duyệt chặn quyền vị trí/);
  });

  it('distinguishes unavailable and timed-out positions', () => {
    expect(describeGeolocationFailure({ code: 2 })).toMatch(/Chưa lấy được vị trí/);
    expect(describeGeolocationFailure({ code: 3 })).toMatch(/Quá thời gian/);
  });

  it('falls back to a generic message for an unknown code', () => {
    expect(describeGeolocationFailure({ code: 99 })).toMatch(/Không lấy được vị trí/);
    expect(describeGeolocationFailure(undefined)).toMatch(/Không lấy được vị trí/);
  });
});
