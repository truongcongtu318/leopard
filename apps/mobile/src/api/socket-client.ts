import { io } from 'socket.io-client';

export interface SocketLike {
  connected: boolean;
  id?: string;
  connect(): this | void;
  disconnect(): this | void;
  emit(event: string, ...args: unknown[]): this | void;
  on(event: string, fn: (...args: any[]) => void): this | void;
  off(event: string, fn?: (...args: any[]) => void): this | void;
  removeAllListeners?(event?: string): this | void;
}

export type SocketFactory = (uri: string, opts?: Record<string, unknown>) => SocketLike;

/**
 * The one real socket.io-client factory in this app. Pass this as the
 * `socketFactory` for any feature that needs a live socket connection.
 */
export const createSocketFactory: SocketFactory = (uri, opts) => io(uri, opts);
