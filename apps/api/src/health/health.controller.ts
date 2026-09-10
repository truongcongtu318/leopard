import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';

import { HealthService } from './health.service.js';
import type {
  LivenessResponse,
  ReadinessSuccessResponse,
} from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  public liveness(): LivenessResponse {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  public async readiness(): Promise<ReadinessSuccessResponse> {
    try {
      return await this.healthService.getReadiness();
    } catch {
      throw new HttpException(
        {
          status: 'not_ready',
          code: 'SERVICE_NOT_READY',
          message: 'Database not available',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
