'use client';

import { useCallback, useEffect, useState } from 'react';

import { browserClient } from '../../lib/api/browser-client';
import { ApiError } from '../../lib/api/api-error';
import { AdminSurface } from './AdminShared';

interface WithdrawalRequestItem {
  id: string;
  driverId: string;
  amountVnd: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  createdAt: string;
}

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
}

export function WithdrawalsScreen() {
  const [requests, setRequests] = useState<WithdrawalRequestItem[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoadState('loading');
    setErrorMsg(null);
    try {
      const data = await browserClient.get<WithdrawalRequestItem[]>('/admin/withdrawals');
      setRequests(data);
      setLoadState('ready');
    } catch (err) {
      setLoadState('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Không tải được danh sách yêu cầu rút tiền');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitReview = useCallback(
    async (id: string, action: 'approve' | 'reject') => {
      if (note.trim().length < 5) {
        setErrorMsg('Lý do phải từ 5 ký tự trở lên');
        return;
      }
      setPendingId(id);
      setErrorMsg(null);
      try {
        await browserClient.post(`/admin/withdrawals/${id}/${action}`, {
          note: note.trim(),
          clientRequestId: newRequestId(),
        });
        setActiveActionId(null);
        setActiveAction(null);
        setNote('');
        await load();
      } catch (err) {
        setErrorMsg(err instanceof ApiError ? err.message : 'Xử lý yêu cầu thất bại');
      } finally {
        setPendingId(null);
      }
    },
    [load, note],
  );

  return (
    <div className="flex min-w-0 flex-col gap-lg">
      <header>
        <h1 className="text-page-title font-semibold">Yêu cầu rút tiền</h1>
        <p className="mt-xxs text-body-compact text-neutral-muted">
          Duyệt sau khi đã chuyển khoản thủ công cho tài xế, hoặc từ chối kèm lý do.
        </p>
      </header>

      {errorMsg ? (
        <p role="alert" className="rounded-control border border-neutral-border bg-neutral-surface px-sm py-xs text-body-compact text-neutral-text">
          {errorMsg}
        </p>
      ) : null}

      <AdminSurface ariaLabel="Danh sách yêu cầu rút tiền đang chờ" title="Đang chờ xử lý" description={`${requests.length} yêu cầu`}>
        {loadState === 'loading' ? (
          <p className="text-body-compact text-neutral-muted">Đang tải…</p>
        ) : loadState === 'error' ? (
          <button type="button" onClick={() => void load()} className="rounded-control border border-neutral-border px-sm py-xs text-body-compact font-semibold">
            Thử lại
          </button>
        ) : requests.length === 0 ? (
          <p className="text-body-compact text-neutral-muted">Không có yêu cầu nào đang chờ.</p>
        ) : (
          <ul className="flex flex-col gap-sm">
            {requests.map((req) => (
              <li key={req.id} className="rounded-card border border-neutral-border bg-neutral p-md">
                <div className="flex flex-wrap items-start justify-between gap-sm">
                  <dl className="grid grid-cols-2 gap-x-lg gap-y-xxs text-body-compact">
                    <dt className="text-neutral-muted">Số tiền</dt>
                    <dd className="font-semibold tabular-nums">{formatCurrency(req.amountVnd)}</dd>
                    <dt className="text-neutral-muted">Ngân hàng</dt>
                    <dd className="font-semibold">{req.bankName ?? '—'}</dd>
                    <dt className="text-neutral-muted">Số tài khoản</dt>
                    <dd className="font-semibold tabular-nums">{req.bankAccountNumber ?? '—'}</dd>
                    <dt className="text-neutral-muted">Chủ tài khoản</dt>
                    <dd className="font-semibold">{req.bankAccountName ?? '—'}</dd>
                    <dt className="text-neutral-muted">Yêu cầu lúc</dt>
                    <dd className="tabular-nums">{formatDate(req.createdAt)}</dd>
                  </dl>

                  <div className="flex flex-col gap-xs">
                    <button
                      type="button"
                      disabled={pendingId === req.id}
                      onClick={() => {
                        setActiveActionId(req.id);
                        setActiveAction('approve');
                        setNote('');
                      }}
                      className="rounded-control bg-brand px-md py-xs text-body-compact font-semibold text-white disabled:opacity-60"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      disabled={pendingId === req.id}
                      onClick={() => {
                        setActiveActionId(req.id);
                        setActiveAction('reject');
                        setNote('');
                      }}
                      className="rounded-control border border-neutral-border px-md py-xs text-body-compact font-semibold disabled:opacity-60"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>

                {activeActionId === req.id ? (
                  <div className="mt-sm flex flex-col gap-xs border-t border-neutral-border pt-sm">
                    <label className="text-body-compact font-semibold" htmlFor={`note-${req.id}`}>
                      {activeAction === 'approve' ? 'Ghi chú duyệt' : 'Ghi chú từ chối'}
                    </label>
                    <textarea
                      id={`note-${req.id}`}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="VD: Đã chuyển khoản thủ công qua MB Bank"
                      rows={2}
                      className="rounded-control border border-neutral-border px-sm py-xs text-body-compact"
                    />
                    <div className="flex gap-xs">
                      <button
                        type="button"
                        disabled={pendingId === req.id}
                        onClick={() => void submitReview(req.id, activeAction!)}
                        className="rounded-control bg-neutral-text px-md py-xs text-body-compact font-semibold text-white disabled:opacity-60"
                      >
                        {activeAction === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveActionId(null);
                          setActiveAction(null);
                          setNote('');
                        }}
                        className="rounded-control border border-neutral-border px-md py-xs text-body-compact"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AdminSurface>
    </div>
  );
}
