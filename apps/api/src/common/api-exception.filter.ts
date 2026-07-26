import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { DomainError } from './domain-error.js';
import { requestContextStore } from './logger.service.js';

// ---------------------------------------------------------------------------
// Envelope shape
// ---------------------------------------------------------------------------

export interface ApiErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
  details?: unknown;
}

/** Minimal response contract that both Express and Fastify satisfy. */
interface HttpServerResponse {
  status(this: HttpServerResponse, code: number): HttpServerResponse;
  json(this: HttpServerResponse, body: unknown): HttpServerResponse;
}

// ---------------------------------------------------------------------------
// ExceptionFilter
// ---------------------------------------------------------------------------

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpServerResponse>();

    const envelope = this.toEnvelope(exception);
    response.status(envelope.statusCode).json(envelope);
  }

  // ---------------------------------------------------------------------------
  // Mapping
  // ---------------------------------------------------------------------------

  private toEnvelope(exception: unknown): ApiErrorEnvelope {
    const requestId = this.requestId();
    const timestamp = new Date().toISOString();

    // 1. DomainError -- use its own code / status / message
    if (exception instanceof DomainError) {
      return {
        statusCode: exception.status,
        code: exception.code,
        message: exception.message,
        requestId,
        timestamp,
        details: exception.details,
      };
    }

    // 2. HttpException (NestJS built-in or custom)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();

      // Validation errors (BadRequestException with array or field-error
      // response from ValidationPipe)
      if (status === HttpStatus.BAD_REQUEST) {
        const details = this.extractValidationDetails(responseBody);
        if (details !== undefined) {
          return {
            statusCode: 422,
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            requestId,
            timestamp,
            details,
          };
        }
      }

      const code = this.statusCodeToCode(status);
      const message = this.extractMessage(responseBody);

      return {
        statusCode: status,
        code,
        message: message ?? exception.message,
        requestId,
        timestamp,
      };
    }

    // 3. Unknown -- generic 500, never expose stack
    return {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId,
      timestamp,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private requestId(): string {
    const store = requestContextStore.getStore();
    const raw = store?.get('requestId');
    return typeof raw === 'string' ? raw : 'unknown';
  }

  private statusCodeToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_NOT_READY',
    };
    return map[status] ?? 'UNKNOWN_ERROR';
  }

  private extractMessage(
    responseBody: string | object,
  ): string | undefined {
    if (typeof responseBody === 'string') {
      return responseBody;
    }

    if (typeof responseBody === 'object' && responseBody !== null) {
      const msg = (responseBody as Record<string, unknown>)['message'];
      if (typeof msg === 'string') {
        return msg;
      }
    }

    return undefined;
  }

  /**
   * Extracts validation error details from a BadRequestException response.
   * The ValidationPipe produces either:
   *   { message: ['field must be...', ...] }
   * or an array of { field, messages } objects when using exceptionFactory.
   */
  private extractValidationDetails(
    responseBody: string | object,
  ): unknown | undefined {
    if (typeof responseBody === 'string') {
      return undefined;
    }

    if (Array.isArray(responseBody)) {
      // Already structured array of field errors
      return responseBody;
    }

    if (typeof responseBody === 'object' && responseBody !== null) {
      const msg = (responseBody as Record<string, unknown>)['message'];

      if (Array.isArray(msg)) {
        // Check if already structured (array of { field, messages })
        if (msg.length > 0 && typeof msg[0] === 'object' && msg[0] !== null) {
          return msg;
        }

        // Default ValidationPipe: message is an array of strings
        // Map them into structured field errors
        return msg.map((m: unknown) => {
          const str = typeof m === 'string' ? m : String(m);
          // Parse "property: constraint" format
          const colonIdx = str.indexOf(':');
          if (colonIdx > 0) {
            return {
              field: str.slice(0, colonIdx).trim(),
              messages: [str.slice(colonIdx + 1).trim()],
            };
          }
          return { field: 'unknown', messages: [str] };
        });
      }
    }

    return undefined;
  }
}
