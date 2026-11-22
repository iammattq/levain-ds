import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    onPageChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders page info correctly', () => {
      render(<Pagination {...defaultProps} currentPage={2} />);
      expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    });

    it('renders item count when provided', () => {
      render(
        <Pagination {...defaultProps} totalItems={42} showItemCount={true} />
      );
      expect(screen.getByText('42 rows')).toBeInTheDocument();
    });

    it('uses singular item label for single item', () => {
      render(
        <Pagination {...defaultProps} totalItems={1} showItemCount={true} />
      );
      expect(screen.getByText('1 row')).toBeInTheDocument();
    });

    it('uses custom item label', () => {
      render(
        <Pagination
          {...defaultProps}
          totalItems={10}
          itemLabel="image"
          showItemCount={true}
        />
      );
      expect(screen.getByText('10 images')).toBeInTheDocument();
    });

    it('hides item count when showItemCount is false', () => {
      render(
        <Pagination {...defaultProps} totalItems={42} showItemCount={false} />
      );
      expect(screen.queryByText('42 rows')).not.toBeInTheDocument();
    });

    it('hides first/last buttons when showFirstLast is false', () => {
      render(<Pagination {...defaultProps} showFirstLast={false} />);
      expect(
        screen.queryByRole('button', { name: /first page/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /last page/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('calls onPageChange with previous page', () => {
      const onPageChange = jest.fn();
      render(
        <Pagination
          {...defaultProps}
          currentPage={3}
          onPageChange={onPageChange}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPageChange with next page', () => {
      const onPageChange = jest.fn();
      render(
        <Pagination
          {...defaultProps}
          currentPage={3}
          onPageChange={onPageChange}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /next page/i }));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('calls onPageChange with first page', () => {
      const onPageChange = jest.fn();
      render(
        <Pagination
          {...defaultProps}
          currentPage={3}
          onPageChange={onPageChange}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /first page/i }));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('calls onPageChange with last page', () => {
      const onPageChange = jest.fn();
      render(
        <Pagination
          {...defaultProps}
          currentPage={3}
          onPageChange={onPageChange}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /last page/i }));
      expect(onPageChange).toHaveBeenCalledWith(5);
    });
  });

  describe('disabled states', () => {
    it('disables previous/first buttons on first page', () => {
      render(<Pagination {...defaultProps} currentPage={1} />);
      expect(
        screen.getByRole('button', { name: /previous page/i })
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /first page/i })
      ).toBeDisabled();
    });

    it('disables next/last buttons on last page', () => {
      render(<Pagination {...defaultProps} currentPage={5} />);
      expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /last page/i })).toBeDisabled();
    });

    it('enables all buttons on middle page', () => {
      render(<Pagination {...defaultProps} currentPage={3} />);
      expect(
        screen.getByRole('button', { name: /previous page/i })
      ).not.toBeDisabled();
      expect(
        screen.getByRole('button', { name: /next page/i })
      ).not.toBeDisabled();
      expect(
        screen.getByRole('button', { name: /first page/i })
      ).not.toBeDisabled();
      expect(
        screen.getByRole('button', { name: /last page/i })
      ).not.toBeDisabled();
    });
  });

  describe('single page', () => {
    it('disables all navigation on single page', () => {
      render(<Pagination {...defaultProps} totalPages={1} currentPage={1} />);
      expect(
        screen.getByRole('button', { name: /previous page/i })
      ).toBeDisabled();
      expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /first page/i })
      ).toBeDisabled();
      expect(screen.getByRole('button', { name: /last page/i })).toBeDisabled();
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Pagination {...defaultProps} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
