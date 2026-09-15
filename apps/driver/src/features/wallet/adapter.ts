// apps/driver/src/features/wallet/adapter.ts
export interface DriverWalletHttpClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
}

export interface DriverWalletResponse {
  balanceVnd: number;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  recentPayouts: readonly WithdrawalHistoryItem[];
  availableBalanceVnd?: number;
  lifetimeDeliveredVnd?: number;
  pendingWithdrawalVnd?: number;
  deliveredOrderCount?: number;
}

export interface WalletSummary {
  availableBalanceVnd: number;
  lifetimeDeliveredVnd: number;
  pendingWithdrawalVnd: number;
  deliveredOrderCount: number;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
}

export type WithdrawalStatusValue = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface WithdrawalHistoryItem {
  id: string;
  status: WithdrawalStatusValue;
  amountVnd: number;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  createdAt: string;
}

export interface WithdrawalRequestInput {
  amountVnd: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  clientRequestId?: string;
}

interface WithdrawalHistoryResponse {
  items: WithdrawalHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function getDefaultHttpClient(): DriverWalletHttpClient {
  const { httpClient } = require('@leopard/mobile-core');
  return httpClient as DriverWalletHttpClient;
}

function newClientRequestId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createDriverWalletHttpAdapter(client?: DriverWalletHttpClient) {
  const getClient = (): DriverWalletHttpClient => client ?? getDefaultHttpClient();

  return {
    async getWalletSummary(): Promise<WalletSummary> {
      const data = await getClient().get<DriverWalletResponse>('/driver/wallet');
      const balance = data.balanceVnd ?? data.availableBalanceVnd ?? 0;
      const recent = data.recentPayouts ?? [];
      const pending = recent
        .filter((p) => p.status === 'PENDING')
        .reduce((sum, p) => sum + (p.amountVnd || 0), 0);
      const approved = recent
        .filter((p) => p.status === 'APPROVED')
        .reduce((sum, p) => sum + (p.amountVnd || 0), 0);
      const lifetime = data.lifetimeDeliveredVnd ?? balance + approved;

      return {
        availableBalanceVnd: balance,
        lifetimeDeliveredVnd: lifetime,
        pendingWithdrawalVnd: data.pendingWithdrawalVnd ?? pending,
        deliveredOrderCount: data.deliveredOrderCount ?? 0,
        bankName: data.bankName ?? null,
        bankAccountNumber: data.bankAccountNumber ?? null,
        bankAccountName: data.bankAccountName ?? null,
      };
    },

    async requestWithdrawal(input: WithdrawalRequestInput): Promise<WithdrawalHistoryItem> {
      return getClient().post<WithdrawalHistoryItem>('/driver/payout', {
        amountVnd: input.amountVnd,
        clientRequestId: input.clientRequestId ?? newClientRequestId(),
      });
    },

    async getWithdrawalHistory(page = 1, pageSize = 20): Promise<WithdrawalHistoryResponse> {
      try {
        const data = await getClient().get<DriverWalletResponse>('/driver/wallet');
        const items = (data.recentPayouts ?? []) as WithdrawalHistoryItem[];
        return {
          items,
          total: items.length,
          page,
          pageSize,
          totalPages: Math.ceil(items.length / pageSize) || 1,
        };
      } catch {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        };
      }
    },
  };
}
