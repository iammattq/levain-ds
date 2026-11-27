// T67: the catalogue, the demo's default page: a header (what levain DS is, the repo, the theme, mode and density
// switches) and the sections in groups, each with a name and a one-line note. The switches set what ?theme=, ?mode= and
// ?density= set, and write them back to the URL so a view can be shared. The test bench is ?bench=1 (bench.ts).
import { setTheme, themeManager } from '@levain/tokens';
import { SegmentedControl, Select } from '@levain/ui-react';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

export type SectionComponent = (p: { title: string; note: string; children: ReactNode }) => ReactElement;
/** wide: the section's pieces don't shrink to a phone; the section scrolls sideways inside itself, the page doesn't. */
type Entry = { id: string; title: string; note: string; wide?: boolean };

export const REPO = 'https://github.com/iammattq/levain-ds';

export const GROUPS: { name: string; sections: Entry[] }[] = [
  { name: 'Foundations', sections: [
    { id: 'colour', title: 'Colour', note: 'The roles every theme defines: surfaces, text, borders, the accent and four tones. Switch the theme or mode above and they all change.' },
    { id: 'type', title: 'Type', note: 'The type scale as classes, from display to caption, and code.' },
    { id: 'motion', title: 'Motion', note: 'Every timing comes from @levain/tokens; under Reduce Motion each one becomes a plain change.' },
  ] },
  { name: 'Inputs', sections: [
    { id: 'forms', title: 'Form inputs', note: 'Text, choices, sliders, dates, tags and chat input under one convention: a label, helper text, an error, compact and disabled.' },
    { id: 'pickers', title: 'Colour pickers', note: 'ColorInput and GradientInput: open a swatch and the picker opens on the side with room.' },
    { id: 'controls', title: 'Checkboxes, a table, a calendar and more', note: 'Older pieces in every theme\'s colours: checkbox and radio, a status card\'s caution tone, a data table with selection and filters, a calendar, an image uploader.' },
  ] },
  { name: 'Overlays', sections: [
    { id: 'popover', title: 'Popover', note: 'A panel that grows out of its trigger, flips when there is no room, and closes on Escape, a press outside or Tab past its end.' },
    { id: 'tooltip', title: 'Tooltip', note: 'A short hint for one control, after a 300 ms hover or at once on keyboard focus. The strip\'s is a toggle: a tap or Enter shows it.' },
    { id: 'menu', title: 'Menu', note: 'A list of choices from a button, the chosen one checked. Arrows move, Enter or Space picks, Escape closes.' },
    { id: 'drawer', title: 'Drawer', note: 'A full-height panel from the left over a scrim; focus moves in and back, the page stays still under it, a swipe left closes it.' },
    { id: 'fab', title: 'Floating menu', note: 'A round button in the corner that grows into a menu; choose a row to slide to its level, and a draft there survives closing.' },
    { id: 'bottom-sheet', title: 'Bottom sheet', note: 'A sheet from the bottom with a handle: swipe down or flick to close, or the ✕, a tap outside, Escape.' },
    { id: 'phone-dialogs', title: 'Dialogs on a phone', note: 'Below md a dialog opens as a bottom sheet: it rises from the bottom, scrolls inside and closes by its handle.' },
    { id: 'dialog-stack', title: 'Dialog stack', note: 'Two dialogs as a pile, grown out of one card: Next sends the front one away, Back brings it back.' },
    { id: 'viewer', title: 'Image viewer', note: 'Zoom the image, not the page: pinch, double tap, the wheel or the keys; a drag moves a zoomed image.' },
  ] },
  { name: 'Feedback', sections: [
    { id: 'notice', title: 'Notice', note: 'A quiet, persistent line under a header, in each tone; with an action or Dismiss it is an alert.' },
    { id: 'progress', title: 'Progress', note: 'How full something is, as a ring or a bar, xs to lg, in three tones. Pick an amount and they travel to it.' },
    { id: 'skeleton', title: 'Skeleton', note: 'Placeholder shapes while a list loads, pulsing softly.' },
    { id: 'empty', title: 'Empty state', note: 'A dashed outline and a muted message, with an optional icon and action.' },
    { id: 'count', title: 'Count badge', note: 'The number beside a heading, a tab or a pill; it takes the caution tone when something needs you.' },
    { id: 'time', title: 'Relative time', note: 'Times that tick on one shared clock, and take the caution colour once something is late.' },
  ] },
  { name: 'Layout and data', sections: [
    { id: 'sortable', title: 'Sortable lists and cards', note: 'Drag a card between the lists, or focus one and press Space, then the arrows. Click a card and it grows into its dialog.' },
    { id: 'decide', title: 'A card with its answers', note: 'StatusCard with actions on its face: a press on an answer never opens the card or starts a drag.' },
    { id: 'card-stack', title: 'Card stack', note: 'A row that piles at the right, and a pile on phones: scroll or swipe and the cards peel off and settle.' },
    { id: 'columns', wide: true, title: 'Columns, Stack and Cluster', note: 'Column: a glyph, the title, the count, marks and an action over its cards; with scroll, the header stays.' },
    { id: 'strip', title: 'Column strip', note: 'Columns on a phone: swipe between them or tap a pill; rest a dragged card at an edge and the strip pages.' },
    { id: 'timeline', title: 'Timeline', note: 'Dated entries in an ordered list, the current one\'s dot filled: a career and a release history.' },
    { id: 'command', title: 'Command block', note: 'Commands to copy, one at a time or all at once; the icon turns to a check for a moment.' },
    { id: 'compare', title: 'Image compare', note: 'A build beside its target at equal width, stacked on a phone; tap one to open it full size.' },
    { id: 'compare-slider', title: 'Image compare, slider', note: 'Before and after in one frame: drag the handle, or focus it and use the arrow keys.' },
  ] },
];

const ENTRIES = new Map(GROUPS.flatMap(g => g.sections.map(s => [s.id, s] as const)));

/** A catalogue section: its anchor, the catalogue's own title and note (the section's bench title and note are for the
 *  captures, and some name the board copies the catalogue leaves out). One component per id, made once. */
const SECTIONS = new Map<string, SectionComponent>();
export function sectionFor(id: string): SectionComponent {
  let S = SECTIONS.get(id);
  if (!S) {
    const e = ENTRIES.get(id);
    if (!e) throw new Error(`no catalogue section "${id}"`);
    S = ({ children }) => (
      <section id={e.id} data-catalogue-section className="scroll-mt-md space-y-sm">
        <div className="space-y-3xs">
          <h3 className="type-heading-4">{e.title}</h3>
          <p className="type-body-sm max-w-prose text-[var(--color-text-muted)]">{e.note}</p>
        </div>
        {e.wide ? (
          <div className="overflow-x-auto pb-2xs" data-catalogue-wide>
            <div className="min-w-[60rem] space-y-sm">{children}</div>
          </div>
        ) : (
          children
        )}
      </section>
    );
    SECTIONS.set(id, S);
  }
  return S;
}

/** A section inside a catalogue section (Motion's four), a step down. */
export const SubSection: SectionComponent = ({ title, note, children }) => (
  <div className="space-y-sm">
    <div className="space-y-3xs">
      <h4 className="type-label">{title}</h4>
      <p className="type-caption text-[var(--color-text-muted)]">{note}</p>
    </div>
    {children}
  </div>
);

const isDark = () => document.documentElement.classList.contains('dark');

/** Write the view into the URL (replacing, so the switches don't fill the history), keeping the anchor. */
function writeUrl(theme: number, mode: 'light' | 'dark', density: string) {
  const q = new URLSearchParams(location.search);
  q.set('theme', String(theme));
  q.set('mode', mode);
  if (density === 'condensed') q.set('density', 'condensed'); else q.delete('density');
  history.replaceState(null, '', `${location.pathname}?${q}${location.hash}`);
}

function Header({ theme0, themesReady, density, setDensity }: { theme0: number; themesReady: Promise<void>; density: string; setDensity: (d: string) => void }) {
  const [names, setNames] = useState<{ value: string; label: string }[]>([]);
  const [theme, setThemeIndex] = useState(theme0);
  const [mode, setMode] = useState<'light' | 'dark'>(isDark() ? 'dark' : 'light');
  useEffect(() => {
    let live = true;
    // ?theme= out of range (99, -1): the manager falls back to a real theme; the select and the URL follow it.
    // If the themes never load, the select names the index rather than sitting on '…'.
    const settle = () => {
      const all = themeManager.getThemes();
      if (!live) return;
      if (!all) { setNames([{ value: String(theme0), label: `Theme ${theme0}` }]); return; }
      setNames(Object.entries(all).sort(([a], [b]) => +a - +b).map(([k, t]) => ({ value: k, label: t.name })));
      const real = themeManager.ensureValidThemeIndex(theme0, all);
      if (real !== theme0) { setThemeIndex(real); writeUrl(real, isDark() ? 'dark' : 'light', density); }
    };
    themesReady.then(settle, settle);
    return () => { live = false; };
  }, [themesReady, theme0, density]);
  const pickTheme = (i: number) => { setThemeIndex(i); void themeManager.applyTheme(i); writeUrl(i, mode, density); };
  const pickMode = (m: string) => { const v = m === 'dark' ? 'dark' : 'light'; setMode(v); setTheme(v); writeUrl(theme, v, density); };
  const pickDensity = (d: string) => { setDensity(d); writeUrl(theme, mode, d); };
  return (
    <header className="space-y-md">
      <div className="space-y-2xs">
        <h1 className="type-heading-1">levain DS</h1>
        <p className="type-body max-w-prose text-[var(--color-text-muted)]">
          Design tokens generated from a few colour choices, and the React components built on them. Every piece below
          is the real package, in nine themes, light and dark.
        </p>
        <p className="type-body-sm"><a className="text-[var(--color-text-link)] underline underline-offset-2" href={REPO}>The repository on GitHub</a></p>
      </div>
      <div className="flex flex-wrap items-end gap-sm">
        <div className="w-44">
          <Select label="Theme" size="sm" data-catalogue-switch="theme" value={String(theme)} onChange={e => pickTheme(Number(e.target.value))}
            options={names.length ? names : [{ value: String(theme), label: '…' }]} />
        </div>
        <SegmentedControl id="catalogue-mode" label="Mode" size="sm" value={mode} onChange={pickMode}
          options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
        <SegmentedControl id="catalogue-density" label="Density" size="sm" value={density} onChange={pickDensity}
          options={[{ label: 'Comfortable', value: 'comfortable' }, { label: 'Condensed', value: 'condensed' }]} />
      </div>
    </header>
  );
}

function Contents() {
  return (
    <nav aria-label="Sections" data-catalogue-toc className="rounded-[var(--radius-xl)] bg-[var(--color-surface-section)] p-sm">
      <div className="grid grid-cols-2 gap-x-md gap-y-sm sm:grid-cols-3 lg:grid-cols-5">
        {GROUPS.map(g => (
          <div key={g.name} className="space-y-3xs">
            <p className="type-label text-[var(--color-text-muted)]">{g.name}</p>
            <ul className="space-y-3xs">
              {g.sections.map(s => <li key={s.id}><a className="type-body-sm text-[var(--color-text-link)] hover:underline" href={'#' + s.id}>{s.title}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

/** The page: the header, the list of sections, then each group. `demos` gives each section's body, drawn with the
 *  section component it's handed. */
export function Catalogue({ demos, theme0, themesReady, density0 }: {
  demos: Record<string, (S: SectionComponent) => ReactNode>; theme0: number; themesReady: Promise<void>; density0: string;
}) {
  const [density, setDensity] = useState(density0);
  useEffect(() => { document.title = 'levain DS'; }, []);
  return (
    <div data-density={density === 'condensed' ? 'condensed' : undefined} className="mx-auto max-w-5xl space-y-xl px-lg py-lg">
      <Header theme0={theme0} themesReady={themesReady} density={density} setDensity={setDensity} />
      <Contents />
      {GROUPS.map(g => (
        <div key={g.name} className="space-y-xl">
          <h2 className="type-heading-2 border-b border-[var(--color-border-subtle)] pb-2xs">{g.name}</h2>
          {g.sections.map(s => <div key={s.id}>{demos[s.id]?.(sectionFor(s.id))}</div>)}
        </div>
      ))}
      <footer className="type-caption border-t border-[var(--color-border-subtle)] pt-sm text-[var(--color-text-muted)]">
        levain DS · <a className="text-[var(--color-text-link)] underline underline-offset-2" href={REPO}>{REPO.replace('https://', '')}</a>
      </footer>
    </div>
  );
}

const SWATCHES: { name: string; vars: string[] }[] = [
  { name: 'Surfaces', vars: ['canvas', 'section', 'card', 'elevated', 'inverted'].map(v => '--color-surface-' + v) },
  { name: 'Text', vars: ['default', 'muted', 'faint', 'link', 'on-accent'].map(v => '--color-text-' + v) },
  { name: 'Borders', vars: ['subtle', 'default', 'emphasis', 'focus'].map(v => '--color-border-' + v) },
  { name: 'Accent', vars: ['100', '300', '500', '700', '900'].map(v => '--color-accent-' + v) },
  { name: 'Tones', vars: ['info', 'success', 'caution', 'error'].map(v => `--color-${v}-fg`) },
];

export function ColourSpecimen({ Section }: { Section: SectionComponent }) {
  return (
    <Section title="" note="">
      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3" data-demo="colour-specimen">
        {SWATCHES.map(g => (
          <div key={g.name} className="space-y-2xs rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] p-sm">
            <p className="type-label">{g.name}</p>
            <ul className="space-y-3xs">
              {g.vars.map(v => (
                <li key={v} className="flex items-center gap-xs">
                  <span className="h-6 w-10 flex-none rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)]" style={{ background: `var(${v})` }} />
                  <code className="type-caption text-[var(--color-text-muted)]">{v}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

const TYPE = ['display', 'heading-1', 'heading-2', 'heading-3', 'heading-4', 'body-lg', 'body', 'body-sm', 'label', 'label-sm', 'caption', 'code'];

export function TypeSpecimen({ Section }: { Section: SectionComponent }) {
  return (
    <Section title="" note="">
      <div className="space-y-xs overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] p-sm" data-demo="type-specimen">
        {TYPE.map(t => (
          <div key={t} className="flex flex-col gap-3xs sm:flex-row sm:items-baseline sm:gap-md">
            <code className="type-caption w-28 flex-none text-[var(--color-text-muted)]">.type-{t}</code>
            <p className={'type-' + t + ' min-w-0 truncate'}>A levain is a baker's starter</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
