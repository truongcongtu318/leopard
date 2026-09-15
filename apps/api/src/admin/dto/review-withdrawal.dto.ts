// apps/api/src/admin/dto/review-withdrawal.dto.ts
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReviewWithdrawalDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  note!: string;

  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
