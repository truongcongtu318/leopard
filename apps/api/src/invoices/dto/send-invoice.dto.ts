import { IsEmail, MaxLength } from 'class-validator';

export class SendInvoiceDto {
  @IsEmail()
  @MaxLength(255)
  declare email: string;
}
