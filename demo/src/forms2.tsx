// T53: TextInput, Select, Checkbox and RadioButton in their usual states, for the before/after capture of the
// form-input convention (part 2). Every prop here is one both the old and the new components take, so the same block
// renders before and after; errors pass `touched` because the old TextInput hid them without it.
import { Checkbox, RadioButton, Select, TextInput } from '@levain/ui-react';
import { useState } from 'react';

const plans = [
  { value: 'free', label: 'Free' },
  { value: 'team', label: 'Team' },
  { value: 'org', label: 'Organisation', disabled: true },
];

export function Forms2Demo() {
  const [name, setName] = useState('Levain');
  const [email, setEmail] = useState('not-an-email');
  const [count, setCount] = useState('4');
  const [small, setSmall] = useState('Compact');
  const [plan, setPlan] = useState('team');
  const [planErr, setPlanErr] = useState('');
  const [boxes, setBoxes] = useState({ a: true, b: false });
  const [pick, setPick] = useState('weekly');

  return (
    <div data-demo="forms-2" className="grid max-w-[40rem] gap-md p-2xs">
      <TextInput id="forms2-name" label="Name" value={name} onChange={e => setName(e.target.value)} helperText="Shown on your profile." />
      <TextInput id="forms2-email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} error="Enter an email address." touched required />
      <div className="flex flex-wrap items-end gap-md">
        <TextInput id="forms2-count" label="Count" type="number" value={count} onChange={e => setCount(e.target.value)} size="sm" />
        <TextInput id="forms2-small" label="Compact" value={small} onChange={e => setSmall(e.target.value)} compact />
        <TextInput id="forms2-search" label="Search" hideLabel placeholder="Search" value="" onChange={() => {}} size="lg" />
      </div>
      <TextInput id="forms2-off" label="Disabled" value="Read only" onChange={() => {}} disabled helperText="Locked by your admin." />
      <div className="flex flex-wrap items-start gap-md">
        <Select id="forms2-plan" label="Plan" options={plans} value={plan} onChange={e => setPlan(e.target.value)} helperText="Change it any time." />
        <Select id="forms2-plan-err" label="Billing plan" options={plans} placeholder="Choose one" value={planErr} onChange={e => setPlanErr(e.target.value)} error="Choose a plan." required />
        <Select id="forms2-plan-off" label="Locked" options={plans} value="free" onChange={() => {}} disabled helperText="Locked" size="xs" />
        <Select id="forms2-plan-inline" label="Inline plan" options={plans} value={plan} onChange={e => setPlan(e.target.value)} inline size="sm" />
      </div>
      <div className="flex flex-wrap items-center gap-md">
        <Checkbox id="forms2-a" label="Email me" checked={boxes.a} onChange={v => setBoxes(b => ({ ...b, a: v }))} />
        <Checkbox id="forms2-b" label="Small" size="sm" checked={boxes.b} onChange={v => setBoxes(b => ({ ...b, b: v }))} />
        <Checkbox id="forms2-c" label="Some" size="lg" checked="indeterminate" onChange={() => {}} />
        <Checkbox id="forms2-d" label="Disabled" checked disabled onChange={() => {}} />
      </div>
      <div className="flex flex-wrap items-center gap-md">
        {['daily', 'weekly', 'monthly'].map(v => (
          <RadioButton key={v} id={`forms2-${v}`} name="forms2-often" value={v} label={v[0].toUpperCase() + v.slice(1)} checked={pick === v} onChange={setPick} />
        ))}
        <RadioButton id="forms2-never" name="forms2-often" value="never" label="Never" checked={false} disabled onChange={setPick} size="sm" />
      </div>
    </div>
  );
}
