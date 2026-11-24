// T5: ImageCompare with a real pair, T24's phone captures at 390: the tall decide as a bottom sheet, and main before it,
// where the dialog ran off the screen. Side by side from md up, stacked below; each opens full size in a new tab.
// ?only=compare shows only this section (for captures).
import { ImageCompare } from '@levain/ui-react';
import type { ReactNode } from 'react';

const PAIR = [
  { label: 'This build', src: 'image-compare/this-build.png' },
  { label: 'Target', src: 'image-compare/target.png' },
];

export function ImageCompareDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  return (
    <Section title="Image compare: a build beside its target" note="Two captures at equal width from md up, stacked on a phone, each at its own aspect ratio with its label under it. Tap one to open it full size in a new tab. Here T24's phone dialog: the bottom sheet, and main before it.">
      <div data-demo="image-compare">
        <ImageCompare images={PAIR} />
      </div>
    </Section>
  );
}

// T40: the slider mode with the same pair, as before (main) and after (the bottom sheet). ?only=slider shows only this
// section; ?before=<path>&after=<path> swap in another pair (T40's capture passes T37's before and after).
export function ImageCompareSliderDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const q = new URLSearchParams(location.search);
  const images = [
    { label: 'Before', src: q.get('before') ?? 'image-compare/target.png' },
    { label: 'After', src: q.get('after') ?? 'image-compare/this-build.png' },
  ];
  return (
    <Section title="Image compare, slider: before and after in one frame" note="Two captures of the same screen laid over each other. Drag the handle (or focus it and use the arrow keys, Home and End) to reveal before on the left and after on the right. Here T24's phone dialog: main, where it ran off the screen, and the bottom sheet.">
      <div data-demo="image-compare-slider">
        <ImageCompare mode="slider" images={images} className="mx-auto max-w-sm" />
      </div>
    </Section>
  );
}
