'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

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
      <div className="mb-8 flex items-center gap-3 px-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-black text-white shadow-md shadow-indigo-500/25">
          🐆
        </span>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">LEOPARD</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            OPERATIONS LEDGER
          </p>
        </div>
      </div>

      {/* Section: MAIN MENU */}
      <div className="mb-2 px-3.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#noi-dung-chinh"
        className="fixed left-md top-md z-50 -translate-y-24 rounded-xl bg-indigo-600 px-md py-sm font-semibold text-white transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Bỏ qua đến nội dung chính
      </a>

      {/* Desktop Clean White Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between overflow-y-auto border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div>{navigation}</div>
        <div className="border-t border-slate-100 p-5 dark:border-slate-800">
          <a
            href="/login"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 motion-reduce:transition-none dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors"
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
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
          <div className="flex items-center gap-3">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setDrawerOpen((open) => !open)}
              aria-label="Mở điều hướng"
              aria-expanded={drawerOpen}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 motion-reduce:transition-none lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <svg aria-hidden="true" focusable="false" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>

            {/* Global Search Bar */}
            <div className="relative hidden sm:block">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                readOnly
                placeholder="Tìm kiếm đơn hàng, tài xế... (⌘K)"
                className="h-10 w-72 rounded-xl border border-slate-200/80 bg-slate-50/80 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Right Header: Notifications & User Profile */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              aria-label="Thông báo"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 transition-colors hover:bg-slate-50 motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {/* Profile Avatar Pill */}
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-1.5 pr-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-sky-400 text-xs font-bold text-white">
                {role === 'admin' ? 'A' : 'F'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold leading-tight text-slate-800 dark:text-slate-200">
                  {role === 'admin' ? 'Admin Manager' : 'Chủ Đội Sao Mai'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {role === 'admin' ? 'Quản trị viên' : 'Fleet Owner'}
                </p>
              </div>
            </div>
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
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="operations-drawer-title"
            className="relative z-10 h-full w-72 max-w-full overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex min-h-16 items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
              <h2 id="operations-drawer-title" className="font-bold text-slate-900 dark:text-white">
                {roleContext.drawerLabel}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDrawer}
                aria-label="Đóng điều hướng"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 motion-reduce:transition-none dark:border-slate-700 dark:text-slate-300"
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

