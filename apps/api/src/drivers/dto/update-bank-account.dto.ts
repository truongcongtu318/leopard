import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  bankAccountNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  bankAccountName!: string;
}
