import type { NestMiddleware } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { statusLabelVi } from './http-status-vi.js';

/**
 * AsyncLocalStorage store that the middleware writes into and the logger /
 * filter reads from.  Exported so downstream code can inspect it.
 */
export { requestContextStore } from './logger.service.js';

import { requestContextStore } from './logger.service.js';

const HEADER_REQUEST_ID = 'x-request-id';

// Module-level logger: `use` is often passed unbound (`app.use(mw.use)`), so it
// must not rely on `this`.
const httpLogger = new Logger('HTTP');

/**
 * Guarantees every request carries an x-request-id (generates a UUID v4 when
 * missing), stores it in AsyncLocalStorage, and echoes it on the response.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ): void {
    const startedAt = Date.now();

    let requestId = req.headers[HEADER_REQUEST_ID];

    if (!requestId || Array.isArray(requestId)) {
      requestId = randomUUID();
    }

    res.setHeader(HEADER_REQUEST_ID, requestId);

    const store = new Map<string, unknown>();
    store.set('requestId', requestId);

    // Friendly one-line access log once the response is fully sent, so every
    // request shows a Vietnamese status label (e.g. "200 Thành công",
    // "401 Chưa xác thực") instead of a bare status code.
    const rid = requestId;
    res.on('finish', () => {
      const status = res.statusCode;
      const durationMs = Date.now() - startedAt;
      const line = `${req.method} ${req.url} → ${status} ${statusLabelVi(status)} (${durationMs}ms) [${rid}]`;

      if (status >= 500) {
        httpLogger.error(line);
      } else if (status >= 400) {
        httpLogger.warn(line);
      } else {
        httpLogger.log(line);
      }
    });

    requestContextStore.run(store, () => {
      next();
    });
  }
}
