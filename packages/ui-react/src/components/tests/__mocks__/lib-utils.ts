// Mock for ../../utils/cn
import { type ClassValue } from 'clsx';

/**
 * A utility function to merge class names with Tailwind CSS
 */
export const cn = (...inputs: ClassValue[]): string => {
  // Simple implementation that concatenates classnames for testing
  return inputs.filter(Boolean).join(' ');
};

/**
 * Format date to a readable string
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};
