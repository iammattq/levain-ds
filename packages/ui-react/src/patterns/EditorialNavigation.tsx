'use client';

import { Link, usePathname } from '../provider/LevainProvider';
import { cn } from '../utils/cn';
import type { NavigationItem } from './NavigationLinks';

interface EditorialNavigationProps {
  navigationItems: NavigationItem[];
  className?: string;
  onLinkClick?: () => void;
}

const ITEM_BASE = cn(
  'group/editorial-nav-item',
  'type-label relative inline-flex items-center px-1 py-1 lowercase',
  'text-[var(--color-text-muted)] hover:text-[var(--color-text-default)]',
  'transition-colors duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'focus-visible:ring-[var(--color-border-focus)] rounded-sm'
);

const ITEM_ACTIVE = 'text-[var(--color-primary)]';

const UNDERLINE_BASE = cn(
  'pointer-events-none absolute right-1 left-1 -bottom-0.5 h-[1.5px]',
  'origin-left bg-[var(--color-primary)]',
  'scale-x-0 group-hover/editorial-nav-item:scale-x-100',
  'transition-transform duration-200'
);

const UNDERLINE_ACTIVE = 'scale-x-100';

export default function EditorialNavigation({
  navigationItems,
  className,
  onLinkClick,
}: EditorialNavigationProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      className={cn('flex items-center gap-8', className)}
      aria-label="Primary"
    >
      {navigationItems.map((item) => {
        const active = isActive(item.href, item.exact);
        const label = item.label.toLowerCase();
        const linkProps = item.external
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {};

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            onClick={onLinkClick}
            className={cn(ITEM_BASE, active && ITEM_ACTIVE)}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            {...linkProps}
          >
            {label}
            <span
              aria-hidden
              className={cn(UNDERLINE_BASE, active && UNDERLINE_ACTIVE)}
              style={{
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </Link>
        );
      })}
    </nav>
  );
}
