'use client';

import React, { useState, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Header,
  HeaderGroup,
  Row,
  Cell,
  RowSelectionState,
  getFilteredRowModel,
  ColumnFiltersState,
  FilterFn,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  Plus,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './Button';
import { Pagination } from './Pagination';

// Custom type for column meta data
export type ColumnMeta = {
  width?: string | number;
};

// Status variants for the table
export type DataTableStatus =
  'default' | 'error' | 'warning' | 'success' | 'info';

// Status message type
export interface DataTableStatusMessage {
  type: DataTableStatus;
  message: string;
}

// Filter option type
export interface FilterOption {
  id: string;
  label: string;
  value: string;
  column: string;
}

// Filter group type
export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
}

// Row selection action type
export interface DataTableSelectionAction<TData = unknown> {
  label: string;
  onClick: (selectedRows: TData[]) => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger';
}

// Add item action type
export interface DataTableAddAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  position?: 'top-left' | 'top-right';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
}

// Utility action type for additional operations
export interface DataTableUtilityAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
}

// Interfaces
export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
  showPagination?: boolean;
  pageSize?: number;
  statusMessage?: DataTableStatusMessage;
  enableRowSelection?: boolean;
  selectionActions?: DataTableSelectionAction<TData>[];
  getRowId?: (row: TData) => string;
  addAction?: DataTableAddAction;
  utilityActions?: DataTableUtilityAction[];
  filterGroups?: FilterGroup[];
}

// Main DataTable component
export function DataTable<TData, TValue>({
  columns,
  data,
  className,
  showPagination = true,
  pageSize = 10,
  statusMessage,
  enableRowSelection = false,
  selectionActions = [],
  getRowId,
  addAction,
  utilityActions = [],
  filterGroups = [],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Add selection column if row selection is enabled
  const selectionColumn: ColumnDef<TData, unknown> = {
    id: 'select',
    header: ({ table }) => (
      <div className="px-1">
        <input
          type="checkbox"
          checked={
            table.getPreFilteredRowModel().rows.length > 0 &&
            table.getIsAllPageRowsSelected()
          }
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-4 w-4 rounded border-[var(--color-border-default)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="px-1">
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-[var(--color-border-default)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
        />
      </div>
    ),
    enableSorting: false,
    meta: {
      width: '40px',
    },
  };

  // Special column filter function that can check dynamic properties
  const filterFn: FilterFn<TData> = (row, columnId, filterValue) => {
    const value = row.getValue(columnId) as string | undefined;

    // If we have a direct match in the column, use it
    if (value !== undefined) {
      return (filterValue as string[]).includes(value);
    }

    // Check if the property exists on the row.original (for dynamically added properties)
    const originalValue = (row.original as Record<string, unknown>)[columnId];
    if (originalValue !== undefined) {
      return (filterValue as string[]).includes(originalValue as string);
    }

    return false;
  };

  // Create accessor columns for all used filter columns
  const filterColumnNames = new Set<string>();
  filterGroups.forEach((group) => {
    group.options.forEach((option) => {
      filterColumnNames.add(option.column);
    });
  });

  // Only create accessor columns for filter columns that aren't already explicitly defined
  const existingColumnIds = new Set<string>();
  columns.forEach((col) => {
    if (col.id) existingColumnIds.add(col.id);
  });

  // Create hidden accessor columns for any filter columns that don't exist
  const accessorColumns: ColumnDef<TData, unknown>[] = [];
  filterColumnNames.forEach((columnName) => {
    if (!existingColumnIds.has(columnName)) {
      accessorColumns.push({
        id: columnName,
        accessorFn: (row) => (row as Record<string, unknown>)[columnName],
        enableHiding: true,
        filterFn, // Use our custom filter function
        meta: { isFilterOnly: true },
      });
    }
  });

  // Apply our custom filterFn to all columns that might be filtered
  const enhancedColumns = columns.map((col) => {
    // If this column is used for filtering, add our custom filterFn
    if (filterColumnNames.has(col.id as string)) {
      return {
        ...col,
        filterFn,
      };
    }
    return col;
  });

  const tableColumns = [
    ...(enableRowSelection ? [selectionColumn] : []),
    ...enhancedColumns,
    ...accessorColumns,
  ];

  // Add columnSizing to make sure table respects size specifications
  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      rowSelection,
      columnFilters,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    getRowId,
    initialState: {
      pagination: {
        pageSize,
      },
      columnVisibility: Object.fromEntries(
        accessorColumns.map((col) => [col.id as string, false]) // Hide filter-only columns
      ),
    },
    defaultColumn: {
      minSize: 0,
      size: 0, // Start with 0 and let the table auto-distribute space
      maxSize: 1000,
    },
    columnResizeMode: 'onChange',
  });

  // Add useEffect to update page size when the prop changes
  useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  // Calculate selected rows for actions
  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);
  const hasSelectedRows = selectedRows.length > 0;

  // Filter handling functions
  const applyFilter = (filter: FilterOption) => {
    if (!activeFilters.some((f) => f.id === filter.id)) {
      // Add to active filters
      setActiveFilters([...activeFilters, filter]);

      // Update column filters for table
      const currentFilters = [...columnFilters];
      const columnFilterIndex = currentFilters.findIndex(
        (f) => f.id === filter.column
      );

      if (columnFilterIndex >= 0) {
        // Add value to existing filter
        const currentValues = currentFilters[columnFilterIndex]
          .value as string[];
        currentFilters[columnFilterIndex] = {
          ...currentFilters[columnFilterIndex],
          value: [...currentValues, filter.value],
        };
      } else {
        // Create new filter
        currentFilters.push({
          id: filter.column,
          value: [filter.value],
        });
      }

      // Apply the column filters, this will trigger filtering with our custom filterFn
      setColumnFilters(currentFilters);
    }

    setShowFilterMenu(false);
  };

  const removeFilter = (filter: FilterOption) => {
    // Remove from active filters
    setActiveFilters(activeFilters.filter((f) => f.id !== filter.id));

    // Update column filters
    const currentFilters = [...columnFilters];
    const columnFilterIndex = currentFilters.findIndex(
      (f) => f.id === filter.column
    );

    if (columnFilterIndex >= 0) {
      const currentValues = currentFilters[columnFilterIndex].value as string[];
      const newValues = currentValues.filter((v) => v !== filter.value);

      if (newValues.length > 0) {
        // Update with remaining values
        currentFilters[columnFilterIndex] = {
          ...currentFilters[columnFilterIndex],
          value: newValues,
        };
      } else {
        // Remove filter entirely
        currentFilters.splice(columnFilterIndex, 1);
      }

      setColumnFilters(currentFilters);
    }
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setColumnFilters([]);
  };

  // Render status message if present
  const renderStatusMessage = () => {
    if (!statusMessage) return null;

    const statusStyles = {
      error: {
        bg: 'bg-[var(--color-error-bg)]',
        border: 'border-[var(--color-error)]',
        text: 'text-[var(--color-error-fg)]',
        icon: <AlertCircle className="mr-2 h-4 w-4" />,
      },
      warning: {
        bg: 'bg-[var(--color-caution-bg)]',
        border: 'border-[var(--color-caution)]',
        text: 'text-[var(--color-caution-fg)]',
        icon: <AlertCircle className="mr-2 h-4 w-4" />,
      },
      success: {
        bg: 'bg-[var(--color-success-bg)]',
        border: 'border-[var(--color-success)]',
        text: 'text-[var(--color-success-fg)]',
        icon: null,
      },
      info: {
        bg: 'bg-[var(--color-info-bg)]',
        border: 'border-[var(--color-info)]',
        text: 'text-[var(--color-info-fg)]',
        icon: <Info className="mr-2 h-4 w-4" />,
      },
      default: {
        bg: 'bg-[var(--color-surface-section)]',
        border: 'border-[var(--color-border-default)]',
        text: 'text-[var(--color-text-muted)]',
        icon: null,
      },
    };

    const style = statusStyles[statusMessage.type] || statusStyles.default;

    return (
      <div
        className={`mb-3 rounded-md border p-3 ${style.bg} ${style.border} ${style.text} flex items-center`}
      >
        {style.icon}
        <span>{statusMessage.message}</span>
      </div>
    );
  };

  // Render active filters
  const renderActiveFilters = () => {
    if (activeFilters.length === 0) return null;

    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <div
              key={filter.id}
              className="type-label-sm inline-flex items-center rounded-full bg-[var(--color-primary-light)] px-2 py-1 text-[var(--color-primary)]"
            >
              <span className="mr-1">{filter.label}</span>
              <button
                onClick={() => removeFilter(filter)}
                className="hover:bg-opacity-80 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"
              >
                <X className="h-2 w-2" />
                <span className="sr-only">Remove filter</span>
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={clearAllFilters}
          className="type-label-sm text-[var(--color-text-muted)] underline hover:text-[var(--color-primary)]"
        >
          Clear all
        </button>
      </div>
    );
  };

  // Render filter menu
  const renderFilterMenu = () => {
    if (!filterGroups || filterGroups.length === 0) return null;

    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilterMenu(!showFilterMenu)}
          className="flex items-center"
        >
          <Filter className="mr-1 h-4 w-4" />
          Filter
        </Button>

        {showFilterMenu && (
          <div className="absolute right-0 z-10 mt-1 w-64 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-2 shadow-lg">
            <div className="mb-2 border-b border-[var(--color-border-subtle)] pb-2">
              <h3 className="type-label mb-1">Filters</h3>
            </div>

            {filterGroups.map((group) => (
              <div key={group.id} className="mb-3">
                <h4 className="type-label-sm mb-1 text-[var(--color-text-muted)]">
                  {group.label}
                </h4>
                <div className="space-y-1">
                  {group.options.map((option) => {
                    const isActive = activeFilters.some(
                      (f) => f.id === option.id
                    );
                    return (
                      <button
                        key={option.id}
                        className={`type-body-sm w-full rounded-sm px-2 py-1 text-left ${isActive ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'hover:bg-[var(--color-surface-section)]'}`}
                        onClick={() => applyFilter(option)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render action bar (selection actions and/or add action)
  const renderActionBar = () => {
    const hasSelectionActions =
      enableRowSelection && hasSelectedRows && selectionActions.length > 0;
    const hasAddAction = !!addAction;
    const hasUtilityActions = utilityActions.length > 0;
    const hasFilters = filterGroups.length > 0;
    const hasActiveFilters = activeFilters.length > 0;

    if (
      !hasSelectionActions &&
      !hasAddAction &&
      !hasUtilityActions &&
      !hasFilters &&
      !hasActiveFilters
    ) {
      return null;
    }

    return (
      <div className="mb-3 flex items-center justify-between">
        {/* Left Side: Selection actions */}
        <div className="flex items-center space-x-2">
          {hasSelectionActions ? (
            <>
              <span className="type-body-sm mr-3 text-[var(--color-text-muted)]">
                {selectedRows.length}{' '}
                {selectedRows.length === 1 ? 'row' : 'rows'} selected
              </span>
              {selectionActions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant || 'secondary'}
                  onClick={() => action.onClick(selectedRows as TData[])}
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </>
          ) : (
            <div></div>
          )}
        </div>

        {/* Right Side: Active filters, filter button, utility actions, add action */}
        <div className="flex items-center space-x-3">
          {/* Active filters */}
          {hasActiveFilters && renderActiveFilters()}

          {/* Filter button */}
          {hasFilters && renderFilterMenu()}

          {/* Utility actions */}
          {hasUtilityActions && (
            <div className="flex items-center space-x-2">
              {utilityActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={action.onClick}
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Add action */}
          {hasAddAction && (
            <Button
              variant={addAction.variant || 'primary'}
              size="sm"
              onClick={addAction.onClick}
            >
              {addAction.icon || <Plus className="mr-1 h-4 w-4" />}
              {addAction.label}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      {renderStatusMessage()}

      {/* Combined action bar with selection actions and add action */}
      {renderActionBar()}

      <div className="overflow-hidden rounded-md border border-[var(--color-border-default)]">
        <table className="w-full table-fixed caption-bottom">
          <thead className="bg-[var(--color-surface-section)]">
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header: Header<TData, unknown>) => {
                  // Get style for this specific column
                  const columnWidth = (
                    header.column.columnDef.meta as ColumnMeta
                  )?.width;
                  const style = columnWidth
                    ? { width: columnWidth }
                    : { width: header.getSize() };

                  return (
                    <th
                      key={header.id}
                      className="type-label h-12 px-4 text-left align-middle text-[var(--color-text-muted)] [&:has([role=checkbox])]:pr-0"
                      style={style}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex items-center gap-1',
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none'
                              : ''
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: <ChevronUp className="h-4 w-4" />,
                            desc: <ChevronDown className="h-4 w-4" />,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row: Row<TData>) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-t border-[var(--color-border-subtle)] transition-colors',
                    row.getIsSelected()
                      ? 'bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-light)]'
                      : 'hover:bg-[var(--color-surface-section)]'
                  )}
                >
                  {row.getVisibleCells().map((cell: Cell<TData, unknown>) => {
                    // Get style for this specific column
                    const columnWidth = (
                      cell.column.columnDef.meta as ColumnMeta
                    )?.width;
                    const style = columnWidth
                      ? { width: columnWidth }
                      : { width: cell.column.getSize() };

                    return (
                      <td
                        key={cell.id}
                        className="p-4 align-middle [&:has([role=checkbox])]:pr-0"
                        style={style}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={tableColumns.length}
                  className="h-24 text-center text-[var(--color-text-muted)]"
                >
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <Pagination
          currentPage={table.getState().pagination.pageIndex + 1}
          totalPages={table.getPageCount()}
          totalItems={table.getFilteredRowModel().rows.length}
          onPageChange={(page) => table.setPageIndex(page - 1)}
          showItemCount
          className="mt-4"
        />
      )}
    </div>
  );
}
