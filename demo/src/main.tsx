// levain DS's motion, density and drag, on one page. Every timing here comes from @levain/tokens.
// ?density=condensed starts condensed; ?mode=light starts light.
import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/oswald/400.css';
import './styles.css';
import { initTheme, motion as motionFor, recipe, setTheme, stagger, themeManager } from '@levain/tokens';
import { LevainProvider, SegmentedControl, SortableGroup, SortableList, StatusCard, StatusCardDialog, type SortableMove, type StatusMarker } from '@levain/ui-react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Clock, Image as ImageIcon, Link2, Menu as MenuIcon, Plus, User, X } from 'lucide-react';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

type Item = { id: string; title: string; owner: string; age: string; state?: 'blocked' | 'waiting'; images?: number; links?: number };
const TODO: Item[] = [
  { id: 'T4', title: 'Board: two tabs, Work board and Completed', owner: 'Matt', age: '3h', links: 1 },
  { id: 'T5', title: 'The comment box is one line and cuts off what I type', owner: 'Matt', age: '1h', images: 1 },
  { id: 'T6', title: 'Drag and drop on the board', owner: 'Matt', age: '40m' },
];
const QUEUED: Item[] = [
  { id: 'T2', title: 'Release v0.13.0: BN1, BN2 and IR1; notes first', owner: 'PM', age: '2h', state: 'waiting' },
  { id: 'T3', title: 'Bench background options and the condenser line fix', owner: 'eng1', age: '25m', state: 'blocked', images: 2 },
];

const markers = (it: Item): StatusMarker[] => [
  { icon: User, label: it.owner },
  { icon: Clock, label: it.age, title: 'waiting ' + it.age },
  ...(it.state ? [{ label: it.state, tone: (it.state === 'blocked' ? 'error' : 'caution') as 'error' | 'caution' }] : []),
  ...(it.images ? [{ icon: ImageIcon, label: String(it.images), title: it.images + ' images' }] : []),
  ...(it.links ? [{ icon: Link2, label: String(it.links), title: it.links + ' links' }] : []),
];

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="space-y-sm">
      <div className="space-y-3xs">
        <h2 className="type-heading-4">{title}</h2>
        <p className="type-body-sm text-[var(--color-text-muted)]">{note}</p>
      </div>
      {children}
    </section>
  );
}

function DragDemo() {
  const [lists, setLists] = useState({ todo: TODO, queued: QUEUED });
  const [open, setOpen] = useState<Item | null>(null);
  const onMove = (m: SortableMove) => setLists(l => {
    const from = l[m.from as 'todo'].filter(i => i.id !== m.key), item = l[m.from as 'todo'].find(i => i.id === m.key)!;
    const next = { ...l, [m.from]: from };
    const to = [...next[m.to as 'todo']];
    to.splice(m.index, 0, item);
    return { ...next, [m.to]: to };
  });
  const card = (it: Item) => (
    <StatusCard id={it.id} number={it.id} title={it.title} markers={markers(it)} accent={it.state === 'blocked' ? 'error' : undefined} open={open?.id === it.id} onOpen={() => setOpen(it)} />
  );
  return (
    <Section title="Drag, and a card becoming its dialog" note="Drag a card between the lists, or focus one and press Space, then the arrows. Click a card to open it.">
      <SortableGroup onMove={onMove}>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          {(['todo', 'queued'] as const).map((k, i) => (
            <div key={k} className="space-y-2xs" data-list={k}>
              <h3 className="type-label">{k === 'todo' ? 'To do' : 'Queued'} <span className="text-[var(--color-text-faint,var(--color-text-muted))]">{lists[k].length}</span></h3>
              <SortableList id={k} order={i} label={k === 'todo' ? 'To do' : 'Queued'} items={lists[k]} getKey={it => it.id} renderItem={card}
                className="min-h-24 rounded-[var(--radius-xl)] bg-[var(--color-surface-section)] p-2xs"
                empty={<p className="type-caption p-xs text-[var(--color-text-muted)]">Nothing here. Drop a card.</p>} />
            </div>
          ))}
        </div>
      </SortableGroup>
      <StatusCardDialog id={open?.id ?? ''} open={!!open} onClose={() => setOpen(null)} number={open?.id} title={open?.title ?? ''} markers={open ? markers(open) : []}>
        <p className="type-body text-[var(--color-text-muted)]">The card grew into this dialog: one element, its corners and size moving on the spring, its content fading in once there was room. Close it and it collapses back into its place.</p>
      </StatusCardDialog>
    </Section>
  );
}

/** The OS menu's principle: the button is the menu. One element changes width, height and radius; rows stagger in. */
function MenuDemo() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const rows = ['Writing', 'Work', 'Experiments', 'Photography', 'Customise'];
  return (
    <Section title="Morph: the button becomes the menu" note="One element changes shape on --ease-spring (radius on --ease-spring-out, so corners don't bounce); its rows wait for room, then stagger in 28 ms apart.">
      <div className="flex h-72 items-end justify-end rounded-[var(--radius-xl)] bg-[var(--color-surface-section)] p-sm">
        <div
          data-demo="menu"
          className="relative overflow-hidden bg-[var(--color-surface-card)] shadow-[var(--elevation-2)]"
          style={{
            width: open ? 240 : 48, height: open ? 232 : 48, borderRadius: open ? 'var(--radius-2xl)' : 24,
            transition: open
              ? 'width var(--duration-morph) var(--ease-spring), height var(--duration-morph) var(--ease-spring), border-radius var(--duration-morph) var(--ease-spring-out)'
              : 'width var(--duration-shift) var(--ease-spring-out), height var(--duration-shift) var(--ease-spring-out), border-radius var(--duration-shift) var(--ease-spring-out)',
          }}
        >
          <ul className="absolute inset-x-0 top-0 w-[240px] p-2xs" aria-hidden={!open}>
            {rows.map((r, i) => (
              <li key={r} className="type-body-sm rounded-[var(--radius-sm)] px-2xs py-3xs"
                style={{ opacity: open ? 1 : 0, transition: `opacity ${open ? 'var(--duration-content-in)' : 'var(--duration-content-out)'} var(--ease-out) ${open && !reduce ? `calc(var(--duration-content-out) + ${i} * var(--stagger))` : '0ms'}` }}>
                {r}
              </li>
            ))}
          </ul>
          <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(o => !o)}
            className="absolute right-0 bottom-0 flex h-12 w-12 items-center justify-center text-[var(--color-text-default)]">
            {open ? <X size={18} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </div>
    </Section>
  );
}

/** A window rising from bottom centre (recipe.arrive, opacity on recipe.fadeIn) and sinking back (recipe.depart). */
function WindowDemo() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  return (
    <Section title="Arrive and depart: a window" note="Rises from below its source on the spring in 620 ms, leaves in 460 ms; leaving is quicker than arriving.">
      <div className="relative h-72 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface-section)]">
        <button type="button" data-demo="window-toggle" onClick={() => setOpen(o => !o)} className="type-label absolute bottom-sm left-1/2 z-10 -translate-x-1/2 rounded-full bg-[var(--color-surface-card)] px-sm py-3xs shadow-[var(--elevation-1)]">
          {open ? 'Close the window' : 'Open a window'}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              key="w"
              className="absolute inset-x-md top-md bottom-16 rounded-[var(--radius-2xl)] bg-[var(--color-surface-card)] p-md shadow-[var(--elevation-2)]"
              style={{ transformOrigin: '50% 100%' }}
              initial={{ transform: reduce ? 'none' : 'translateY(120px) scale(0.06)', opacity: 0 }}
              animate={{ transform: 'translateY(0px) scale(1)', opacity: 1, transition: { transform: motionFor('arrive', reduce), opacity: motionFor('fadeIn', reduce) } }}
              exit={{ transform: reduce ? 'none' : 'translateY(120px) scale(0.06)', opacity: 0, transition: { transform: motionFor('depart', reduce), opacity: motionFor('contentOut', reduce) } }}
            >
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { ...motionFor('contentIn', reduce), delay: reduce ? 0 : 0.2 } }} className="space-y-2xs">
                <h3 className="type-heading-4">Photography</h3>
                <p className="type-body-sm text-[var(--color-text-muted)]">The body fades in once the window has room.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Section>
  );
}

function ListDemo() {
  const reduce = useReducedMotion();
  const [items, setItems] = useState(['Answered: D212 Strip', 'Answered: D213 Even light', 'L205 bench glass', 'R18 run the checker']);
  const [n, setN] = useState(1);
  return (
    <Section title="Lists: items enter and collapse out, the rest close the gap" note="Enter and leave on --duration-content-in; neighbours move on recipe.shift.">
      <div className="space-y-2xs">
        <button type="button" data-demo="list-add" onClick={() => { setItems(i => [`New line ${n}`, ...i]); setN(n + 1); }} className="type-label inline-flex items-center gap-3xs rounded-full bg-[var(--color-surface-section)] px-xs py-3xs"><Plus size={14} /> Add</button>
        <ul className="space-y-2xs">
          <AnimatePresence initial={false}>
            {items.map(t => (
              <motion.li key={t} layout transition={motionFor('shift', reduce)}
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', transition: motionFor('contentIn', reduce) }}
                exit={{ opacity: 0, height: 0, transition: motionFor('shift', reduce) }}
                className="overflow-hidden">
                <div className="type-body-sm flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] px-xs py-2xs">
                  {t}
                  <button type="button" aria-label={'Done with ' + t} onClick={() => setItems(i => i.filter(x => x !== t))} className="text-[var(--color-text-muted)]"><X size={14} /></button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </Section>
  );
}

function TabsDemo() {
  const reduce = useReducedMotion();
  const tabs = ['Work board', 'Completed', 'Releases'];
  const [tab, setTab] = useState(tabs[0]!);
  return (
    <Section title="Tabs: the indicator slides, the content cross-fades" note="One indicator element (shared layoutId) on recipe.shift; content on recipe.contentIn.">
      <LayoutGroup id="tabs">
        <div className="flex gap-3xs rounded-full bg-[var(--color-surface-section)] p-3xs" role="tablist">
          {tabs.map(t => (
            <button key={t} role="tab" aria-selected={t === tab} onClick={() => setTab(t)} className="type-label relative rounded-full px-sm py-3xs">
              {t === tab && <motion.span layoutId="tab-indicator" transition={motionFor('shift', reduce)} className="absolute inset-0 rounded-full bg-[var(--color-surface-card)] shadow-[var(--elevation-1)]" />}
              <span className="relative">{t}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: motionFor('contentIn', reduce) }} exit={{ opacity: 0, transition: motionFor('contentOut', reduce) }} className="type-body-sm text-[var(--color-text-muted)]">
          {tab}: its content cross-fades in place.
        </motion.p>
      </AnimatePresence>
    </Section>
  );
}

function App() {
  const q = new URLSearchParams(location.search);
  const [density, setDensity] = useState(q.get('density') === 'condensed' ? 'condensed' : 'comfortable');
  return (
    <div data-density={density === 'condensed' ? 'condensed' : undefined} className="mx-auto max-w-5xl space-y-xl px-md py-lg lg:px-lg">
      <header className="flex flex-wrap items-end justify-between gap-sm">
        <div className="space-y-3xs">
          <h1 className="type-heading-2">levain DS: motion, density and drag</h1>
          <p className="type-body-sm text-[var(--color-text-muted)]">Every timing from @levain/tokens. Reduced motion turns all of it into plain changes. Stagger {stagger} ms; morph {recipe.morph.duration * 1000} ms.</p>
        </div>
        <SegmentedControl id="density" size="sm" value={density} onChange={setDensity} options={[{ label: 'Comfortable', value: 'comfortable' }, { label: 'Condensed', value: 'condensed' }]} />
      </header>
      <DragDemo />
      <div className="grid grid-cols-1 gap-xl md:grid-cols-2">
        <MenuDemo />
        <WindowDemo />
        <ListDemo />
        <TabsDemo />
      </div>
    </div>
  );
}

const asked = new URLSearchParams(location.search).get('mode');
if (asked === 'light' || asked === 'dark') setTheme(asked); else initTheme();
void themeManager.applyTheme(0);
createRoot(document.getElementById('root')!).render(<StrictMode><LevainProvider><App /></LevainProvider></StrictMode>);
