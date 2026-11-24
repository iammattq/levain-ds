// T31 (D13): ColorInput and GradientInput with their swatch at the window's left edge, where the picker used to open
// off-screen. ?only=picker; demo/e2e/picker.sh captures it before and after.
import { ColorInput, GradientInput } from '@levain/ui-react';
import { useState, type ReactNode } from 'react';

export function PickerDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const [colour, setColour] = useState('#3366CC');
  const [gradient, setGradient] = useState({
    angle: 90,
    stops: [
      { id: 'a', color: '#3366CC', alpha: 100, position: 0 },
      { id: 'b', color: '#CC6633', alpha: 100, position: 100 },
    ],
  });
  return (
    <Section title="Pickers at the left edge" note="Open either swatch: the picker opens beside it, on the side with room.">
      <div className="space-y-md" style={{ maxWidth: 320 }}>
        <div data-piece="colour-input">
          <ColorInput id="picker-colour" label="Colour" value={colour} onChange={setColour} />
        </div>
        <div data-piece="gradient-input">
          <GradientInput id="picker-gradient" label="Gradient" value={gradient as never} onChange={setGradient as never} />
        </div>
      </div>
    </Section>
  );
}
