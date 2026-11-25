'use client';

/**
 * ImageViewer (T61): one image, or a before/after pair, full screen on Modal's solid scrim, zoomed by the image itself
 * while the page stays put.
 *
 * Built on `Modal scrim="solid" bare` (opaque, so nothing of the page shows behind the image: T63; no backdrop blur: a
 * full-screen fixed blur over a zoomed page turned the iPhone app white, Ringmaster T169): Modal brings the dialog,
 * the focus trap and its return, top-only Escape and the portal, so opened over a dialog it sits on top and closing goes
 * back to it. The image is fitted inside the safe-area insets
 * (1rem at least) and centred; a ✕ sits top right. A tap outside the image, the ✕ or Escape closes.
 *
 * Zoom, on one surface with `touch-action: none` (every touch on it is the viewer's: the page never pinches through),
 * read from pointer events only:
 * - two fingers pinch around their midpoint (and pan as it moves); a double tap on the image toggles 1x / 2.5x around
 *   the tap; one finger (or a mouse drag) pans when zoomed;
 * - the wheel, or ctrl+wheel (a trackpad's pinch), zooms around the cursor;
 * - keys: + (or =) and - zoom around the centre, 0 resets, the arrows pan when zoomed;
 * - always 1x-5x, and a zoomed image's edges never come inside the screen on a side it overflows (one narrower than the
 *   screen stays centred on that axis). Closing resets it.
 * Double tap, keys and reset ease the transform (shift's duration, spring-out); pinch, pan and the wheel follow the
 * input exactly. Under Reduce Motion nothing eases.
 *
 * `compare` shows ImageCompare's slider instead (its `zoom` prop): both images zoom and pan as one layer, the handle
 * stays where it is on screen while they move under it, and the handle drags only from itself, so a drag anywhere else
 * pans.
 *
 * A plain `<img>`, as ImageCompare: the size isn't known ahead.
 */
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { useReducedMotion, type MotionProps } from 'framer-motion';
import { motion as motionFor } from '@levain/tokens';
import { X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ImageCompare, type ImageCompareImage } from '../patterns/ImageCompare';

export type ImageViewerProps = {
  open: boolean;
  onClose: () => void;
  /** The dialog's accessible name; defaults to `alt`, or "<before> and <after>". */
  label?: string;
} & (
  | { /** The image. */ src: string; /** Its alt text. */ alt: string; compare?: never }
  | { /** A before/after pair, shown in ImageCompare's slider. */ compare: [ImageCompareImage, ImageCompareImage]; src?: never; alt?: never }
);

/** Where the content sits: a scale about its centre, then a shift in px. The content's rest centre is the screen's. */
export interface Zoom {
  scale: number;
  x: number;
  y: number;
}
/** The content's size at rest (`w`, `h`) and the screen's (`W`, `H`), in px. */
export interface ZoomBox {
  w: number;
  h: number;
  W: number;
  H: number;
}
/** A point in px from the screen's centre. */
export interface ZoomPoint {
  x: number;
  y: number;
}

export const ZOOM = {
  min: 1,
  max: 5,
  /** Where a double tap goes from 1x. */
  double: 2.5,
  /** One key press zooms by this factor. */
  step: 1.5,
  /** One arrow key press pans this far, px. */
  pan: 48,
  /** A finger or mouse moves this far before a press is a drag, not a tap, px. */
  slop: 8,
  /** Two taps this close in time (ms) and space (px) are a double tap. */
  doubleMs: 300,
  doublePx: 30,
} as const;

export const REST: Zoom = { scale: 1, x: 0, y: 0 };

const within = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The zoom in range (1x-5x) and the content's edges on screen: an overflowing axis can't show a gap, a fitting one is centred. */
export function clampZoom(z: Zoom, b: ZoomBox): Zoom {
  const scale = within(z.scale, ZOOM.min, ZOOM.max);
  const edge = (t: number, size: number, screen: number) => {
    const over = Math.max(0, (size * scale - screen) / 2);
    return within(t, -over, over) || 0; // || 0: no -0
  };
  return { scale, x: edge(z.x, b.w, b.W), y: edge(z.y, b.h, b.H) };
}

/**
 * From `z`, to `scale`, with the content point that was under `from` now under `to` (a pinch whose midpoint moved
 * from `from` to `to`; `to` left out, a zoom that keeps the point under `from` in place), then clamped.
 */
export function zoomAt(z: Zoom, scale: number, from: ZoomPoint, b: ZoomBox, to: ZoomPoint = from): Zoom {
  const s = within(scale, ZOOM.min, ZOOM.max);
  const k = s / z.scale;
  return clampZoom({ scale: s, x: to.x - (from.x - z.x) * k, y: to.y - (from.y - z.y) * k }, b);
}

/** `z` moved by (dx, dy), clamped. */
export function panBy(z: Zoom, dx: number, dy: number, b: ZoomBox): Zoom {
  return clampZoom({ scale: z.scale, x: z.x + dx, y: z.y + dy }, b);
}

/** The CSS transform for a zoom (origin: the content's centre). */
export const zoomTransform = (z: Zoom) => `translate(${z.x}px, ${z.y}px) scale(${z.scale})`;

/** The easing of a stepped change (double tap, keys, reset), as a CSS transition's timing. */
export const ZOOM_EASE = 'var(--duration-shift) var(--ease-spring-out)';

/**
 * The fit: the content inside the safe-area insets, 1rem at least, the same on opposite sides so its centre is the
 * screen's (the zoom math's origin). ImageCompare's zoomed slider reads it too.
 */
const INSET =
  'max(var(--safe-top), var(--safe-bottom), 1rem) max(var(--safe-left), var(--safe-right), 1rem)';

const CONTENT = '[data-image-viewer-content]';

export function ImageViewer(props: ImageViewerProps) {
  const { open, onClose, label } = props;
  const reduce = useReducedMotion();
  const name = label ?? (props.compare ? `${props.compare[0].label} and ${props.compare[1].label}` : props.alt);
  const fade: MotionProps = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: motionFor('fadeIn', reduce),
  };
  return (
    <Modal isOpen={open} onClose={onClose} scrim="solid" bare label={name} motionProps={fade}>
      {close => <Stage {...props} onClose={close} reduce={!!reduce} />}
    </Modal>
  );
}

type Pointer = { x: number; y: number };
type Gesture =
  | { kind: 'press'; id: number; x0: number; y0: number; z0: Zoom; t0: number; moved: boolean; onContent: boolean; handle?: boolean }
  | { kind: 'pinch'; d0: number; m0: ZoomPoint; z0: Zoom };

/** The viewer's contents, mounted while it's open: a fresh one (at rest) each time it opens. */
function Stage(props: ImageViewerProps & { reduce: boolean }) {
  const { onClose, reduce } = props;
  const surface = useRef<HTMLDivElement>(null);
  const hint = useId();
  const [zoom, setZoomState] = useState<Zoom>(REST);
  const [eased, setEased] = useState(false);
  const zoomRef = useRef(zoom);
  const set = useCallback((z: Zoom, ease: boolean) => {
    zoomRef.current = z;
    setEased(ease);
    setZoomState(z);
  }, []);

  const pointers = useRef(new Map<number, Pointer>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const swallowClick = useRef(false);

  /** The screen's box and the content's rest size, read now (the content's offset size ignores its transform). */
  const measure = useCallback(() => {
    const s = surface.current!;
    const r = s.getBoundingClientRect();
    const c = s.querySelector<HTMLElement>(CONTENT);
    const box: ZoomBox = { w: c?.offsetWidth ?? 0, h: c?.offsetHeight ?? 0, W: r.width, H: r.height };
    return { box, at: (clientX: number, clientY: number): ZoomPoint => ({ x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) }) };
  }, []);

  // focus on the surface, so the keys reach it (Modal's focus trap finds focus already inside and leaves it)
  useEffect(() => {
    surface.current?.focus({ preventScroll: true });
  }, []);

  // the wheel zooms around the cursor; a native listener, since React's wheel listener is passive and can't stop the page
  useEffect(() => {
    const el = surface.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { box, at } = measure();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * box.H : e.deltaY;
      // ctrl+wheel is a trackpad's pinch: small deltas, so a stronger factor
      const f = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.002));
      const z = zoomRef.current;
      set(zoomAt(z, z.scale * f, at(e.clientX, e.clientY), box), false);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [measure, set]);

  // a resize (a phone turned) keeps the edges on screen
  useEffect(() => {
    const onResize = () => set(clampZoom(zoomRef.current, measure().box), false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure, set]);

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    const { at } = measure();
    const pa = at(a.x, a.y), pb = at(b.x, b.y);
    gesture.current = { kind: 'pinch', d0: Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1, m0: { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }, z0: zoomRef.current };
  };
  const startPress = (id: number, p: Pointer, onContent: boolean, moved: boolean, handle = false) => {
    gesture.current = { kind: 'press', id, x0: p.x, y0: p.y, z0: zoomRef.current, t0: Date.now(), moved, onContent, handle };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    // the ✕ stays a button (a captured pointer would take its click away)
    if (target.closest('button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swallowClick.current = false;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      startPinch();
      swallowClick.current = true;
      for (const id of pointers.current.keys()) surface.current?.setPointerCapture?.(id);
    } else {
      // a finger alone on the pair's handle drags the handle (counted here, so a second finger makes a pinch)
      startPress(e.pointerId, { x: e.clientX, y: e.clientY }, !!target.closest(CONTENT), false, !!target.closest('[role="slider"]'));
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const { box, at } = measure();
    if (g.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      if (!b) return;
      const pa = at(a.x, a.y), pb = at(b.x, b.y);
      const d = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      set(zoomAt(g.z0, (g.z0.scale * d) / g.d0, g.m0, box, { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }), false);
      return;
    }
    if (g.id !== e.pointerId || g.handle) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (!g.moved && Math.hypot(dx, dy) > ZOOM.slop) {
      g.moved = true;
      // a drag: the surface keeps the pointer (a mouse leaving the window), and its click (if any) is no tap
      surface.current?.setPointerCapture?.(e.pointerId);
    }
    if (g.moved && g.z0.scale > 1) set(panBy(g.z0, dx, dy, box), false);
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (g?.kind === 'pinch') {
      // two or more still down: they pinch on from here; one: it pans on; none: done
      const rest = [...pointers.current.entries()];
      if (rest.length >= 2) startPinch();
      else if (rest.length === 1) startPress(rest[0][0], rest[0][1], false, true);
      else gesture.current = null;
      return;
    }
    gesture.current = null;
    if (!g || g.id !== e.pointerId) return;
    if (g.moved) {
      swallowClick.current = true;
      return;
    }
    if (e.type !== 'pointerup' || !g.onContent) return;
    // a tap on the image: the second of two close together toggles the zoom
    const now = Date.now(), last = lastTap.current;
    if (last && now - last.t <= ZOOM.doubleMs && Math.hypot(e.clientX - last.x, e.clientY - last.y) <= ZOOM.doublePx) {
      lastTap.current = null;
      const { box, at } = measure();
      const z = zoomRef.current;
      set(z.scale > 1 ? REST : zoomAt(z, ZOOM.double, at(e.clientX, e.clientY), box), true);
    } else {
      lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    }
  };

  // a tap outside the image (not a drag, not on a control) closes
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    if (!(e.target as Element).closest(`${CONTENT}, button, [role="slider"]`)) onClose();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const z = zoomRef.current;
    const { box } = measure();
    const centre = { x: 0, y: 0 };
    let next: Zoom | null = null;
    if (e.key === '+' || e.key === '=') next = zoomAt(z, z.scale * ZOOM.step, centre, box);
    else if (e.key === '-' || e.key === '_') next = zoomAt(z, z.scale / ZOOM.step, centre, box);
    else if (e.key === '0') next = REST;
    else if (z.scale > 1) {
      const d = { ArrowLeft: [ZOOM.pan, 0], ArrowRight: [-ZOOM.pan, 0], ArrowUp: [0, ZOOM.pan], ArrowDown: [0, -ZOOM.pan] }[e.key];
      if (d) next = panBy(z, d[0], d[1], box);
    }
    if (!next) return;
    e.preventDefault();
    set(next, true);
  };

  const ease = eased && !reduce ? ZOOM_EASE : undefined;

  return (
    <div
      ref={surface}
      data-image-viewer=""
      data-zoom={zoom.scale}
      tabIndex={-1}
      aria-describedby={hint}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={{ ['--image-viewer-inset' as string]: INSET }}
      className="absolute inset-0 touch-none select-none overflow-hidden outline-none"
    >
      <span id={hint} className="sr-only">
        Pinch, double tap or press + and - to zoom; drag or use the arrow keys to move a zoomed image; 0 resets.
      </span>
      {props.compare ? (
        <ImageCompare images={props.compare} mode="slider" zoom={{ ...zoom, ease }} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center [container-type:size]" style={{ padding: 'var(--image-viewer-inset)' }}>
          <div
            data-image-viewer-content=""
            style={{ transform: zoomTransform(zoom), transition: ease ? `transform ${ease}` : 'none' }}
            className="origin-center will-change-transform"
          >
            <img
              src={props.src}
              alt={props.alt}
              draggable={false}
              className="block h-auto max-h-[100cqh] w-auto max-w-[100cqw] rounded-[var(--radius-md)]"
            />
          </div>
        </div>
      )}
      <Button
        variant="secondary"
        size="icon"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-[max(var(--safe-right),var(--spacing-xs))] top-[max(var(--safe-top),var(--spacing-xs))] z-10 size-11 rounded-full"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  );
}

export default ImageViewer;
