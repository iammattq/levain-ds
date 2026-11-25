// T61: ImageViewer, one image and a before/after pair, opened from thumbnails on the page and from inside a dialog (the
// board's case: a card's thumbnail opens the viewer over the card, and closing goes back to it). On the iPhone, pinch
// the image: it zooms, the page doesn't. ?only=viewer shows only this section (for captures and the phone preview).
import { Button, ImageViewer, Modal } from '@levain/ui-react';
import { useState, type ReactNode } from 'react';

const SHOT = { src: 'image-compare/this-build.png', alt: 'This build' };
const PAIR: [{ label: string; src: string }, { label: string; src: string }] = [
  { label: 'Before', src: 'image-compare/target.png' },
  { label: 'After', src: 'image-compare/this-build.png' },
];

type Open = null | 'single' | 'pair';

/** A thumbnail that opens the viewer: a button (never a link), its image cropped to the top. */
function Thumb({ src, label, onOpen }: { src: string; label: string; onOpen: () => void }) {
  return (
    <button type="button" data-viewer-thumb={label} aria-haspopup="dialog" aria-label={`View ${label}`} onClick={onOpen} className="block w-32 cursor-zoom-in space-y-3xs text-left">
      <img src={src} alt="" className="h-24 w-32 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-section)] object-cover object-top" />
      <span className="type-caption block truncate text-[var(--color-text-muted)]">{label}</span>
    </button>
  );
}

function Thumbs({ onOpen }: { onOpen: (o: Exclude<Open, null>) => void }) {
  return (
    <div className="flex flex-wrap gap-sm">
      <Thumb src={SHOT.src} label={SHOT.alt} onOpen={() => onOpen('single')} />
      <Thumb src={PAIR[0].src} label="Before and after" onOpen={() => onOpen('pair')} />
    </div>
  );
}

function Viewers({ open, onClose }: { open: Open; onClose: () => void }) {
  return (
    <>
      <ImageViewer open={open === 'single'} onClose={onClose} src={SHOT.src} alt={SHOT.alt} />
      <ImageViewer open={open === 'pair'} onClose={onClose} compare={PAIR} />
    </>
  );
}

export function ViewerDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const [page, setPage] = useState<Open>(null);
  const [dialog, setDialog] = useState(false);
  const [inDialog, setInDialog] = useState<Open>(null);
  const [dark, setDark] = useState(false);
  return (
    <Section
      title="Image viewer: zoom the image, not the page"
      note="Tap a thumbnail. Pinch (or double tap) to zoom, drag to move a zoomed image; with a mouse, the wheel zooms and a drag moves; keys + - 0 and the arrows. Tap outside the image, the ✕ or Escape to close. The pair's handle drags only from itself; a drag elsewhere moves the zoomed images under it. Open the dialog to view an image over it: closing goes back to the dialog."
    >
      <div data-demo="viewer" className="space-y-md">
        <Thumbs onOpen={setPage} />
        <Button variant="secondary" onClick={() => setDialog(true)} data-viewer-dialog-open="">
          Open a dialog with thumbnails
        </Button>
        {/* T63: Modal's own dark scrim (90 %), beside the viewer's solid one: the page still shows through faintly */}
        <Button variant="secondary" onClick={() => setDark(true)} data-viewer-dark-open="">
          Open a dark-scrim dialog
        </Button>
        <Viewers open={page} onClose={() => setPage(null)} />
        <Modal isOpen={dialog} onClose={() => setDialog(false)} title="A card with images">
          {() => (
            <div className="space-y-sm">
              <p className="type-body-sm text-[var(--color-text-muted)]">The board's case: a thumbnail in a card's dialog opens the viewer over it.</p>
              <Thumbs onOpen={setInDialog} />
            </div>
          )}
        </Modal>
        <Modal isOpen={dark} onClose={() => setDark(false)} title="A dark-scrim dialog" scrim="dark">
          {() => <p className="type-body-sm text-[var(--color-text-muted)]">Modal scrim="dark": the page shows faintly behind it. The image viewer's backdrop is solid.</p>}
        </Modal>
        {/* after the dialog, so its portal lands on top of the dialog's */}
        <Viewers open={inDialog} onClose={() => setInDialog(null)} />
      </div>
    </Section>
  );
}
