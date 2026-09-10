/**
 * Matches Express's own body-parser default (~100kb). Applied globally to
 * every route except the ones explicitly opted into a larger cap below —
 * keeps the resource-exhaustion/DoS surface small everywhere by default.
 */
export const DEFAULT_JSON_BODY_LIMIT_BYTES = 100 * 1024;

/**
 * `POST /driver/apply` accepts a base64 data-URI signature image up to
 * `MAX_IMAGE_SIZE_BYTES` (10MB, see `media/image-validation.ts`); base64
 * encoding inflates that by ~4/3 (~13.4MB), so the JSON envelope carrying it
 * (plus the rest of the applicant's fields) needs headroom above that.
 * Scoped to only this one route — see `DriversModule.configure()`.
 */
export const DRIVER_APPLY_JSON_BODY_LIMIT_BYTES = 15 * 1024 * 1024;
