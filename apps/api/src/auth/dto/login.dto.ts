import { Role } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DemoLoginDto {
  @IsString()
  @IsNotEmpty()
  declare accountId: string;
}

export class FirebaseLoginDto {
  @IsString()
  @IsNotEmpty()
  declare idToken: string;
}

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  declare phone: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  declare phone: string;

  @IsString()
  @IsNotEmpty()
  declare otp: string;

  @IsOptional()
  @IsEnum(Role)
  declare role?: Role;
}
