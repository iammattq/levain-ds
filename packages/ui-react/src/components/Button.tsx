'use client';

import { Link } from '../provider/LevainProvider';
import React, { ButtonHTMLAttributes, forwardRef, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, LucideProps } from 'lucide-react';
import { cn } from '../utils/cn';

// Variants that need pseudo-element overlays for state effects
const OVERLAY_VARIANTS = ['primary', 'accent', 'secondary', 'danger'] as const;

// Define button variants using class-variance-authority
// Typography: Uses semantic .type-label (md/lg) and .type-label-sm (sm)
const buttonVariants = cva(
  // Base styles applied to all buttons
  // Uses type-label for consistent typography (14px medium weight)
  'type-label inline-flex items-center cursor-pointer justify-center rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'relative overflow-hidden bg-[var(--color-primary)] text-[var(--color-text-on-primary)] focus-visible:ring-[var(--color-border-focus)] border-[0.5px] border-[var(--color-primary)]',
        accent:
          'relative overflow-hidden bg-[var(--color-accent)] text-[var(--color-text-on-accent)] focus-visible:ring-[var(--color-border-focus)] border-[0.5px] border-[var(--color-accent)]',
        /** @deprecated Use 'accent' instead */
        secondary:
          'relative overflow-hidden bg-[var(--color-accent)] text-[var(--color-text-on-accent)] focus-visible:ring-[var(--color-border-focus)] border-[0.5px] border-[var(--color-accent)]',
        outline:
          'pill-gradient-border text-[var(--color-text-default)] hover:bg-[var(--color-state-hover)] focus:bg-[var(--color-state-focus)] active:bg-[var(--color-state-active)] focus-visible:ring-[var(--color-border-focus)]',
        ghost:
          'bg-transparent text-[var(--color-text-default)] hover:bg-[var(--color-state-hover)] focus:bg-[var(--color-state-focus)] active:bg-[var(--color-state-active)] focus-visible:ring-[var(--color-border-focus)]',
        link: 'text-[var(--color-text-link)] underline-offset-4 hover:underline focus-visible:ring-[var(--color-border-focus)]',
        danger:
          'relative overflow-hidden bg-[var(--color-error)] text-[var(--color-text-inverted)] focus-visible:ring-[var(--color-border-focus)] border-[0.5px] border-[var(--color-error)]',
      },
      size: {
        xs: 'type-label-sm h-7 px-2 py-0.5 text-xs', // Extra small for compact UIs
        sm: 'type-label-sm h-8 px-3 py-1', // Override to type-label-sm (12px) for small buttons
        md: 'h-9 px-4 py-2',
        lg: 'h-12 px-6 py-3',
        icon: 'h-9 w-9', // Default icon size
        'icon-sm': 'h-7 w-7', // Small icon button
        'icon-xs': 'h-5 w-5', // Extra small icon button
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'outline',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  href?: string;
  external?: boolean;
  loading?: boolean;
  Icon?: React.ElementType<LucideProps>;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
  /** Show only the icon below `md`, while retaining the label from `md` up. */
  iconOnlyOnMobile?: boolean;
  /** When true, shows the button in an active/selected state (primary background) */
  active?: boolean;
  /** When true, uses monospace font */
  mono?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      href,
      external,
      loading,
      disabled,
      children,
      Icon,
      iconPosition = 'left',
      iconOnly = false,
      iconOnlyOnMobile = false,
      active = false,
      mono = false,
      ...props
    },
    ref
  ) => {
    const actualSize = iconOnly
      ? size === 'xs'
        ? 'icon-xs'
        : size === 'sm'
          ? 'icon-sm'
          : 'icon'
      : size;

    function getIconSizeClass(buttonSize: typeof size): string {
      switch (buttonSize) {
        case 'lg':
          return 'h-5 w-5';
        case 'sm':
        case 'xs':
          return 'h-3 w-3';
        default:
          return 'h-4 w-4';
      }
    }

    const iconSizeClass = getIconSizeClass(size);

    // Ghost and link variants don't have shadows
    const noShadow = variant === 'ghost' || variant === 'link';

    // Hover state for press effect
    const [isHovered, setIsHovered] = useState(false);

    const shadowStyle = noShadow
      ? {}
      : ({
          boxShadow: isHovered ? 'none' : 'var(--elevation-1)',
          transform: isHovered ? 'translateY(1px)' : 'none',
          transition: 'transform 150ms ease-out, box-shadow 150ms ease-out',
        } as React.CSSProperties);

    // Handlers on wrapper to keep hit area stable during transform
    const wrapperHoverHandlers = {
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
    };

    const wrapperStyle = {};

    // When active, override to primary variant styling
    const activeClasses = active
      ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] border-[0.5px] border-[var(--color-primary)] shadow-none'
      : '';

    // Determine if this variant needs overlay spans for state effects
    const effectiveVariant = active ? 'primary' : variant;
    const needsOverlay = OVERLAY_VARIANTS.includes(
      effectiveVariant as (typeof OVERLAY_VARIANTS)[number]
    );

    // State overlay spans for solid color variants (primary, accent, danger)
    const stateOverlays = needsOverlay ? (
      <>
        {/* Hover overlay */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[var(--color-state-hover)] opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-0 group-active:opacity-0"
        />
        {/* Focus overlay */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[var(--color-state-focus)] opacity-0 transition-opacity group-focus:opacity-100 group-active:opacity-0"
        />
        {/* Active overlay */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[var(--color-state-active)] opacity-0 transition-opacity group-active:opacity-100"
        />
      </>
    ) : null;

    const content = (
      <>
        {stateOverlays}
        <span
          className={cn(
            'relative z-10 inline-flex items-center',
            needsOverlay && 'pointer-events-none'
          )}
        >
          {Icon && iconPosition === 'left' && !loading && !iconOnly && (
            <Icon
              className={cn(
                iconOnlyOnMobile ? 'mr-0 md:mr-2' : 'mr-2',
                iconSizeClass
              )}
            />
          )}
          {loading && (
            <Loader2
              className={cn(
                'animate-spin',
                // Only apply margins when there's content next to the spinner
                !iconOnly &&
                  (iconPosition === 'left' ? 'mr-2 -ml-1' : '-mr-1 ml-2'),
                iconSizeClass
              )}
            />
          )}
          {!iconOnly &&
            (iconOnlyOnMobile ? (
              <span className="hidden md:inline">{children}</span>
            ) : (
              children
            ))}
          {Icon && iconOnly && !loading && <Icon className={iconSizeClass} />}
          {Icon && iconPosition === 'right' && !loading && !iconOnly && (
            <Icon className={cn('ml-2', iconSizeClass)} />
          )}
        </span>
      </>
    );

    const buttonClasses = cn(
      buttonVariants({
        variant: active ? 'primary' : variant,
        size: actualSize,
        fullWidth,
      }),
      needsOverlay && 'group',
      activeClasses,
      mono && 'font-mono',
      iconOnlyOnMobile && 'h-7 w-7 px-0 md:h-8 md:w-auto md:px-3 md:py-1',
      className
    );

    const wrapperClasses = cn(
      'inline-flex cursor-pointer',
      fullWidth && 'w-full'
    );

    const iconOnlyAriaLabel =
      iconOnly || iconOnlyOnMobile
        ? {
            'aria-label':
              typeof children === 'string' ? children : props['aria-label'],
          }
        : {};

    function renderElement(): React.ReactNode {
      if (href) {
        if (external) {
          return (
            <a
              href={href}
              className={buttonClasses}
              style={shadowStyle}
              target="_blank"
              rel="noopener noreferrer"
              {...iconOnlyAriaLabel}
            >
              {content}
            </a>
          );
        }
        return (
          <Link
            href={href}
            className={buttonClasses}
            style={shadowStyle}
            onClick={
              props.onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>
            }
            {...iconOnlyAriaLabel}
          >
            {content}
          </Link>
        );
      }

      return (
        <button
          type="button"
          className={buttonClasses}
          style={shadowStyle}
          ref={ref}
          disabled={disabled || loading}
          {...iconOnlyAriaLabel}
          {...props}
        >
          {content}
        </button>
      );
    }

    return (
      <span
        className={wrapperClasses}
        style={wrapperStyle}
        {...wrapperHoverHandlers}
      >
        {renderElement()}
      </span>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
