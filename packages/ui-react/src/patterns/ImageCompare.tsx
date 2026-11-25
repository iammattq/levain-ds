'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
 * `zoom` (T61) is ImageViewer's: the slider fills its parent (the viewer's screen) with no frame of its own, both images
 * fitted inside it as one layer that the viewer zooms and pans (`zoom`'s scale and shift), the handle and labels in
 * screen space over it. The handle stays where it is on screen as the images move under it (kept inside the visible
 * image), so the after image is clipped where the handle is; it drags only from itself (a 44 px strip along its line)
 * or its keys, so a drag anywhere else is the viewer's pan. The labels sit at the visible image's bottom corners (the
 * viewer's ✕ takes the top right).
 *
 * A plain `<img>`, not the provider's Image: the image's size isn't known ahead, and next/image would need it.
 */
export interface ImageCompareImage {
  label: string;
  src: string;
  /** What the link opens; defaults to `src`. */
  href?: string;
}

/** ImageViewer's zoom of the slider: scale about the images' centre, then a shift in px; `ease`, a transition timing. */
export interface ImageCompareZoom {
  scale: number;
  x: number;
  y: number;
  ease?: string;
}

export interface ImageCompareProps {
  images: ImageCompareImage[];
  /** 'side-by-side' (default): each image shown whole. 'slider': the first two in one frame, before and after. */
  mode?: 'side-by-side' | 'slider';
  /** ImageViewer's zoom (slider only): the slider fills its parent and its images zoom and pan by this. */
  zoom?: ImageCompareZoom;
  className?: string;
}

/** How far one arrow key moves the handle, in percent of the frame's width. */
const KEY_STEP = 5;
/** Space kept between the handle and a label before the label fades, in px. */
const LABEL_GAP = 8;
/** How far a touch moves sideways (and more than down) before it takes the handle, in px. */
const TOUCH_SLOP = 6;

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** A label chip's look (both sliders). */
const LABEL_CHIP =
  'type-caption pointer-events-none rounded-full bg-[var(--color-surface-inverted)] px-2xs py-3xs shadow-[var(--elevation-1)] transition-opacity duration-150 motion-reduce:transition-none';

/** A label chip in a top corner of the slider's frame; fades out while the handle is over it. */
const SliderLabel = React.forwardRef<HTMLSpanElement, { side: 'left' | 'right'; covered: boolean; children: React.ReactNode }>(
  ({ side, covered, children }, ref) => (
    <span
      ref={ref}
      aria-hidden="true"
      data-image-compare-label={side}
      className={cn(
        LABEL_CHIP,
        'absolute top-xs',
        side === 'left' ? 'left-xs' : 'right-xs',
        covered ? 'opacity-0' : 'opacity-100'
      )}
    >
      {/* the colour on an inner span: .type-caption's own colour (unlayered) beats a text utility on the same element */}
      <span className="text-[var(--color-text-inverted)]">{children}</span>
    </span>
  )
);
SliderLabel.displayName = 'SliderLabel';

function SliderCompare({ before, after, onBroken, className, zoom }: { before: ImageCompareImage; after: ImageCompareImage; onBroken: (src: string) => void; className?: string; zoom?: ImageCompareZoom }) {
  if (zoom) return <ZoomedSlider before={before} after={after} onBroken={onBroken} className={className} zoom={zoom} />;
  return <FramedSlider before={before} after={after} onBroken={onBroken} className={className} />;
}

function FramedSlider({ before, after, onBroken, className }: { before: ImageCompareImage; after: ImageCompareImage; onBroken: (src: string) => void; className?: string }) {
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

/** The space between a label and the visible image's edges, px: --spacing-xs at the default density (for the fade). */
const LABEL_INSET = 8;
/** A zoomed label's bottom: --spacing-xs above the visible image's bottom edge, and clear of the home indicator. */
const LABEL_BOTTOM = 'bottom-[calc(max(var(--edge-b),var(--safe-bottom))+var(--spacing-xs))]';

/** The slider in ImageViewer (`zoom`): see the comment at the top. */
function ZoomedSlider({ before, after, onBroken, className, zoom }: { before: ImageCompareImage; after: ImageCompareImage; onBroken: (src: string) => void; className?: string; zoom: ImageCompareZoom }) {
  // the handle's place on screen, as a fraction of the frame's width
  const [hx, setHx] = useState(0.5);
  // the frame (the screen), the images' rest size and the labels' widths, measured
  const [box, setBox] = useState({ W: 0, H: 0, w: 0, h: 0, bw: 0, aw: 0 });
  const frame = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const beforeLabel = useRef<HTMLSpanElement>(null);
  const afterLabel = useRef<HTMLSpanElement>(null);
  const drag = useRef<number | null>(null);

  const measure = () => {
    const f = frame.current, l = layer.current;
    if (!f || !l) return;
    setBox({ W: f.clientWidth, H: f.clientHeight, w: l.offsetWidth, h: l.offsetHeight, bw: beforeLabel.current?.offsetWidth ?? 0, aw: afterLabel.current?.offsetWidth ?? 0 });
  };
  useLayoutEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    for (const el of [frame.current, layer.current, beforeLabel.current, afterLabel.current]) if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // the images on screen: where they are, and the part of them the screen shows
  const { W, H, w, h } = box;
  const sw = w * zoom.scale, sh = h * zoom.scale;
  const L = W / 2 + zoom.x - sw / 2, T = H / 2 + zoom.y - sh / 2;
  const vis = { l: Math.max(0, L), r: Math.min(W, L + sw), t: Math.max(0, T), b: Math.min(H, T + sh) };
  const handleX = Math.min(vis.r, Math.max(vis.l, hx * W));
  // how much of the images is before: the handle's place across them
  const pos = sw > 0 ? clamp(((handleX - L) / sw) * 100) : 50;
  const placeAt = (x: number) => { if (W > 0) setHx(Math.min(vis.r, Math.max(vis.l, x)) / W); };

  // The handle's events reach the viewer, which counts every finger (one alone on the handle is the handle's, not a
  // pan). A second finger down anywhere ends the handle's drag, so a pinch with one finger on the handle zooms. The
  // fingers are counted at the window, where a pointer captured elsewhere still ends.
  useEffect(() => {
    const down = new Set<number>();
    const onDown = (e: PointerEvent) => {
      down.add(e.pointerId);
      if (down.size > 1) drag.current = null;
    };
    const onEnd = (e: PointerEvent) => void down.delete(e.pointerId);
    const kinds = [['pointerdown', onDown], ['pointerup', onEnd], ['pointercancel', onEnd]] as const;
    for (const [k, f] of kinds) window.addEventListener(k, f, true);
    return () => { for (const [k, f] of kinds) window.removeEventListener(k, f, true); };
  }, []);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    drag.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current !== e.pointerId) return;
    placeAt(e.clientX - frame.current!.getBoundingClientRect().left);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current === e.pointerId) drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const next = { ArrowLeft: pos - KEY_STEP, ArrowDown: pos - KEY_STEP, ArrowRight: pos + KEY_STEP, ArrowUp: pos + KEY_STEP, Home: 0, End: 100 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    placeAt(L + (clamp(next) / 100) * sw);
  };

  const shown = Math.round(pos);
  const beforeCovered = W > 0 && handleX < vis.l + LABEL_INSET + box.bw + LABEL_GAP;
  const afterCovered = W > 0 && handleX > vis.r - LABEL_INSET - box.aw - LABEL_GAP;
  // the labels' distance from the screen's bottom edge and their side's: the visible image's, or the safe area's
  const below = `${H - vis.b}px`;
  const ease = (prop: string) => (zoom.ease ? `${prop} ${zoom.ease}` : 'none');

  return (
    <div ref={frame} data-image-compare-slider="" data-zoomed="" className={cn('absolute inset-0 touch-none select-none overflow-hidden', className)}>
      <div className="absolute inset-0 flex items-center justify-center [container-type:size]" style={{ padding: 'var(--image-viewer-inset, 0px)' }}>
        <div
          ref={layer}
          data-image-viewer-content=""
          style={{ transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`, transition: ease('transform') }}
          className="relative origin-center will-change-transform"
        >
          <img src={before.src} alt={before.label} draggable={false} onError={() => onBroken(before.src)} onLoad={measure} className="block h-auto max-h-[100cqh] w-auto max-w-[100cqw]" />
          <img
            src={after.src}
            alt={after.label}
            draggable={false}
            onError={() => onBroken(after.src)}
            data-image-compare-after=""
            style={{ clipPath: `inset(0 0 0 ${pos}%)`, transition: ease('clip-path') }}
            className="absolute inset-0 block h-full w-full object-contain object-top"
          />
        </div>
      </div>
      <span
        ref={beforeLabel}
        aria-hidden="true"
        data-image-compare-label="left"
        style={{ ['--edge-x' as string]: `${vis.l}px`, ['--edge-b' as string]: below }}
        className={cn(LABEL_CHIP, 'absolute', LABEL_BOTTOM, 'left-[calc(max(var(--edge-x),var(--safe-left))+var(--spacing-xs))]', beforeCovered ? 'opacity-0' : 'opacity-100')}
      >
        <span className="text-[var(--color-text-inverted)]">{before.label}</span>
      </span>
      <span
        ref={afterLabel}
        aria-hidden="true"
        data-image-compare-label="right"
        style={{ ['--edge-x' as string]: `${W - vis.r}px`, ['--edge-b' as string]: below }}
        className={cn(LABEL_CHIP, 'absolute', LABEL_BOTTOM, 'right-[calc(max(var(--edge-x),var(--safe-right))+var(--spacing-xs))]', afterCovered ? 'opacity-0' : 'opacity-100')}
      >
        <span className="text-[var(--color-text-inverted)]">{after.label}</span>
      </span>
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        style={{ left: handleX, top: vis.t, height: Math.max(0, vis.b - vis.t) }}
        className="group absolute w-11 -translate-x-1/2 cursor-ew-resize outline-none"
      >
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-[var(--color-text-default)] shadow-[var(--elevation-1)]" />
        <span className="absolute left-1/2 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border-emphasis)] bg-[var(--color-surface-elevated)] text-[var(--color-text-default)] shadow-[var(--elevation-2)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--color-border-focus)] group-focus-visible:ring-offset-2">
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

export function ImageCompare({ images, mode = 'side-by-side', zoom, className }: ImageCompareProps) {
  // the srcs that failed in the slider: a new pair gets the slider back
  const [brokenSrcs, setBrokenSrcs] = useState<string[]>([]);
  if (mode === 'slider' && images.length >= 2 && !brokenSrcs.includes(images[0].src) && !brokenSrcs.includes(images[1].src)) {
    const [before, after] = images;
    return <SliderCompare key={`${before.src}|${after.src}`} before={before} after={after} onBroken={src => setBrokenSrcs(b => (b.includes(src) ? b : [...b, src]))} className={className} zoom={zoom} />;
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
