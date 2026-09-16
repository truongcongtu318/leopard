import {
  type OtpIdentity,
  type OtpProvider,
  OtpProviderError,
} from './otp-provider.js';

export interface DemoOtpProviderOptions {
  readonly enabled: boolean;
  readonly nodeEnv: string;
  /**
   * Explicit production opt-in.
   *
   * Demo credentials are meant for local and staging environments, so a
   * production deployment has to acknowledge them with
   * `ALLOW_DEMO_AUTH_PROVIDER=true` — the same shape every other demo provider
   * in this codebase already uses (`ALLOW_DEMO_PROVIDER`,
   * `ALLOW_DEMO_PAYMENT_PROVIDER`, `ALLOW_LOCAL_STORAGE_PROVIDER`, ...). The env
   * schema requires that acknowledgement in production.
   */
  readonly allowInProduction?: boolean;
}

export const DEMO_IDENTITIES = new Map<string, OtpIdentity>([
  ['customer', { providerUserId: 'demo:customer', phoneNumber: '+840000000001' }],
  ['driver', { providerUserId: 'demo:driver', phoneNumber: '+840000000002' }],
  [
    'fleet-owner',
    { providerUserId: 'demo:fleet-owner', phoneNumber: '+840000000003' },
  ],
  ['admin', { providerUserId: 'demo:admin', phoneNumber: '+840000000004' }],
  ['+840000000001', { providerUserId: 'demo:customer', phoneNumber: '+840000000001' }],
  ['+840000000002', { providerUserId: 'demo:driver', phoneNumber: '+840000000002' }],
  ['+840000000003', { providerUserId: 'demo:fleet-owner', phoneNumber: '+840000000003' }],
  ['+840000000004', { providerUserId: 'demo:admin', phoneNumber: '+840000000004' }],
  ['0900000001', { providerUserId: 'demo:customer', phoneNumber: '+840000000001' }],
  ['0900000002', { providerUserId: 'demo:driver', phoneNumber: '+840000000002' }],
  ['0900000003', { providerUserId: 'demo:fleet-owner', phoneNumber: '+840000000003' }],
  ['0900000004', { providerUserId: 'demo:admin', phoneNumber: '+840000000004' }],
  // Remaining seeded drivers. Without an alias the app would treat these phones
  // as unknown and silently create a brand-new CUSTOMER account instead.
  ['+840000000005', { providerUserId: 'demo:driver-5', phoneNumber: '+840000000005' }],
  ['+840000000006', { providerUserId: 'demo:driver-6', phoneNumber: '+840000000006' }],
  ['+840000000007', { providerUserId: 'demo:driver-7', phoneNumber: '+840000000007' }],
  ['+840000000008', { providerUserId: 'demo:driver-8', phoneNumber: '+840000000008' }],
  ['0900000005', { providerUserId: 'demo:driver-5', phoneNumber: '+840000000005' }],
  ['0900000006', { providerUserId: 'demo:driver-6', phoneNumber: '+840000000006' }],
  ['0900000007', { providerUserId: 'demo:driver-7', phoneNumber: '+840000000007' }],
  ['0900000008', { providerUserId: 'demo:driver-8', phoneNumber: '+840000000008' }],
  ['0987324561', { providerUserId: 'demo:driver-phuoc', phoneNumber: '+84987324561' }],
  ['+84987324561', { providerUserId: 'demo:driver-phuoc', phoneNumber: '+84987324561' }],
]);

const ALLOWED_DEMO_ENVS = new Set(['development', 'local', 'test']);

export class DemoOtpProvider implements OtpProvider {
  constructor(private readonly options: DemoOtpProviderOptions) {}

  public async verify(idToken: string): Promise<OtpIdentity> {
    const envAllowed =
      ALLOWED_DEMO_ENVS.has(this.options.nodeEnv) ||
      this.options.allowInProduction === true;

    if (!this.options.enabled || !envAllowed) {
      throw new OtpProviderError(
        'OTP_PROVIDER_DISABLED',
        'Demo OTP provider is disabled',
      );
    }

    const identity = DEMO_IDENTITIES.get(idToken);
    if (!identity) {
      throw new OtpProviderError(
        'OTP_PROVIDER_REJECTED',
        'Demo OTP verification failed',
      );
    }

    return identity;
  }
}
