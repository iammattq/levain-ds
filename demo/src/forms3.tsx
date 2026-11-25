// T54: DualSlider, DateInput, Calendar, ColorInput and GradientInput at rest, for the before/after capture of the
// form-input convention (part 3). Every prop here is one both the old and the new components take, so the same section
// renders before and after; the errors pass `touched` so they show in both (before, an error waited for `touched`).
import { Calendar, ColorInput, DateInput, DualSlider, GradientInput, type GradientValue } from '@levain/ui-react';
import { useState } from 'react';

const GRADIENT: GradientValue = {
  angle: 90,
  stops: [
    { position: 0, color: { hex: '#2E6B4F', alpha: 100 } },
    { position: 100, color: { hex: '#E8C468', alpha: 100 } },
  ],
};

export function FormsPart3() {
  const [range, setRange] = useState({ min: 20, max: 80 });
  const [date, setDate] = useState('2026-03-14');
  const [bad, setBad] = useState('2026-13-40');
  const [day, setDay] = useState(new Date(2026, 2, 14));
  const [colour, setColour] = useState('#2E6B4F');
  const [wrong, setWrong] = useState('#12');
  const [gradient, setGradient] = useState(GRADIENT);

  return (
    <div data-demo="forms-3" className="grid max-w-[40rem] gap-md p-2xs">
      <DualSlider label="Price" minValue={range.min} maxValue={range.max} min={0} max={100}
        onMinChange={min => setRange(r => ({ ...r, min }))} onMaxChange={max => setRange(r => ({ ...r, max }))} />
      <div className="grid gap-md sm:grid-cols-2">
        <DateInput id="forms-date" label="Published" value={date} onChange={e => setDate(e.target.value)} helperText="YYYY-MM-DD" />
        <DateInput id="forms-date-bad" label="Due" value={bad} onChange={e => setBad(e.target.value)} touched error="Please enter a valid date." />
        <DateInput id="forms-date-off" label="Created" value="2026-01-02" onChange={() => {}} disabled />
        <ColorInput id="forms-colour" label="Accent" value={colour} onChange={setColour} helperText="Hex, #RRGGBB" />
        <ColorInput id="forms-colour-bad" label="Border" value={wrong} onChange={setWrong} touched size="sm" />
        <ColorInput id="forms-colour-off" label="Locked" value="#888888" onChange={() => {}} disabled size="xs" />
        <GradientInput id="forms-gradient" label="Fill" value={gradient} onChange={setGradient} helperText="Two stops" />
        <GradientInput id="forms-gradient-bad" label="Shine" value={gradient} onChange={setGradient} touched error="Add a third stop." size="sm" />
      </div>
      <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-section)] w-fit">
        <Calendar selectedDate={day} onDateSelect={setDay} />
      </div>
    </div>
  );
}
