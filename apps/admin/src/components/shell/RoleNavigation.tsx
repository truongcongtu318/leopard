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

export function RoleNavigation({
  items,
  currentPath,
  ariaLabel = 'Điều hướng theo vai trò',
  tone = 'light',
}: RoleNavigationProps) {
  const currentHref = findCurrentHref(items, currentPath);

  return (
    <nav aria-label={ariaLabel}>
      <ul className="m-0 list-none space-y-xs p-0">
        {items.map((item) => {
          const isActive = currentHref === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-11 items-center rounded-control px-md py-xs text-body-compact transition-colors motion-reduce:transition-none ${
                  isActive
                    ? tone === 'dark'
                      ? 'border-l-4 border-brand-soft bg-brand font-semibold text-brand-text'
                      : 'bg-active font-semibold text-active-text'
                    : tone === 'dark'
                      ? 'text-brand-soft hover:bg-brand/30 hover:text-brand-text'
                      : 'text-neutral-muted hover:bg-neutral-surface hover:text-neutral-text'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
