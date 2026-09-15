import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateDriverLocationDto {
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  accuracyM?: number;

  @IsOptional()
  @IsBoolean()
  isStationaryHeartbeat?: boolean;
}
