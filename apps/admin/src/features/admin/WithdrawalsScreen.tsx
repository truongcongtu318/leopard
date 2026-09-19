'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  QrCode,
  RefreshCw,
  User,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

import { browserClient } from '../../lib/api/browser-client';
import { ApiError } from '../../lib/api/api-error';

export interface WithdrawalRequestItem {
  id: string;
  driverId: string;
  amountVnd: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  createdAt: string;
  userRole?: string;
  userName?: string;
  userPhone?: string;
}

function getVietQrUrl(
  bankName: string | null,
  accountNo: string | null,
  amount: number,
  accountName: string | null,
): string {
  const rawBank = (bankName ?? '').toLowerCase().trim();
  let bankCode = 'VCB';
  if (rawBank.includes('techcom') || rawBank.includes('tcb')) bankCode = 'TCB';
  else if (rawBank.includes('vietin') || rawBank.includes('icb') || rawBank.includes('ctg')) bankCode = 'ICB';
  else if (rawBank.includes('mb') || rawBank.includes('quan doi')) bankCode = 'MB';
  else if (rawBank.includes('bidv')) bankCode = 'BIDV';
  else if (rawBank.includes('acb')) bankCode = 'ACB';
  else if (rawBank.includes('vp') || rawBank.includes('vpb')) bankCode = 'VPB';
  else if (rawBank.includes('tp') || rawBank.includes('tpb')) bankCode = 'TPB';
  else if (rawBank.includes('agri') || rawBank.includes('vba')) bankCode = 'VBA';
  else if (rawBank.includes('sacom') || rawBank.includes('stb')) bankCode = 'STB';
  else if (rawBank.includes('hdb')) bankCode = 'HDB';
  else if (rawBank.includes('vib')) bankCode = 'VIB';
  else if (rawBank.includes('ocb')) bankCode = 'OCB';
  else if (rawBank.includes('msb')) bankCode = 'MSB';
  else if (rawBank.includes('shb')) bankCode = 'SHB';
  else if (rawBank.includes('sea')) bankCode = 'SEAB';
  else if (rawBank.includes('lpb') || rawBank.includes('lienviet')) bankCode = 'LPB';
  else if (rawBank.includes('vietcom') || rawBank.includes('vcb')) bankCode = 'VCB';
  else {
    bankCode = rawBank.replace(/[^a-z0-9]/g, '').toUpperCase() || 'VCB';
  }

  const cleanAcc = (accountNo ?? '').replace(/\s+/g, '');
  const cleanName = encodeURIComponent((accountName ?? '').trim().toUpperCase());
  const memo = encodeURIComponent('LEOPARD HOAN TIEN');

  return `https://img.vietqr.io/image/${bankCode}-${cleanAcc}-compact2.png?amount=${amount}&addInfo=${memo}&accountName=${cleanName}`;
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [qrModalRequest, setQrModalRequest] = useState<WithdrawalRequestItem | null>(null);

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

  const activeRequest = requests.find((r) => r.id === activeActionId) ?? null;

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
        const actionText = action === 'approve' ? 'Duyệt' : 'Từ chối';
        setSuccessMsg(`Đã ${actionText.toLowerCase()} yêu cầu rút tiền thành công.`);
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

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const totalPendingAmount = pendingRequests.reduce((sum, r) => sum + r.amountVnd, 0);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Yêu cầu rút tiền
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Duyệt sau khi đã chuyển khoản thủ công cho tài xế hoặc khách hàng, hoặc từ chối kèm lý do.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-full shadow-2xs hover:bg-slate-50 transition-colors"
          aria-label="Tải lại danh sách"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loadState === 'loading' ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </header>

      {/* Success Notification */}
      {successMsg ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold shadow-xs animate-in fade-in-0 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded-md hover:bg-emerald-100/60 transition-colors cursor-pointer"
            aria-label="Đóng thông báo thành công"
          >
            Đóng
          </button>
        </div>
      ) : null}

      {/* Error Alert */}
      {errorMsg ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold shadow-xs animate-in fade-in-0 duration-200"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-none" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold px-2 py-1 rounded-md hover:bg-rose-100/60 transition-colors cursor-pointer"
            aria-label="Đóng cảnh báo"
          >
            Đóng
          </button>
        </div>
      ) : null}

      {/* KPI Bento Metrics Strip */}
      <section aria-label="Chỉ số yêu cầu rút tiền" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500">Đang chờ xử lý</span>
            <p className="text-xl font-bold text-slate-900 tabular-nums">
              {pendingRequests.length} <span className="text-xs font-normal text-slate-400">yêu cầu</span>
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Wallet className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500">Tổng tiền chờ giải ngân</span>
            <p className="text-xl font-bold text-emerald-700 tabular-nums">
              {totalPendingAmount.toLocaleString('vi-VN')} VND
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500">Phương thức thanh toán</span>
            <p className="text-sm font-bold text-slate-800">
              Chuyển khoản 24/7
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section
        aria-label="Danh sách yêu cầu rút tiền đang chờ"
        className="rounded-3xl border border-black/[0.06] bg-white/90 backdrop-blur-xl p-5 sm:p-6 shadow-xs text-slate-900"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Danh sách yêu cầu rút tiền
            </h2>
            <p className="text-xs text-slate-500">
              {requests.length} yêu cầu được ghi nhận
            </p>
          </div>
        </div>

        {loadState === 'loading' ? (
          <div className="py-16 text-center">
            <div className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-slate-900 border-t-transparent mb-3" />
            <p className="text-xs text-slate-500">Đang tải danh sách yêu cầu…</p>
          </div>
        ) : loadState === 'error' ? (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
            <p className="text-xs text-slate-600 mb-3">Đã xảy ra lỗi khi tải dữ liệu.</p>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-full hover:bg-slate-800 shadow-xs transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <ArrowDownToLine className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Không có yêu cầu nào đang chờ</p>
            <p className="text-xs text-slate-400 mt-1">Tất cả yêu cầu rút tiền của tài xế và khách hàng đã được giải quyết.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((req) => {
              const isApproved = req.status === 'APPROVED';
              const isRejected = req.status === 'REJECTED';
              const isPending = req.status === 'PENDING';

              return (
                <li
                  key={req.id}
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: User & Role & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {req.userRole === 'CUSTOMER' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Khách hàng (Hoàn cọc)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Tài xế (Thu nhập)
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          <User className="h-3 w-3 text-slate-500" />
                          {req.userName || req.userPhone || req.driverId}
                        </span>
                      </div>
                      {isPending ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                          Chờ duyệt
                        </span>
                      ) : isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <CheckCircle2 className="h-3 w-3" />
                          Đã duyệt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                          <XCircle className="h-3 w-3" />
                          Từ chối
                        </span>
                      )}
                    </div>

                    {/* Amount Banner */}
                    <div className="mb-4">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        Số tiền rút
                      </span>
                      <p className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                        {formatCurrency(req.amountVnd)}
                      </p>
                    </div>

                    {/* Bank Details Bento Box */}
                    <div className="rounded-2xl bg-slate-50/80 border border-slate-100 p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Ngân hàng</span>
                        <span className="font-semibold text-slate-800">{req.bankName ?? '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Số tài khoản</span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {req.bankAccountNumber ?? '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Chủ tài khoản</span>
                        <span className="font-semibold text-slate-800 uppercase">{req.bankAccountName ?? '—'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                        <span className="text-slate-400">Thời gian yêu cầu</span>
                        <span className="text-slate-500 font-mono tabular-nums">{formatDate(req.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  {isPending ? (
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setQrModalRequest(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 rounded-full hover:bg-blue-100 shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title="Xem mã VietQR để quét chuyển khoản"
                      >
                        <QrCode className="h-3.5 w-3.5 text-blue-600" />
                        <span>Mã VietQR</span>
                      </button>
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          disabled={pendingId === req.id}
                          onClick={() => {
                            setActiveActionId(req.id);
                            setActiveAction('reject');
                            setNote('');
                          }}
                          className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200/80 rounded-full hover:bg-rose-100 shadow-2xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          disabled={pendingId === req.id}
                          onClick={() => {
                            setActiveActionId(req.id);
                            setActiveAction('approve');
                            setNote('');
                          }}
                          className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                        >
                          Duyệt
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* VietQR Quick-Transfer Modal */}
      {qrModalRequest ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vietqr-dialog-title"
        >
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-blue-600" />
                <h3 id="vietqr-dialog-title" className="text-base font-bold text-slate-900">
                  Mã VietQR chuyển khoản
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQrModalRequest(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: QR image + info */}
            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <p className="text-xs text-slate-500">
                Mở app ngân hàng (VCB, MB, Techcom, BIDV...) quét mã để chuyển khoản chính xác cho {qrModalRequest.userRole === 'CUSTOMER' ? 'khách hàng' : 'tài xế'}:
              </p>

              <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
                <img
                  src={getVietQrUrl(
                    qrModalRequest.bankName,
                    qrModalRequest.bankAccountNumber,
                    qrModalRequest.amountVnd,
                    qrModalRequest.bankAccountName,
                  )}
                  alt="Mã VietQR chuyển khoản"
                  className="w-56 h-auto object-contain rounded-lg"
                  loading="lazy"
                />
              </div>

              <div className="w-full bg-slate-50 rounded-2xl p-3 border border-slate-100 text-xs space-y-1.5 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Số tiền:</span>
                  <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(qrModalRequest.amountVnd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ngân hàng:</span>
                  <span className="font-semibold text-slate-800">{qrModalRequest.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Số tài khoản:</span>
                  <span className="font-mono font-bold text-slate-900">{qrModalRequest.bankAccountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chủ tài khoản:</span>
                  <span className="font-semibold text-slate-800 uppercase">{qrModalRequest.bankAccountName}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setQrModalRequest(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetReq = qrModalRequest;
                  setQrModalRequest(null);
                  setActiveActionId(targetReq.id);
                  setActiveAction('approve');
                  setNote('Đã quét VietQR chuyển khoản');
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Đã chuyển, duyệt ngay
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modern Review Modal Dialog */}
      {activeActionId && activeRequest && activeAction ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-dialog-title"
        >
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs text-white ${
                    activeAction === 'approve' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {activeAction === 'approve' ? (
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <h3 id="review-dialog-title" className="text-base font-bold text-slate-900">
                    {activeAction === 'approve' ? 'Xác nhận duyệt rút tiền' : 'Xác nhận từ chối yêu cầu'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {activeRequest.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveActionId(null);
                  setActiveAction(null);
                  setNote('');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Target Details Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Số tiền:</span>
                  <span className="font-bold text-base text-slate-900 tabular-nums">
                    {formatCurrency(activeRequest.amountVnd)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Người nhận:</span>
                  <span className="font-semibold text-slate-800 uppercase">{activeRequest.bankAccountName}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Ngân hàng & STK:</span>
                  <span className="font-mono">{activeRequest.bankName} • {activeRequest.bankAccountNumber}</span>
                </div>
              </div>

              {activeAction === 'approve' ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 text-emerald-950 text-xs">
                  Vui lòng đảm bảo bạn đã chuyển khoản thành công ra số tài khoản trên trước khi duyệt yêu cầu.
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/60 text-rose-950 text-xs">
                  Yêu cầu sẽ bị hủy và số dư ví sẽ được hoàn trả lại cho tài xế.
                </div>
              )}

              {/* Note input field */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`note-${activeRequest.id}`}
                  className="block text-xs font-bold text-slate-700"
                >
                  {activeAction === 'approve' ? 'Ghi chú duyệt' : 'Ghi chú từ chối'}
                </label>
                <textarea
                  id={`note-${activeRequest.id}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    activeAction === 'approve'
                      ? 'VD: Đã chuyển khoản thủ công qua MB Bank'
                      : 'VD: Thông tin số tài khoản không trùng khớp'
                  }
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setActiveActionId(null);
                  setActiveAction(null);
                  setNote('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={pendingId === activeRequest.id}
                onClick={() => void submitReview(activeRequest.id, activeAction)}
                className={`px-5 py-2 text-xs font-bold text-white rounded-full shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer ${
                  activeAction === 'approve' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {activeAction === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
