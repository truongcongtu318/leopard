import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  declare category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  declare description: string;

  @IsOptional()
  @IsBoolean()
  declare hasPhoto?: boolean;
}
