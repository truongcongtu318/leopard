'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { LiveRefreshBridge } from '../live/LiveOrderRefresher';
import { RoleNavigation, type NavItem } from './RoleNavigation';

export interface OperationsShellProps {
  children: React.ReactNode;
  role: string;
  navItems: readonly NavItem[];
}

interface RoleContext {
  contextLabel: string;
  navigationLabel: string;
  drawerLabel: string;
}

const ROLE_CONTEXT: Readonly<Record<string, RoleContext>> = {
  admin: {
    contextLabel: 'Quản trị vận hành',
    navigationLabel: 'Điều hướng quản trị',
    drawerLabel: 'Điều hướng quản trị vận hành',
  },
  fleet_owner: {
    contextLabel: 'Quản lý đội xe',
    navigationLabel: 'Điều hướng đội xe',
    drawerLabel: 'Điều hướng quản lý đội xe',
  },
};

const FALLBACK_CONTEXT: RoleContext = {
  contextLabel: 'Khu vực vận hành',
  navigationLabel: 'Điều hướng vận hành',
  drawerLabel: 'Điều hướng khu vực vận hành',
};

const NAVIGATION_LABELS: Readonly<Record<string, string>> = {
  '/admin': 'Tổng quan',
  '/admin/users': 'Người dùng',
  '/admin/fleets': 'Đội xe',
  '/admin/drivers': 'Tài xế',
  '/admin/orders': 'Đơn hàng',
  '/fleet': 'Tổng quan',
  '/fleet/drivers': 'Tài xế',
  '/fleet/orders': 'Đơn hàng',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function OperationsShell({ children, role, navItems }: OperationsShellProps) {
  const pathname = usePathname() ?? '';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const roleContext = ROLE_CONTEXT[role] ?? FALLBACK_CONTEXT;
  const localizedItems = useMemo(
    () =>
      navItems.map((item) => ({
        ...item,
        label: NAVIGATION_LABELS[item.href] ?? item.label,
      })),
    [navItems],
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const first = focusable.at(0);
      const last = focusable.at(-1);

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    drawer.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => drawer.removeEventListener('keydown', handleKeyDown);
  }, [closeDrawer, drawerOpen]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const navigation = (
    <div className="p-5">
      {/* Brand Header — premium */}
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-teal-600 text-white shadow-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div>
            <p className="text-[15px] font-extrabold tracking-tight text-neutral-text leading-none">LEOPARD</p>
            <p className="text-[10px] font-bold tracking-[0.14em] text-brand uppercase">Operations</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-full bg-brand-soft border border-brand/10 px-3 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-brand-soft-text">{roleContext.contextLabel}</span>
        </div>
      </div>

      <RoleNavigation
        items={localizedItems}
        currentPath={pathname}
        ariaLabel={roleContext.navigationLabel}
        tone="light"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafb] text-neutral-text selection:bg-brand-soft selection:text-brand-soft-text">
      <LiveRefreshBridge />
      <a
        href="#noi-dung-chinh"
        className="fixed left-md top-md z-50 -translate-y-24 rounded-control bg-brand px-md py-sm font-semibold text-brand-text shadow-brand transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Bỏ qua đến nội dung chính
      </a>

      {/* Desktop Sidebar — premium glass + gradient accent */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between overflow-y-auto border-r border-neutral-border/60 bg-white/80 backdrop-blur-xl lg:flex shadow-[1px_0_24px_-4px_rgba(0,0,0,0.06)]">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-gradient-soft via-transparent to-transparent pointer-events-none h-32" />
        <div className="relative">{navigation}</div>
        <div className="relative border-t border-neutral-border/60 p-4">
          <div className="rounded-xl bg-neutral-surface/80 p-3 border border-neutral-border/40">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">AD</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-neutral-text truncate">Admin Demo</p>
                <p className="text-[11px] text-neutral-muted">Quản trị viên</p>
              </div>
            </div>
            <a
              href="/login"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white border border-neutral-border px-3 py-2 text-xs font-semibold text-neutral-text shadow-sm hover:bg-neutral-surface hover:text-danger-text hover:border-danger-border/30 transition-colors motion-reduce:transition-none"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Đăng xuất
            </a>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:ml-64">
        {/* Topbar — glass */}
        <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between border-b border-neutral-border/60 bg-white/70 backdrop-blur-xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setDrawerOpen((open) => !open)}
              aria-label="Mở điều hướng"
              aria-expanded={drawerOpen}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-neutral-border bg-white text-neutral-text shadow-sm transition-all hover:bg-neutral-surface hover:shadow active:scale-95 motion-reduce:transition-none lg:hidden"
            >
              <svg aria-hidden="true" focusable="false" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">Hệ thống hoạt động</span>
              <span className="text-neutral-border">•</span>
              <span className="tabular-nums">Cập nhật vừa xong</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-border bg-white text-neutral-muted shadow-sm hover:text-neutral-text hover:bg-neutral-surface transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-6 5-6 5h18s-6 2-6-5"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
            <div className="flex items-center gap-2.5 rounded-full border border-neutral-border/60 bg-white pl-1 pr-3 py-1 shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand to-teal-600 text-xs font-bold text-white shadow-sm">
                {role === 'admin' ? 'A' : 'F'}
              </span>
              <div className="hidden sm:block text-left leading-none">
                <p className="text-xs font-semibold text-neutral-text">{role === 'admin' ? 'Admin' : 'Fleet Owner'}</p>
                <p className="text-[11px] text-neutral-muted">Online</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-muted"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </header>

        <main
          id="noi-dung-chinh"
          tabIndex={-1}
          className="mx-auto w-full max-w-operations flex-1 p-6 md:p-8 text-neutral-text bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.04),transparent_60%)]"
        >
          {children}
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={closeDrawer}
            className="absolute inset-0 bg-neutral-text/60"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="operations-drawer-title"
            className="relative z-10 h-full w-72 max-w-full overflow-y-auto border-r border-neutral-border bg-neutral"
          >
            <div className="flex min-h-16 items-center justify-between border-b border-neutral-border px-5">
              <h2 id="operations-drawer-title" className="font-bold text-neutral-text">
                {roleContext.drawerLabel}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDrawer}
                aria-label="Đóng điều hướng"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-neutral-border text-neutral-text motion-reduce:transition-none"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {navigation}
          </div>
        </div>
      ) : null}
    </div>
  );
}

