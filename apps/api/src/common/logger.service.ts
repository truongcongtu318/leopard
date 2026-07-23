import {
  ConsoleLogger,
  Injectable,
  type LogLevel,
  type ConsoleLoggerOptions,
} from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

// ---------------------------------------------------------------------------
// Shared AsyncLocalStorage -- written by RequestContextMiddleware, read by
// the logger and the exception filter.
// ---------------------------------------------------------------------------

export const requestContextStore = new AsyncLocalStorage<Map<string, unknown>>();

// ---------------------------------------------------------------------------
// Sensitive keys that must never appear in plain text in log output.
// ---------------------------------------------------------------------------

const REDACT_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'token',
  'refreshtoken',
  'refresh_token',
  'accesstoken',
  'access_token',
  'phone',
  'password',
  'secret',
]);

const REDACTED = '[REDACTED]';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively walk a value (object, array, primitive) and replace the value
 * of any key whose lower-cased name matches a redact-key with "[REDACTED]".
 */
function redact(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = redact(obj[i]);
    }
    return obj;
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACT_KEYS.has(key.toLowerCase())) {
      (obj as Record<string, unknown>)[key] = REDACTED;
    } else if (typeof value === 'object' && value !== null) {
      redact(value);
    }
  }

  return obj;
}

/**
 * Build the log-levels array from env configuration.
 */
function resolveLogLevels(): LogLevel[] {
  const logLevelEnv = process.env['LOG_LEVEL'];
  if (logLevelEnv) {
    return logLevelEnv.split(',').map((s) => s.trim()) as LogLevel[];
  }

  const env = process.env['NODE_ENV'] ?? 'development';
  if (env === 'production') {
    return ['log', 'error', 'warn', 'fatal'];
  }

  // development: all levels (Nest 11 ConsoleLogger defaults)
  return ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];
}

// ---------------------------------------------------------------------------
// LoggerService
// ---------------------------------------------------------------------------

@Injectable()
export class LoggerService extends ConsoleLogger {
  constructor() {
    const isProduction = (process.env['NODE_ENV'] ?? 'development') === 'production';

    const options: ConsoleLoggerOptions = {
      logLevels: resolveLogLevels(),
      timestamp: !isProduction,
      json: isProduction,
      colors: !isProduction,
    };

    super(options);
  }

  // -------------------------------------------------------------------------
  // Override formatPid to include requestId in development mode.
  // This is called by the parent before formatMessage, but we want requestId
  // at the end of the log line, so we override formatMessage instead.
  // -------------------------------------------------------------------------

  protected override formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
  ): string {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);

    // Redact sensitive data in the message
    let safeMessage = msg;
    try {
      const parsed = JSON.parse(msg);
      if (typeof parsed === 'object' && parsed !== null) {
        redact(parsed);
        safeMessage = JSON.stringify(parsed);
      }
    } catch {
      // plain text
    }

    const requestId =
      requestContextStore.getStore()?.get('requestId') ?? undefined;
    const rid = requestId ? ` [${requestId}]` : '';

    const env = process.env['NODE_ENV'] ?? 'development';
    if (env === 'production') {
      // In production, json mode is on so Nest prints JSON automatically.
      // We still inject requestId by patching the message.
      const payload: Record<string, unknown> = {
        message: safeMessage,
        context: contextMessage || undefined,
        requestId: requestId || undefined,
      };
      return `${JSON.stringify(payload)}\n`;
    }

    // Development: pretty-print with requestId appended
    const parts = [
      pidMessage,
      timestampDiff,
      formattedLogLevel,
      contextMessage,
    ].filter(Boolean);

    const prefix = parts.length > 0 ? `${parts.join(' ')} ` : '';
    return `${prefix}${safeMessage}${rid}\n`;
  }

  /**
   * Convenience: expose the store for the middleware & tests.
   */
  get contextStore(): typeof requestContextStore {
    return requestContextStore;
  }
}
