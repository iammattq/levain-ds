// T36: the side drawer, as the board's phone menu would use it (Ringmaster T112): a Menu button opens a Drawer from the
// left with the app's name at the top, then Releases, Theme and Version. The contents are the demo's own; the drawer
// brings only the panel. ?only=drawer shows only this section; with ?open=menu it opens on load (for captures).
import { Button, Drawer, ThemeToggle } from '@levain/ui-react';
import { Menu as MenuIcon, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

const RELEASES = ['v0.7.0', 'v0.6.0', 'v0.5.1', 'v0.5.0'];

export function DrawerDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const [open, setOpen] = useState(new URLSearchParams(location.search).get('open') === 'menu');
  return (
    <Section title="A side drawer" note="Drawer: a full-height panel from the left, over the scrim (a tap on it closes), Escape, focus moved in and given back, the page locked under it, a swipe left to close. It slides in on sheetIn and out on sheetOut; under Reduce Motion it appears at once. The contents are the caller's.">
      <div className="flex flex-wrap gap-xs">
        <Button size="sm" variant="outline" Icon={MenuIcon} data-demo="drawer-open" onClick={() => setOpen(true)}>Menu</Button>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} label="Menu">
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
          <ThemeToggle />
        </div>
        <p className="type-caption mt-auto text-[var(--color-text-muted)]" data-demo="drawer-version">Version 0.7.0</p>
      </Drawer>
    </Section>
  );
}
