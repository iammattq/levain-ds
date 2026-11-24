'use client';

import React, { useState } from 'react';
import { cn } from '../utils/cn';

/**
 * ImageCompare (T5): images shown large for comparison, usually a build beside its reference ("This build" and
 * "Target"). Side by side at equal width from md up, stacked below md; one image alone takes the full width. Each image
 * keeps its own aspect ratio (no crop, no fixed height), top-aligned, its label under it as the caption and as its alt
 * text. Each is a link that opens the full image in a new tab (`href`, default `src`). An image that can't load falls
 * back to its label and path as text, as the Ringmaster board's thumbnails do.
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
  className?: string;
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

export function ImageCompare({ images, className }: ImageCompareProps) {
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
