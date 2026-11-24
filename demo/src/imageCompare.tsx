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
