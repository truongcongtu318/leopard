import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  declare rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  declare comment?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  declare tipVnd?: number;
}
