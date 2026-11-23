import { cn } from '../utils/cn';
import { meterProps, progress, toneClass, trackToken, type ProgressProps, type ProgressSize } from './progress';

export interface ProgressRingProps extends ProgressProps {
  /** Hidden from assistive tech, for a ring whose value is said elsewhere (e.g. beside a bar or in text). */
  decorative?: boolean;
}

/**
 * Rendered size and stroke, in CSS px. xs is a status glyph: 14px, a 1.5px stroke (the stroke never scales with the
 * box, as in the glyphs), so it sits in a line of text beside them.
 */
export const ringSizes: Record<ProgressSize, { px: number; stroke: number }> = {
  xs: { px: 14, stroke: 1.5 },
  sm: { px: 20, stroke: 2 },
  md: { px: 32, stroke: 3 },
  lg: { px: 48, stroke: 4 },
};

/** A ring that fills clockwise from 12 o'clock: a faint track and the arc over it. */
export function ProgressRing({
  value,
  max,
  size = 'md',
  tone = 'default',
  label,
  'aria-valuetext': valueText,
  decorative,
  className,
}: ProgressRingProps) {
  const p = progress(value, max);
  const { px, stroke } = ringSizes[size];
  const a11y = decorative ? { 'aria-hidden': true } : meterProps(p, label, valueText);
  const circle = { cx: 8, cy: 8, r: 6, fill: 'none', strokeWidth: stroke, vectorEffect: 'non-scaling-stroke' as const };
  return (
    <svg
      viewBox="0 0 16 16"
      width={px}
      height={px}
      data-size={size}
      data-tone={tone}
      className={cn('inline-block flex-none overflow-visible align-middle', toneClass[tone], className)}
      {...a11y}
    >
      <circle data-part="track" {...circle} stroke={`var(--color-${trackToken})`} />
      {/* No arc at 0: a round cap would leave a dot at the top. */}
      {p.pct > 0 && (
        <circle
          data-part="arc"
          {...circle}
          stroke="currentColor"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${p.pct} 100`}
          transform="rotate(-90 8 8)"
          // the motion tokens drop to 0ms under reduced motion
          style={{ transition: 'stroke-dasharray var(--duration-travel) var(--ease-out)' }}
        />
      )}
    </svg>
  );
}
