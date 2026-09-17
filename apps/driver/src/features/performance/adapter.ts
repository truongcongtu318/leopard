// apps/driver/src/features/performance/adapter.ts
export interface DriverPerformanceHttpClient {
  get<T = unknown>(path: string): Promise<T>;
}

export interface DriverPerformanceReviewResponse {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer?: {
    id?: string;
    name?: string | null;
    phone?: string | null;
  } | null;
}

export interface DriverPerformanceResponse {
  ratingAvg: number | null;
  ratingCount: number;
  acceptancePct: number | null;
  cancellationPct: number | null;
  recentReviews: DriverPerformanceReviewResponse[];
}

export interface DriverPerformanceSummary {
  ratingAvg: number;
  ratingCount: number;
  acceptancePct: number;
  cancellationPct: number;
  recentReviews: readonly DriverPerformanceReviewResponse[];
}

function getDefaultHttpClient(): DriverPerformanceHttpClient {
  const { httpClient } = require('@leopard/mobile-core');
  return httpClient as DriverPerformanceHttpClient;
}

export function createDriverPerformanceHttpAdapter(client?: DriverPerformanceHttpClient) {
  const getClient = (): DriverPerformanceHttpClient => client ?? getDefaultHttpClient();

  return {
    async getPerformanceSummary(): Promise<DriverPerformanceSummary> {
      const data = await getClient().get<DriverPerformanceResponse>('/driver/performance');
      return {
        ratingAvg: data.ratingAvg ?? 0,
        ratingCount: data.ratingCount ?? 0,
        acceptancePct: data.acceptancePct ?? 0,
        cancellationPct: data.cancellationPct ?? 0,
        recentReviews: data.recentReviews ?? [],
      };
    },
  };
}
