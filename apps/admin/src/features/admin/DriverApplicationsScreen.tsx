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

  return (
    <div className="flex min-w-0 flex-col gap-lg">
      <header>
        <h1 className="text-page-title font-semibold">Duyệt tài xế</h1>
        <p className="mt-xxs text-body-compact text-neutral-muted">
          Hồ sơ tài xế đang chờ duyệt. Duyệt để kích hoạt nhận đơn, hoặc từ chối kèm lý do.
        </p>
      </header>

      {errorMsg ? (
        <p
          role="alert"
          className="rounded-control border border-neutral-border bg-neutral-surface px-sm py-xs text-body-compact text-neutral-text"
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
            className="rounded-control border border-neutral-border px-sm py-xs text-body-compact font-semibold"
          >
            Thử lại
          </button>
        ) : applications.length === 0 ? (
          <p className="text-body-compact text-neutral-muted">
            Không có hồ sơ nào đang chờ duyệt.
          </p>
        ) : (
          <ul className="flex flex-col gap-sm">
            {applications.map((app) => (
              <li
                key={app.userId}
                className="rounded-card border border-neutral-border bg-neutral p-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-sm">
                  <dl className="grid grid-cols-2 gap-x-lg gap-y-xxs text-body-compact">
                    <dt className="text-neutral-muted">Tên tài xế</dt>
                    <dd className="font-semibold">{app.name ?? '—'}</dd>
                    <dt className="text-neutral-muted">Số điện thoại</dt>
                    <dd className="font-semibold tabular-nums">{app.phone ?? '—'}</dd>
                    <dt className="text-neutral-muted">Loại xe</dt>
                    <dd className="font-semibold">
                      {app.vehicleType ? (VEHICLE_LABELS[app.vehicleType] ?? app.vehicleType) : '—'}
                    </dd>
                    <dt className="text-neutral-muted">Biển số</dt>
                    <dd className="font-semibold">{app.licensePlate ?? '—'}</dd>
                    <dt className="text-neutral-muted">GPLX</dt>
                    <dd className="font-semibold">{app.licenseNumber ?? '—'}</dd>
                    <dt className="text-neutral-muted">Nộp lúc</dt>
                    <dd className="tabular-nums">{formatDate(app.submittedAt)}</dd>
                  </dl>

                  <div className="flex flex-col gap-xs">
                    <button
                      type="button"
                      disabled={pendingId === app.userId}
                      onClick={() => void approve(app.userId)}
                      className="rounded-control bg-brand px-md py-xs text-body-compact font-semibold text-white disabled:opacity-60"
                    >
                      {pendingId === app.userId ? 'Đang xử lý…' : 'Duyệt'}
                    </button>
                    <button
                      type="button"
                      disabled={pendingId === app.userId}
                      onClick={() =>
                        setRejectingId(rejectingId === app.userId ? null : app.userId)
                      }
                      className="rounded-control border border-neutral-border px-md py-xs text-body-compact font-semibold disabled:opacity-60"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleDocs(app.userId)}
                      className="rounded-control border border-neutral-border px-md py-xs text-body-compact font-semibold"
                    >
                      {openDocsId === app.userId ? 'Ẩn giấy tờ' : 'Xem giấy tờ'}
                    </button>
                  </div>
                </div>

                {openDocsId === app.userId ? (
                  <div className="mt-sm border-t border-neutral-border pt-sm">
                    {docsByUser[app.userId] === 'loading' ? (
                      <p className="text-body-compact text-neutral-muted">Đang tải giấy tờ…</p>
                    ) : (docsByUser[app.userId] as DriverDocument[] | undefined)?.length ? (
                      <ul className="flex flex-wrap gap-md">
                        {(docsByUser[app.userId] as DriverDocument[]).map((doc) => (
                          <li key={doc.id} className="flex flex-col gap-xxs">
                            <span className="text-xs font-semibold text-neutral-muted">
                              {DOCUMENT_LABELS[doc.type] ?? doc.type}
                            </span>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <img
                                alt={DOCUMENT_LABELS[doc.type] ?? doc.type}
                                src={doc.url}
                                className="h-32 w-32 rounded-card border border-neutral-border object-cover"
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
                  <div className="mt-sm flex flex-col gap-xs border-t border-neutral-border pt-sm">
                    <label className="text-body-compact font-semibold" htmlFor={`reason-${app.userId}`}>
                      Lý do từ chối
                    </label>
                    <textarea
                      id={`reason-${app.userId}`}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="VD: Ảnh GPLX mờ, vui lòng chụp lại rõ nét"
                      rows={2}
                      className="rounded-control border border-neutral-border px-sm py-xs text-body-compact"
                    />
                    <div className="flex gap-xs">
                      <button
                        type="button"
                        disabled={pendingId === app.userId}
                        onClick={() => void submitReject(app.userId)}
                        className="rounded-control bg-neutral-text px-md py-xs text-body-compact font-semibold text-white disabled:opacity-60"
                      >
                        Xác nhận từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason('');
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
