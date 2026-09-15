import {
  formatCargoSummary,
  formatDateTime,
  formatDistance,
  formatOrderReference,
  formatVehicleLabel,
  type MappedDriverOrderResponse,
} from '../orders/adapter';
import type { HistoryTripItem } from './DriverHistoryScreen';

export interface DriverHistoryHttpClient {
  get<T = unknown>(path: string): Promise<T>;
}

interface DriverOrderHistoryResponse {
  items: MappedDriverOrderResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const TERMINAL_STATUSES = new Set([
  'DELIVERED',
  'CANCELLED',
  'INCIDENT_CANCELLED',
  'RETURNING',
  'RETURNED',
]);

function getDefaultHttpClient(): DriverHistoryHttpClient {
  const { httpClient } = require('@leopard/mobile-core');
  return httpClient as DriverHistoryHttpClient;
}

function datePeriodOf(dateInput: string | null | undefined): 'today' | 'week' | 'older' {
  if (!dateInput) return 'older';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'older';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= startOfToday) return 'today';
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  if (date >= startOfWeek) return 'week';
  return 'older';
}

function completedAtOf(order: MappedDriverOrderResponse): string | null {
  return (
    order.deliveredAt ??
    order.cancelledAt ??
    (order as { incidentReportedAt?: string | null }).incidentReportedAt ??
    order.updatedAt
  );
}

function mapHistoryItem(order: MappedDriverOrderResponse): HistoryTripItem {
  const stops = order.stops ?? [];
  const pickup = stops.find((s) => s.type === 'PICKUP') ?? stops[0];
  const dropoff = [...stops].reverse().find((s) => s.type === 'DROPOFF') ?? stops[stops.length - 1];
  const completedAt = completedAtOf(order);
  const status = TERMINAL_STATUSES.has(order.status)
    ? (order.status as HistoryTripItem['status'])
    : 'DELIVERED';

  return {
    id: order.id,
    reference: formatOrderReference(order),
    origin: pickup?.address ?? 'Điểm lấy hàng',
    destination: dropoff?.address ?? 'Điểm giao hàng',
    distanceLabel: formatDistance(order.distanceMeters),
    cargoSummary: formatCargoSummary(order),
    completedAtLabel: formatDateTime(completedAt),
    datePeriod: datePeriodOf(completedAt),
    payoutAmount: order.priceVnd ?? 0,
    status,
    hasProof: (order.media ?? []).some((m) => m.type === 'DELIVERY_PROOF'),
    vehicleLabel: formatVehicleLabel(order.vehicleType),
  };
}

export function createDriverHistoryHttpAdapter(client?: DriverHistoryHttpClient) {
  const getClient = (): DriverHistoryHttpClient => client ?? getDefaultHttpClient();

  return {
    async getHistory(page = 1, pageSize = 50): Promise<{ items: HistoryTripItem[]; total: number }> {
      const response = await getClient().get<DriverOrderHistoryResponse>(
        `/driver/orders/history?page=${page}&pageSize=${pageSize}`,
      );
      return {
        items: response.items.map(mapHistoryItem),
        total: response.total,
      };
    },
  };
}
