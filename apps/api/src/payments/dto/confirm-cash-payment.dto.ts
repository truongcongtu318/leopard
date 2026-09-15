import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConfirmCashPaymentDto {
  @IsString({ message: 'clientRequestId phải là chuỗi' })
  @IsNotEmpty({ message: 'clientRequestId không được để trống' })
  @MaxLength(128, { message: 'clientRequestId không được vượt quá 128 ký tự' })
  clientRequestId!: string;
}
