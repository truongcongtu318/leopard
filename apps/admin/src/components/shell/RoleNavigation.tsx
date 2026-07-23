"use client";

import Link from "next/link";

export interface NavItem {
  label: string;
  href: string;
}

export interface RoleNavigationProps {
  items: NavItem[];
  currentPath: string;
}

export function RoleNavigation({ items, currentPath }: RoleNavigationProps) {
  return (
    <nav role="navigation" aria-label="Role navigation">
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "block",
                  padding: "0.75rem 1rem",
                  textDecoration: "none",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#1d4ed8" : "#374151",
                  backgroundColor: isActive ? "#eff6ff" : "transparent",
                  borderRadius: "0.375rem",
                }}
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
