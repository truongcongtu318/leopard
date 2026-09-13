// apps/api/src/drivers/dto/request-withdrawal.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class RequestWithdrawalDto {
  @IsInt()
  @IsPositive()
  amountVnd!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  bankName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  bankAccountNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  bankAccountName!: string;

  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
