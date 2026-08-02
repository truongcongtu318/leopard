import { type DynamicModule, Module } from '@nestjs/common';

import { DemoOtpProvider, type DemoOtpProviderOptions } from './demo-otp.provider.js';
import {
  FirebaseOtpProvider,
  type FirebaseIdTokenVerifier,
} from './firebase-otp.provider.js';
import { OTP_PROVIDER } from './otp-provider.js';

export interface OtpProviderModuleOptions {
  readonly provider: 'demo' | 'firebase';
  readonly demo?: DemoOtpProviderOptions;
  readonly firebase?: {
    readonly verifyIdToken?: FirebaseIdTokenVerifier;
    readonly timeoutMs?: number;
  };
}

@Module({})
export class OtpProviderModule {
  public static register(options: OtpProviderModuleOptions): DynamicModule {
    return {
      module: OtpProviderModule,
      providers: [
        {
          provide: OTP_PROVIDER,
          useFactory: () => {
            if (options.provider === 'demo') {
              return new DemoOtpProvider(
                options.demo ?? {
                  enabled: false,
                  nodeEnv: process.env['NODE_ENV'] ?? 'development',
                },
              );
            }

            return new FirebaseOtpProvider(
              options.firebase?.verifyIdToken,
              options.firebase?.timeoutMs,
            );
          },
        },
      ],
      exports: [OTP_PROVIDER],
    };
  }
}
