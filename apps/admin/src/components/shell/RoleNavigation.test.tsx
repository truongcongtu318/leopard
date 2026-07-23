import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { RoleNavigation } from "./RoleNavigation";

const navItems = [
  { label: "Dashboard", href: "/fleet" },
  { label: "Drivers", href: "/fleet/drivers" },
  { label: "Orders", href: "/fleet/orders" },
];

describe("RoleNavigation", () => {
  it("renders all nav items", () => {
    render(<RoleNavigation items={navItems} currentPath="/fleet" />);
    for (const item of navItems) {
      expect(screen.getByText(item.label)).toBeDefined();
    }
  });

  it("highlights current route with aria-current=\"page\"", () => {
    render(<RoleNavigation items={navItems} currentPath="/fleet/drivers" />);
    const driversLink = screen.getByText("Drivers");
    expect(driversLink.getAttribute("aria-current")).toBe("page");
  });

  it("does not set aria-current on inactive items", () => {
    render(<RoleNavigation items={navItems} currentPath="/fleet/drivers" />);
    const dashboardLink = screen.getByText("Dashboard");
    expect(dashboardLink.getAttribute("aria-current")).toBeNull();
  });

  it("renders links with correct hrefs", () => {
    render(<RoleNavigation items={navItems} currentPath="/fleet" />);
    for (const item of navItems) {
      const link = screen.getByText(item.label);
      expect(link.getAttribute("href")).toBe(item.href);
    }
  });

  it("has accessible navigation role", () => {
    render(<RoleNavigation items={navItems} currentPath="/fleet" />);
    const nav = screen.getByRole("navigation");
    expect(nav).toBeDefined();
  });
});
