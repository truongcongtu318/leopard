'use client';

import { useCallback, useEffect, useState } from 'react';

import { browserClient } from '../../lib/api/browser-client';
import { ApiError } from '../../lib/api/api-error';
import { AdminSurface } from './AdminShared';

interface DriverApplication {
  userId: string;
  name: string | null;
  phone: string | null;
  status: string;
  vehicleType: string | null;
  licensePlate: string | null;
  licenseNumber: string | null;
  submittedAt: string | null;
  rejectionReason: string | null;
}

interface DriverDocument {
  id: string;
  type: string;
  contentType: string;
  url: string;
  createdAt: string;
}

const VEHICLE_LABELS: Readonly<Record<string, string>> = {
  MOTORBIKE: 'Xe máy / Ba gác',
  VAN: 'Xe van',
  TRUCK: 'Xe tải',
};

const DOCUMENT_LABELS: Readonly<Record<string, string>> = {
  LICENSE: 'GPLX',
  VEHICLE_REGISTRATION: 'Cà-vẹt',
  ID_CARD: 'CCCD',
  VEHICLE_PHOTO: 'Ảnh xe',
};

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
}

export function DriverApplicationsScreen() {
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [requestingChangesId, setRequestingChangesId] = useState<string | null>(null);
  const [changeReasonNote, setChangeReasonNote] = useState('');
  const [changeReasonCode, setChangeReasonCode] = useState('BLURRY_IMAGE');
  const [openDocsId, setOpenDocsId] = useState<string | null>(null);
  const [docsByUser, setDocsByUser] = useState<
    Record<string, DriverDocument[] | 'loading' | undefined>
  >({});

  const toggleDocs = useCallback(
    async (userId: string) => {
      if (openDocsId === userId) {
        setOpenDocsId(null);
        return;
      }
      setOpenDocsId(userId);
      if (docsByUser[userId] !== undefined) {
        return;
      }
      setDocsByUser((prev) => ({ ...prev, [userId]: 'loading' }));
      try {
        const docs = await browserClient.get<DriverDocument[]>(
          `/admin/drivers/${userId}/documents`,
        );
        setDocsByUser((prev) => ({ ...prev, [userId]: docs }));
      } catch {
        setDocsByUser((prev) => ({ ...prev, [userId]: [] }));
        setErrorMsg('Không tải được giấy tờ của tài xế');
      }
    },
    [openDocsId, docsByUser],
  );

  const load = useCallback(async () => {
    setLoadState('loading');
    setErrorMsg(null);
    try {
      const data = await browserClient.get<DriverApplication[]>(
        '/admin/drivers/applications?status=PENDING_APPROVAL',
      );
      setApplications(data);
      setLoadState('ready');
    } catch (err) {
      setLoadState('error');
      setErrorMsg(
        err instanceof ApiError ? err.message : 'Không tải được danh sách hồ sơ tài xế',
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = useCallback(
    async (userId: string) => {
      setPendingId(userId);
      setErrorMsg(null);
      try {
        await browserClient.post(`/admin/drivers/${userId}/approve`, {
          clientRequestId: newRequestId(),
        });
        await load();
      } catch (err) {
        setErrorMsg(err instanceof ApiError ? err.message : 'Duyệt hồ sơ thất bại');
      } finally {
        setPendingId(null);
      }
    },
    [load],
  );

  const submitReject = useCallback(
    async (userId: string) => {
      if (rejectReason.trim().length < 5) {
        setErrorMsg('Lý do từ chối phải từ 5 ký tự trở lên');
        return;
      }
      setPendingId(userId);
      setErrorMsg(null);
      try {
        await browserClient.post(`/admin/drivers/${userId}/reject`, {
          reason: rejectReason.trim(),
          clientRequestId: newRequestId(),
        });
        setRejectingId(null);
        setRejectReason('');
        await load();
      } catch (err) {
        setErrorMsg(err instanceof ApiError ? err.message : 'Từ chối hồ sơ thất bại');
      } finally {
        setPendingId(null);
      }
    },
    [load, rejectReason],
  );

  const submitRequestChanges = useCallback(
    async (userId: string) => {
      const trimmed = changeReasonNote.trim();
      if (trimmed.length < 5) {
        setErrorMsg('Ghi chú yêu cầu bổ sung phải từ 5 ký tự trở lên');
        return;
      }
      setPendingId(userId);
      setErrorMsg(null);
      try {
        await browserClient.post(`/admin/drivers/${userId}/request-changes`, {
          reason: trimmed,
          reasonCode: changeReasonCode,
          clientRequestId: newRequestId(),
        });
        setRequestingChangesId(null);
        setChangeReasonNote('');
        await load();
      } catch (err) {
        setErrorMsg(err instanceof ApiError ? err.message : 'Yêu cầu bổ sung hồ sơ thất bại');
      } finally {
        setPendingId(null);
      }
    },
    [load, changeReasonNote, changeReasonCode],
  );


  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="mb-1">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Duyệt hồ sơ tài xế</h1>
        <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-500 font-medium">
          Hồ sơ tài xế đang chờ duyệt. Duyệt để kích hoạt nhận đơn, hoặc từ chối kèm lý do.
        </p>
      </header>

      {errorMsg ? (
        <p
          role="alert"
          className="rounded-2xl border border-danger-border/40 bg-danger/40 px-4 py-3 text-xs font-semibold text-danger-text shadow-2xs"
        >
          {errorMsg}
        </p>
      ) : null}

      <AdminSurface
        ariaLabel="Danh sách hồ sơ tài xế chờ duyệt"
        title="Hồ sơ chờ duyệt"
        description={`${applications.length} hồ sơ đang chờ`}
      >
        {loadState === 'loading' ? (
          <p className="text-body-compact text-neutral-muted">Đang tải…</p>
        ) : loadState === 'error' ? (
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            Thử lại
          </button>
        ) : applications.length === 0 ? (
          <p className="text-body-compact text-neutral-muted">
            Không có hồ sơ nào đang chờ duyệt.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {applications.map((app) => (
              <li
                key={app.userId}
                className="rounded-3xl border border-black/[0.06] bg-white/70 backdrop-blur-xl p-5 sm:p-6 shadow-sm shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-xs flex-1 min-w-56">
                    <div className="flex justify-between gap-3 border-b border-slate-100/80 pb-1.5">
                      <dt className="text-slate-400 font-semibold uppercase tracking-wide">Tên tài xế</dt>
                      <dd className="font-semibold text-slate-800 text-right break-words">{app.name ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-slate-100/80 pb-1.5">
                      <dt className="text-slate-400 font-semibold uppercase tracking-wide">Số điện thoại</dt>
                      <dd className="font-mono font-semibold text-slate-800 tabular-nums text-right">{app.phone ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-slate-100/80 pb-1.5">
                      <dt className="text-slate-400 font-semibold uppercase tracking-wide">Loại xe</dt>
                      <dd className="font-semibold text-slate-800 text-right">
                        {app.vehicleType ? (VEHICLE_LABELS[app.vehicleType] ?? app.vehicleType) : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-slate-100/80 pb-1.5">
                      <dt className="text-slate-400 font-semibold uppercase tracking-wide">Biển số</dt>
                      <dd className="font-mono font-semibold text-slate-800 text-right">{app.licensePlate ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-slate-100/80 pb-1.5">
                      <dt className="text-slate-400 font-semibold uppercase tracking-wide">GPLX</dt>
                      <dd className="font-semibold text-slate-800 text-right">{app.licenseNumber ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-slate-100/80 pb-1.5">
                      <dt className="text-slate-400 font-semibold uppercase tracking-wide">Nộp lúc</dt>
                      <dd className="font-mono tabular-nums text-slate-600 text-right text-[11px]">{formatDate(app.submittedAt)}</dd>
                    </div>
                  </dl>

                  <div className="flex sm:flex-col flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={pendingId === app.userId}
                      onClick={() => void approve(app.userId)}
                      className="inline-flex min-h-9 items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-700 disabled:opacity-50 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                    >
                      {pendingId === app.userId ? 'Đang xử lý…' : 'Duyệt'}
                    </button>
                    <button
                      type="button"
                      disabled={pendingId === app.userId}
                      onClick={() =>
                        setRequestingChangesId(requestingChangesId === app.userId ? null : app.userId)
                      }
                      className="rounded-control border border-amber-600 bg-amber-50 px-md py-xs text-body-compact font-semibold text-amber-900 disabled:opacity-60"
                    >
                      Yêu cầu bổ sung
                    </button>
                    <button
                      type="button"
                      disabled={pendingId === app.userId}
                      onClick={() =>
                        setRejectingId(rejectingId === app.userId ? null : app.userId)
                      }
                      className="inline-flex min-h-9 items-center justify-center rounded-full border border-rose-200/80 bg-rose-50/70 px-4 py-2 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100 disabled:opacity-50 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleDocs(app.userId)}
                      className="inline-flex min-h-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                    >
                      {openDocsId === app.userId ? 'Ẩn giấy tờ' : 'Xem giấy tờ'}
                    </button>
                  </div>
                </div>

                {openDocsId === app.userId ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    {docsByUser[app.userId] === 'loading' ? (
                      <p className="text-body-compact text-neutral-muted">Đang tải giấy tờ…</p>
                    ) : (docsByUser[app.userId] as DriverDocument[] | undefined)?.length ? (
                      <ul className="flex flex-wrap gap-4">
                        {(docsByUser[app.userId] as DriverDocument[]).map((doc) => (
                          <li key={doc.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-3.5 shadow-2xs backdrop-blur-xs hover:shadow-xs transition-all">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                              {DOCUMENT_LABELS[doc.type] ?? doc.type}
                            </span>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="group rounded-xl overflow-hidden border border-slate-100 shadow-2xs">
                              <img
                                alt={DOCUMENT_LABELS[doc.type] ?? doc.type}
                                src={doc.url}
                                className="h-32 w-32 rounded-xl object-cover group-hover:scale-[1.03] transition-transform"
                              />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-body-compact text-neutral-muted">
                        Tài xế chưa tải giấy tờ nào.
                      </p>
                    )}
                  </div>
                ) : null}

                {rejectingId === app.userId ? (
                  <div className="mt-4 flex flex-col gap-2.5 border-t border-slate-100 pt-4 rounded-2xl">
                    <label className="text-xs font-bold text-slate-700" htmlFor={`reason-${app.userId}`}>
                      Lý do từ chối
                    </label>
                    <textarea
                      id={`reason-${app.userId}`}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="VD: Ảnh GPLX mờ, vui lòng chụp lại rõ nét"
                      rows={2}
                      className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-800 shadow-2xs transition-all focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pendingId === app.userId}
                        onClick={() => void submitReject(app.userId)}
                        className="inline-flex min-h-9 items-center justify-center rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                      >
                        Xác nhận từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        className="inline-flex min-h-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : null}

                {requestingChangesId === app.userId ? (
                  <div className="mt-sm flex flex-col gap-xs rounded-card border border-amber-300 bg-amber-50/50 p-sm">
                    <label className="text-body-compact font-semibold text-amber-900" htmlFor={`changes-reason-${app.userId}`}>
                      Yêu cầu bổ sung tài liệu (ACTION_REQUIRED)
                    </label>
                    <div className="flex flex-wrap gap-xs">
                      {[
                        { code: 'BLURRY_IMAGE', label: 'Ảnh bị mờ / chói sáng' },
                        { code: 'EXPIRED_DOCUMENT', label: 'Giấy tờ đã hết hạn' },
                        { code: 'CLASS_MISMATCH', label: 'Hạng GPLX không khớp xe' },
                        { code: 'NAME_MISMATCH', label: 'Họ tên không khớp' },
                        { code: 'PLATE_MISMATCH', label: 'Biển số không khớp' },
                      ].map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => setChangeReasonCode(item.code)}
                          className={`rounded-pill border px-sm py-xxs text-xs font-semibold ${
                            changeReasonCode === item.code
                              ? 'border-amber-700 bg-amber-700 text-white'
                              : 'border-amber-300 bg-white text-amber-900'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      id={`changes-reason-${app.userId}`}
                      value={changeReasonNote}
                      onChange={(e) => setChangeReasonNote(e.target.value)}
                      placeholder="VD: Vui lòng chụp lại mặt trước GPLX rõ nét, không bị chói ở vùng số bằng lái."
                      rows={2}
                      className="rounded-control border border-neutral-border bg-white px-sm py-xs text-body-compact"
                    />
                    <div className="flex gap-xs">
                      <button
                        type="button"
                        disabled={pendingId === app.userId}
                        onClick={() => void submitRequestChanges(app.userId)}
                        className="rounded-control bg-amber-700 px-md py-xs text-body-compact font-semibold text-white disabled:opacity-60"
                      >
                        Gửi yêu cầu bổ sung
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRequestingChangesId(null);
                          setChangeReasonNote('');
                        }}
                        className="rounded-control border border-neutral-border bg-white px-md py-xs text-body-compact"
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
