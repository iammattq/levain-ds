// T36: the side drawer, as the board's phone menu would use it (Ringmaster T112): a Menu button opens a Drawer from the
// left with the app's name at the top, then Releases, Theme and Version. The contents are the demo's own; the drawer
// brings only the panel. Both surfaces (T51): Menu opens it on the elevated surface (the default), Menu on canvas on
// the darker canvas surface. ?only=drawer shows only this section; ?open=menu or ?open=canvas opens one on load (for
// captures).
import { setTheme } from '@levain/tokens';
import { Button, Drawer, SegmentedControl } from '@levain/ui-react';
import { Menu as MenuIcon, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

const RELEASES = ['v0.7.0', 'v0.6.0', 'v0.5.1', 'v0.5.0'];

export function DrawerDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const [open, setOpenAs] = useState<false | 'elevated' | 'canvas'>(() => {
    const q = new URLSearchParams(location.search).get('open');
    return q === 'menu' ? 'elevated' : q === 'canvas' ? 'canvas' : false;
  });
  const setOpen = (on: boolean) => setOpenAs(on ? 'elevated' : false);
  const [mode, setMode] = useState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  return (
    <Section title="A side drawer" note="Drawer: a full-height panel from the left (on the elevated surface, or the darker canvas surface with surface canvas), over the scrim (a tap on it closes), Escape, focus moved in and given back, the page locked under it, a swipe left to close. It slides in on sheetIn and out on sheetOut; under Reduce Motion it appears at once. The contents are the caller's.">
      <div className="flex flex-wrap gap-xs">
        <Button size="sm" variant="outline" Icon={MenuIcon} data-demo="drawer-open" onClick={() => setOpen(true)}>Menu</Button>
        <Button size="sm" variant="outline" Icon={MenuIcon} data-demo="drawer-open-canvas" onClick={() => setOpenAs('canvas')}>Menu on canvas</Button>
      </div>
      <Drawer open={!!open} surface={open || 'elevated'} onClose={() => setOpen(false)} label="Menu">
        <div className="flex items-center justify-between gap-sm" data-demo="drawer-head">
          <p className="type-heading-4">Ringmaster</p>
          <Button size="sm" variant="ghost" iconOnly Icon={X} aria-label="Close menu" onClick={() => setOpen(false)}>Close</Button>
        </div>
        <nav aria-label="Releases" className="flex flex-col gap-3xs">
          <p className="type-label text-[var(--color-text-muted)]">Releases</p>
          {RELEASES.map(r => (
            <a key={r} href={`#${r}`} className="type-body-sm rounded-[var(--radius-md)] px-2xs py-3xs text-[var(--color-text-default)] hover:bg-[var(--color-surface-section)]" onClick={() => setOpen(false)}>{r}</a>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-sm">
          <p className="type-body-sm">Theme</p>
          <SegmentedControl id="drawer-theme" size="sm" value={mode} onChange={m => { setMode(m); setTheme(m as 'light' | 'dark'); }} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
        </div>
        <p className="type-caption mt-auto text-[var(--color-text-muted)]" data-demo="drawer-version">Version 0.7.0</p>
      </Drawer>
    </Section>
  );
}
