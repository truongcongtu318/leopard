export const TrackingErrorCode = {
  forbidden: 'TRACKING_FORBIDDEN',
  invalidPoint: 'TRACKING_INVALID_POINT',
  rateLimited: 'TRACKING_RATE_LIMITED',
  orderInactive: 'TRACKING_ORDER_INACTIVE',
  pointConflict: 'TRACKING_POINT_CONFLICT',
} as const;
export type TrackingErrorCode = (typeof TrackingErrorCode)[keyof typeof TrackingErrorCode];

export const PaymentErrorCode = {
  activeIntentConflict: 'PAYMENT_ACTIVE_INTENT_CONFLICT',
  providerFailed: 'PAYMENT_PROVIDER_FAILED',
  alreadyConfirmed: 'PAYMENT_ALREADY_CONFIRMED',
} as const;
export type PaymentErrorCode = (typeof PaymentErrorCode)[keyof typeof PaymentErrorCode];

export const MediaErrorCode = {
  unsupportedType: 'MEDIA_UNSUPPORTED_TYPE',
  fileTooLarge: 'MEDIA_FILE_TOO_LARGE',
  invalidFile: 'MEDIA_INVALID_FILE',
} as const;
export type MediaErrorCode = (typeof MediaErrorCode)[keyof typeof MediaErrorCode];
