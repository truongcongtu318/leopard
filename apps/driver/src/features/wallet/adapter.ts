// apps/driver/src/features/wallet/adapter.ts
export interface DriverWalletHttpClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
}

export interface DriverWalletSummaryResponse {
  availableBalanceVnd?: number;
  lifetimeDeliveredVnd?: number;
  pendingWithdrawalVnd?: number;
  deliveredOrderCount?: number;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
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

export type WalletTransactionType = 'WITHDRAWAL' | 'ORDER_PAYOUT' | 'PLATFORM_FEE';

export interface WithdrawalHistoryItem {
  id: string;
  status: WithdrawalStatusValue;
  amountVnd: number;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  createdAt: string;
  type?: WalletTransactionType | string;
  title?: string;
}

export interface TopupWalletInput {
  amountVnd: number;
  clientRequestId?: string;
}

export interface TopupWalletResponse {
  depositId: string;
  amountVnd: number;
  qrPayload: string;
  provider: string;
  providerReference: string;
  expiresAt: string;
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
      const data = await getClient().get<DriverWalletSummaryResponse>('/driver/wallet');
      return {
        availableBalanceVnd: data.availableBalanceVnd ?? 0,
        lifetimeDeliveredVnd: data.lifetimeDeliveredVnd ?? 0,
        pendingWithdrawalVnd: data.pendingWithdrawalVnd ?? 0,
        deliveredOrderCount: data.deliveredOrderCount ?? 0,
        bankName: data.bankName ?? null,
        bankAccountNumber: data.bankAccountNumber ?? null,
        bankAccountName: data.bankAccountName ?? null,
      };
    },

    async requestWithdrawal(input: WithdrawalRequestInput): Promise<WithdrawalHistoryItem> {
      return getClient().post<WithdrawalHistoryItem>('/driver/wallet/withdrawals', {
        amountVnd: input.amountVnd,
        bankName: input.bankName,
        bankAccountNumber: input.bankAccountNumber,
        bankAccountName: input.bankAccountName,
        clientRequestId: input.clientRequestId ?? newClientRequestId(),
      });
    },

    async getWithdrawalHistory(page = 1, pageSize = 20): Promise<WithdrawalHistoryResponse> {
      return getClient().get<WithdrawalHistoryResponse>(
        `/driver/wallet/withdrawals?page=${page}&pageSize=${pageSize}`,
      );
    },

    async topupWallet(input: TopupWalletInput): Promise<TopupWalletResponse> {
      return getClient().post<TopupWalletResponse>('/driver/wallet/topup', {
        amountVnd: input.amountVnd,
        clientRequestId: input.clientRequestId ?? newClientRequestId(),
      });
    },
  };
}
