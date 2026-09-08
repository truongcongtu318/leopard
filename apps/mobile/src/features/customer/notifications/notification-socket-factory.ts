import { io } from 'socket.io-client';

import type { SocketFactory } from './notification-socket';

/**
 * The notifications feature's own socket.io-client factory. Deliberately
 * local to this feature rather than depending on any shared socket-client
 * module owned by other, unrelated in-progress work on this branch —
 * constructs sockets the same way `notification-socket.ts`'s
 * `SocketFactory` type expects.
 */
export const createNotificationSocketFactory: SocketFactory = (uri, opts) => io(uri, opts);
