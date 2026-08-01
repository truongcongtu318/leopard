import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';

const verifyIdToken = jest.fn();

describe('OTP provider boundary', () => {
  beforeEach(() => {
    jest.useRealTimers();
    verifyIdToken.mockReset();
  });

  it('returns deterministic demo identities for known demo accounts', async () => {
    const { DemoOtpProvider } = await import('./demo-otp.provider.js');
    const provider = new DemoOtpProvider({ enabled: true, nodeEnv: 'test' });

    await expect(provider.verify('customer')).resolves.toEqual({
      providerUserId: 'demo:customer',
      phoneNumber: '+840000000001',
    });
    await expect(provider.verify('driver')).resolves.toEqual({
      providerUserId: 'demo:driver',
      phoneNumber: '+840000000002',
    });
  });

  it('rejects the demo provider outside local or test environments', async () => {
    const { DemoOtpProvider } = await import('./demo-otp.provider.js');
    const provider = new DemoOtpProvider({
      enabled: true,
      nodeEnv: 'production',
    });

    await expect(provider.verify('customer')).rejects.toMatchObject({
      code: 'OTP_PROVIDER_DISABLED',
    });
  });

  it('maps Firebase decoded tokens without exposing the raw id token', async () => {
    const { FirebaseOtpProvider } = await import('./firebase-otp.provider.js');
    verifyIdToken.mockResolvedValue({
      uid: 'firebase-user-1',
      phone_number: '+84901234567',
    });

    const provider = new FirebaseOtpProvider(verifyIdToken);

    await expect(provider.verify('raw-id-token-secret')).resolves.toEqual({
      providerUserId: 'firebase-user-1',
      phoneNumber: '+84901234567',
    });
    expect(verifyIdToken).toHaveBeenCalledWith('raw-id-token-secret');
  });

  it('redacts provider errors instead of echoing idToken values', async () => {
    const { FirebaseOtpProvider } = await import('./firebase-otp.provider.js');
    verifyIdToken.mockRejectedValue(
      new Error('provider rejected raw-id-token-secret'),
    );

    const provider = new FirebaseOtpProvider(verifyIdToken);

    await expect(provider.verify('raw-id-token-secret')).rejects.toMatchObject({
      code: 'OTP_PROVIDER_REJECTED',
      message: 'Firebase OTP verification failed',
    });

    try {
      await provider.verify('raw-id-token-secret');
    } catch (error) {
      expect(String(error)).not.toContain('raw-id-token-secret');
    }
  });

  it('returns a redacted timeout error when Firebase does not respond', async () => {
    const { FirebaseOtpProvider } = await import('./firebase-otp.provider.js');
    jest.useFakeTimers();
    verifyIdToken.mockReturnValue(new Promise(() => undefined));

    const provider = new FirebaseOtpProvider(verifyIdToken, 10);
    const result = provider.verify('raw-id-token-secret');
    const assertion = expect(result).rejects.toMatchObject({
      code: 'OTP_PROVIDER_TIMEOUT',
      message: 'Firebase OTP verification timed out',
    });

    await jest.advanceTimersByTimeAsync(11);

    await assertion;
  });

  it('registers the selected provider behind the OTP_PROVIDER token', async () => {
    const { OTP_PROVIDER } = await import('./otp-provider.js');
    const { OtpProviderModule } = await import('./otp-provider.module.js');

    const moduleRef = await Test.createTestingModule({
      imports: [
        OtpProviderModule.register({
          provider: 'demo',
          demo: { enabled: true, nodeEnv: 'test' },
        }),
      ],
    }).compile();

    const provider = moduleRef.get(OTP_PROVIDER);

    await expect(provider.verify('admin')).resolves.toEqual({
      providerUserId: 'demo:admin',
      phoneNumber: '+840000000004',
    });
  });
});
