import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(64)
  declare label: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  declare address: string;

  @IsNumber()
  declare latitude: number;

  @IsNumber()
  declare longitude: number;

  @IsOptional()
  @IsBoolean()
  declare isDefault?: boolean;
}
