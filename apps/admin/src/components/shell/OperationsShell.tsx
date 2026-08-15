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
    <div className="p-md">
      <div className="px-md pb-lg text-section-title font-bold">LEOPARD</div>
      <p className="mb-xs px-md text-body-compact font-semibold uppercase text-neutral-muted">
        {roleContext.contextLabel}
      </p>
      <RoleNavigation
        items={localizedItems}
        currentPath={pathname}
        ariaLabel={roleContext.navigationLabel}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral text-neutral-text">
      <a
        href="#noi-dung-chinh"
        className="fixed left-md top-md z-50 -translate-y-24 rounded-control bg-brand px-md py-sm font-semibold text-brand-text transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Bỏ qua đến nội dung chính
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto border-r border-neutral-border bg-neutral-surface lg:block">
        {navigation}
      </aside>

      <div className="flex min-h-screen flex-col lg:ml-64">
        <header className="sticky top-0 z-20 flex min-h-14 items-center gap-sm border-b border-neutral-border bg-neutral px-md lg:hidden">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setDrawerOpen((open) => !open)}
            aria-label="Mở điều hướng"
            aria-expanded={drawerOpen}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-neutral-border bg-neutral text-neutral-text transition-colors hover:bg-neutral-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <span className="font-semibold">LEOPARD</span>
          <span className="text-body-compact text-neutral-muted">{roleContext.contextLabel}</span>
        </header>

        <main
          id="noi-dung-chinh"
          tabIndex={-1}
          className="mx-auto w-full max-w-operations flex-1 bg-neutral p-lg text-neutral-text"
        >
          {children}
        </main>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={closeDrawer}
            className="absolute inset-0 bg-neutral-text/40"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="operations-drawer-title"
            className="relative z-10 h-full w-72 max-w-full overflow-y-auto border-r border-neutral-border bg-neutral"
          >
            <div className="flex min-h-14 items-center justify-between border-b border-neutral-border px-md">
              <h2 id="operations-drawer-title" className="font-semibold">
                {roleContext.drawerLabel}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDrawer}
                aria-label="Đóng điều hướng"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-neutral-border bg-neutral text-neutral-text transition-colors hover:bg-neutral-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
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
