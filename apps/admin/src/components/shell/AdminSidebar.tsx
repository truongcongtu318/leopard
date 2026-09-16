'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Bell,
  Calculator,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  Headphones,
  History,
  LayoutGrid,
  LogOut,
  Navigation,
  Package,
  Radio,
  Settings,
  ShieldCheck,
  Star,
  TicketPercent,
  Users,
  Wallet,
} from 'lucide-react';

export interface SidebarNavItem {
  label: string;
  href: string;
  /** Real notification badge count */
  badge?: number;
  /** Show chevron-down to indicate expandable sub-group */
  hasDropdown?: boolean;
}

export interface SidebarNavGroup {
  groupLabel: string;
  items: SidebarNavItem[];
}

interface AdminSidebarProps {
  groups: readonly SidebarNavGroup[];
  currentPath: string;
  onLogout: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ICON_CLS = 'h-[13px] w-[13px] shrink-0';

function getNavIcon(href: string) {
  if (href.endsWith('/dispatch'))            return <Radio         className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/live-map'))            return <Navigation    className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/orders'))              return <Package       className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/reports'))             return <AlertCircle   className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/support'))             return <Headphones    className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/payments'))            return <CreditCard    className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/invoices'))            return <FileText      className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/withdrawals'))         return <Wallet        className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/promotions'))          return <TicketPercent className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/notifications'))       return <Bell          className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/reviews'))             return <Star          className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/users'))               return <Users         className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/drivers'))             return <ShieldCheck   className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/driver-applications')) return <ClipboardCheck className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/pricing'))             return <Calculator    className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/audit'))               return <History       className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  if (href.endsWith('/settings'))            return <Settings      className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
  return <LayoutGrid className={ICON_CLS} strokeWidth={1.9} aria-hidden="true" />;
}

function isItemActive(href: string, currentPath: string): boolean {
  if (href === '/admin') return currentPath === '/admin';
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

interface TreeGroupProps {
  group: SidebarNavGroup;
  currentPath: string;
}

/** Collapsible tree group — auto-expands when child is active, without deceptive child count numbers */
function SidebarTreeGroup({ group, currentPath }: TreeGroupProps) {
  const hasActiveChild = group.items.some((item) => isItemActive(item.href, currentPath));
  const [isOpen, setIsOpen] = useState(hasActiveChild || group.items.length <= 2);

  // Auto-expand whenever active child changes
  useEffect(() => {
    if (hasActiveChild) {
      setIsOpen(true);
    }
  }, [hasActiveChild]);

  return (
    <div>
      {/* ── Group Header (no deceptive count numbers, enhanced contrast) ── */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="group/gh w-full flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-white/[0.05] transition-colors duration-150 cursor-pointer"
        aria-expanded={isOpen}
      >
        <ChevronRight
          className={[
            'h-2.5 w-2.5 shrink-0 text-zinc-500 transition-transform duration-200 motion-reduce:transition-none',
            isOpen ? 'rotate-90 text-zinc-400' : '',
          ].join(' ')}
          aria-hidden="true"
        />
        <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 group-hover/gh:text-zinc-300 transition-colors">
          {group.groupLabel}
        </span>
      </button>

      {/* ── Tree Children with Vertical Guide Line ── */}
      {isOpen && (
        <div className="relative ml-[11px] mt-0.5 mb-1 pl-2.5 border-l border-white/[0.08] space-y-0.5">
          {group.items.map((item) => {
            const active = isItemActive(item.href, currentPath);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'group/item flex items-center gap-2 min-h-[30px] rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 motion-reduce:transition-none',
                  active
                    ? 'bg-amber-400 text-zinc-950 font-semibold shadow-xs shadow-amber-400/20'
                    : 'text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-100',
                ].join(' ')}
              >
                {/* Synchronized Icon Color */}
                <span
                  className={[
                    'shrink-0 transition-colors',
                    active ? 'text-zinc-950' : 'text-zinc-400 group-hover/item:text-zinc-200',
                  ].join(' ')}
                >
                  {getNavIcon(item.href)}
                </span>

                {/* Label */}
                <span className="flex-1 truncate">{item.label}</span>

                {/* Real Notification Badge (Only when present) */}
                {item.badge != null && item.badge > 0 && (
                  <span
                    aria-label={`${item.badge} thông báo`}
                    className={[
                      'flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none tabular-nums',
                      active ? 'bg-zinc-950/20 text-zinc-950' : 'bg-rose-500 text-white',
                    ].join(' ')}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar({
  groups,
  currentPath,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  return (
    <aside
      aria-label="Điều hướng quản trị"
      className={[
        'flex h-full shrink-0 flex-col bg-[#18181B] select-none transition-[width] duration-200 ease-in-out',
        isCollapsed ? 'w-[60px]' : 'w-[218px]',
      ].join(' ')}
    >
      {/* ── Logo Header ── */}
      <div
        className={[
          'flex h-[52px] shrink-0 items-center border-b border-white/[0.06]',
          isCollapsed ? 'justify-center px-2' : 'px-4',
        ].join(' ')}
      >
        {isCollapsed ? (
          <Link
            href="/admin"
            title="LEOPARD Admin Console"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-black shadow-md shadow-amber-400/20 hover:opacity-90 transition-opacity"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-black" strokeWidth={2.6} aria-hidden="true" />
          </Link>
        ) : (
          <Link
            href="/admin"
            className="flex items-center gap-2 transition-opacity hover:opacity-80 motion-reduce:transition-none min-w-0"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400 shadow-md shadow-amber-400/20">
              <ShieldCheck className="h-3.5 w-3.5 text-black" strokeWidth={2.6} aria-hidden="true" />
            </div>
            <div className="truncate">
              <p className="text-[12px] font-bold leading-tight tracking-tight text-white">LEOPARD</p>
              <p className="text-[9px] leading-none text-zinc-500 font-medium mt-0.5">Admin Console</p>
            </div>
          </Link>
        )}
      </div>

      {/* ── Navigation (Icon-only when collapsed, Tree groups when expanded) ── */}
      {isCollapsed ? (
        <nav
          aria-label="Menu điều hướng thu gọn"
          className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1.5 space-y-1.5 no-scrollbar"
        >
          {groups.map((group, groupIdx) => (
            <div key={group.groupLabel} className="space-y-1">
              {groupIdx > 0 && <div className="h-px bg-white/[0.08] my-1.5 mx-2" />}
              {group.items.map((item) => {
                const active = isItemActive(item.href, currentPath);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'relative flex h-8 w-8 mx-auto items-center justify-center rounded-lg transition-colors',
                      active
                        ? 'bg-amber-400 text-zinc-950 font-semibold shadow-xs shadow-amber-400/20'
                        : 'text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100',
                    ].join(' ')}
                  >
                    <span className={active ? 'text-zinc-950' : 'text-zinc-400'}>
                      {getNavIcon(item.href)}
                    </span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white leading-none">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      ) : (
        <nav
          aria-label="Menu điều hướng"
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2.5 space-y-1 no-scrollbar"
        >
          {groups.map((group) => (
            <SidebarTreeGroup key={group.groupLabel} group={group} currentPath={currentPath} />
          ))}
        </nav>
      )}

      {/* ── Footer: User Profile ── */}
      {isCollapsed ? (
        <div className="shrink-0 border-t border-white/[0.06] p-2 flex justify-center">
          <div
            title="Nguyễn Hoài Nam (Quản trị viên)"
            className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-[10px] font-bold text-black shadow-sm"
          >
            QT
            <span
              className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-[1.5px] ring-[#18181B]"
              aria-hidden="true"
            />
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t border-white/[0.06] p-2">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04] transition-colors group">
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-[10px] font-bold text-black shadow-sm">
              QT
              <span
                className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-[1.5px] ring-[#18181B]"
                aria-hidden="true"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[11px] font-semibold text-zinc-200 leading-tight">Nguyễn Hoài Nam</p>
              <p className="text-[9px] font-medium text-zinc-500 leading-none mt-0.5">Quản trị viên</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Đăng xuất"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors motion-reduce:transition-none cursor-pointer opacity-0 group-hover:opacity-100"
            >
              <LogOut className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
