'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { LiveRefreshBridge } from '../live/LiveOrderRefresher';
import { RoleNavigation, type NavItem } from './RoleNavigation';
import { AdminSidebar, type SidebarNavGroup } from './AdminSidebar';

export interface OperationsShellProps {
  children: React.ReactNode;
  role: string;
  navItems: readonly NavItem[];
  navGroups?: readonly SidebarNavGroup[];
}

interface RoleContext {
  contextLabel: string;
  roleLabel: string;
  navigationLabel: string;
  drawerLabel: string;
}

const ROLE_CONTEXT: Readonly<Record<string, RoleContext>> = {
  admin: {
    contextLabel: 'Admin Dispatch Console',
    roleLabel: 'Quản trị viên',
    navigationLabel: 'Điều hướng quản trị',
    drawerLabel: 'Điều hướng quản trị vận hành',
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
  '/admin/drivers': 'Tài xế',
  '/admin/orders': 'Đơn hàng',
  '/admin/driver-applications': 'Duyệt hồ sơ',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function OperationsShell({ children, role, navItems, navGroups }: OperationsShellProps) {
  const pathname = usePathname() ?? '';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const roleContext = ROLE_CONTEXT[role] ?? FALLBACK_CONTEXT;
  const localizedItems = useMemo(
    () =>
      navItems.map((item) => ({
        ...item,
        label: NAVIGATION_LABELS[item.href] ?? item.label,
      })),
    [navItems],
  );

  /** Flatten all nav items for quick search spotlight */
  const allNavItems = useMemo(() => {
    if (!navGroups) return [];
    return navGroups.flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        groupLabel: group.groupLabel,
      })),
    );
  }, [navGroups]);

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return allNavItems;
    const q = searchQuery.toLowerCase().trim();
    return allNavItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.groupLabel.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q),
    );
  }, [allNavItems, searchQuery]);

  /** Derive breadcrumb context from navGroups + current path */
  const pageContext = useMemo(() => {
    if (!navGroups) return { group: 'Tổng quan', label: 'Dashboard' };
    for (const group of navGroups) {
      for (const item of group.items) {
        const active =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        if (active) return { group: group.groupLabel, label: item.label };
      }
    }
    return { group: 'Tổng quan', label: 'Dashboard' };
  }, [navGroups, pathname]);

  // Global keyboard shortcuts (Cmd+K / Ctrl+K for search, Escape for menus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close user dropdown
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    triggerRef.current?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab') return;
    const drawer = drawerRef.current;
    if (!drawer) return;
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

  const prevDrawerOpen = useRef(drawerOpen);
  useEffect(() => {
    if (prevDrawerOpen.current && !drawerOpen) {
      triggerRef.current?.focus();
    }
    prevDrawerOpen.current = drawerOpen;
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    closeButtonRef.current?.focus();
  }, [drawerOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    }
    window.location.href = '/login';
  };

  // Use grouped sidebar layout when navGroups is provided (admin role)
  const useGroupedLayout = role === 'admin' && navGroups && navGroups.length > 0;

  if (useGroupedLayout) {
    return (
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        {/* Skip to main content */}
        <a
          href="#noi-dung-chinh"
          className="fixed left-4 top-4 z-50 -translate-y-24 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 motion-reduce:transition-none"
        >
          Bỏ qua đến nội dung chính
        </a>

        {/* ── Outer page canvas (neutral bg + padding, fixed viewport height) ── */}
        <div className="h-screen bg-[#D0D2DA] flex items-stretch justify-center p-3 lg:p-4 antialiased overflow-hidden">
          <LiveRefreshBridge />

          {/* ── Contained console frame (fixed height, content scrolls inside) ── */}
          <div className="relative flex w-full max-w-[1480px] h-full overflow-hidden rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.10]">
            {/* ── Desktop Sidebar (dark) with centered vertical divider collapse toggle ── */}
            <div className="relative hidden lg:flex shrink-0">
              <AdminSidebar
                groups={navGroups}
                currentPath={pathname}
                onLogout={handleLogout}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
              />

              {/* ── Single Collapse Button Centered on Vertical Dividing Line ── */}
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                title={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                className="absolute -right-3 top-[14px] z-30 flex h-6 w-6 items-center justify-center rounded-full bg-[#18181B] border border-zinc-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.35)] text-zinc-300 hover:text-amber-400 hover:border-amber-400/80 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none"
              >
                <ChevronLeft
                  className={[
                    'h-3.5 w-3.5 transition-transform duration-200',
                    sidebarCollapsed ? 'rotate-180' : '',
                  ].join(' ')}
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* ── Right column: Topbar + Content ── */}
            <div className="flex flex-1 flex-col min-w-0 bg-[#F4F5F7]">

              {/* ── Topbar ── */}
              <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-slate-200/70 bg-white px-4 sm:px-5 gap-3">
                {/* Left: mobile trigger + breadcrumb (desktop collapse moved to vertical divider) */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile menu trigger */}
                  <Dialog.Trigger asChild>
                    <button
                      ref={triggerRef}
                      type="button"
                      aria-label="Mở menu điều hướng"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors motion-reduce:transition-none lg:hidden"
                    >
                      <Menu className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </Dialog.Trigger>

                  {/* Breadcrumb */}
                  <nav aria-label="Breadcrumb" className="flex items-center gap-1 min-w-0 text-xs">
                    <span className="text-slate-400 font-medium shrink-0">Admin</span>
                    <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" aria-hidden="true" />
                    <span className="text-slate-400 hidden sm:block shrink-0">{pageContext.group}</span>
                    <ChevronRight className="h-3 w-3 text-slate-300 hidden sm:block shrink-0" aria-hidden="true" />
                    <span className="text-slate-800 font-semibold truncate">{pageContext.label}</span>
                  </nav>
                </div>

                {/* Right: Search Icon + Bell + User Capsule with Dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Search Icon-Only Button */}
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Tìm kiếm nhanh (⌘K)"
                    title="Tìm kiếm nhanh (⌘K)"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/70 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  {/* Notification Bell */}
                  <Link
                    href="/admin/notifications"
                    aria-label="Thông báo hệ thống"
                    className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/70 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                    <span
                      aria-hidden="true"
                      className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-[1.5px] ring-white"
                    />
                  </Link>

                  {/* User Profile Capsule with Interactive Dropdown (dropdown width matches tab exactly) */}
                  <div className="relative w-[184px] sm:w-[190px]" ref={userMenuRef}>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen((prev) => !prev)}
                      aria-expanded={userMenuOpen}
                      aria-haspopup="true"
                      aria-label="Menu tài khoản quản trị viên"
                      className="w-full flex items-center justify-between gap-1.5 rounded-xl py-1 px-1.5 sm:px-2 hover:bg-slate-100 transition-colors cursor-pointer border-l border-slate-200 pl-2 focus:outline-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-[10px] font-bold text-black shadow-sm">
                          QT
                          <span
                            className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"
                            aria-hidden="true"
                          />
                        </div>
                        <div className="hidden sm:block text-left min-w-0">
                          <p className="text-[11px] font-semibold text-slate-800 leading-tight truncate">Nguyễn Hoài Nam</p>
                          <p className="text-[9px] font-medium text-slate-400 leading-none mt-0.5 truncate">Quản trị viên</p>
                        </div>
                      </div>
                      <ChevronDown
                        className={[
                          'h-3.5 w-3.5 text-slate-400 transition-transform duration-200 hidden sm:block shrink-0',
                          userMenuOpen ? 'rotate-180 text-slate-700' : '',
                        ].join(' ')}
                        aria-hidden="true"
                      />
                    </button>

                    {/* Dropdown Menu Panel - Width matches the tab above exactly (w-full left-0 right-0) */}
                    {userMenuOpen && (
                      <div
                        role="menu"
                        aria-orientation="vertical"
                        className="animate-dropdown absolute left-0 right-0 w-full mt-1.5 rounded-xl bg-white/95 backdrop-blur-md p-1 shadow-lg ring-1 ring-black/[0.08] border border-slate-100 z-50 origin-top"
                      >
                        {/* Action Navigation Links */}
                        <div className="space-y-0.5">
                          <Link
                            href="/admin/settings"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-colors"
                          >
                            <Settings className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                            <span>Cài đặt hệ thống</span>
                          </Link>
                          <Link
                            href="/admin/audit"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-colors"
                          >
                            <History className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                            <span>Nhật ký hoạt động</span>
                          </Link>
                          <Link
                            href="/admin/notifications"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Bell className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                              <span className="truncate">Thông báo hệ thống</span>
                            </div>
                            <span className="rounded-full bg-rose-500/10 text-rose-600 text-[9px] font-bold px-1.5 py-0.2 shrink-0">
                              Mới
                            </span>
                          </Link>
                        </div>

                        <div className="my-1 border-t border-slate-100" />

                        {/* Logout Button - exact same font size text-[11.5px] and font-medium as other items */}
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            handleLogout();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-rose-600 hover:bg-rose-50/80 transition-colors cursor-pointer"
                        >
                          <LogOut className="h-3.5 w-3.5 text-rose-500 shrink-0" aria-hidden="true" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* ── Search Spotlight Modal ── */}
              <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
                <Dialog.Portal>
                  <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] p-4">
                    <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150" />
                    <Dialog.Content
                      aria-modal="true"
                      aria-label="Tìm kiếm nhanh trên hệ thống"
                      className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden focus:outline-none"
                    >
                      <Dialog.Title className="sr-only">Tìm kiếm nhanh</Dialog.Title>

                      {/* Search Bar Input */}
                      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 bg-white">
                        <Search className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Tìm kiếm nhanh chức năng, đơn hàng, tài xế..."
                          className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                          autoFocus
                        />
                        {searchQuery ? (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            aria-label="Xóa nội dung tìm kiếm"
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : (
                          <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                            ESC
                          </kbd>
                        )}
                      </div>

                      {/* Search Results / Navigation Suggestions */}
                      <div className="max-h-[340px] overflow-y-auto p-2 space-y-0.5">
                        {filteredNavItems.length > 0 ? (
                          filteredNavItems.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => {
                                setSearchOpen(false);
                                setSearchQuery('');
                              }}
                              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-amber-400 group-hover:text-black transition-colors">
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate">{item.label}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{item.groupLabel}</p>
                                </div>
                              </div>
                              <span className="text-[11px] text-slate-400 group-hover:text-slate-600 font-medium">
                                Mở trang →
                              </span>
                            </Link>
                          ))
                        ) : (
                          <div className="py-8 text-center text-xs text-slate-400">
                            Không tìm thấy chức năng phù hợp với &quot;{searchQuery}&quot;
                          </div>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 bg-slate-50 text-[11px] text-slate-400">
                        <span>Nhấn <kbd className="font-semibold text-slate-600">ESC</kbd> để đóng</span>
                        <span>LEOPARD Dispatch Console</span>
                      </div>
                    </Dialog.Content>
                  </div>
                </Dialog.Portal>
              </Dialog.Root>

              {/* ── Main content ── */}
              <main
                id="noi-dung-chinh"
                tabIndex={-1}
                className="flex-1 overflow-y-auto focus:outline-none"
              >
                <div className="p-4 sm:p-5 flex flex-col gap-4">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </div>

        {/* ── Mobile Drawer ── */}
        <Dialog.Portal>
          <div className="fixed inset-0 z-40">
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <Dialog.Content
              ref={drawerRef}
              aria-modal="true"
              aria-label="Menu điều hướng quản trị"
              onKeyDown={handleKeyDown}
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                closeButtonRef.current?.focus();
              }}
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                triggerRef.current?.focus();
              }}
              className="relative z-10 flex h-full w-[218px] max-w-full flex-col overflow-y-auto bg-[#18181B] focus:outline-none"
            >
              <Dialog.Title className="sr-only">Menu điều hướng quản trị</Dialog.Title>

              {/* Close row */}
              <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
                <span className="text-[12px] font-bold text-white">Menu</span>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Đóng menu"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-zinc-400 motion-reduce:transition-none"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                <AdminSidebar
                  groups={navGroups}
                  currentPath={pathname}
                  onLogout={handleLogout}
                />
              </div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // ── Fallback: original horizontal nav layout ──
  return (
    <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
      <div className="min-h-screen bg-[#F5F5F7] text-neutral-text p-2 sm:p-4 flex flex-col antialiased">
        <LiveRefreshBridge />
        <a
          href="#noi-dung-chinh"
          className="fixed left-md top-md z-50 -translate-y-24 rounded-control bg-brand px-md py-sm font-semibold text-brand-text transition-transform focus:translate-y-0 motion-reduce:transition-none"
        >
          Bỏ qua đến nội dung chính
        </a>

        <header className="bg-white/80 backdrop-blur-xl border border-black/[0.06] rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-3 mb-3 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] shrink-0">
          <div className="flex items-center gap-5 lg:gap-7">
            <Link href="/admin" className="flex items-center gap-2.5 transition-opacity motion-reduce:transition-none">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xs">
                <ShieldCheck className="w-[18px] h-[18px]" strokeWidth={2.2} aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-slate-900">LEOPARD</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200/60">
                    Admin Console
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 leading-none">{roleContext.contextLabel}</p>
              </div>
            </Link>
            <RoleNavigation
              items={localizedItems}
              currentPath={pathname}
              ariaLabel={roleContext.navigationLabel}
              orientation="horizontal"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" aria-label="Tìm kiếm nhanh (⌘K)" className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/60 rounded-full px-3 py-1.5 text-xs text-slate-500 transition-colors cursor-pointer motion-reduce:transition-none">
              <Search className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Tìm kiếm...</span>
              <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 shadow-2xs border border-slate-200/80">⌘K</kbd>
            </button>
            <button type="button" aria-label="Thông báo hệ thống" className="relative p-2 rounded-full border border-slate-200/70 hover:bg-slate-50 text-slate-600 transition-colors motion-reduce:transition-none">
              <Bell className="w-4 h-4" aria-hidden="true" />
            </button>
            {/* User Profile Capsule */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700 ring-1 ring-slate-300">
                QTV
              </span>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">Nguyễn Hoài Nam</p>
                <p className="text-[10px] font-medium text-slate-400 leading-none">Quản trị viên điều phối</p>
              </div>
            </div>
            <Dialog.Trigger asChild>
              <button ref={triggerRef} type="button" aria-label="Mở điều hướng" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 motion-reduce:transition-none md:hidden">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Trigger>
          </div>
        </header>

        <div className="flex flex-1 items-stretch min-w-0">
          <main id="noi-dung-chinh" tabIndex={-1} className="flex-1 flex flex-col gap-3 min-w-0 text-neutral-text max-w-operations w-full focus:outline-none">
            {children}
          </main>
        </div>

        <Dialog.Portal>
          <div className="fixed inset-0 z-40">
            <Dialog.Overlay className="fixed inset-0 bg-neutral-text/60" />
            <Dialog.Content
              ref={drawerRef}
              aria-modal="true"
              aria-label="Điều hướng quản trị vận hành"
              onKeyDown={handleKeyDown}
              onOpenAutoFocus={(e) => { e.preventDefault(); closeButtonRef.current?.focus(); }}
              onCloseAutoFocus={(e) => { e.preventDefault(); triggerRef.current?.focus(); }}
              className="relative z-10 h-full w-72 max-w-full overflow-y-auto border-r border-neutral-border bg-neutral p-4 focus:outline-none"
            >
              <Dialog.Title className="sr-only">{roleContext.drawerLabel}</Dialog.Title>
              <div className="flex min-h-16 items-center justify-between border-b border-neutral-border pb-3 mb-4">
                <h2 className="font-bold text-neutral-text text-sm" aria-hidden="true">{roleContext.drawerLabel}</h2>
                <button ref={closeButtonRef} type="button" onClick={closeDrawer} aria-label="Đóng điều hướng" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-neutral-border text-neutral-text motion-reduce:transition-none">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <RoleNavigation items={localizedItems} currentPath={pathname} ariaLabel={roleContext.navigationLabel} orientation="vertical" />
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </div>
    </Dialog.Root>
  );
}
