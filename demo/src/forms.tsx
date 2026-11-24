// T35: the four form inputs the board uses (TextArea, Switch, Slider, SegmentedControl) in the states it shows them,
// for the before/after capture of the form-input convention. Every prop here is one both the old and the new
// components take, so the same section renders before and after.
import { SegmentedControl, Slider, Switch, TextArea } from '@levain/ui-react';
import { useState } from 'react';
import { Forms2Demo } from './forms2';

export function FormsDemo({ Section }: { Section: (p: { title: string; note: string; children: React.ReactNode }) => React.ReactElement }) {
  const [text, setText] = useState('A comment, two rows tall.');
  const [long, setLong] = useState('');
  const [small, setSmall] = useState('Compact notes');
  const [on, setOn] = useState({ sm: true, md: false, lg: true });
  const [pool, setPool] = useState(4);
  const [opacity, setOpacity] = useState(60);
  const [view, setView] = useState('upcoming');
  const [size, setSize] = useState('md');

  return (
    <Section title="Form inputs" note="TextArea, Switch, Slider and SegmentedControl, as the board uses them, under one convention (T35).">
      <div data-demo="forms" className="grid max-w-[40rem] gap-md p-2xs">
        <TextArea id="forms-comment" label="Comment" rows={2} value={text} onChange={e => setText(e.target.value)} helperText="Cmd+Enter sends it." />
        <TextArea id="forms-response" label="Response" rows={2} value={long} onChange={e => setLong(e.target.value)} error="This response is 2,140 characters; the most is 2,000." textareaClassName="type-body-sm" />
        <TextArea id="forms-compact" label="Notes" rows={2} compact value={small} onChange={e => setSmall(e.target.value)} helperText="Compact" />
        <TextArea id="forms-disabled" label="Disabled" rows={2} disabled value="Read only" onChange={() => {}} />
        <div className="flex flex-wrap items-center gap-md">
          <div className="flex items-center gap-xs">
            <label htmlFor="forms-notify" className="type-label-sm">Notifications</label>
            <Switch id="forms-notify" size="sm" checked={on.sm} onChange={v => setOn(o => ({ ...o, sm: v }))} />
          </div>
          <Switch id="forms-md" label="Medium" checked={on.md} onChange={v => setOn(o => ({ ...o, md: v }))} />
          <Switch id="forms-lg" size="lg" label="Large" checked={on.lg} onChange={v => setOn(o => ({ ...o, lg: v }))} />
          <Switch id="forms-off" label="Disabled" checked={false} disabled onChange={() => {}} />
        </div>
        <Slider label="Workers" size="sm" value={pool} min={1} max={10} step={1} onChange={n => setPool(Math.round(n))} showValue showMinMax />
        <Slider label="Opacity" value={opacity} min={0} max={100} onChange={setOpacity} showInput helperText="Type a value or drag." />
        <div className="flex flex-wrap items-end gap-md">
          <SegmentedControl id="forms-view" size="sm" value={view} onChange={setView}
            options={[{ label: 'Upcoming (3)', value: 'upcoming' }, { label: 'Earlier releases (12)', value: 'all' }]} />
          <SegmentedControl id="forms-size" label="Size" value={size} onChange={setSize}
            options={[{ label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg', disabled: true }]} />
        </div>
      </div>
      <Forms2Demo />
    </Section>
  );
}
