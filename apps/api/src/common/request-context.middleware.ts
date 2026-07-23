import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * AsyncLocalStorage store that the middleware writes into and the logger /
 * filter reads from.  Exported so downstream code can inspect it.
 */
export { requestContextStore } from './logger.service.js';

import { requestContextStore } from './logger.service.js';

const HEADER_REQUEST_ID = 'x-request-id';

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
    let requestId = req.headers[HEADER_REQUEST_ID];

    if (!requestId || Array.isArray(requestId)) {
      requestId = randomUUID();
    }

    res.setHeader(HEADER_REQUEST_ID, requestId);

    const store = new Map<string, unknown>();
    store.set('requestId', requestId);

    requestContextStore.run(store, () => {
      next();
    });
  }
}
