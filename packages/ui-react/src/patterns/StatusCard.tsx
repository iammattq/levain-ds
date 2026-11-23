'use client';

/**
 * StatusCard: a compact card that shows an item's state at a glance, and opens into its own dialog.
 *
 * The card carries a number, a kind, a title and a row of status markers (owner, age, state, attachments, anything
 * else), all optional. It is condensed by design: one tight inset, small type, markers as quiet chips.
 *
 * Opening follows morph-not-swap (assembly.json): <StatusCardDialog> shares the card's layoutId, so the card itself
 * grows into the dialog on recipe.morph and collapses back on recipe.collapse; nothing fades in over a dimmed page.
 * While open, the card's slot keeps its size so the list doesn't jump. The dialog's content fades in once the shape
 * has room (recipe.contentIn) and leaves ahead of it (recipe.contentOut).
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { duration, motion as motionFor } from '@levain/tokens';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type StatusTone = 'default' | 'accent' | 'info' | 'caution' | 'success' | 'error' | 'muted';

export interface StatusMarker {
  /** What the marker says: "eng1", "2h", "blocked", "2 images". */
  label: ReactNode;
  icon?: LucideIcon;
  tone?: StatusTone;
  /** Spelled out for assistive technology and on hover ("waiting on Matt for 2 hours"). */
  title?: string;
}

export interface StatusCardProps {
  /** Unique on the page; ties the card to its dialog. */
  id: string;
  /** The card's number, shown first ("T4"). */
  number?: ReactNode;
  /** Its kind, as a small tinted label ("Decide"). */
  kind?: { label: ReactNode; tone?: StatusTone };
  title: ReactNode;
  /** Status markers, in reading order. */
  markers?: StatusMarker[];
  /** A thin bar of colour down the leading edge for a state that needs attention. */
  accent?: StatusTone;
  /** True while its dialog is open: the card's place is held, and the card itself is in the dialog. */
  open?: boolean;
  onOpen?: () => void;
  /** Actions or extra content under the markers. */
  children?: ReactNode;
  className?: string;
}

const TONE: Record<StatusTone, string> = {
  default: 'text-[var(--color-text-muted)]',
  accent: 'text-[var(--color-accent)]',
  info: 'text-[var(--color-info-fg,var(--color-text-muted))]',
  caution: 'text-[var(--color-warning,var(--color-accent))]',
  success: 'text-[var(--color-success,var(--color-primary))]',
  error: 'text-[var(--color-error)]',
  muted: 'text-[var(--color-text-faint,var(--color-text-muted))]',
};
const BAR: Record<StatusTone, string> = {
  default: 'bg-[var(--color-border-default)]',
  accent: 'bg-[var(--color-accent)]',
  info: 'bg-[var(--color-info,var(--color-primary))]',
  caution: 'bg-[var(--color-warning,var(--color-accent))]',
  success: 'bg-[var(--color-success,var(--color-primary))]',
  error: 'bg-[var(--color-error)]',
  muted: 'bg-[var(--color-border-subtle)]',
};

/** The card's corner radius in px, read from the token, so layout animations can keep corners round as it morphs. */
function useRadius(token = '--radius-lg') {
  const [px, setPx] = useState(8);
  useLayoutEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    const n = parseFloat(v);
    if (Number.isFinite(n)) setPx(v.endsWith('rem') ? n * parseFloat(getComputedStyle(document.documentElement).fontSize) : n);
  }, [token]);
  return px;
}

export const morphId = (id: string) => 'status-card-' + id;

export function StatusMarkers({ markers }: { markers: StatusMarker[] }) {
  return (
    <ul className="type-caption flex flex-wrap items-center gap-x-xs gap-y-3xs">
      {markers.map((m, i) => (
        <li key={i} className={'inline-flex items-center gap-3xs ' + TONE[m.tone ?? 'default']} title={m.title}>
          {m.icon && <m.icon aria-hidden size={12} strokeWidth={2} />}
          <span>{m.label}</span>
          {m.title && <span className="sr-only">{m.title}</span>}
        </li>
      ))}
    </ul>
  );
}

function Face({ number, kind, title, markers }: Pick<StatusCardProps, 'number' | 'kind' | 'title' | 'markers'>) {
  return (
    <>
      {(number !== undefined || kind) && (
        <p className="type-caption flex items-center gap-2xs">
          {number !== undefined && <span className="text-[var(--color-text-faint,var(--color-text-muted))] tabular-nums">{number}</span>}
          {kind && <span className={'font-semibold uppercase tracking-wide ' + TONE[kind.tone ?? 'default']}>{kind.label}</span>}
        </p>
      )}
      <p className="type-body-sm text-[var(--color-text-default)]">{title}</p>
      {markers && markers.length > 0 && <StatusMarkers markers={markers} />}
    </>
  );
}

export function StatusCard({ id, number, kind, title, markers, accent, open = false, onOpen, children, className = '' }: StatusCardProps) {
  const reduce = useReducedMotion();
  const radius = useRadius();
  const slot = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => { if (!open && slot.current) setHeight(slot.current.offsetHeight); });
  if (open) return <div style={{ height }} aria-hidden className={className} />;
  return (
    <motion.div
      ref={slot}
      layoutId={morphId(id)}
      transition={motionFor('collapse', reduce)}
      style={{ borderRadius: radius }}
      className={'relative overflow-hidden bg-[var(--color-surface-card)] text-left ' + className}
    >
      {accent && <span aria-hidden className={'absolute inset-y-0 left-0 w-[3px] ' + BAR[accent]} />}
      <div
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? -1 : undefined}
        onClick={onOpen}
        className={'flex flex-col gap-3xs px-xs py-2xs ' + (onOpen ? 'cursor-pointer' : '')}
      >
        <Face number={number} kind={kind} title={title} markers={markers} />
        {children}
      </div>
    </motion.div>
  );
}

export interface StatusCardDialogProps extends Pick<StatusCardProps, 'id' | 'number' | 'kind' | 'title' | 'markers'> {
  open: boolean;
  onClose: () => void;
  /** The dialog's body: the full item, its actions. */
  children: ReactNode;
  /** Max width, as a CSS length. */
  width?: string;
}

export function StatusCardDialog({ id, open, onClose, number, kind, title, markers, children, width = '40rem' }: StatusCardDialogProps) {
  const reduce = useReducedMotion();
  const radius = useRadius('--radius-2xl');
  const panel = useRef<HTMLDivElement>(null);
  // The latest onClose, read through a ref: a consumer passing a fresh inline onClose on every render must not re-run
  // the open effect below, or focus would jump back to the panel mid-typing.
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); prev?.focus?.(); };
  }, [open]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        // No dimmed page: the card grows into the dialog, and a click outside it closes it.
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-sm md:items-center md:p-lg" onClick={onClose}>
          <motion.div
            ref={panel}
            layoutId={morphId(id)}
            transition={motionFor('morph', reduce)}
            style={{ borderRadius: radius, maxWidth: width }}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
            // floating, so the elevated surface (one step above the cards it grew out of) with the floating shadow
            className="relative w-full overflow-hidden bg-[var(--color-surface-elevated)] shadow-[var(--elevation-3)] outline-none"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { ...motionFor('contentIn', reduce), delay: reduce ? 0 : duration.contentOut / 1000 } }}
              exit={{ opacity: 0, transition: motionFor('contentOut', reduce) }}
              className="flex flex-col gap-sm p-md"
            >
              <div className="flex items-start gap-sm">
                <div className="flex min-w-0 flex-1 flex-col gap-3xs"><Face number={number} kind={kind} title={title} markers={markers} /></div>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-3xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-section)]">
                  <X size={16} />
                </button>
              </div>
              {children}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
