'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

import { LiveRefreshBridge } from '../live/LiveOrderRefresher';
import { RoleNavigation, type NavItem } from './RoleNavigation';

export interface OperationsShellProps {
  children: React.ReactNode;
  role: string;
  navItems: readonly NavItem[];
}

interface RoleContext {
  contextLabel: string;
  roleLabel: string;
  navigationLabel: string;
  drawerLabel: string;
}

const ROLE_CONTEXT: Readonly<Record<string, RoleContext>> = {
  admin: {
    contextLabel: 'Quản trị vận hành',
    roleLabel: 'Quản trị viên',
    navigationLabel: 'Điều hướng quản trị',
    drawerLabel: 'Điều hướng quản trị vận hành',
  },
  fleet_owner: {
    contextLabel: 'Quản lý đội xe',
    roleLabel: 'Chủ đội xe',
    navigationLabel: 'Điều hướng đội xe',
    drawerLabel: 'Điều hướng quản lý đội xe',
  },
};

const FALLBACK_CONTEXT: RoleContext = {
  contextLabel: 'Khu vực vận hành',
  roleLabel: 'Người vận hành',
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
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    drawer.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      drawer.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeDrawer, drawerOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    }
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-neutral-text p-2 sm:p-4 flex flex-col antialiased">
      <LiveRefreshBridge />
      <a
        href="#noi-dung-chinh"
        className="fixed left-md top-md z-50 -translate-y-24 rounded-control bg-brand px-md py-sm font-semibold text-brand-text transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Bỏ qua đến nội dung chính
      </a>

      {/* Top Application Header Bar */}
      <header className="bg-white rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-3 mb-3 flex items-center justify-between shadow-xs border border-slate-100/90 shrink-0">
        {/* Left: Brand Logo & Horizontal Tabs */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            href={role === 'admin' ? '/admin' : '/fleet'}
            className="flex items-center gap-2.5 transition-opacity motion-reduce:transition-none"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xs">
              <svg
                aria-hidden="true"
                focusable="false"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">LEOPARD</span>
              <p className="text-[10px] font-semibold text-slate-400 leading-none">{roleContext.contextLabel}</p>
            </div>
          </Link>

          {/* Horizontal Navigation Menu */}
          <RoleNavigation
            items={localizedItems}
            currentPath={pathname}
            ariaLabel={roleContext.navigationLabel}
            orientation="horizontal"
          />
        </div>

        {/* Right: Search, Notifications, Profile & Mobile Trigger */}
        <div className="flex items-center gap-3">
          {/* Search Pill */}
          <div className="relative hidden sm:block w-44 lg:w-52">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              aria-label="Tìm kiếm trong hệ thống"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-full focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-700"
            />
          </div>

          {/* Notification Bell */}
          <button
            type="button"
            aria-label="Thông báo hệ thống"
            className="relative p-2 rounded-full border border-slate-200/70 hover:bg-slate-50 text-slate-600 transition-colors motion-reduce:transition-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* User Profile Capsule */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700 ring-1 ring-slate-300">
              {role === 'admin' ? 'QTV' : 'CĐX'}
            </span>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {role === 'admin' ? 'Nguyễn Hoài Nam' : 'Trần Quốc Tuấn'}
              </p>
              <p className="text-[10px] font-medium text-slate-400 leading-none">
                {role === 'admin' ? 'Quản trị viên điều phối' : 'Chủ đội xe Sao Mai'}
              </p>
            </div>
          </div>

          {/* Logout Action Button */}
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Đăng xuất khỏi phiên làm việc"
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors motion-reduce:transition-none cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>

          {/* Mobile Drawer Trigger */}
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setDrawerOpen((open) => !open)}
            aria-label="Mở điều hướng"
            aria-expanded={drawerOpen}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 motion-reduce:transition-none md:hidden"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 items-stretch min-w-0">
        {/* Main Central Content */}
        <main
          id="noi-dung-chinh"
          tabIndex={-1}
          className="flex-1 flex flex-col gap-3 min-w-0 text-neutral-text max-w-operations w-full focus:outline-none"
        >
          {children}
        </main>
      </div>

      {/* Mobile Drawer (Responsive Menu) */}
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
            aria-label={roleContext.drawerLabel}
            className="relative z-10 h-full w-72 max-w-full overflow-y-auto border-r border-neutral-border bg-neutral p-4"
          >
            <div className="flex min-h-16 items-center justify-between border-b border-neutral-border pb-3 mb-4">
              <h2 className="font-bold text-neutral-text text-sm">
                {roleContext.drawerLabel}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDrawer}
                aria-label="Đóng điều hướng"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-neutral-border text-neutral-text motion-reduce:transition-none"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <RoleNavigation
              items={localizedItems}
              currentPath={pathname}
              ariaLabel={roleContext.navigationLabel}
              orientation="vertical"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
