import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CompleteProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  declare name: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsEmail()
  @MaxLength(255)
  declare email?: string | null;

  @IsOptional()
  @IsUUID()
  declare avatarMediaId?: string;

  @Equals(true, { message: 'Bạn cần đồng ý Điều khoản & Chính sách' })
  declare consentTerms: true;

  @Equals(true, { message: 'Bạn cần đồng ý cho phép xử lý dữ liệu để cung cấp dịch vụ' })
  declare consentService: true;

  @IsOptional()
  @IsBoolean()
  declare consentMarketing?: boolean;

  @IsOptional()
  @IsBoolean()
  declare consentThirdParty?: boolean;
}
