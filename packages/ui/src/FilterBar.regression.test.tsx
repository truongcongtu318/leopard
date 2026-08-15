import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { FilterBar, type FilterBarFilters } from './FilterBar';

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Đang hoạt động' },
] as const;

describe('FilterBar regressions', () => {
  it('keeps the latest status when a pending search debounce fires', () => {
    jest.useFakeTimers();

    try {
      const emittedFilters = jest.fn<(filters: FilterBarFilters) => void>();

      function FilterHarness() {
        const [filters, setFilters] = React.useState<FilterBarFilters>({
          search: '',
          status: '',
        });

        const handleFilterChange = (nextFilters: FilterBarFilters) => {
          emittedFilters(nextFilters);
          setFilters(nextFilters);
        };

        return (
          <FilterBar
            filters={filters}
            statusOptions={statusOptions}
            onFilterChange={handleFilterChange}
          />
        );
      }

      render(<FilterHarness />);

      fireEvent.change(screen.getByLabelText('Tìm kiếm'), {
        target: { value: 'LP-2026' },
      });
      fireEvent.change(screen.getByLabelText('Trạng thái'), {
        target: { value: 'ACTIVE' },
      });

      expect(emittedFilters).toHaveBeenLastCalledWith({
        search: '',
        status: 'ACTIVE',
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(emittedFilters).toHaveBeenLastCalledWith({
        search: 'LP-2026',
        status: 'ACTIVE',
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
