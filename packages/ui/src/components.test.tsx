import { describe, expect, it, jest, beforeAll } from "@jest/globals";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

import { Button } from "./Button";
import { StatusBadge } from "./StatusBadge";
import { DataTable } from "./DataTable";
import { Pagination } from "./Pagination";
import { FilterBar } from "./FilterBar";
import { ScreenState } from "./ScreenState";
import { MapPanel } from "./MapPanel";

// ---- Button ----

describe("Button", () => {
  it("renders with primary variant by default", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("bg-brand");
  });

  it("renders secondary variant", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole("button", { name: "Secondary" });
    expect(btn.className).toContain("bg-neutral");
  });

  it("renders destructive variant", () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toContain("bg-danger");
  });

  it("renders ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole("button", { name: "Ghost" });
    expect(btn.className).toContain("bg-transparent");
  });

  it("renders size variants", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let btn = screen.getByRole("button", { name: "Small" });
    expect(btn.className).toContain("h-11");

    rerender(<Button size="md">Medium</Button>);
    btn = screen.getByRole("button", { name: "Medium" });
    expect(btn.className).toContain("h-11");

    rerender(<Button size="lg">Large</Button>);
    btn = screen.getByRole("button", { name: "Large" });
    expect(btn.className).toContain("h-12");
  });

  it("fires onClick when clicked", () => {
    const handleClick = jest.fn();
    render(<Button onPress={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", () => {
    const handleClick = jest.fn();
    render(
      <Button onPress={handleClick} isDisabled>
        Disabled
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Disabled" }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("shows spinner when loading", () => {
    render(<Button isLoading>Loading</Button>);
    const btn = screen.getByRole("button", { name: "Loading" });
    // Spinner element should be present
    const spinner = btn.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("does not fire onClick when loading", () => {
    const handleClick = jest.fn();
    render(
      <Button onPress={handleClick} isLoading>
        Loading
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Loading" }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("has disabled attribute and aria-disabled when disabled", () => {
    render(<Button isDisabled>Disabled</Button>);
    const btn = screen.getByRole("button", { name: "Disabled" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-disabled", "true");
  });

  it("has minimum 44px touch target", () => {
    render(<Button size="sm">Touch</Button>);
    const btn = screen.getByRole("button", { name: "Touch" });
    expect(btn.className).toMatch(/min-h-\[44px\]|h-11/);
  });

  it("supports forwardRef", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("merges custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    const btn = screen.getByRole("button", { name: "Custom" });
    expect(btn.className).toContain("custom-class");
  });
});

// ---- StatusBadge ----

describe("StatusBadge", () => {
  const cases: Array<{ status: string; expectedClass: string }> = [
    { status: "DELIVERED", expectedClass: "bg-success" },
    { status: "ACTIVE", expectedClass: "bg-active" },
    { status: "AVAILABLE", expectedClass: "bg-success" },
    { status: "BUSY", expectedClass: "bg-active" },
    { status: "REQUESTED", expectedClass: "bg-info" },
    { status: "PICKING_UP", expectedClass: "bg-warning" },
    { status: "IN_TRANSIT", expectedClass: "bg-active" },
    { status: "CANCELLED", expectedClass: "bg-danger" },
    { status: "DISABLED", expectedClass: "bg-danger" },
    { status: "FAILED", expectedClass: "bg-danger" },
    { status: "ACCEPTED", expectedClass: "bg-active" },
    { status: "INVITED", expectedClass: "bg-info" },
    { status: "QR_CREATED", expectedClass: "bg-info" },
    { status: "OFFLINE", expectedClass: "bg-neutral" },
    { status: "UNPAID", expectedClass: "bg-warning" },
    { status: "PAID_MANUAL", expectedClass: "bg-success" },
  ];

  it.each(cases)(
    'renders "$status" with $expectedClass',
    ({ status, expectedClass }) => {
      render(<StatusBadge status={status} />);
      // Statuses may be displayed with spaces replacing underscores
      const displayText = status.replace(/_/g, " ");
      const badge = screen.getByText(new RegExp(displayText, "i"));
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain(expectedClass);
    },
  );

  it("uses neutral styling for an unknown status", () => {
    render(<StatusBadge status="AWAITING_REVIEW" />);

    const badge = screen.getByText("AWAITING REVIEW");
    expect(badge.className).toContain("bg-neutral-surface");
    expect(badge.className).toContain("text-neutral-text");
    expect(badge.className).toContain("border-neutral-border");
  });

  it("uses the dedicated pill radius token", () => {
    render(<StatusBadge status="ACTIVE" />);

    expect(screen.getByText("ACTIVE").className).toContain("rounded-pill");
  });

  it("applies custom className", () => {
    render(<StatusBadge status="ACTIVE" className="my-badge" />);
    const badge = screen.getByText(/ACTIVE/);
    expect(badge.className).toContain("my-badge");
  });
});

// ---- DataTable ----

describe("DataTable", () => {
  const columns = [
    { key: "id", header: "ID", sortable: true },
    { key: "name", header: "Name", sortable: true },
    { key: "status", header: "Status" },
  ];
  const rows = [
    { id: 1, name: "Alpha", status: "ACTIVE" },
    { id: 2, name: "Beta", status: "DELIVERED" },
  ];

  it("renders column headers", () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByRole("columnheader", { name: "ID" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
  });

  it("renders rows with data", () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("shows loading skeleton when isLoading is true", () => {
    render(<DataTable columns={columns} rows={rows} isLoading />);
    const skeletons = document.querySelectorAll('[aria-busy="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty message when rows is empty", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        emptyMessage="No data available"
      />,
    );
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("calls onSort when a sortable column header is clicked", () => {
    const handleSort = jest.fn();
    render(
      <DataTable columns={columns} rows={rows} onSort={handleSort} />,
    );
    fireEvent.click(screen.getByRole("columnheader", { name: "ID" }));
    expect(handleSort).toHaveBeenCalledWith("id");
  });

  it("does not call onSort for non-sortable columns", () => {
    const handleSort = jest.fn();
    render(
      <DataTable columns={columns} rows={rows} onSort={handleSort} />,
    );
    fireEvent.click(screen.getByRole("columnheader", { name: "Status" }));
    expect(handleSort).not.toHaveBeenCalled();
  });

  it("has table role for accessibility", () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders custom render function for columns", () => {
    const cols = [
      { key: "id", header: "ID" },
      { key: "name", header: "Name", render: (row: Record<string, unknown>) => `Custom: ${row.name}` },
    ];
    render(<DataTable columns={cols} rows={rows} />);
    expect(screen.getByText("Custom: Alpha")).toBeInTheDocument();
  });
});

// ---- Pagination ----

describe("Pagination", () => {
  it("renders page numbers", () => {
    render(
      <Pagination page={1} totalPages={5} onPageChange={() => {}} />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("disables Previous button on first page", () => {
    render(
      <Pagination page={1} totalPages={5} onPageChange={() => {}} />,
    );
    const prevBtn = screen.getByRole("button", { name: /previous/i });
    expect(prevBtn).toBeDisabled();
  });

  it("disables Next button on last page", () => {
    render(
      <Pagination page={5} totalPages={5} onPageChange={() => {}} />,
    );
    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).toBeDisabled();
  });

  it("calls onPageChange when a page is clicked", () => {
    const handleChange = jest.fn();
    render(
      <Pagination page={1} totalPages={5} onPageChange={handleChange} />,
    );
    fireEvent.click(screen.getByText("3"));
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange when Next is clicked", () => {
    const handleChange = jest.fn();
    render(
      <Pagination page={2} totalPages={5} onPageChange={handleChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange when Previous is clicked", () => {
    const handleChange = jest.fn();
    render(
      <Pagination page={2} totalPages={5} onPageChange={handleChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it("shows screen reader page info", () => {
    render(
      <Pagination page={2} totalPages={5} onPageChange={() => {}} />,
    );
    expect(screen.getByText(/Page 2 of 5/)).toBeInTheDocument();
  });
});

// ---- FilterBar ----

describe("FilterBar", () => {
  it("renders text input and status dropdown", () => {
    render(
      <FilterBar filters={{ search: "", status: "" }} onFilterChange={() => {}} />,
    );
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("renders clear filters button", () => {
    render(
      <FilterBar
        filters={{ search: "test", status: "ACTIVE" }}
        onFilterChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("calls onFilterChange with debounced search", async () => {
    jest.useFakeTimers();
    const handleChange = jest.fn();
    render(
      <FilterBar filters={{ search: "", status: "" }} onFilterChange={handleChange} />,
    );
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "test" } });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: "test" }),
    );

    jest.useRealTimers();
  });

  it("calls onFilterChange immediately when status changes", () => {
    const handleChange = jest.fn();
    render(
      <FilterBar filters={{ search: "", status: "" }} onFilterChange={handleChange} />,
    );
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "ACTIVE" } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ACTIVE" }),
    );
  });

  it("clears filters when clear button is clicked", () => {
    const handleChange = jest.fn();
    render(
      <FilterBar
        filters={{ search: "test", status: "ACTIVE" }}
        onFilterChange={handleChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(handleChange).toHaveBeenCalledWith({ search: "", status: "" });
  });
});

// ---- ScreenState ----

describe("ScreenState", () => {
  it("renders loading spinner and message", () => {
    render(<ScreenState state="loading" />);
    // Has a status role for spinner
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders empty state with message", () => {
    render(<ScreenState state="empty" message="No items found" />);
    expect(screen.getByText("No items found")).toBeInTheDocument();
    expect(screen.getByText(/empty/i)).toBeInTheDocument();
  });

  it("renders error state with message and retry button", () => {
    const handleRetry = jest.fn();
    render(
      <ScreenState state="error" message="Something went wrong" onRetry={handleRetry} />,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("renders children when state is success", () => {
    render(
      <ScreenState state="success">
        <div>Content here</div>
      </ScreenState>,
    );
    expect(screen.getByText("Content here")).toBeInTheDocument();
  });
});

// ---- MapPanel ----

describe("MapPanel", () => {
  it("renders map placeholder", () => {
    render(<MapPanel />);
    expect(screen.getByText(/map placeholder/i)).toBeInTheDocument();
  });

  it("uses default height 400px", () => {
    render(<MapPanel />);
    const panel = screen.getByText(/map placeholder/i);
    expect(panel.style.height).toBe("400px");
  });

  it("uses custom height", () => {
    render(<MapPanel height="600px" />);
    const panel = screen.getByText(/map placeholder/i);
    expect(panel.style.height).toBe("600px");
  });
});
