import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class RequestPayoutDto {
  @IsInt()
  @IsPositive()
  amountVnd!: number;

  @IsString()
  @IsNotEmpty()
  clientRequestId!: string;
}

export class RejectPayoutDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
