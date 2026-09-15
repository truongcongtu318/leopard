import { IsOptional, IsString } from 'class-validator';

export class AcceptOrderDto {
  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
