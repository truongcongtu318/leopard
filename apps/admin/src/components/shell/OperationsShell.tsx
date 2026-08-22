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
      {/* Brand Header */}
      <div className="mb-8 px-2">
        <p className="text-base font-extrabold tracking-tight text-neutral-text">LEOPARD</p>
        <p className="text-xs font-bold tracking-widest text-neutral-muted uppercase">
          OPERATIONS LEDGER
        </p>
      </div>

      {/* Section: MAIN MENU */}
      <div className="mb-2 px-3.5">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-muted">
          {roleContext.contextLabel}
        </p>
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
    <div className="min-h-screen bg-neutral-surface text-neutral-text">
      <LiveRefreshBridge />
      <a
        href="#noi-dung-chinh"
        className="fixed left-md top-md z-50 -translate-y-24 rounded-control bg-brand px-md py-sm font-semibold text-brand-text transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Bỏ qua đến nội dung chính
      </a>

      {/* Desktop Clean White Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between overflow-y-auto border-r border-neutral-border bg-neutral lg:flex">
        <div>{navigation}</div>
        <div className="border-t border-neutral-border p-5">
          <a
            href="/login"
            className="flex min-h-11 items-center gap-3 rounded-control px-3.5 py-2.5 text-sm font-semibold text-danger-border transition-colors hover:bg-danger motion-reduce:transition-none"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Đăng xuất / Đổi vai trò</span>
          </a>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-neutral-border bg-neutral px-6">
          <div className="flex items-center gap-3">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setDrawerOpen((open) => !open)}
              aria-label="Mở điều hướng"
              aria-expanded={drawerOpen}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-neutral-border bg-neutral text-neutral-text transition-colors hover:bg-neutral-surface motion-reduce:transition-none lg:hidden"
            >
              <svg aria-hidden="true" focusable="false" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>

          </div>

          {/* Right Header: role context */}
          <div className="flex items-center gap-2 rounded-control border border-neutral-border bg-neutral px-sm py-xs">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-control bg-brand text-xs font-bold text-brand-text"
            >
              {role === 'admin' ? 'A' : 'F'}
            </span>
            <p className="text-xs font-semibold text-neutral-text">{roleContext.contextLabel}</p>
          </div>
        </header>

        <main
          id="noi-dung-chinh"
          tabIndex={-1}
          className="mx-auto w-full max-w-operations flex-1 bg-neutral p-6 md:p-8 text-neutral-text"
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

