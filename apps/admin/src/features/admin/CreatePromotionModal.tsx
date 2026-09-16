'use client';

import { useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, DollarSign, Percent, Tag, TicketPercent, X } from 'lucide-react';
import { browserClient } from '../../lib/api/browser-client';
import { ApiError } from '../../lib/api/api-error';

export interface CreatePromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  commandRuntime?: boolean | undefined;
}

export function CreatePromotionModal({
  isOpen,
  onClose,
  onSuccess,
  commandRuntime,
}: CreatePromotionModalProps) {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<string>('15');
  const [maxDiscountVnd, setMaxDiscountVnd] = useState<string>('50000');
  const [minOrderAmountVnd, setMinOrderAmountVnd] = useState<string>('100000');
  const [usageLimit, setUsageLimit] = useState<string>('500');
  const [expiresAt, setExpiresAt] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const normCode = code.trim().toUpperCase();
    if (normCode.length < 3 || normCode.length > 30) {
      setErrorMsg('Mã khuyến mãi phải từ 3 đến 30 ký tự.');
      return;
    }
    if (!/^[A-Z0-9_-]+$/.test(normCode)) {
      setErrorMsg('Mã voucher chỉ được chứa chữ cái in hoa, số, dấu gạch ngang (-) hoặc gạch dưới (_).');
      return;
    }

    const normTitle = title.trim();
    if (normTitle.length < 3 || normTitle.length > 100) {
      setErrorMsg('Tiêu đề voucher phải từ 3 đến 100 ký tự.');
      return;
    }

    const valNum = Number(discountValue);
    if (isNaN(valNum) || valNum <= 0) {
      setErrorMsg('Giá trị giảm giá phải lớn hơn 0.');
      return;
    }
    if (discountType === 'PERCENT' && valNum > 100) {
      setErrorMsg('Mức giảm theo phần trăm không được vượt quá 100%.');
      return;
    }

    const minOrderNum = Number(minOrderAmountVnd) || 0;
    const maxDiscountNum = maxDiscountVnd ? Number(maxDiscountVnd) : undefined;
    const usageLimitNum = usageLimit ? Number(usageLimit) : undefined;

    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (isNaN(expDate.getTime()) || expDate <= new Date()) {
        setErrorMsg('Ngày hết hạn phải ở trong tương lai.');
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      code: normCode,
      title: normTitle,
      description: description.trim() || undefined,
      discountType,
      discountValue: valNum,
      maxDiscountVnd: discountType === 'PERCENT' ? maxDiscountNum : undefined,
      minOrderAmountVnd: minOrderNum,
      usageLimit: usageLimitNum,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    };

    if (commandRuntime) {
      try {
        await browserClient.post('/admin/promotions', payload);
        onSuccess(`Đã tạo thành công mã khuyến mãi "${normCode}".`);
        onClose();
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Không thể tạo mã khuyến mãi.';
        setErrorMsg(msg);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Preview / simulated mode
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(`Đã tạo thành công mã khuyến mãi "${normCode}" (Dữ liệu mô phỏng).`);
        onClose();
      }, 400);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-promo-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-black/[0.06] overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
              <TicketPercent className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 id="create-promo-title" className="text-base font-bold text-slate-900">
                Tạo Mã Khuyến Mãi Mới
              </h2>
              <p className="text-xs text-slate-500">Thiết lập voucher ưu đãi cước vận chuyển cho khách hàng</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Đóng modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg ? (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/90 p-3 text-xs font-semibold text-rose-800"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Code & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mã voucher <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={30}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: FREESHIP"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tiêu đề chương trình <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Giảm 20% đơn vận chuyển nội thành"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mô tả chi tiết điều kiện áp dụng
            </label>
            <textarea
              rows={2}
              maxLength={250}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập điều kiện áp dụng, khu vực hoặc nhóm khách hàng..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Loại giảm giá <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountType('PERCENT')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-2xl border font-bold transition-all ${
                    discountType === 'PERCENT'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Percent className="h-3.5 w-3.5" /> Theo %
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('FIXED')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-2xl border font-bold transition-all ${
                    discountType === 'FIXED'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5" /> Số tiền cố định
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Giá trị giảm <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={discountType === 'PERCENT' ? '100' : '10000000'}
                  required
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  {discountType === 'PERCENT' ? '%' : '₫'}
                </span>
              </div>
            </div>
          </div>

          {/* Limits: Max Discount, Min Order, Usage Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {discountType === 'PERCENT' ? (
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Giảm tối đa (₫)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={maxDiscountVnd}
                  onChange={(e) => setMaxDiscountVnd(e.target.value)}
                  placeholder="Để trống = không giới hạn"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            ) : null}

            <div className={discountType === 'FIXED' ? 'sm:col-span-2' : ''}>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Đơn tối thiểu (₫)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={minOrderAmountVnd}
                onChange={(e) => setMinOrderAmountVnd(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Giới hạn lượt dùng
              </label>
              <input
                type="number"
                min="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="VD: 500"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Expires At */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Thời hạn kết thúc chương trình
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-xs"
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo khuyến mãi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
