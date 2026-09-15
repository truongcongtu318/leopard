import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const INCIDENT_REASON_CODES = [
  'VEHICLE_BREAKDOWN',
  'SENDER_NO_SHOW',
  'SENDER_CANCELLED',
  'RECIPIENT_REJECTED',
  'WRONG_ADDRESS',
  'FORCE_MAJEURE',
] as const;

export type IncidentReasonCode = (typeof INCIDENT_REASON_CODES)[number];

export class ReportOrderIncidentDto {
  @IsEnum(INCIDENT_REASON_CODES)
  @IsNotEmpty()
  reason!: IncidentReasonCode;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  evidenceMediaId?: string;

  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
