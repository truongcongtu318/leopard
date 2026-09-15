import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ValidateVoucherDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsInt()
  @Min(0)
  orderAmountVnd!: number;
}
