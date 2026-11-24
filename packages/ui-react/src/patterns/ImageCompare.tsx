'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * ImageCompare (T5): images shown large for comparison, usually a build beside its reference ("This build" and
 * "Target"). Side by side at equal width from md up, stacked below md; one image alone takes the full width. Each image
 * keeps its own aspect ratio (no crop, no fixed height), top-aligned, its label under it as the caption and as its alt
 * text. Each is a link that opens the full image in a new tab (`href`, default `src`). An image that can't load falls
 * back to its label and path as text, as the Ringmaster board's thumbnails do.
 *
 * `mode="slider"` (T40) lays the first two images over each other in one frame, the first as before and the second as
 * after, with a vertical handle the user drags (mouse, pen or touch) or moves with the keys to reveal one or the other.
 * Before shows left of the handle, after right of it. The frame takes the before image's aspect ratio; the after image
 * is fitted inside it (object-fit contain, top-aligned). Fewer than two images, or one that can't load, falls back to
 * side by side.
 *
 * A plain `<img>`, not the provider's Image: the image's size isn't known ahead, and next/image would need it.
 */
export interface ImageCompareImage {
  label: string;
  src: string;
  /** What the link opens; defaults to `src`. */
  href?: string;
}

export interface ImageCompareProps {
  images: ImageCompareImage[];
  /** 'side-by-side' (default): each image shown whole. 'slider': the first two in one frame, before and after. */
  mode?: 'side-by-side' | 'slider';
  className?: string;
}

/** How far one arrow key moves the handle, in percent of the frame's width. */
const KEY_STEP = 5;
/** Space kept between the handle and a label before the label fades, in px. */
const LABEL_GAP = 8;
/** How far a touch moves sideways (and more than down) before it takes the handle, in px. */
const TOUCH_SLOP = 6;

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** A label chip in a top corner of the slider's frame; fades out while the handle is over it. */
const SliderLabel = React.forwardRef<HTMLSpanElement, { side: 'left' | 'right'; covered: boolean; children: React.ReactNode }>(
  ({ side, covered, children }, ref) => (
    <span
      ref={ref}
      aria-hidden="true"
      data-image-compare-label={side}
      className={cn(
        'type-caption pointer-events-none absolute top-xs rounded-full bg-[var(--color-surface-inverted)] px-2xs py-3xs text-[var(--color-text-inverted)] shadow-[var(--elevation-1)] transition-opacity duration-150 motion-reduce:transition-none',
        side === 'left' ? 'left-xs' : 'right-xs',
        covered ? 'opacity-0' : 'opacity-100'
      )}
    >
      {children}
    </span>
  )
);
SliderLabel.displayName = 'SliderLabel';

function SliderCompare({ before, after, onBroken, className }: { before: ImageCompareImage; after: ImageCompareImage; onBroken: (src: string) => void; className?: string }) {
  const [pos, setPos] = useState(50);
  // The frame's width and each label's box, measured, so a label fades only while the handle is over it.
  const [box, setBox] = useState({ w: 0, beforeEnd: 0, afterStart: 0 });
  const frame = useRef<HTMLDivElement>(null);
  const beforeLabel = useRef<HTMLSpanElement>(null);
  const afterLabel = useRef<HTMLSpanElement>(null);
  // The pointer dragging the handle, where it went down, and whether it has taken the gesture (a touch takes it only
  // once it moves sideways more than down, so a vertical scroll that starts on the frame leaves the handle be).
  const drag = useRef<{ id: number; x: number; y: number; engaged: boolean } | null>(null);

  useLayoutEffect(() => {
    const f = frame.current;
    if (!f) return;
    const measure = () => {
      const b = beforeLabel.current, a = afterLabel.current;
      setBox({ w: f.clientWidth, beforeEnd: b ? b.offsetLeft + b.offsetWidth : 0, afterStart: a ? a.offsetLeft : 0 });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    // the labels too: their width changes when the web font arrives
    const ro = new ResizeObserver(measure);
    for (const el of [f, beforeLabel.current, afterLabel.current]) if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const moveTo = (clientX: number) => {
    const r = frame.current!.getBoundingClientRect();
    if (r.width > 0) setPos(clamp(((clientX - r.left) / r.width) * 100));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // A mouse or pen press jumps the handle there; a touch waits to move sideways, so a tap or a scroll leaves it be.
    const engaged = e.pointerType !== 'touch';
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, engaged };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (engaged) moveTo(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.engaged) {
      const dx = Math.abs(e.clientX - d.x), dy = Math.abs(e.clientY - d.y);
      if (dx < TOUCH_SLOP || dx <= dy) return;
      d.engaged = true;
    }
    moveTo(e.clientX);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const next = { ArrowLeft: pos - KEY_STEP, ArrowDown: pos - KEY_STEP, ArrowRight: pos + KEY_STEP, ArrowUp: pos + KEY_STEP, Home: 0, End: 100 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setPos(clamp(next));
  };

  const shown = Math.round(pos);
  const x = (box.w * pos) / 100;
  const beforeCovered = box.w > 0 && x < box.beforeEnd + LABEL_GAP;
  const afterCovered = box.w > 0 && x > box.afterStart - LABEL_GAP;

  return (
    <div
      ref={frame}
      data-image-compare-slider=""
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      className={cn(
        'relative cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-section)]',
        className
      )}
    >
      <img src={before.src} alt={before.label} draggable={false} onError={() => onBroken(before.src)} className="block h-auto w-full" />
      <img
        src={after.src}
        alt={after.label}
        draggable={false}
        onError={() => onBroken(after.src)}
        data-image-compare-after=""
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        className="absolute inset-0 block h-full w-full object-contain object-top"
      />
      <SliderLabel ref={beforeLabel} side="left" covered={beforeCovered}>{before.label}</SliderLabel>
      <SliderLabel ref={afterLabel} side="right" covered={afterCovered}>{after.label}</SliderLabel>
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${before.label} and ${after.label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        aria-valuetext={`${before.label} ${shown}%, ${after.label} ${100 - shown}%`}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        style={{ left: `${pos}%` }}
        className="group absolute inset-y-0 w-0 outline-none"
      >
        <span className="absolute inset-y-0 -left-px w-0.5 bg-[var(--color-text-default)] shadow-[var(--elevation-1)]" />
        <span className="absolute left-0 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border-emphasis)] bg-[var(--color-surface-elevated)] text-[var(--color-text-default)] shadow-[var(--elevation-2)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--color-border-focus)] group-focus-visible:ring-offset-2">
          <GripVertical size={16} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function CompareImage({ label, src, href = src }: ImageCompareImage) {
  const [broken, setBroken] = useState(false);
  return (
    <figure className="m-0 min-w-0 space-y-3xs" data-image-compare-item="">
      {broken ? (
        <p className="type-caption break-all text-[var(--color-text-muted)]">{label}: {src}</p>
      ) : (
        <a href={href} target="_blank" rel="noreferrer" title={`Open "${label}" in a new tab`} className="block">
          <img
            src={src}
            alt={label}
            onError={() => setBroken(true)}
            className="block h-auto w-full rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-section)]"
          />
        </a>
      )}
      {!broken && <figcaption className="type-caption text-[var(--color-text-muted)]">{label}</figcaption>}
    </figure>
  );
}

export function ImageCompare({ images, mode = 'side-by-side', className }: ImageCompareProps) {
  // the srcs that failed in the slider: a new pair gets the slider back
  const [brokenSrcs, setBrokenSrcs] = useState<string[]>([]);
  if (mode === 'slider' && images.length >= 2 && !brokenSrcs.includes(images[0].src) && !brokenSrcs.includes(images[1].src)) {
    const [before, after] = images;
    return <SliderCompare key={`${before.src}|${after.src}`} before={before} after={after} onBroken={src => setBrokenSrcs(b => (b.includes(src) ? b : [...b, src]))} className={className} />;
  }
  return (
    <div className={cn('grid grid-cols-1 items-start gap-md', images.length > 1 && 'md:grid-cols-2', className)}>
      {images.map((im, i) => (
        // keyed by src too, so a new src gets a fresh broken state
        <CompareImage key={`${i}-${im.src}`} {...im} />
      ))}
    </div>
  );
}

export default ImageCompare;
