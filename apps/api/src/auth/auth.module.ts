import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { FirebaseOtpProvider } from './providers/firebase-otp.provider.js';
import { OTP_PROVIDER } from './providers/otp-provider.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    { provide: OTP_PROVIDER, useClass: FirebaseOtpProvider },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
