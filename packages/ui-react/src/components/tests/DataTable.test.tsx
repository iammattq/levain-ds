import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataTable, DataTableProps } from '../DataTable';
import { ColumnDef } from '@tanstack/react-table';

// Mock for Lucide React icons
jest.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="icon-chevron-down">▼</div>,
  ChevronUp: () => <div data-testid="icon-chevron-up">▲</div>,
  ChevronsLeft: () => <div data-testid="icon-chevrons-left">◀◀</div>,
  ChevronsRight: () => <div data-testid="icon-chevrons-right">▶▶</div>,
  ChevronLeft: () => <div data-testid="icon-chevron-left">◀</div>,
  ChevronRight: () => <div data-testid="icon-chevron-right">▶</div>,
  AlertCircle: () => <div data-testid="icon-alert-circle">⚠</div>,
  Info: () => <div data-testid="icon-info">ℹ</div>,
  Plus: () => <div data-testid="icon-plus">+</div>,
  Filter: () => <div data-testid="icon-filter">🔍</div>,
  X: () => <div data-testid="icon-x">✕</div>,
}));

// Sample test data
type TestData = {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  dynamic?: string;
};

const testData: TestData[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    status: 'Active',
    role: 'Admin',
    dynamic: 'ValueA',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    status: 'Inactive',
    role: 'User',
  },
  {
    id: '3',
    name: 'Carol Davis',
    email: 'carol@example.com',
    status: 'Active',
    role: 'Editor',
    dynamic: 'ValueB',
  },
  {
    id: '4',
    name: 'Dave Wilson',
    email: 'dave@example.com',
    status: 'Pending',
    role: 'User',
  },
  {
    id: '5',
    name: 'Eve Brown',
    email: 'eve@example.com',
    status: 'Active',
    role: 'Viewer',
    dynamic: 'ValueA',
  },
];

// Explicitly define all columns used, including dynamic if needed for headers
const baseColumns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
];

// Common Filter Groups for tests
const filterGroups = [
  {
    id: 'status-filters',
    label: 'Status',
    options: [
      {
        id: 'status-active',
        label: 'Active',
        value: 'Active',
        column: 'status',
      },
      {
        id: 'status-inactive',
        label: 'Inactive',
        value: 'Inactive',
        column: 'status',
      },
    ],
  },
  {
    id: 'role-filters',
    label: 'Role',
    options: [
      { id: 'role-admin', label: 'Admin', value: 'Admin', column: 'role' },
      { id: 'role-user', label: 'User', value: 'User', column: 'role' },
    ],
  },
  {
    id: 'dynamic-filters',
    label: 'Dynamic Prop', // Testing filterFn fallback
    options: [
      { id: 'dynamic-a', label: 'Value A', value: 'ValueA', column: 'dynamic' },
    ],
  },
];

describe('DataTable Component', () => {
  const renderDataTable = (
    props?: Partial<DataTableProps<TestData, unknown>>
  ) => {
    const defaultProps: DataTableProps<TestData, unknown> = {
      columns: baseColumns,
      data: testData,
      filterGroups:
        props?.filterGroups === undefined ? filterGroups : props.filterGroups,
    };

    return render(<DataTable {...defaultProps} {...props} />);
  };

  describe('Basic Rendering', () => {
    it('renders the table with headers and data', () => {
      renderDataTable({ filterGroups: [] });

      // Check headers
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();

      // Check data
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      expect(screen.getByText('Carol Davis')).toBeInTheDocument();
    });

    it('applies default styling', () => {
      const { container } = renderDataTable({ filterGroups: [] });

      const table = container.querySelector('table');
      expect(table).toHaveClass('w-full');
      expect(table).toHaveClass('caption-bottom');
    });
  });

  describe('Pagination', () => {
    it('renders pagination controls when showPagination is true', () => {
      renderDataTable({ showPagination: true });

      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
      expect(screen.getByTestId('icon-chevrons-left')).toBeInTheDocument();
      expect(screen.getByTestId('icon-chevrons-right')).toBeInTheDocument();
    });

    it('does not render pagination controls when showPagination is false', () => {
      renderDataTable({ showPagination: false });

      expect(screen.queryByText('Page 1 of 1')).not.toBeInTheDocument();
    });

    it('respects pageSize prop', () => {
      // Create more test data to test pagination
      const manyItems = Array.from({ length: 15 }, (_, i) => ({
        id: `id-${i + 1}`,
        name: `Name ${i + 1}`,
        email: `email${i + 1}@example.com`,
        status: i % 2 === 0 ? 'Active' : 'Inactive',
        role: 'User',
      }));

      renderDataTable({ data: manyItems, pageSize: 5 });

      // Only the first 5 items should be visible
      expect(screen.getByText('Name 1')).toBeInTheDocument();
      expect(screen.getByText('Name 5')).toBeInTheDocument();
      expect(screen.queryByText('Name 6')).not.toBeInTheDocument();

      // Should show 3 pages (15 items / 5 per page)
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });
  });

  describe('Status Messages', () => {
    it('renders error status message', () => {
      renderDataTable({
        statusMessage: {
          type: 'error',
          message: 'Error fetching data',
        },
      });

      const message = screen.getByText('Error fetching data');
      expect(message).toBeInTheDocument();
      expect(message.closest('div')).toHaveClass('border-[var(--color-error)]');
      expect(screen.getByTestId('icon-alert-circle')).toBeInTheDocument();
    });

    it('renders info status message', () => {
      renderDataTable({
        statusMessage: {
          type: 'info',
          message: 'Information message',
        },
      });

      const message = screen.getByText('Information message');
      expect(message).toBeInTheDocument();
      expect(message.closest('div')).toHaveClass('border-[var(--color-info)]');
      expect(screen.getByTestId('icon-info')).toBeInTheDocument();
    });

    it('renders warning status message', () => {
      renderDataTable({
        statusMessage: {
          type: 'warning',
          message: 'Warning message',
        },
      });

      const message = screen.getByText('Warning message');
      expect(message).toBeInTheDocument();
      expect(message.closest('div')).toHaveClass(
        'border-[var(--color-caution)]'
      );
      expect(screen.getByTestId('icon-alert-circle')).toBeInTheDocument();
    });

    it('renders success status message', () => {
      renderDataTable({
        statusMessage: {
          type: 'success',
          message: 'Success message',
        },
      });

      const message = screen.getByText('Success message');
      expect(message).toBeInTheDocument();
      expect(message.closest('div')).toHaveClass(
        'border-[var(--color-success)]'
      );
    });

    it('renders default status message', () => {
      renderDataTable({
        statusMessage: {
          type: 'default',
          message: 'Default message',
        },
      });

      const message = screen.getByText('Default message');
      expect(message).toBeInTheDocument();
      expect(message.closest('div')).toHaveClass(
        'border-[var(--color-border-default)]'
      );
    });
  });

  describe('Row Selection', () => {
    it('shows checkboxes when enableRowSelection is true', () => {
      renderDataTable({ enableRowSelection: true });

      // Should have header checkbox and one for each row
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(testData.length + 1); // +1 for header
    });

    it('does not show checkboxes when enableRowSelection is false', () => {
      renderDataTable({ enableRowSelection: false });

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('triggers selection actions when rows are selected', () => {
      const mockAction = jest.fn();
      renderDataTable({
        enableRowSelection: true,
        selectionActions: [
          { label: 'Delete Selected', onClick: mockAction, variant: 'danger' },
        ],
      });

      // Select a row
      const firstRowCheckbox = screen.getAllByRole('checkbox')[1]; // Skip header checkbox
      fireEvent.click(firstRowCheckbox);

      // Now click the action button
      const actionButton = screen.getByText('Delete Selected');
      fireEvent.click(actionButton);

      // Should call with the selected row data
      expect(mockAction).toHaveBeenCalledWith([testData[0]]);
    });
  });

  describe('Add Action', () => {
    it('renders add button when addAction is provided', () => {
      const mockAddAction = jest.fn();
      renderDataTable({
        addAction: {
          label: 'Add New Item',
          onClick: mockAddAction,
        },
      });

      const addButton = screen.getByText('Add New Item');
      expect(addButton).toBeInTheDocument();

      fireEvent.click(addButton);
      expect(mockAddAction).toHaveBeenCalled();
    });
  });

  describe('Filtering', () => {
    it('renders filter button when filterGroups are provided', () => {
      renderDataTable({ filterGroups });

      const filterButton = screen.getByText('Filter');
      expect(filterButton).toBeInTheDocument();
      expect(screen.getByTestId('icon-filter')).toBeInTheDocument();
    });

    it('opens filter menu on button click', () => {
      renderDataTable({ filterGroups });

      const filterButton = screen.getByText('Filter');
      fireEvent.click(filterButton);

      // Check if filter group labels are visible
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument(); // Check an option label
    });

    it('applies a single filter from the menu', () => {
      renderDataTable({ filterGroups });

      const filterButton = screen.getByText('Filter');
      fireEvent.click(filterButton);

      // Click the 'Active' status filter option
      const activeOption = screen.getByText('Active');
      fireEvent.click(activeOption);

      // Check if only active rows are visible
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument(); // Active
      expect(screen.getByText('Carol Davis')).toBeInTheDocument(); // Active
      expect(screen.getByText('Eve Brown')).toBeInTheDocument(); // Active
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument(); // Inactive
      expect(screen.queryByText('Dave Wilson')).not.toBeInTheDocument(); // Pending

      // Check if active filter badge is shown
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Clear all')).toBeInTheDocument();
      expect(screen.getByTestId('icon-x')).toBeInTheDocument(); // Remove icon in badge
    });

    it('applies multiple filters from different groups', () => {
      renderDataTable({ filterGroups });

      // Apply 'Active' status filter
      fireEvent.click(screen.getByText('Filter'));
      fireEvent.click(screen.getByText('Active'));

      // Apply 'User' role filter
      fireEvent.click(screen.getByText('Filter'));
      fireEvent.click(screen.getByText('User'));

      // Only Active Users should be visible (Dave is Pending, Bob is Inactive)
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument(); // Active Admin
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument(); // Inactive User
      expect(screen.queryByText('Carol Davis')).not.toBeInTheDocument(); // Active Editor
      expect(screen.queryByText('Dave Wilson')).not.toBeInTheDocument(); // Pending User
      expect(screen.queryByText('Eve Brown')).not.toBeInTheDocument(); // Active Viewer
      // If we had an Active User, they would appear here.
      // Let's check that the table indicates no results based on current data + filters
      expect(screen.getByText('No results.')).toBeInTheDocument();

      // Check active filter badges
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('removes a filter using the badge', () => {
      renderDataTable({ filterGroups });

      // Apply 'Active' status filter
      fireEvent.click(screen.getByText('Filter'));
      fireEvent.click(screen.getByText('Active'));
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument(); // Verify filter applied

      // Remove the 'Active' filter via its badge
      const removeButton = screen
        .getByText('Active')
        .closest('div')
        ?.querySelector('button');
      expect(removeButton).toBeInTheDocument();
      if (removeButton) fireEvent.click(removeButton);

      // Check if inactive row is now visible again
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.queryByText('Clear all')).not.toBeInTheDocument(); // No active filters
    });

    it('clears all filters', () => {
      renderDataTable({ filterGroups });

      // Apply multiple filters
      fireEvent.click(screen.getByText('Filter'));
      fireEvent.click(screen.getByText('Active'));
      fireEvent.click(screen.getByText('Filter'));
      fireEvent.click(screen.getByText('User'));
      expect(screen.getByText('Clear all')).toBeInTheDocument();

      // Click clear all
      fireEvent.click(screen.getByText('Clear all'));

      // Check if all rows are visible again
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.queryByText('Clear all')).not.toBeInTheDocument(); // No active filters
    });

    it('filters using dynamic properties via filterFn', () => {
      renderDataTable({ filterGroups });

      // Open filter menu and apply filter for dynamic property 'ValueA'
      fireEvent.click(screen.getByText('Filter'));
      fireEvent.click(screen.getByText('Value A'));

      // Check that only rows with dynamic: 'ValueA' are visible
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument(); // Has ValueA
      expect(screen.getByText('Eve Brown')).toBeInTheDocument(); // Has ValueA
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument(); // Undefined dynamic
      expect(screen.queryByText('Carol Davis')).not.toBeInTheDocument(); // Has ValueB
      expect(screen.queryByText('Dave Wilson')).not.toBeInTheDocument(); // Undefined dynamic

      // Check active filter badge
      expect(screen.getByText('Value A')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts by Name column when header is clicked', () => {
      renderDataTable();
      const nameHeader = screen.getByText('Name');
      const rows = screen.getAllByRole('row'); // Includes header row

      // Initial order check (example)
      expect(rows[1]).toHaveTextContent('Alice Johnson');

      // Click to sort ascending
      fireEvent.click(nameHeader);
      let sortedRows = screen.getAllByRole('row');
      expect(sortedRows[1]).toHaveTextContent('Alice Johnson'); // A comes first
      expect(screen.getByTestId('icon-chevron-up')).toBeInTheDocument(); // Asc icon

      // Click again to sort descending
      fireEvent.click(nameHeader);
      sortedRows = screen.getAllByRole('row');
      expect(sortedRows[1]).toHaveTextContent('Eve Brown'); // E comes last alphabetically in this set
      expect(screen.getByTestId('icon-chevron-down')).toBeInTheDocument(); // Desc icon
    });

    it('does not sort non-sortable columns (like select)', () => {
      renderDataTable({ enableRowSelection: true });
      // The first header is the checkbox
      const selectHeader = screen.getAllByRole('columnheader')[0];

      // Attempt to click - should not add sort icons
      fireEvent.click(selectHeader);
      expect(screen.queryByTestId('icon-chevron-up')).not.toBeInTheDocument();
      expect(screen.queryByTestId('icon-chevron-down')).not.toBeInTheDocument();
    });
  });

  describe('Utility Actions', () => {
    it('renders utility actions when provided', () => {
      const mockUtilityAction = jest.fn();
      renderDataTable({
        utilityActions: [
          {
            label: 'Export Data',
            onClick: mockUtilityAction,
            variant: 'outline',
          },
        ],
      });

      const utilityButton = screen.getByText('Export Data');
      expect(utilityButton).toBeInTheDocument();

      fireEvent.click(utilityButton);
      expect(mockUtilityAction).toHaveBeenCalled();
    });
  });

  describe('getRowId Prop', () => {
    it('uses getRowId for row identification if provided', () => {
      // Test by checking selection state with a custom ID
      const mockAction = jest.fn();
      const customGetRowId = (row: TestData) => `custom_${row.email}`;
      renderDataTable({
        enableRowSelection: true,
        getRowId: customGetRowId,
        selectionActions: [{ label: 'Custom Action', onClick: mockAction }],
      });

      // Select Alice using the checkbox
      const aliceCheckbox = screen.getAllByRole('checkbox')[1]; // Row for Alice
      fireEvent.click(aliceCheckbox);

      // Click the action button
      const actionButton = screen.getByText('Custom Action');
      fireEvent.click(actionButton);

      // The selection logic should still work, passing the original data
      expect(mockAction).toHaveBeenCalledWith([testData[0]]);
      // More direct testing of getRowId's effect on internal table state is complex
      // but ensuring selection works implies getRowId is functioning.
    });
  });
});
