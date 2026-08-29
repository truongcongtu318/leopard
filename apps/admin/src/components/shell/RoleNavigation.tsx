'use client';

import Link from 'next/link';

export interface NavItem {
  label: string;
  href: string;
}

export interface RoleNavigationProps {
  items: readonly NavItem[];
  currentPath: string;
  ariaLabel?: string;
  tone?: 'light' | 'dark';
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

function getNavIcon(href: string) {
  if (href.endsWith('/orders')) {
    return (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    );
  }
  if (href.endsWith('/users')) {
    return (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  }
  if (href.endsWith('/fleets')) {
    return (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    );
  }
  if (href.endsWith('/drivers')) {
    return (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

export function RoleNavigation({
  items,
  currentPath,
  ariaLabel = 'Điều hướng theo vai trò',
  tone = 'light',
}: RoleNavigationProps) {
  const currentHref = findCurrentHref(items, currentPath);

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
                className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all motion-reduce:transition-none ${
                  isActive
                    ? 'bg-brand text-white shadow-brand translate-x-0.5 motion-reduce:transition-none'
                    : 'text-neutral-muted hover:bg-neutral-surface hover:text-neutral-text hover:translate-x-0.5 motion-reduce:transition-none'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'bg-neutral-surface text-neutral-muted group-hover:bg-white group-hover:text-neutral-text group-hover:shadow-sm'
                  }`}
                >
                  {getNavIcon(item.href)}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="opacity-80"><path d="m9 18 6-6-6-6"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-0 group-hover:opacity-40 transition-opacity"><path d="m9 18 6-6-6-6"/></svg>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

