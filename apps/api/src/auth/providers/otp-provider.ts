export const OTP_PROVIDER = Symbol('OTP_PROVIDER');

export interface OtpIdentity {
  readonly providerUserId: string;
  readonly phoneNumber: string;
}

export interface OtpProvider {
  verify(idToken: string): Promise<OtpIdentity>;
}

export class OtpProviderError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'OtpProviderError';
    this.code = code;
    Object.setPrototypeOf(this, OtpProviderError.prototype);
  }
}
