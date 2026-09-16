'use client';

import { useState } from 'react';
import { Check, Copy, History, Shield, Terminal, X } from 'lucide-react';
import type { AdminAuditEntryView } from './model';

export interface AuditDetailModalProps {
  entry: AdminAuditEntryView | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditDetailModal({
  entry,
  isOpen,
  onClose,
}: AuditDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !entry) return null;

  const metadataJson = entry.metadata ? JSON.stringify(entry.metadata, null, 2) : null;

  const handleCopy = async () => {
    if (!metadataJson) return;
    try {
      await navigator.clipboard.writeText(metadataJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs">
              <History className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="audit-modal-title" className="text-base font-bold text-slate-900">
                Chi tiết nhật ký kiểm toán
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                ID: {entry.id || entry.auditId || '—'} • {entry.timestampLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Đóng cửa sổ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Người thực hiện
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {entry.actorName || entry.actorLabel || 'Hệ thống'}
              </p>
              <p className="text-xs font-mono text-slate-500">
                {entry.actorRole || 'SYSTEM'} {entry.actorId ? `• ${entry.actorId}` : ''}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Hành động & Kết quả
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-200/70 text-slate-800 font-mono">
                  {entry.actionLabel || entry.action}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  {entry.outcomeLabel || 'Thành công'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Tài nguyên mục tiêu
              </span>
              <p className="mt-1 text-xs font-semibold text-slate-800">
                {entry.resourceType || '—'}
              </p>
              <p className="text-xs font-mono text-slate-500 truncate" title={entry.resourceId || entry.targetLabel}>
                {entry.resourceId || entry.targetLabel || '—'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Mã yêu cầu (Request ID)
              </span>
              <p className="mt-1 text-xs font-mono text-slate-600 break-all">
                {entry.requestId || '—'}
              </p>
            </div>
          </div>

          {/* Reason if present */}
          {entry.reason ? (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Lý do / Diễn giải
              </span>
              <p className="mt-1 text-xs text-amber-950 font-medium leading-relaxed">
                {entry.reason}
              </p>
            </div>
          ) : null}

          {/* Metadata JSON */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Terminal className="h-4 w-4 text-slate-500" />
                <span>Dữ liệu chi tiết (Metadata Payload)</span>
              </div>
              {metadataJson ? (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Sao chép JSON</span>
                    </>
                  )}
                </button>
              ) : null}
            </div>

            {metadataJson ? (
              <pre className="max-h-60 overflow-y-auto p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800 selection:bg-slate-800">
                <code>{metadataJson}</code>
              </pre>
            ) : (
              <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-400">
                Không có trường metadata bổ sung nào cho sự kiện này.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-100 shadow-2xs transition-all active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
