"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { RoleNavigation, type NavItem } from "./RoleNavigation";

export interface OperationsShellProps {
  children: React.ReactNode;
  role: string;
  navItems: NavItem[];
}

export function OperationsShell({
  children,
  role,
  navItems,
}: OperationsShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close drawer
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  // Focus trap inside drawer
  useEffect(() => {
    if (!drawerOpen) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ];
    const focusableSelector = focusableSelectors.join(",");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
        return;
      }

      if (e.key !== "Tab") return;

      const focusableElements = drawer.querySelectorAll(focusableSelector);
      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (!firstFocusable || !lastFocusable) return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    drawer.addEventListener("keydown", handleKeyDown);

    // Focus the close button when drawer opens
    closeButtonRef.current?.focus();

    return () => {
      drawer.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen, closeDrawer]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const toggleDrawer = () => setDrawerOpen((prev) => !prev);

  const brand = "LEOPARD";

  const sidebarContent = (
    <div style={{ padding: "1rem" }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: "1.25rem",
          marginBottom: "1.5rem",
          padding: "0 1rem",
        }}
      >
        {brand}
      </div>
      <p
        style={{
          fontSize: "0.75rem",
          textTransform: "uppercase",
          color: "#6b7280",
          padding: "0 1rem",
          marginBottom: "0.5rem",
        }}
      >
        {role === "admin" ? "Administration" : "Fleet Owner"}
      </p>
      <RoleNavigation items={navItems} currentPath={pathname} />
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Desktop sidebar */}
      <aside
        aria-label="Main navigation"
        style={{
          display: "none",
          width: "260px",
          flexShrink: 0,
          borderRight: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          overflowY: "auto",
        }}
        className="desktop-sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile/tablet hamburger */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
        className="mobile-header"
      >
        <button
          ref={hamburgerRef}
          onClick={toggleDrawer}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          style={{
            background: "none",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            padding: "0.5rem",
            cursor: "pointer",
            marginRight: "0.75rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>{brand}</span>
      </header>

      {/* Mobile/tablet drawer overlay */}
      {drawerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 30,
            display: "flex",
          }}
        >
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.3)",
            }}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <nav
            ref={drawerRef}
            role="navigation"
            aria-label="Main navigation"
            style={{
              position: "relative",
              width: "280px",
              maxWidth: "85vw",
              backgroundColor: "#ffffff",
              height: "100%",
              overflowY: "auto",
              boxShadow: "2px 0 12px rgba(0, 0, 0, 0.15)",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem 1rem",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <span style={{ fontWeight: 600 }}>{brand}</span>
              <button
                ref={closeButtonRef}
                onClick={closeDrawer}
                aria-label="Close navigation menu"
                style={{
                  background: "none",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  padding: "0.5rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="20"
                  height="20"
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
            {sidebarContent}
          </nav>
        </div>
      )}

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        className="content-wrapper"
      >
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
          }}
        >
          {children}
        </main>
      </div>

      {/* Responsive styles */}
      <style jsx>{`
        /* Desktop: show sidebar, hide mobile header */
        @media (min-width: 1024px) {
          .desktop-sidebar {
            display: block;
          }
          .mobile-header {
            display: none;
          }
          .content-wrapper {
            margin-left: 260px;
          }
        }
        /* Tablet and below: show mobile header, hide desktop sidebar */
        @media (max-width: 1023px) {
          .desktop-sidebar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
