'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Send,
  User,
  Truck,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { OperationsPageHeader } from '@leopard/ui';
import type {
  AdminPreviewContext,
  AdminSupportConversationView,
  AdminSupportMessageView,
  AdminSupportRouteView,
} from './model';
import {
  AdminBoundaryState,
  AdminBreadcrumbs,
  AdminNotice,
  AdminSurface,
} from './AdminShared';

type AdminSupportScreenProps = Readonly<{
  view: AdminSupportRouteView;
  previewContext?: AdminPreviewContext;
}>;

const QUICK_RESPONSES = [
  'Dạ chào anh/chị, tổng đài LEOPARD đã tiếp nhận và đang hỗ trợ kiểm tra đơn hàng ngay.',
  'Tài xế đang di chuyển tới điểm giao, dự kiến sẽ có mặt đúng theo thời gian hiển thị trên ứng dụng.',
  'Đơn hàng đã được bộ phận điều phối xác nhận xử lý thành công. Cảm ơn anh/chị!',
] as const;

export function AdminSupportScreen({ view, previewContext }: AdminSupportScreenProps) {
  const searchInputId = useId();
  const replyInputId = useId();

  if (view.kind !== 'support') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Trung Tâm Hỗ Trợ Khách Hàng" />
        <AdminBoundaryState view={view} />
      </div>
    );
  }

  const [conversations] = useState<readonly AdminSupportConversationView[]>(view.conversations);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    view.selectedOrderId ?? conversations[0]?.orderId ?? null,
  );
  const [messages, setMessages] = useState<readonly AdminSupportMessageView[]>(view.activeMessages);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WAITING_REPLY' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const selectedConv = conversations.find((c) => c.orderId === selectedOrderId) ?? null;

  const filteredConversations = conversations.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = c.orderCode.toLowerCase().includes(q);
      const matchCustomer = c.customerName.toLowerCase().includes(q);
      const matchDriver = (c.driverName ?? '').toLowerCase().includes(q);
      const matchPhone = c.customerPhone.toLowerCase().includes(q);
      if (!matchCode && !matchCustomer && !matchDriver && !matchPhone) return false;
    }
    return true;
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed || !selectedConv) return;

    const newMsg: AdminSupportMessageView = {
      id: `msg-reply-${Date.now()}`,
      orderId: selectedConv.orderId,
      senderId: 'admin-current',
      senderName: 'Ban Quản Trị LEOPARD',
      senderRole: 'ADMIN',
      body: trimmed,
      createdAtLabel: 'Vừa xong',
      isFromMe: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setReplyText('');
    setSendSuccess('Đã gửi phản hồi hỗ trợ tới người dùng thành công.');
  };

  const handleApplyQuickResponse = (text: string) => {
    setReplyText(text);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs & Header */}
      <div>
        <AdminBreadcrumbs previewContext={previewContext} screen="support" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div>
            <OperationsPageHeader
              title="Trung Tâm Hỗ Trợ & CSKH Trực Tuyến"
              context="Giám sát kênh giao tiếp hỗ trợ, giải đáp phản hồi giữa khách hàng, tài xế và ban điều hành"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Tổng đài trực tuyến
            </span>
          </div>
        </div>
      </div>

      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {sendSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-medium text-emerald-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{sendSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSendSuccess(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Đóng
          </button>
        </div>
      ) : null}

      {/* 4 Bento KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Hội Thoại Đang Mở</span>
            <MessageSquare className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{view.metrics.totalActiveChats}</div>
          <div className="text-xs text-slate-500 mt-1">Cuộc trò chuyện đang diễn ra</div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cần Phản Hồi Gấp</span>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{view.metrics.waitingReplyCount}</div>
          <div className="text-xs text-slate-500 mt-1">Yêu cầu phản hồi từ khách</div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Thời Gian Phản Hồi TB</span>
            <Clock className="h-4 w-4 text-brand" />
          </div>
          <div className="text-2xl font-black text-slate-900">~{view.metrics.avgResponseMinutes} phút</div>
          <div className="text-xs text-slate-500 mt-1">Tốc độ giải quyết thắc mắc</div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tỉ Lệ Hài Lòng CSAT</span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{view.metrics.satisfactionCsat}%</div>
          <div className="text-xs text-slate-500 mt-1">Đánh giá 5 sao từ người dùng</div>
        </div>
      </div>

      {/* Main Support Console: 2-Column Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Thread List & Search (4-5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs space-y-4">
            {/* Search & Filter Bar */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id={searchInputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm mã đơn, khách, tài xế..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'WAITING_REPLY', label: 'Chờ phản hồi' },
                  { key: 'ACTIVE', label: 'Đang trao đổi' },
                  { key: 'RESOLVED', label: 'Đã giải quyết' },
                ].map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setStatusFilter(st.key as any)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      statusFilter === st.key
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Threads List */}
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  Không tìm thấy cuộc hội thoại nào phù hợp.
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isSelected = c.orderId === selectedOrderId;
                  return (
                    <button
                      key={c.orderId}
                      type="button"
                      onClick={() => {
                        setSelectedOrderId(c.orderId);
                        setSendSuccess(null);
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all space-y-2 ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {c.orderCode}
                          </span>
                          <span
                            className={`text-[11px] font-medium ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {c.customerName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {c.status === 'WAITING_REPLY' ? (
                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                          ) : null}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              c.status === 'WAITING_REPLY'
                                ? isSelected
                                  ? 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                                : c.status === 'RESOLVED'
                                  ? isSelected
                                    ? 'bg-white/20 text-slate-200 border-white/20'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                  : isSelected
                                    ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/40'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {c.statusLabel}
                          </span>
                        </div>
                      </div>

                      <p
                        className={`text-xs line-clamp-2 leading-relaxed ${
                          isSelected ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {c.lastMessageSnippet}
                      </p>

                      <div
                        className={`flex items-center justify-between text-[11px] pt-1 border-t ${
                          isSelected
                            ? 'border-white/10 text-slate-400'
                            : 'border-slate-100 text-slate-400'
                        }`}
                      >
                        <span>{c.maskedPhone}</span>
                        <span>{c.lastMessageAtLabel}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Chat Workspace & Live Thread (7-8 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedConv ? (
            <div className="rounded-3xl border border-black/[0.06] bg-white p-5 sm:p-6 shadow-xs space-y-5">
              {/* Thread Context Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">{selectedConv.customerName}</h3>
                      <span className="text-xs font-mono text-slate-400 font-semibold">
                        {selectedConv.maskedPhone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>Đơn hàng:</span>
                      <Link
                        href={`/admin/orders/${selectedConv.orderId}`}
                        className="font-mono font-bold text-slate-900 hover:text-brand inline-flex items-center gap-1"
                      >
                        {selectedConv.orderCode} <ExternalLink className="h-3 w-3" />
                      </Link>
                      <span>·</span>
                      <span>{selectedConv.orderStatusLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                      selectedConv.status === 'WAITING_REPLY'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : selectedConv.status === 'RESOLVED'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {selectedConv.statusLabel}
                  </span>
                </div>
              </div>

              {/* Driver context bar if driver is assigned */}
              {selectedConv.driverName ? (
                <div className="rounded-2xl bg-slate-50 p-3 text-xs border border-slate-100 flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-2 font-medium">
                    <Truck className="h-4 w-4 text-brand" />
                    Tài xế tiếp nhận: <strong>{selectedConv.driverName}</strong>
                  </span>
                  <span className="text-slate-400 font-mono">Đã đồng bộ kênh chat</span>
                </div>
              ) : null}

              {/* Messages Stream Container */}
              <div className="space-y-3.5 min-h-[300px] max-h-[420px] overflow-y-auto p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400">
                    Chưa có tin nhắn nào trong hội thoại này.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.senderRole === 'ADMIN' || m.isFromMe;
                    const isDriver = m.senderRole === 'DRIVER';

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} max-w-[85%] ${
                          isAdmin ? 'ml-auto' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                          {isAdmin ? (
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3 text-indigo-600" />
                              Ban Quản Trị
                            </span>
                          ) : isDriver ? (
                            <span className="font-bold text-emerald-700 flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {m.senderName}
                            </span>
                          ) : (
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {m.senderName}
                            </span>
                          )}
                          <span>·</span>
                          <span>{m.createdAtLabel}</span>
                        </div>

                        <div
                          className={`p-3.5 text-xs leading-relaxed ${
                            isAdmin
                              ? 'bg-slate-900 text-white rounded-2xl rounded-tr-none shadow-xs'
                              : isDriver
                                ? 'bg-emerald-50 text-emerald-950 border border-emerald-200/80 rounded-2xl rounded-tl-none'
                                : 'bg-white text-slate-800 border border-slate-200/80 rounded-2xl rounded-tl-none shadow-2xs'
                          }`}
                        >
                          {m.body}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-brand" />
                  Mẫu câu phản hồi nhanh:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_RESPONSES.map((qr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyQuickResponse(qr)}
                      className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl px-2.5 py-1 text-left line-clamp-1 border border-slate-200/60 transition-colors"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Send Reply Form */}
              <form onSubmit={handleSendReply} className="space-y-3 pt-1">
                <div className="relative">
                  <textarea
                    id={replyInputId}
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập nội dung phản hồi tới khách hàng hoặc hướng dẫn tài xế..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-400">
                    Phản hồi sẽ được gửi tức thời qua kênh chat và push notification
                  </div>

                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Gửi phản hồi CSKH
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-3xl border border-black/[0.06] bg-white p-12 text-center shadow-xs">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Chọn cuộc hội thoại</h3>
              <p className="text-xs text-slate-400 mt-1">
                Chọn một cuộc trò chuyện ở danh sách bên trái để bắt đầu hỗ trợ
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
