'use client';

import React from 'react';
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './Button';
import Select from './Select';

export interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Total number of items (for display) */
  totalItems?: number;
  /** Label for items (e.g., "image" → "95 images") */
  itemLabel?: string;
  /** Show item count on the left */
  showItemCount?: boolean;
  /** Show first/last page buttons */
  showFirstLast?: boolean;
  /** Current page size */
  pageSize?: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Pagination - Reusable pagination controls
 *
 * Extracted from DataTable for use in grid layouts and other contexts.
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemLabel = 'row',
  showItemCount = true,
  showFirstLast = true,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const goToFirst = () => onPageChange(1);
  const goToPrevious = () => onPageChange(currentPage - 1);
  const goToNext = () => onPageChange(currentPage + 1);
  const goToLast = () => onPageChange(totalPages);

  // Pluralize item label
  const itemLabelPlural = totalItems === 1 ? itemLabel : `${itemLabel}s`;

  // Page size select options
  const pageSizeSelectOptions = pageSizeOptions?.map((size) => ({
    value: String(size),
    label: String(size),
  }));

  const showPageSize =
    pageSize !== undefined && pageSizeOptions && onPageSizeChange;

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {/* Left side: Item count and page size */}
      <div className="flex items-center gap-3">
        {showItemCount && totalItems !== undefined && (
          <span className="type-body-sm text-[var(--color-text-muted)]">
            {totalItems} {itemLabelPlural}
          </span>
        )}
        {showPageSize && (
          <div className="flex items-center gap-1.5">
            <Select
              id="pagination-page-size"
              label="Items per page"
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
              options={pageSizeSelectOptions!}
              compact
              inline
            />
            <span className="type-body-sm text-[var(--color-text-muted)]">
              per page
            </span>
          </div>
        )}
      </div>

      {/* Navigation controls */}
      <div className="flex items-center space-x-2">
        {showFirstLast && (
          <Button
            variant="secondary"
            size="sm"
            onClick={goToFirst}
            disabled={!canGoPrevious}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={goToPrevious}
          disabled={!canGoPrevious}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="type-label px-2">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={goToNext}
          disabled={!canGoNext}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {showFirstLast && (
          <Button
            variant="secondary"
            size="sm"
            onClick={goToLast}
            disabled={!canGoNext}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default Pagination;
