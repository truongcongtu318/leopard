'use client';

import { useId, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  DollarSign,
  Edit3,
  HelpCircle,
  History,
  Info,
  Layers,
  RotateCcw,
  Save,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Truck,
  X,
} from 'lucide-react';

import { OperationsPageHeader } from '@leopard/ui';

import { browserClient } from '../../lib/api/browser-client';
import { ApiError } from '../../lib/api/api-error';
import type {
  AdminPricingRouteView,
  AdminVehiclePricingRateView,
  AdminPreviewContext,
} from './model';
import {
  AdminBoundaryState,
  AdminBreadcrumbs,
  AdminNotice,
  AdminSurface,
} from './AdminShared';

interface PriceDiffItem {
  vehicleType: string;
  vehicleTypeLabel: string;
  oldBase: number;
  newBase: number;
  diffBasePct: number;
  oldPerKm: number;
  newPerKm: number;
  diffPerKmPct: number;
  oldLoading: number;
  newLoading: number;
  diffLoadingPct: number;
}

export function AdminPricingScreen({
  view,
  previewContext,
  commandRuntime,
}: Readonly<{
  view: AdminPricingRouteView;
  previewContext?: AdminPreviewContext | undefined;
  commandRuntime?: boolean | undefined;
}>) {
  const reasonInputId = useId();

  if (view.kind !== 'pricing') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Cấu Hình Cước Phí Vận Hành" />
        <AdminBoundaryState view={view} />
      </div>
    );
  }

  // Active pricing config
  const [rates, setRates] = useState<readonly AdminVehiclePricingRateView[]>(view.vehicleRates);
  const [minFare, setMinFare] = useState<number>(view.minimumFareVnd);
  const [stopFee, setStopFee] = useState<number>(view.stopSurchargeVnd);
  const [updatedAtLabel, setUpdatedAtLabel] = useState<string>(view.updatedAtLabel);
  const [updatedByName, setUpdatedByName] = useState<string>(view.updatedByName);

  // Draft editable state
  const [isEditing, setIsEditing] = useState(false);
  const [draftRates, setDraftRates] = useState<Record<string, { baseFare: number; perKm: number; loadingFee: number }>>(() => {
    const initial: Record<string, { baseFare: number; perKm: number; loadingFee: number }> = {};
    for (const r of view.vehicleRates) {
      initial[r.vehicleType] = {
        baseFare: r.baseFareVnd,
        perKm: r.perKmVnd,
        loadingFee: r.loadingFeeVnd,
      };
    }
    return initial;
  });
  const [draftMinFare, setDraftMinFare] = useState<number>(view.minimumFareVnd);
  const [draftStopFee, setDraftStopFee] = useState<number>(view.stopSurchargeVnd);

  // Preview differences stage state
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [updateReason, setUpdateReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Calculate price differences
  const diffs = useMemo<PriceDiffItem[]>(() => {
    return rates.map((r) => {
      const draft = draftRates[r.vehicleType] ?? {
        baseFare: r.baseFareVnd,
        perKm: r.perKmVnd,
        loadingFee: r.loadingFeeVnd,
      };
      const diffBasePct = r.baseFareVnd > 0 ? ((draft.baseFare - r.baseFareVnd) / r.baseFareVnd) * 100 : 0;
      const diffPerKmPct = r.perKmVnd > 0 ? ((draft.perKm - r.perKmVnd) / r.perKmVnd) * 100 : 0;
      const diffLoadingPct = r.loadingFeeVnd > 0 ? ((draft.loadingFee - r.loadingFeeVnd) / r.loadingFeeVnd) * 100 : 0;

      return {
        vehicleType: r.vehicleType,
        vehicleTypeLabel: r.vehicleTypeLabel,
        oldBase: r.baseFareVnd,
        newBase: draft.baseFare,
        diffBasePct,
        oldPerKm: r.perKmVnd,
        newPerKm: draft.perKm,
        diffPerKmPct,
        oldLoading: r.loadingFeeVnd,
        newLoading: draft.loadingFee,
        diffLoadingPct,
      };
    });
  }, [rates, draftRates]);

  const hasAnyChanges = useMemo(() => {
    if (draftMinFare !== minFare || draftStopFee !== stopFee) return true;
    for (const d of diffs) {
      if (d.oldBase !== d.newBase || d.oldPerKm !== d.newPerKm || d.oldLoading !== d.newLoading) {
        return true;
      }
    }
    return false;
  }, [draftMinFare, minFare, draftStopFee, stopFee, diffs]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setActionError(null);
  };

  const handleCancelEdit = () => {
    // Reset draft to current values
    const initial: Record<string, { baseFare: number; perKm: number; loadingFee: number }> = {};
    for (const r of rates) {
      initial[r.vehicleType] = {
        baseFare: r.baseFareVnd,
        perKm: r.perKmVnd,
        loadingFee: r.loadingFeeVnd,
      };
    }
    setDraftRates(initial);
    setDraftMinFare(minFare);
    setDraftStopFee(stopFee);
    setIsEditing(false);
  };

  const handleOpenPreviewDiffs = () => {
    // Validate values
    if (draftMinFare < 1000 || draftStopFee < 0) {
      setActionError('Cước tối thiểu và phụ phí điểm dừng phải lớn hơn hoặc bằng 0.');
      return;
    }
    for (const [vType, val] of Object.entries(draftRates)) {
      if (val.baseFare < 1000 || val.perKm < 500 || val.loadingFee < 0) {
        setActionError(`Biểu phí xe ${vType} không hợp lệ. Vui lòng kiểm tra lại.`);
        return;
      }
    }
    setActionError(null);
    setShowDiffModal(true);
  };

  const handleConfirmPublish = async () => {
    if (!updateReason.trim() || updateReason.trim().length < 5) {
      setActionError('Lý do điều chỉnh giá là bắt buộc và phải có ít nhất 5 ký tự.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    const clientRequestId = `prc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const vehicleRatesPayload: Record<string, { baseFareVnd: number; perKmVnd: number; loadingFeeVnd: number }> = {};
    for (const [k, v] of Object.entries(draftRates)) {
      vehicleRatesPayload[k] = {
        baseFareVnd: v.baseFare,
        perKmVnd: v.perKm,
        loadingFeeVnd: v.loadingFee,
      };
    }

    if (commandRuntime) {
      try {
        await browserClient.put('/admin/pricing', {
          minimumFareVnd: draftMinFare,
          stopSurchargeVnd: draftStopFee,
          vehicleRates: vehicleRatesPayload,
          reason: updateReason.trim(),
          clientRequestId,
        });

        // Update local active state
        const updatedRatesList: AdminVehiclePricingRateView[] = rates.map((r) => {
          const draft = draftRates[r.vehicleType];
          return {
            ...r,
            baseFareVnd: draft ? draft.baseFare : r.baseFareVnd,
            perKmVnd: draft ? draft.perKm : r.perKmVnd,
            loadingFeeVnd: draft ? draft.loadingFee : r.loadingFeeVnd,
          };
        });

        setRates(updatedRatesList);
        setMinFare(draftMinFare);
        setStopFee(draftStopFee);
        setUpdatedAtLabel('Vừa cập nhật');
        setUpdatedByName('Bạn (Admin)');
        setIsEditing(false);
        setShowDiffModal(false);
        setUpdateReason('');
        setActionSuccess(
          `Cập nhật biểu phí cước vận hành thành công. Mã kiểm toán: ${clientRequestId}`,
        );
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : 'Không thể cập nhật biểu phí.';
        setActionError(message);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Preview mode simulation
      const updatedRatesList: AdminVehiclePricingRateView[] = rates.map((r) => {
        const draft = draftRates[r.vehicleType];
        return {
          ...r,
          baseFareVnd: draft ? draft.baseFare : r.baseFareVnd,
          perKmVnd: draft ? draft.perKm : r.perKmVnd,
          loadingFeeVnd: draft ? draft.loadingFee : r.loadingFeeVnd,
        };
      });

      setRates(updatedRatesList);
      setMinFare(draftMinFare);
      setStopFee(draftStopFee);
      setUpdatedAtLabel('Vừa cập nhật');
      setUpdatedByName('Quản trị viên (Mô phỏng)');
      setIsEditing(false);
      setShowDiffModal(false);
      setUpdateReason('');
      setActionSuccess('[Mô phỏng] Đã lưu và áp dụng biểu phí cước vận hành mới vào hệ thống.');
      setIsSubmitting(false);
    }
  };

  const renderPctBadge = (pct: number) => {
    if (pct === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
          Không đổi
        </span>
      );
    }
    if (pct > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <TrendingUp className="h-3 w-3" />+{pct.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <TrendingDown className="h-3 w-3" />
        {pct.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs & Header */}
      <div>
        <AdminBreadcrumbs previewContext={previewContext} screen="pricing" />
        <OperationsPageHeader
          title="Cấu Hình Cước Phí Vận Hành"
          context="Quản lý đơn giá cơ sở, cước theo khoảng cách và phụ phí theo từng loại phương tiện vận chuyển"
        />
      </div>

      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {/* Success / Error Alerts */}
      {actionSuccess ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4 text-sm text-emerald-800 shadow-xs"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1 font-medium">{actionSuccess}</div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900"
            aria-label="Đóng thông báo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/90 p-4 text-sm text-rose-800 shadow-xs"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 font-medium">{actionError}</div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-900"
            aria-label="Đóng thông báo lỗi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Top Banner: Status & Edit CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-black/[0.06] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Biểu Phí Đang Áp Dụng</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Đang hiệu lực
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật lần cuối: <strong>{updatedAtLabel}</strong> bởi{' '}
              <strong>{updatedByName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleOpenPreviewDiffs}
                disabled={!hasAnyChanges}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <Calculator className="h-3.5 w-3.5" />
                Xem trước chênh lệch & Ban hành
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Điều chỉnh biểu phí
            </button>
          )}
        </div>
      </div>

      {/* General Surcharges Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cước Tối Thiểu / Chuyến</span>
            <Calculator className="h-4 w-4 text-brand" />
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                step="1000"
                min="1000"
                value={draftMinFare}
                onChange={(e) => setDraftMinFare(Number(e.target.value))}
                className="w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-lg font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <span className="text-xs font-bold text-slate-500">VNĐ</span>
            </div>
          ) : (
            <div className="text-2xl font-black text-slate-900 mt-1">
              {minFare.toLocaleString('vi-VN')} <span className="text-sm font-bold text-slate-500">VNĐ</span>
            </div>
          )}
          <div className="text-xs text-slate-500 mt-1.5">
            Áp dụng cho mọi đơn hàng bất kể quãng đường di chuyển ngắn
          </div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Phụ Phí Thêm Điểm Dừng</span>
            <Layers className="h-4 w-4 text-indigo-600" />
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                step="500"
                min="0"
                value={draftStopFee}
                onChange={(e) => setDraftStopFee(Number(e.target.value))}
                className="w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-lg font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <span className="text-xs font-bold text-slate-500">VNĐ</span>
            </div>
          ) : (
            <div className="text-2xl font-black text-slate-900 mt-1">
              {stopFee.toLocaleString('vi-VN')} <span className="text-sm font-bold text-slate-500">VNĐ</span>
            </div>
          )}
          <div className="text-xs text-slate-500 mt-1.5">
            Tính thêm cho mỗi điểm giao trả hàng phụ trên cùng lộ trình
          </div>
        </div>
      </div>

      {/* Vehicle Rates Bento Table */}
      <AdminSurface
        title="Biểu Phí Theo Loại Phương Tiện"
        description="Chi tiết giá mở cửa (Base Fare), đơn giá mỗi km và phụ phí bốc xếp"
        icon={<Truck className="h-5 w-5 text-slate-800" />}
      >
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Loại phương tiện</th>
                <th className="py-3.5 px-4">Giá mở cửa (Base Fare)</th>
                <th className="py-3.5 px-4">Đơn giá / km (Per Km)</th>
                <th className="py-3.5 px-4">Phí bốc xếp hàng</th>
                {isEditing ? <th className="py-3.5 px-4 text-center">Trạng thái thay đổi</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rates.map((r) => {
                const draft = draftRates[r.vehicleType] ?? {
                  baseFare: r.baseFareVnd,
                  perKm: r.perKmVnd,
                  loadingFee: r.loadingFeeVnd,
                };
                const hasItemChanged =
                  draft.baseFare !== r.baseFareVnd ||
                  draft.perKm !== r.perKmVnd ||
                  draft.loadingFee !== r.loadingFeeVnd;

                return (
                  <tr key={r.vehicleType} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-sm">{r.vehicleTypeLabel}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{r.vehicleType}</div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="1000"
                            min="1000"
                            value={draft.baseFare}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setDraftRates((prev) => ({
                                ...prev,
                                [r.vehicleType]: {
                                  baseFare: val,
                                  perKm: prev[r.vehicleType]?.perKm ?? r.perKmVnd,
                                  loadingFee: prev[r.vehicleType]?.loadingFee ?? r.loadingFeeVnd,
                                },
                              }));
                            }}
                            className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                          />
                          <span className="text-slate-400 text-[11px]">đ</span>
                        </div>
                      ) : (
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {r.baseFareVnd.toLocaleString('vi-VN')} đ
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="500"
                            min="500"
                            value={draft.perKm}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setDraftRates((prev) => ({
                                ...prev,
                                [r.vehicleType]: {
                                  baseFare: prev[r.vehicleType]?.baseFare ?? r.baseFareVnd,
                                  perKm: val,
                                  loadingFee: prev[r.vehicleType]?.loadingFee ?? r.loadingFeeVnd,
                                },
                              }));
                            }}
                            className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                          />
                          <span className="text-slate-400 text-[11px]">đ/km</span>
                        </div>
                      ) : (
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {r.perKmVnd.toLocaleString('vi-VN')} đ/km
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="5000"
                            min="0"
                            value={draft.loadingFee}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setDraftRates((prev) => ({
                                ...prev,
                                [r.vehicleType]: {
                                  baseFare: prev[r.vehicleType]?.baseFare ?? r.baseFareVnd,
                                  perKm: prev[r.vehicleType]?.perKm ?? r.perKmVnd,
                                  loadingFee: val,
                                },
                              }));
                            }}
                            className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                          />
                          <span className="text-slate-400 text-[11px]">đ</span>
                        </div>
                      ) : (
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {r.loadingFeeVnd > 0 ? `${r.loadingFeeVnd.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                        </div>
                      )}
                    </td>

                    {isEditing ? (
                      <td className="py-4 px-4 whitespace-nowrap text-center">
                        {hasItemChanged ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Đã sửa
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">Chưa đổi</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 p-4 text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Quy tắc nghiệp vụ cốt lõi:</strong> Khi ban hành biểu phí mới, chỉ những đơn hàng
            khởi tạo sau thời điểm lưu mới được tính giá mới. Tất cả các đơn hàng đang giao nhận hoặc
            đã được khách hàng thanh toán trước đó vẫn giữ nguyên cước phí ban đầu.
          </div>
        </div>
      </AdminSurface>

      {/* Mandatory Preview Differences Modal */}
      {showDiffModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pricing-diff-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="pricing-diff-modal-title" className="text-base font-bold text-slate-900">
                    Bản Xem Trước Chênh Lệch Biểu Phí
                  </h3>
                  <p className="text-xs text-slate-500">
                    So sánh mức giá cũ và mới trước khi ghi nhận vào hệ thống
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDiffModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
                aria-label="Đóng modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* General Fare Diffs */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
              <div>
                <span className="text-slate-500 block mb-1">Cước tối thiểu:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-500 line-through">
                    {minFare.toLocaleString('vi-VN')} đ
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  <span className="font-mono font-bold text-slate-900">
                    {draftMinFare.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Phụ phí thêm điểm dừng:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-500 line-through">
                    {stopFee.toLocaleString('vi-VN')} đ
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  <span className="font-mono font-bold text-slate-900">
                    {draftStopFee.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Differences Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Loại xe</th>
                    <th className="py-2.5 px-3">Giá mở cửa (Base)</th>
                    <th className="py-2.5 px-3">Đơn giá / km</th>
                    <th className="py-2.5 px-3">Phí bốc xếp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {diffs.map((d) => (
                    <tr key={d.vehicleType}>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{d.vehicleTypeLabel}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span>{d.oldBase.toLocaleString('vi-VN')}</span>
                          <span className="text-slate-400">→</span>
                          <strong className="text-slate-900">{d.newBase.toLocaleString('vi-VN')}</strong>
                        </div>
                        <div className="mt-0.5">{renderPctBadge(d.diffBasePct)}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span>{d.oldPerKm.toLocaleString('vi-VN')}</span>
                          <span className="text-slate-400">→</span>
                          <strong className="text-slate-900">{d.newPerKm.toLocaleString('vi-VN')}</strong>
                        </div>
                        <div className="mt-0.5">{renderPctBadge(d.diffPerKmPct)}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span>{d.oldLoading.toLocaleString('vi-VN')}</span>
                          <span className="text-slate-400">→</span>
                          <strong className="text-slate-900">{d.newLoading.toLocaleString('vi-VN')}</strong>
                        </div>
                        <div className="mt-0.5">{renderPctBadge(d.diffLoadingPct)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mandatory Reason Input */}
            <div>
              <label
                htmlFor={reasonInputId}
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Lý do điều chỉnh cước phí <span className="text-rose-500">*</span>
              </label>
              <input
                id={reasonInputId}
                type="text"
                required
                maxLength={500}
                value={updateReason}
                onChange={(e) => setUpdateReason(e.target.value)}
                placeholder="Ví dụ: Điều chỉnh theo biến động giá xăng dầu quý 3/2026..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Bắt buộc nhập tối thiểu 5 ký tự để lưu vào Nhật Ký Kiểm Toán (`AuditLog`).
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDiffModal(false)}
                disabled={isSubmitting}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Quay lại chỉnh sửa
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={isSubmitting || updateReason.trim().length < 5}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <>Đang ban hành...</>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Xác nhận & Ban hành biểu phí
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
