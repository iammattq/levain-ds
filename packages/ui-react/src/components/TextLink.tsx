'use client';

import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * TextLink — a minimal text-link primitive. Renders an anchor with a small
 * trailing arrow that slides to the right on hover. Built as a primitive so
 * the consuming app wraps it in `<Link>` (Next.js) or uses it as-is for
 * external links.
 *
 * Sizes mirror the body type scale:
 *   - sm   → `type-body-sm`
 *   - base → `type-body`   (default)
 *   - lg   → `type-body-lg`
 *
 * Color: `--color-primary` (theme-tracked). Note that `type-body*` classes
 * do NOT set their own color (unlike `type-caption*`), so a direct
 * `text-[var(--color-primary)]` utility is applied — no variable override
 * needed for these classes.
 *
 * Hover behavior:
 *   - underline appears
 *   - arrow translates 6px to the right once (no looping pulse) and slides
 *     back smoothly when the cursor leaves
 *
 * Renders a plain `<a>` — the consuming app wraps with `next/link` for
 * client-side routing, or uses `external + href` for outbound links.
 */

export type TextLinkSize = 'sm' | 'base' | 'lg';

export interface TextLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'children'
> {
  /** Text content of the link. */
  children: ReactNode;
  /** Body-scale size. Defaults to `'base'` (`type-body`). */
  size?: TextLinkSize;
  /** External link — adds `target="_blank"` + `rel="noopener noreferrer"`. */
  external?: boolean;
}

const SIZE_CLASS: Record<TextLinkSize, string> = {
  sm: 'type-body-sm',
  base: 'type-body',
  lg: 'type-body-lg',
};

const ARROW_SIZE: Record<TextLinkSize, number> = {
  sm: 12,
  base: 14,
  lg: 16,
};

export const TextLink = forwardRef<HTMLAnchorElement, TextLinkProps>(
  function TextLink(
    { children, size = 'base', external, className, style, ...rest },
    ref
  ) {
    const merged = [
      'group/textlink inline-flex items-center gap-1.5',
      SIZE_CLASS[size],
      'font-semibold',
      'text-[var(--color-primary)]',
      'underline-offset-4',
      'hover:underline',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const externalAttrs = external
      ? { target: '_blank', rel: 'noopener noreferrer' }
      : {};

    return (
      <a
        ref={ref}
        className={merged}
        style={style}
        {...externalAttrs}
        {...rest}
      >
        {children}
        <ArrowRight
          size={ARROW_SIZE[size]}
          strokeWidth={1.5}
          aria-hidden="true"
          // One-shot translate on hover (no looping pulse). transition-transform
          // smooths both the entry and the snap-back on hover-out.
          className="transition-transform duration-300 ease-out group-hover/textlink:translate-x-1.5"
        />
      </a>
    );
  }
);

export default TextLink;
