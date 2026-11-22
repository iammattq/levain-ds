import { cn } from '../utils/cn';
import { LucideProps } from 'lucide-react';

interface TagProps {
  children: React.ReactNode;
  className?: string;
  variant?:
    'default' | 'accent' | 'muted' | 'success' | 'error' | 'info' | 'caution';
  /** Size of the tag */
  size?: 'sm' | 'md';
  /** Optional icon component (from lucide-react) */
  Icon?: React.ElementType<LucideProps>;
  /** Additional className for the icon */
  iconClassName?: string;
}

export default function Tag({
  children,
  className,
  variant = 'default',
  size = 'md',
  Icon,
  iconClassName,
}: TagProps) {
  const variantClasses = {
    default: 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]',
    accent: 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]',
    muted: 'bg-[var(--color-surface-section)] text-[var(--color-text-default)]',
    success: 'bg-[var(--color-success-bg)] text-[var(--color-success-fg)]',
    error: 'bg-[var(--color-error-bg)] text-[var(--color-error-fg)]',
    info: 'bg-[var(--color-info-bg)] text-[var(--color-info-fg)]',
    caution: 'bg-[var(--color-caution-bg)] text-[var(--color-caution-fg)]',
  };

  const sizeClasses = {
    sm: 'type-label-compact px-3 py-1.5 gap-1.5',
    md: 'type-label px-3 py-2 gap-2',
  };

  const iconSizeClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {Icon && (
        <span className="flex items-center">
          <Icon className={cn(iconSizeClass, 'flex-shrink-0', iconClassName)} />
        </span>
      )}
      <span
        className={cn(
          'flex items-center leading-none',
          size === 'sm' && 'mt-0.5'
        )}
      >
        {children}
      </span>
    </span>
  );
}
