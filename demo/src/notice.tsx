// T62: levain's Notice, fitted to the Ringmaster board's two bad-connection lines (its T173): "Offline,
// reconnecting…" (a message only: a polite status) and "Your idea wasn't sent: the network dropped" (with Retry and
// Dismiss: an alert), each in every tone, under a header-like row in a container the board's column surface. First,
// for comparison, the board's line today: a bare caption in its header. ?only=notice shows only this section (for
// captures).
import { Button, Notice, type NoticeTone } from '@levain/ui-react';
import { WifiOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { BENCH } from './bench';

const TONES: NoticeTone[] = ['muted', 'info', 'caution', 'error'];
export const OFFLINE = 'Offline, reconnecting…';
export const LOST = "Your idea wasn't sent: the network dropped";

const Box = ({ id, label, children }: { id: string; label: string; children: ReactNode }) => (
  <div className="space-y-xs" data-demo={`notice-${id}`}>
    <p className="type-caption text-[var(--color-text-faint)]">{BENCH && 'T62 · '}{label}</p>
    <div className="space-y-xs rounded-[var(--radius-xl)] bg-[var(--color-surface-section)] p-sm">
      <div className="flex items-center justify-between gap-sm">
        <h3 className="type-label m-0">Your work</h3>
        <Button size="sm" variant="ghost">New idea</Button>
      </div>
      {children}
    </div>
  </div>
);

function Lost({ tone }: { tone: NoticeTone }) {
  const [shown, setShown] = useState(true);
  return shown ? (
    <Notice data-demo-notice={`${tone}-lost`} tone={tone} action={<Button size="sm" variant="ghost">Retry</Button>} onDismiss={() => setShown(false)}>
      {LOST}
    </Notice>
  ) : (
    <Button size="sm" variant="outline" onClick={() => setShown(true)}>Show it again</Button>
  );
}

export function NoticeDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  return (
    <Section title="An inline status line" note="Notice: a quiet, persistent line under a header. A message only is a polite status; with an action or Dismiss it is an alert. The board's caption line today first, then each tone with the board's two messages, then one with an icon.">
      {BENCH && <Box id="board" label="the board today (a caption line, a copy)">
        <p role="status" className="type-caption m-0 text-[var(--color-text-muted)]">{OFFLINE}</p>
      </Box>}
      {TONES.map((tone) => (
        <Box key={tone} id={tone} label={tone}>
          <Notice data-demo-notice={`${tone}-offline`} tone={tone}>{OFFLINE}</Notice>
          <Lost tone={tone} />
        </Box>
      ))}
      <Box id="icon" label="muted, with an icon">
        <Notice data-demo-notice="icon-offline" icon={<WifiOff size={16} />}>{OFFLINE}</Notice>
      </Box>
    </Section>
  );
}
