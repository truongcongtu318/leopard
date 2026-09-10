'use client';

import Link from 'next/link';
import { Building2, LayoutGrid, Package, ShieldCheck, Users } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
}

export interface RoleNavigationProps {
  items: readonly NavItem[];
  currentPath: string;
  ariaLabel?: string;
  tone?: 'light' | 'dark';
  orientation?: 'vertical' | 'horizontal';
}

function findCurrentHref(items: readonly NavItem[], currentPath: string) {
  return items.reduce<string | undefined>((longestMatch, item) => {
    const isRoleRoot = item.href.split('/').filter(Boolean).length <= 1;
    const isMatch =
      currentPath === item.href || (!isRoleRoot && currentPath.startsWith(`${item.href}/`));

    if (!isMatch || (longestMatch && longestMatch.length >= item.href.length)) {
      return longestMatch;
    }

    return item.href;
  }, undefined);
}

const iconClass = 'h-5 w-5 shrink-0';

function getNavIcon(href: string) {
  if (href.endsWith('/orders')) return <Package className={iconClass} strokeWidth={1.75} aria-hidden="true" />;
  if (href.endsWith('/users')) return <Users className={iconClass} strokeWidth={1.75} aria-hidden="true" />;
  if (href.endsWith('/fleets')) return <Building2 className={iconClass} strokeWidth={1.75} aria-hidden="true" />;
  if (href.endsWith('/drivers')) return <ShieldCheck className={iconClass} strokeWidth={1.75} aria-hidden="true" />;
  return <LayoutGrid className={iconClass} strokeWidth={1.75} aria-hidden="true" />;
}

export function RoleNavigation({
  items,
  currentPath,
  ariaLabel = 'Điều hướng theo vai trò',
  tone = 'light',
  orientation = 'vertical',
}: RoleNavigationProps) {
  const currentHref = findCurrentHref(items, currentPath);

  if (orientation === 'horizontal') {
    return (
      <nav aria-label={ariaLabel} className="hidden md:flex items-center">
        <ul className="m-0 list-none flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100/70 rounded-full text-xs font-medium text-slate-600">
          {items.map((item) => {
            const isActive = currentHref === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-8 items-center px-3.5 py-1.5 rounded-full transition-all motion-reduce:transition-none ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={ariaLabel} className="space-y-1 py-1">
      <ul className="m-0 list-none space-y-1 p-0">
        {items.map((item) => {
          const isActive = currentHref === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl border-l-4 px-3.5 py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none ${
                  isActive
                    ? 'border-brand bg-slate-900 text-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <span aria-hidden="true" className={isActive ? 'text-brand-soft' : undefined}>
                  {getNavIcon(item.href)}
                </span>
                <span className="flex-1">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
