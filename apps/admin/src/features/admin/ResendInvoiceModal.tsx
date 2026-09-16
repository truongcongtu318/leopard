'use client';

import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, FileText, Mail, Send, X } from 'lucide-react';
import { browserClient } from '../../lib/api/browser-client';
import { ApiError } from '../../lib/api/api-error';
import type { AdminInvoiceListItemView } from './model';

export interface ResendInvoiceModalProps {
  invoice: AdminInvoiceListItemView | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  commandRuntime?: boolean | undefined;
}

export function ResendInvoiceModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
  commandRuntime,
}: ResendInvoiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const handleConfirm = async () => {
    if (!invoice.customerEmail) {
      setErrorMsg('Hóa đơn này không có địa chỉ email nhận.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    if (commandRuntime) {
      try {
        await browserClient.post(`/invoices/${invoice.id}/send`, {
          email: invoice.customerEmail,
        });
        onSuccess(`Đã gửi lại email hóa đơn ${invoice.invoiceNumber} thành công tới ${invoice.customerEmail}.`);
        onClose();
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Không thể gửi lại email hóa đơn.';
        setErrorMsg(msg);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(`Đã gửi lại email hóa đơn ${invoice.invoiceNumber} thành công tới ${invoice.customerEmail} (Mô phỏng).`);
        onClose();
      }, 400);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resend-invoice-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-black/[0.06] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <Mail className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 id="resend-invoice-title" className="text-base font-bold text-slate-900">
                Gửi Lại Email Hóa Đơn VAT
              </h2>
              <p className="text-xs text-slate-500">Phát hành lại thông báo hóa đơn điện tử cho khách hàng</p>
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

        {/* Invoice Context Card */}
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Số hóa đơn:</span>
            <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Mã đơn hàng:</span>
            <span className="font-mono font-bold text-brand">{invoice.orderCode}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Khách hàng nhận:</span>
            <span className="font-bold text-slate-900">{invoice.customerName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Email đích:</span>
            <span className="font-mono font-semibold text-indigo-700">{invoice.customerEmail}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
            <span className="text-slate-500">Tổng tiền thanh toán:</span>
            <span className="font-mono font-black text-slate-900 text-sm">{invoice.totalLabel}</span>
          </div>
        </div>

        {/* Risk / Notice Warning */}
        <div className="mt-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Hệ thống sẽ tái tạo đường dẫn tải chứng từ PDF có chữ ký số tạm thời và gửi email thông báo
            trực tiếp tới hòm thư của khách hàng.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-xs"
          >
            {isSubmitting ? (
              'Đang gửi email...'
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Xác nhận gửi email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
