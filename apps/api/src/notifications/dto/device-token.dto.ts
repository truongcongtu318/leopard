import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const DEVICE_TOKEN_PLATFORMS = ['IOS', 'ANDROID', 'WEB'] as const;
export type DeviceTokenPlatform = (typeof DEVICE_TOKEN_PLATFORMS)[number];

// Conservative token shape check: FCM/APNs tokens and web-push subscription
// endpoint URLs all fit this charset. Bounds stop obvious abuse (empty
// strings, multi-KB payloads) while staying well above any real provider's
// token length; the actual authenticity of the token is verified by the
// push provider when Task 2 sends to it, not here.
const TOKEN_PATTERN = /^[A-Za-z0-9\-_.:/?=&%]+$/;

export class RegisterTokenDto {
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  @Matches(TOKEN_PATTERN)
  declare token: string;

  @IsIn(DEVICE_TOKEN_PLATFORMS)
  declare platform: DeviceTokenPlatform;
}

export class RemoveTokenDto {
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  @Matches(TOKEN_PATTERN)
  declare token: string;
}
