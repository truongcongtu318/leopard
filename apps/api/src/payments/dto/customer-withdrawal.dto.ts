import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class RequestCustomerWithdrawalDto {
  @IsInt()
  @IsPositive()
  @Min(10000, { message: 'Số tiền rút tối thiểu là 10.000 ₫' })
  amountVnd!: number;

  @IsString()
  @IsNotEmpty({ message: 'Tên ngân hàng không được để trống' })
  @MaxLength(120)
  bankName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Số tài khoản không được để trống' })
  @MaxLength(32)
  bankAccountNumber!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên chủ tài khoản không được để trống' })
  @MaxLength(120)
  bankAccountName!: string;

  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
