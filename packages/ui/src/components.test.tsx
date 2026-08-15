import { describe, expect, it, jest, beforeAll } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { Button } from './Button';
import { ExternalStatusBadge, StatusBadge, type StatusBadgeProps } from './StatusBadge';
import { DataTable } from './DataTable';
import { Pagination } from './Pagination';
import { FilterBar } from './FilterBar';
import { ScreenState } from './ScreenState';
import { MapPanel } from './MapPanel';

// ---- Button ----

describe('Button', () => {
  it('renders with primary variant by default', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('bg-brand');
  });

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button', { name: 'Secondary' });
    expect(btn.className).toContain('bg-neutral');
  });

  it('renders destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toContain('bg-danger');
  });

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button', { name: 'Ghost' });
    expect(btn.className).toContain('bg-transparent');
  });

  it('renders size variants', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let btn = screen.getByRole('button', { name: 'Small' });
    expect(btn.className).toContain('h-11');

    rerender(<Button size="md">Medium</Button>);
    btn = screen.getByRole('button', { name: 'Medium' });
    expect(btn.className).toContain('h-11');

    rerender(<Button size="lg">Large</Button>);
    btn = screen.getByRole('button', { name: 'Large' });
    expect(btn.className).toContain('h-12');
  });

  it('fires onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onPress={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Click' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const handleClick = jest.fn();
    render(
      <Button onPress={handleClick} isDisabled>
        Disabled
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows spinner when loading', () => {
    render(<Button isLoading>Loading</Button>);
    const btn = screen.getByRole('button', { name: 'Loading' });
    // Spinner element should be present
    const spinner = btn.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('does not fire onClick when loading', () => {
    const handleClick = jest.fn();
    render(
      <Button onPress={handleClick} isLoading>
        Loading
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Loading' }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('has disabled attribute and aria-disabled when disabled', () => {
    render(<Button isDisabled>Disabled</Button>);
    const btn = screen.getByRole('button', { name: 'Disabled' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('has minimum 44px touch target', () => {
    render(<Button size="sm">Touch</Button>);
    const btn = screen.getByRole('button', { name: 'Touch' });
    expect(btn.className).toMatch(/min-h-\[44px\]|h-11/);
  });

  it('supports forwardRef', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('merges custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const btn = screen.getByRole('button', { name: 'Custom' });
    expect(btn.className).toContain('custom-class');
  });
});

// ---- StatusBadge ----

describe('StatusBadge', () => {
  const cases: Array<{
    props: StatusBadgeProps;
    label: string;
    expectedClass: string;
  }> = [
    {
      props: { domain: 'orderStatus', status: 'DELIVERED' },
      label: 'Đã giao',
      expectedClass: 'bg-success',
    },
    {
      props: { domain: 'orderStatus', status: 'REQUESTED' },
      label: 'Chờ tài xế',
      expectedClass: 'bg-info',
    },
    {
      props: { domain: 'orderStatus', status: 'PICKING_UP' },
      label: 'Đang đến điểm lấy',
      expectedClass: 'bg-warning',
    },
    {
      props: { domain: 'orderStatus', status: 'IN_TRANSIT' },
      label: 'Đang vận chuyển',
      expectedClass: 'bg-active',
    },
    {
      props: { domain: 'orderStatus', status: 'CANCELLED' },
      label: 'Đã hủy',
      expectedClass: 'bg-danger',
    },
    {
      props: { domain: 'orderStatus', status: 'ACCEPTED' },
      label: 'Đã nhận đơn',
      expectedClass: 'bg-active',
    },
    {
      props: { domain: 'paymentStatus', status: 'FAILED' },
      label: 'Thất bại',
      expectedClass: 'bg-danger',
    },
    {
      props: { domain: 'paymentStatus', status: 'QR_CREATED' },
      label: 'Đã tạo mã QR',
      expectedClass: 'bg-info',
    },
    {
      props: { domain: 'paymentStatus', status: 'UNPAID' },
      label: 'Chưa thanh toán',
      expectedClass: 'bg-warning',
    },
    {
      props: { domain: 'paymentStatus', status: 'PAID_MANUAL' },
      label: 'Đã xác nhận thanh toán',
      expectedClass: 'bg-success',
    },
    {
      props: { domain: 'driverAvailability', status: 'AVAILABLE' },
      label: 'Sẵn sàng',
      expectedClass: 'bg-success',
    },
    {
      props: { domain: 'driverAvailability', status: 'BUSY' },
      label: 'Đang bận',
      expectedClass: 'bg-active',
    },
    {
      props: { domain: 'driverAvailability', status: 'OFFLINE' },
      label: 'Ngoại tuyến',
      expectedClass: 'bg-neutral',
    },
    {
      props: { domain: 'fleetMemberStatus', status: 'INVITED' },
      label: 'Đã mời',
      expectedClass: 'bg-info',
    },
    {
      props: { domain: 'fleetMemberStatus', status: 'ACTIVE' },
      label: 'Đang tham gia',
      expectedClass: 'bg-active',
    },
    {
      props: { domain: 'fleetMemberStatus', status: 'REMOVED' },
      label: 'Đã gỡ khỏi đội xe',
      expectedClass: 'bg-neutral',
    },
    {
      props: { domain: 'userStatus', status: 'ACTIVE' },
      label: 'Đang hoạt động',
      expectedClass: 'bg-active',
    },
    {
      props: { domain: 'userStatus', status: 'DISABLED' },
      label: 'Đã vô hiệu hóa',
      expectedClass: 'bg-danger',
    },
  ];

  it.each(cases)('renders "$label" with $expectedClass', ({ props, label, expectedClass }) => {
    render(<StatusBadge {...props} />);
    const badge = screen.getByText(label);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain(expectedClass);
  });

  it('uses neutral styling for an unknown status', () => {
    render(<ExternalStatusBadge domain="orderStatus" status="AWAITING_REVIEW" />);

    const badge = screen.getByText('Trạng thái chưa được hỗ trợ');
    expect(badge.className).toContain('bg-neutral-surface');
    expect(badge.className).toContain('text-neutral-text');
    expect(badge.className).toContain('border-neutral-border');
  });

  it('uses the dedicated pill radius token', () => {
    render(<StatusBadge domain="userStatus" status="ACTIVE" />);

    expect(screen.getByText('Đang hoạt động').className).toContain('rounded-pill');
  });

  it('applies custom className', () => {
    render(<StatusBadge domain="fleetMemberStatus" status="ACTIVE" className="my-badge" />);
    const badge = screen.getByText('Đang tham gia');
    expect(badge.className).toContain('my-badge');
  });
});

// ---- DataTable ----

describe('DataTable', () => {
  const columns = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'status', header: 'Status' },
  ];
  const rows = [
    { id: 1, name: 'Alpha', status: 'ACTIVE' },
    { id: 2, name: 'Beta', status: 'DELIVERED' },
  ];

  it('renders column headers', () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
  });

  it('renders rows with data', () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<DataTable columns={columns} rows={rows} isLoading />);
    const skeletons = document.querySelectorAll('[aria-busy="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('stops skeleton motion when reduced motion is requested', () => {
    render(<DataTable columns={columns} rows={rows} isLoading />);

    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('motion-reduce:animate-none');
  });

  it('shows empty message when rows is empty', () => {
    render(<DataTable columns={columns} rows={[]} emptyMessage="No data available" />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('uses a focusable native button for sortable column headers', () => {
    const handleSort = jest.fn();
    render(<DataTable columns={columns} rows={rows} onSort={handleSort} />);

    const sortButton = screen.getByRole('button', { name: 'ID' });
    const columnHeader = screen.getByRole('columnheader', { name: 'ID' });

    expect(sortButton.tagName).toBe('BUTTON');
    expect(sortButton.closest('th')).toBe(columnHeader);
    sortButton.focus();
    expect(sortButton).toHaveFocus();

    fireEvent.click(sortButton);
    expect(handleSort).toHaveBeenCalledWith('id');
  });

  it('exposes the current optional sort direction on the column header', () => {
    const { rerender } = render(
      <DataTable columns={columns} rows={rows} sortKey="name" sortDirection="ascending" />,
    );

    expect(screen.getByRole('columnheader', { name: 'ID' })).not.toHaveAttribute('aria-sort');
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(screen.getByRole('columnheader', { name: 'Status' })).not.toHaveAttribute('aria-sort');

    rerender(<DataTable columns={columns} rows={rows} sortKey="name" sortDirection="descending" />);

    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    rerender(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).not.toHaveAttribute('aria-sort');
  });

  it('gives sortable headers a 44px target and visible focus treatment', () => {
    render(<DataTable columns={columns} rows={rows} onSort={() => {}} />);

    const sortButton = screen.getByRole('button', { name: 'ID' });
    expect(sortButton).toHaveClass('min-h-11');
    expect(sortButton).toHaveClass('min-w-11');
    expect(sortButton).toHaveClass('focus-visible:ring-2');
    expect(sortButton).toHaveClass('focus-visible:ring-brand');
  });

  it('does not call onSort for non-sortable columns', () => {
    const handleSort = jest.fn();
    render(<DataTable columns={columns} rows={rows} onSort={handleSort} />);
    fireEvent.click(screen.getByRole('columnheader', { name: 'Status' }));
    expect(handleSort).not.toHaveBeenCalled();
  });

  it('has table role for accessibility', () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders custom render function for columns', () => {
    const cols = [
      { key: 'id', header: 'ID' },
      {
        key: 'name',
        header: 'Name',
        render: (row: Record<string, unknown>) => `Custom: ${row.name}`,
      },
    ];
    render(<DataTable columns={cols} rows={rows} />);
    expect(screen.getByText('Custom: Alpha')).toBeInTheDocument();
  });
});

// ---- Pagination ----

describe('Pagination', () => {
  it('renders page numbers', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('disables Previous button on first page', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
    const prevBtn = screen.getByRole('button', { name: 'Về trang trước' });
    expect(prevBtn).toBeDisabled();
  });

  it('disables Next button on last page', () => {
    render(<Pagination page={5} totalPages={5} onPageChange={() => {}} />);
    const nextBtn = screen.getByRole('button', { name: 'Đến trang sau' });
    expect(nextBtn).toBeDisabled();
  });

  it('calls onPageChange when a page is clicked', () => {
    const handleChange = jest.fn();
    render(<Pagination page={1} totalPages={5} onPageChange={handleChange} />);
    fireEvent.click(screen.getByText('3'));
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange when Next is clicked', () => {
    const handleChange = jest.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={handleChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Đến trang sau' }));
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange when Previous is clicked', () => {
    const handleChange = jest.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={handleChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Về trang trước' }));
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it('shows screen reader page info', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByText('Trang 2 trên 5')).toBeInTheDocument();
  });
});

// ---- FilterBar ----

describe('FilterBar', () => {
  const fleetMemberStatusOptions = [
    { value: '', label: 'Tất cả trạng thái thành viên' },
    { value: 'INVITED', label: 'Đã mời' },
    { value: 'ACTIVE', label: 'Đang tham gia' },
    { value: 'REMOVED', label: 'Đã gỡ khỏi đội xe' },
  ] as const;

  const userStatusOptions = [
    { value: '', label: 'Tất cả trạng thái người dùng' },
    { value: 'ACTIVE', label: 'Đang hoạt động' },
    { value: 'DISABLED', label: 'Đã vô hiệu hóa' },
  ] as const;

  it('renders visible labels connected to the search and status controls', () => {
    render(
      <FilterBar
        filters={{ search: '', status: '' }}
        statusOptions={fleetMemberStatusOptions}
        onFilterChange={() => {}}
      />,
    );

    const searchInput = screen.getByLabelText('Tìm kiếm');
    const statusSelect = screen.getByLabelText('Trạng thái');
    const searchLabel = screen.getByText('Tìm kiếm', { selector: 'label' });
    const statusLabel = screen.getByText('Trạng thái', { selector: 'label' });

    expect(searchInput).toBeInTheDocument();
    expect(statusSelect).toBeInTheDocument();
    expect(searchLabel).toHaveAttribute('for', searchInput.id);
    expect(statusLabel).toHaveAttribute('for', statusSelect.id);
  });

  it('renders immutable domain-scoped status copy supplied by the caller', () => {
    const { rerender } = render(
      <FilterBar
        filters={{ search: '', status: 'ACTIVE' }}
        statusOptions={fleetMemberStatusOptions}
        onFilterChange={() => {}}
      />,
    );

    expect(
      screen.getAllByRole('option').map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: option.textContent,
      })),
    ).toEqual([
      { value: '', label: 'Tất cả trạng thái thành viên' },
      { value: 'INVITED', label: 'Đã mời' },
      { value: 'ACTIVE', label: 'Đang tham gia' },
      { value: 'REMOVED', label: 'Đã gỡ khỏi đội xe' },
    ]);

    rerender(
      <FilterBar
        filters={{ search: '', status: 'ACTIVE' }}
        statusOptions={userStatusOptions}
        onFilterChange={() => {}}
      />,
    );

    expect(
      screen.getAllByRole('option').map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: option.textContent,
      })),
    ).toEqual([
      { value: '', label: 'Tất cả trạng thái người dùng' },
      { value: 'ACTIVE', label: 'Đang hoạt động' },
      { value: 'DISABLED', label: 'Đã vô hiệu hóa' },
    ]);
  });

  it('renders clear filters button', () => {
    render(
      <FilterBar
        filters={{ search: 'test', status: 'ACTIVE' }}
        statusOptions={fleetMemberStatusOptions}
        onFilterChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Xóa bộ lọc' })).toBeInTheDocument();
  });

  it('gives controls and the clear action 44px targets with visible focus', () => {
    render(
      <FilterBar
        filters={{ search: 'test', status: 'ACTIVE' }}
        statusOptions={fleetMemberStatusOptions}
        onFilterChange={() => {}}
      />,
    );

    const controls = [
      screen.getByLabelText('Tìm kiếm'),
      screen.getByLabelText('Trạng thái'),
      screen.getByRole('button', { name: 'Xóa bộ lọc' }),
    ];

    controls.forEach((control) => {
      expect(control).toHaveClass('min-h-11');
      expect(control).toHaveClass('focus-visible:ring-2');
      expect(control).toHaveClass('focus-visible:ring-brand');
    });
  });

  it('calls onFilterChange with debounced search', async () => {
    jest.useFakeTimers();
    try {
      const handleChange = jest.fn();
      render(
        <FilterBar
          filters={{ search: '', status: '' }}
          statusOptions={fleetMemberStatusOptions}
          onFilterChange={handleChange}
        />,
      );
      const input = screen.getByLabelText('Tìm kiếm');
      fireEvent.change(input, { target: { value: 'test' } });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'test' }));
    } finally {
      jest.useRealTimers();
    }
  });

  it('calls onFilterChange immediately when status changes', () => {
    const handleChange = jest.fn();
    render(
      <FilterBar
        filters={{ search: '', status: '' }}
        statusOptions={fleetMemberStatusOptions}
        onFilterChange={handleChange}
      />,
    );
    const select = screen.getByLabelText('Trạng thái');
    fireEvent.change(select, { target: { value: 'ACTIVE' } });
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE' }));
  });

  it('returns a new filter object without mutating the input filters', () => {
    const filters = Object.freeze({ search: 'existing', status: 'INVITED' });
    const handleChange = jest.fn();
    render(
      <FilterBar
        filters={filters}
        statusOptions={fleetMemberStatusOptions}
        onFilterChange={handleChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Trạng thái'), {
      target: { value: 'REMOVED' },
    });

    expect(handleChange).toHaveBeenCalledWith({
      search: 'existing',
      status: 'REMOVED',
    });
    expect(handleChange.mock.calls[0]?.[0]).not.toBe(filters);
    expect(filters).toEqual({ search: 'existing', status: 'INVITED' });
  });

  it('clears filters and cancels a pending debounced search', () => {
    jest.useFakeTimers();
    try {
      const handleChange = jest.fn();
      render(
        <FilterBar
          filters={{ search: 'test', status: 'ACTIVE' }}
          statusOptions={fleetMemberStatusOptions}
          onFilterChange={handleChange}
        />,
      );

      fireEvent.change(screen.getByLabelText('Tìm kiếm'), {
        target: { value: 'pending' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith({ search: '', status: '' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('cleans up a pending search debounce on unmount', () => {
    jest.useFakeTimers();
    try {
      const handleChange = jest.fn();
      const { unmount } = render(
        <FilterBar
          filters={{ search: '', status: '' }}
          statusOptions={fleetMemberStatusOptions}
          onFilterChange={handleChange}
        />,
      );

      fireEvent.change(screen.getByLabelText('Tìm kiếm'), {
        target: { value: 'pending' },
      });
      unmount();
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(handleChange).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

// ---- ScreenState ----

describe('ScreenState', () => {
  it('renders loading spinner and message', () => {
    render(<ScreenState state="loading" />);
    expect(screen.getByText('Đang tải dữ liệu')).toBeInTheDocument();
  });

  it('renders empty state with message', () => {
    render(<ScreenState state="empty" message="Chưa có đơn hàng" />);
    expect(screen.getByText('Chưa có đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument();
  });

  it('renders error state with message and retry button', () => {
    const handleRetry = jest.fn();
    render(<ScreenState state="error" message="Không thể tải đơn hàng" onRetry={handleRetry} />);
    expect(screen.getByText('Không thể tải đơn hàng')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Thử lại' });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders children when state is success', () => {
    render(
      <ScreenState state="success">
        <div>Content here</div>
      </ScreenState>,
    );
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });
});

// ---- MapPanel ----

describe('MapPanel', () => {
  it('renders route content with a visible textual alternative', () => {
    render(
      <MapPanel state="route" textAlternative="Tuyến từ Kho A đến Kho B">
        <div>Map canvas</div>
      </MapPanel>,
    );
    expect(screen.getByText('Map canvas')).toBeInTheDocument();
    expect(screen.getByText('Tuyến từ Kho A đến Kho B')).toBeInTheDocument();
  });

  it('uses a stable semantic default height with a 280px minimum', () => {
    render(<MapPanel state="loading" />);
    const panel = screen.getByRole('region', { name: 'Bản đồ tuyến đường' });
    expect(panel).toHaveClass('min-h-map-min', 'h-map-standard');
    expect(panel).not.toHaveAttribute('style');
  });

  it('supports a named large height without an inline style', () => {
    render(<MapPanel state="loading" height="large" />);
    const panel = screen.getByRole('region', { name: 'Bản đồ tuyến đường' });
    expect(panel).toHaveClass('h-map-large');
    expect(panel).not.toHaveAttribute('style');
  });
});
