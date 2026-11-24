// T27: the pieces that named colours or classes no theme defines, each in the state that shows the fix. ?only=colours
// shows only this section (for captures). Each piece carries data-piece for the capture script.
import {
  AdminPageTemplate, Calendar, Checkbox, ContentNavigation, DataTable, ImageUploader, MediaCard, RadioButton,
  LevainProvider, SimpleAnimatedName, Slider, StatusCard, SurfaceCard, type DataTableProps,
} from '@levain/ui-react';
import { useState, type ReactNode } from 'react';

type Row = { id: string; title: string; state: string };
const ROWS: Row[] = [
  { id: 'T25', title: 'Dialog height', state: 'done' },
  { id: 'T26', title: 'Architecture review', state: 'done' },
  { id: 'T27', title: 'Missing colour names', state: 'doing' },
];
const COLUMNS: DataTableProps<Row, unknown>['columns'] = [
  { accessorKey: 'id', header: 'Task' },
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'state', header: 'State' },
];

// one object for every render: SimpleAnimatedName's effect depends on it, and a new one each time loops
const STATIC_THEME = { theme: 'light' as const, setTheme: () => {}, themeIndex: 0, setThemeIndex: () => {}, saveThemePreference: () => {} };
const staticTheme = () => STATIC_THEME;

const Piece = ({ name, children, className = '' }: { name: string; children: ReactNode; className?: string }) => (
  <div data-piece={name} className={'space-y-2xs rounded-[var(--radius-lg)] bg-[var(--color-surface-canvas)] p-sm ' + className}>
    <p className="type-label-sm text-[var(--color-text-muted)]">{name}</p>
    {children}
  </div>
);

export function ColoursDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const [checks, setChecks] = useState({ a: false, b: true });
  const [radio, setRadio] = useState('b');
  const [slider, setSlider] = useState(30);
  const [date, setDate] = useState(new Date(2026, 10, 23));
  return (
    <Section title="Colour and class names every theme defines" note="Pieces that asked for colours or classes no theme defines (T27): borders, a selected row, the caution tone, a slider's fill, a calendar's panel slide.">
      <div className="grid grid-cols-1 gap-sm md:grid-cols-3">
        <Piece name="checkbox-radio">
          <Checkbox id="c-a" checked={checks.a} onChange={a => setChecks(c => ({ ...c, a }))} label="Unchecked" />
          <Checkbox id="c-b" checked={checks.b} onChange={b => setChecks(c => ({ ...c, b }))} label="Checked" />
          <RadioButton id="r-a" name="r" value="a" checked={radio === 'a'} onChange={setRadio} label="Unselected" />
          <RadioButton id="r-b" name="r" value="b" checked={radio === 'b'} onChange={setRadio} label="Selected" />
        </Piece>
        <Piece name="status-card">
          <StatusCard id="T27c" number="T27" title="Waiting on the designer" accent="caution" kind={{ label: 'Caution', tone: 'caution' }} markers={[{ label: 'stale', tone: 'caution' }]} />
        </Piece>
        <Piece name="slider">
          <Slider label="Pool size" value={slider} min={0} max={100} onChange={setSlider} />
        </Piece>
        <Piece name="data-table" className="md:col-span-2">
          <DataTable columns={COLUMNS} data={ROWS} getRowId={r => r.id} enableRowSelection
            filterGroups={[{ id: 'state', label: 'State', options: [{ id: 'doing', label: 'Doing', value: 'doing', column: 'state' }] }]} />
        </Piece>
        <Piece name="calendar">
          <Calendar selectedDate={date} onDateSelect={setDate} />
        </Piece>
        <Piece name="image-uploader">
          <ImageUploader entityType="demo" onImagesUploaded={() => {}} label="Images" description="Drop images here" />
        </Piece>
        <Piece name="media-card">
          <MediaCard title="A card with no image" subtitle="the placeholder icon" href="#" />
        </Piece>
        <Piece name="surface-card">
          <SurfaceCard selectable shadowStyle="none"><p className="type-body p-sm">Hover me: a 1px ring</p></SurfaceCard>
        </Piece>
        <Piece name="content-navigation" className="md:col-span-2">
          <ContentNavigation previous={{ title: 'Dialog height', slug: 't25' }} next={{ title: 'Missing colours', slug: 't27' }} basePath="#" backLinkText="Back to tasks" delayMs={0} />
        </Piece>
        <Piece name="admin-error">
          <AdminPageTemplate title="Admin" error="Could not load the tasks.">{null}</AdminPageTemplate>
        </Piece>
        <Piece name="animated-name">
          {/* SimpleAnimatedName reads the app's theme state; a fixed one is enough to show its drift */}
          <LevainProvider useTheme={staticTheme}><SimpleAnimatedName name="levain" className="type-heading-2" /></LevainProvider>
        </Piece>
      </div>
    </Section>
  );
}
