import {
  type OtpIdentity,
  type OtpProvider,
  OtpProviderError,
} from './otp-provider.js';

export interface DemoOtpProviderOptions {
  readonly enabled: boolean;
  readonly nodeEnv: string;
}

const DEMO_IDENTITIES = new Map<string, OtpIdentity>([
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
]);

const ALLOWED_DEMO_ENVS = new Set(['development', 'local', 'test']);

export class DemoOtpProvider implements OtpProvider {
  constructor(private readonly options: DemoOtpProviderOptions) {}

  public async verify(idToken: string): Promise<OtpIdentity> {
    if (!this.options.enabled || !ALLOWED_DEMO_ENVS.has(this.options.nodeEnv)) {
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
