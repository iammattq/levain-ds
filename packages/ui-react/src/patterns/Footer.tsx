import React from 'react';
import { Linkedin } from 'lucide-react';

export interface FooterProps {
  /** Display name shown in the brand line and the copyright. */
  name: string;
  /** Absolute LinkedIn profile URL. Consumer-supplied so this pattern stays
   *  app-agnostic — it never imports app-local navigation config. */
  linkedInUrl: string;
  /** Optional theme-toggle slot (e.g. `<ThemeToggle />`). */
  themeToggle?: React.ReactNode;
  /** Optional theme-color-cycler slot (e.g. `<ThemeColorButton />`). */
  themeColorButton?: React.ReactNode;
  /**
   * Visual tone. `'default'` keeps the footer on the canvas surface (text in
   * default tokens). `'inverted'` self-applies `--color-surface-inverted` for a
   * dark editorial chapter-break band; the consumer should pass appropriately
   * styled theme toggle slots (e.g. `className="text-[var(--color-text-inverted)]"`).
   */
  tone?: 'default' | 'inverted';
  /** Extra classes appended to the outer `<footer>`. */
  className?: string;
}

/**
 * Site footer pattern. Slot-based so the consuming app can pass its own
 * `ThemeToggle` and `ThemeColorButton` without this pattern reaching into any
 * `@/`-aliased app paths.
 *
 * Note: keyboard shortcuts (`l` for light/dark toggle, `t` for color theme
 * cycle) live in the consuming app's public layout, NOT here. Footer used to
 * own them (chunk 1G), but moving them up to layout level lets the shortcuts
 * work on every public route, not only routes that mount the Footer.
 */
export function Footer({
  name,
  linkedInUrl,
  themeToggle,
  themeColorButton,
  tone = 'default',
  className,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const isInverted = tone === 'inverted';

  const footerClasses = [
    'w-full',
    'flex',
    'flex-col',
    'gap-6',
    'p-6',
    'sm:flex-row',
    'sm:items-center',
    'sm:justify-between',
    isInverted
      ? 'bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)]'
      : 'text-[var(--color-text-default)]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const copyrightClass = isInverted
    ? 'type-body-sm text-[var(--color-text-inverted)] opacity-60'
    : 'type-body-sm text-[var(--color-text-muted)]';

  const linkedInClass = [
    'inline-flex h-9 w-9 items-center justify-center rounded-lg',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-[var(--color-border-focus)]',
    isInverted
      ? 'text-[var(--color-text-inverted)] hover:bg-[var(--color-state-hover)]'
      : 'text-[var(--color-text-default)] hover:bg-[var(--color-state-hover)]',
  ].join(' ');

  return (
    <footer aria-label="Site footer" className={footerClasses}>
      <span className={copyrightClass}>
        © {currentYear} {name}
      </span>

      <div className="flex items-center gap-1">
        <a
          href={linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${name} on LinkedIn`}
          className={linkedInClass}
        >
          <Linkedin size={16} strokeWidth={1.5} aria-hidden="true" />
        </a>
        {themeToggle ? (
          <span data-slot="theme-toggle">{themeToggle}</span>
        ) : null}
        {themeColorButton ? (
          <span data-slot="theme-color-button">{themeColorButton}</span>
        ) : null}
      </div>
    </footer>
  );
}

export default Footer;
