import type { DispatchOfferEvent } from '@leopard/shared';

import { createSocketFactory, type SocketFactory, type SocketLike } from '../../../api/socket-client';
import { sessionStore } from '../../../auth/session-store';
import type { IncomingDispatchOffer } from './IncomingDispatchModal';
import {
  formatCargoSummary,
  formatDistance,
  formatDriverEtaLabel,
  formatOrderReference,
  formatVehicleLabel,
  formatVndPrice,
} from './adapter';

const DISPATCH_NAMESPACE = '/dispatch';
const DEFAULT_TIMEOUT_SECONDS = 25;

export function mapDispatchOfferEvent(event: DispatchOfferEvent): IncomingDispatchOffer {
  return {
    id: event.orderId,
    reference: formatOrderReference({ id: event.orderId }),
    pickupDistanceLabel: `Cách bạn ${formatDistance(event.driverDistanceM)}`,
    pickupAddress: event.pickupAddress,
    dropoffAddress: event.dropoffAddress,
    tripDistanceLabel: formatDistance(event.distanceMeters),
    etaLabel: formatDriverEtaLabel(event.durationSeconds),
    priceLabel: formatVndPrice(event.priceVnd),
    vehicleLabel: formatVehicleLabel(event.vehicleType),
    cargoSummary: formatCargoSummary({ cargoNote: event.cargoNote }),
    timeoutSeconds: event.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
  };
}

export type DispatchOfferListenerOptions = Readonly<{
  socketFactory?: SocketFactory;
  serverUrl?: string;
  tokenProvider?: () => string | null;
  onOffer?: (offer: IncomingDispatchOffer) => void;
}>;

export class DispatchOfferListener {
  private socket: SocketLike | null = null;
  private readonly socketFactory: SocketFactory;
  private readonly serverUrl: string;
  private readonly tokenProvider: () => string | null;
  private readonly onOffer?: (offer: IncomingDispatchOffer) => void;

  constructor(options: DispatchOfferListenerOptions = {}) {
    this.socketFactory = options.socketFactory ?? createSocketFactory;
    this.serverUrl = options.serverUrl ?? process.env.EXPO_PUBLIC_API_URL ?? '';
    this.tokenProvider = options.tokenProvider ?? (() => sessionStore.getAccessToken());
    this.onOffer = options.onOffer;
  }

  connect(): void {
    if (this.socket) return;
    const token = this.tokenProvider();
    if (!token) return;

    const uri = `${this.serverUrl}${DISPATCH_NAMESPACE}`;
    this.socket = this.socketFactory(uri, { auth: { token }, transports: ['websocket'] });
    this.socket.on('dispatch:offer', (event: DispatchOfferEvent) => {
      this.onOffer?.(mapDispatchOfferEvent(event));
    });
    this.socket.connect();
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners?.();
    this.socket.disconnect();
    this.socket = null;
  }
}

export function createDispatchOfferListener(
  options?: DispatchOfferListenerOptions,
): DispatchOfferListener {
  return new DispatchOfferListener(options);
}
