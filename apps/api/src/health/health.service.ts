import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface LivenessResponse {
  status: 'ok';
  uptime: number;
}

export interface ReadinessSuccessResponse {
  status: 'ready';
  database: 'connected';
}

export interface ReadinessFailureResponse {
  status: 'not_ready';
  code: 'SERVICE_NOT_READY';
  message: 'Database not available';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** Maximum time (ms) to wait for the database readiness query. */
const READINESS_TIMEOUT_MS = 3_000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns a liveness snapshot without touching the database.
   * The process is "alive" as long as this handler executes.
   */
  public getLiveness(): LivenessResponse {
    return {
      status: 'ok',
      uptime: process.uptime(),
    };
  }

  /**
   * Probes database connectivity with a bounded timeout.
   *
   * On success returns a ready payload; on any failure (connection refused,
   * timeout, etc.) throws so the controller can respond with 503.
   */
  public async getReadiness(): Promise<ReadinessSuccessResponse> {
    await this.pingDatabase();
    return { status: 'ready', database: 'connected' };
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /**
   * Executes SELECT 1 with a hard timeout.  If the query does not settle
   * within {@link READINESS_TIMEOUT_MS} milliseconds the promise rejects.
   */
  private async pingDatabase(): Promise<void> {
    const query = this.prisma.$queryRawUnsafe<[{ readonly '?column?': number }]>('SELECT 1');

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => {
        reject(new Error('Database readiness check timed out'));
      }, READINESS_TIMEOUT_MS),
    );

    try {
      await Promise.race([query, timeout]);
    } catch (error) {
      this.logger.warn('Database readiness check failed', (error as Error)?.message);
      throw error;
    }
  }
}
