import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RejectDriverDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  declare reason: string;

  @IsOptional()
  @IsString()
  clientRequestId?: string;
}

export class ApproveDriverDto {
  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
