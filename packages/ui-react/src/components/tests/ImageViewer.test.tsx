import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageViewer, REST, ZOOM, clampZoom, panBy, zoomAt, type ZoomBox } from '../ImageViewer';
import { Modal } from '../Modal';

// framer-motion as plain elements: no animation, the motion props dropped; Reduce Motion set per test
let mockReduced = false;
jest.mock('framer-motion', () => {
  const React = jest.requireActual('react');
  const strip = ({ initial, animate, exit, transition, layout, ...rest }: Record<string, unknown>) => rest; // eslint-disable-line @typescript-eslint/no-unused-vars
  return {
    motion: { div: React.forwardRef((p: Record<string, unknown>, ref: unknown) => React.createElement('div', { ...strip(p), ref })) },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => mockReduced,
  };
});

// jsdom 20 has no PointerEvent; React's pointer handlers need one carrying pointerId and pointerType
class FakePointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'touch';
  }
}

/**
 * The geometry jsdom has none of: the screen is 400 x 800 at (0, 0); the image (or the compare layer) is 400 x 300 at
 * rest, so its centre is the screen's (200, 400). Zoomed 2x it is 800 x 600: 200 px over each side, and still shorter
 * than the screen, so it stays centred up and down.
 */
const SCREEN = { left: 0, top: 0, width: 400, height: 800, right: 400, bottom: 800, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
const own = {
  pe: (window as { PointerEvent?: unknown }).PointerEvent,
  ow: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')!,
  oh: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!,
  cw: Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')!,
  ch: Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!,
  rect: Element.prototype.getBoundingClientRect,
};
const isContent = (el: Element) => el.hasAttribute('data-image-viewer-content');
const isLabel = (el: Element) => el.hasAttribute('data-image-compare-label');
beforeAll(() => {
  (window as { PointerEvent?: unknown }).PointerEvent = FakePointerEvent;
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return isContent(this) ? 400 : isLabel(this) ? 60 : 0; } });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return isContent(this) ? 300 : 0; } });
  Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get() { return this.hasAttribute('data-image-compare-slider') ? 400 : 0; } });
  Object.defineProperty(Element.prototype, 'clientHeight', { configurable: true, get() { return this.hasAttribute('data-image-compare-slider') ? 800 : 0; } });
  Element.prototype.getBoundingClientRect = function () {
    return this.hasAttribute('data-image-viewer') || this.hasAttribute('data-image-compare-slider') ? SCREEN : own.rect.call(this);
  };
});
afterAll(() => {
  (window as { PointerEvent?: unknown }).PointerEvent = own.pe;
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', own.ow);
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', own.oh);
  Object.defineProperty(Element.prototype, 'clientWidth', own.cw);
  Object.defineProperty(Element.prototype, 'clientHeight', own.ch);
  Element.prototype.getBoundingClientRect = own.rect;
});
beforeEach(() => { mockReduced = false; });

describe('the zoom math', () => {
  const big: ZoomBox = { w: 1000, h: 1000, W: 400, H: 800 };
  const shot: ZoomBox = { w: 400, h: 300, W: 400, H: 800 };

  test('clampZoom: 1x-5x', () => {
    expect(clampZoom({ scale: 0.4, x: 0, y: 0 }, big).scale).toBe(1);
    expect(clampZoom({ scale: 9, x: 0, y: 0 }, big).scale).toBe(5);
    expect(clampZoom({ scale: 3, x: 0, y: 0 }, big).scale).toBe(3);
  });

  test('clampZoom: at 1x a fitted image sits centred', () => {
    expect(clampZoom({ scale: 1, x: 50, y: -70 }, shot)).toEqual(REST);
  });

  test('clampZoom: an overflowing side never shows a gap; a fitting one stays centred', () => {
    // 2x: 800 x 600 on 400 x 800, 200 over each side, shorter than the screen
    expect(clampZoom({ scale: 2, x: 500, y: 90 }, shot)).toEqual({ scale: 2, x: 200, y: 0 });
    expect(clampZoom({ scale: 2, x: -500, y: -90 }, shot)).toEqual({ scale: 2, x: -200, y: 0 });
    // 4x: 1600 x 1200, 600 over left and right, 200 over top and bottom
    expect(clampZoom({ scale: 4, x: -100, y: 999 }, shot)).toEqual({ scale: 4, x: -100, y: 200 });
  });

  test('zoomAt keeps the point under the focus where it is', () => {
    const z = zoomAt(REST, 2, { x: 100, y: 50 }, big);
    expect(z).toEqual({ scale: 2, x: -100, y: -50 });
    // the content point under (100, 50): (100 - 0) / 1 before, (100 - -100) / 2 after
    expect((100 - z.x) / z.scale).toBe(100);
    // and again from there, back to 1x: the image comes home
    expect(zoomAt(z, 1, { x: 100, y: 50 }, big)).toEqual(REST);
  });

  test('zoomAt with a moved midpoint: zooms and pans together (a pinch)', () => {
    expect(zoomAt(REST, 2, { x: 0, y: 0 }, big, { x: 30, y: -20 })).toEqual({ scale: 2, x: 30, y: -20 });
  });

  test('zoomAt clamps the scale and the edges', () => {
    expect(zoomAt(REST, 50, { x: 0, y: 0 }, big).scale).toBe(ZOOM.max);
    expect(zoomAt({ scale: 2, x: 100, y: 0 }, 0.1, { x: 0, y: 0 }, shot)).toEqual(REST);
    // zoomed hard at the image's corner: the edges hold
    expect(zoomAt(REST, 2, { x: 200, y: 150 }, shot)).toEqual({ scale: 2, x: -200, y: 0 });
  });

  test('panBy moves and clamps', () => {
    expect(panBy({ scale: 2, x: 0, y: 0 }, 60, 30, shot)).toEqual({ scale: 2, x: 60, y: 0 });
    expect(panBy({ scale: 2, x: 0, y: 0 }, 900, 0, shot)).toEqual({ scale: 2, x: 200, y: 0 });
    expect(panBy(REST, 60, 30, shot)).toEqual(REST);
  });
});

describe('ImageViewer', () => {
  function Page({ compare = false }: { compare?: boolean }) {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>View</button>
        {compare ? (
          <ImageViewer open={open} onClose={() => setOpen(false)} compare={[{ label: 'Before', src: '/b.png' }, { label: 'After', src: '/a.png' }]} />
        ) : (
          <ImageViewer open={open} onClose={() => setOpen(false)} src="/shot.png" alt="This build" />
        )}
      </>
    );
  }
  const openPage = (compare = false) => {
    render(<Page compare={compare} />);
    const opener = screen.getByRole('button', { name: 'View' });
    opener.focus();
    fireEvent.click(opener);
    return opener;
  };
  const surface = () => document.querySelector('[data-image-viewer]') as HTMLElement;
  const content = () => document.querySelector('[data-image-viewer-content]') as HTMLElement;
  const image = () => screen.getByRole('img', { name: 'This build' });
  const transform = () => content().style.transform;
  const at = (scale: number, x = 0, y = 0) => expect(transform()).toBe(`translate(${x}px, ${y}px) scale(${scale})`);
  const isOpen = () => !!surface();

  const down = (el: Element, id: number, x: number, y: number, type = 'touch') => fireEvent.pointerDown(el, { pointerId: id, pointerType: type, button: 0, clientX: x, clientY: y });
  const move = (el: Element, id: number, x: number, y: number) => fireEvent.pointerMove(el, { pointerId: id, clientX: x, clientY: y });
  const up = (el: Element, id: number, x: number, y: number) => fireEvent.pointerUp(el, { pointerId: id, clientX: x, clientY: y });
  const tap = (el: Element, x: number, y: number, type = 'touch') => { down(el, 1, x, y, type); up(el, 1, x, y); fireEvent.click(el, { clientX: x, clientY: y }); };
  /** Two fingers from a and b to a2 and b2, on the image. */
  const pinch = (a: [number, number], b: [number, number], a2: [number, number], b2: [number, number], end = true) => {
    const el = image();
    down(el, 1, ...a);
    down(el, 2, ...b);
    move(el, 1, ...a2);
    move(el, 2, ...b2);
    if (end) { up(el, 1, ...a2); up(el, 2, ...b2); }
  };

  describe('the shell', () => {
    test('opens on Modal\'s dark scrim with no card: a dialog named by the alt text, the image fitted, a close button', () => {
      openPage();
      expect(document.querySelector('[data-modal-scrim]')).toHaveAttribute('data-modal-scrim', 'dark');
      const dialog = screen.getByRole('dialog', { name: 'This build' });
      expect(dialog).toHaveAttribute('data-bare', 'true');
      expect(image()).toHaveAttribute('src', '/shot.png');
      expect(image()).toHaveClass('max-w-[100cqw]', 'max-h-[100cqh]');
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      at(1);
    });

    test('the zoom surface takes every touch (touch-action: none), so the page never pinches through it', () => {
      openPage();
      expect(surface()).toHaveClass('touch-none', 'absolute', 'inset-0');
    });

    test('label names the dialog; a pair is named by its two labels', () => {
      const { rerender } = render(<ImageViewer open onClose={() => {}} src="/s.png" alt="Shot" label="Screenshot" />);
      expect(screen.getByRole('dialog', { name: 'Screenshot' })).toBeInTheDocument();
      rerender(<ImageViewer open onClose={() => {}} compare={[{ label: 'Before', src: '/b.png' }, { label: 'After', src: '/a.png' }]} />);
      expect(screen.getByRole('dialog', { name: 'Before and After' })).toBeInTheDocument();
    });

    test('a tap outside the image closes; a tap on it does not', () => {
      openPage();
      tap(image(), 200, 400);
      expect(isOpen()).toBe(true);
      tap(surface(), 200, 100);
      expect(isOpen()).toBe(false);
    });

    test('the close button and Escape close', () => {
      openPage();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(isOpen()).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: 'View' }));
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
      expect(isOpen()).toBe(false);
    });

    test('takes focus on open (the zoom surface, for the keys) and gives it back to what opened it', () => {
      const opener = openPage();
      expect(document.activeElement).toBe(surface());
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
      expect(document.activeElement).toBe(opener);
    });

    test('a drag that ends outside the image is no tap: it does not close', () => {
      openPage();
      down(surface(), 1, 200, 100);
      move(surface(), 1, 260, 140);
      up(surface(), 1, 260, 140);
      fireEvent.click(surface());
      expect(isOpen()).toBe(true);
      // the next tap is a tap again
      tap(surface(), 200, 100);
      expect(isOpen()).toBe(false);
    });

    test('over an open dialog: on top of it; Escape closes only the viewer and focus goes back into the dialog', () => {
      function Over() {
        const [dialog, setDialog] = React.useState(true);
        const [view, setView] = React.useState(false);
        return (
          <>
            <Modal isOpen={dialog} onClose={() => setDialog(false)} title="Card">
              {() => <button type="button" onClick={() => setView(true)}>Thumbnail</button>}
            </Modal>
            <ImageViewer open={view} onClose={() => setView(false)} src="/shot.png" alt="This build" />
          </>
        );
      }
      render(<Over />);
      const thumb = screen.getByRole('button', { name: 'Thumbnail' });
      thumb.focus();
      fireEvent.click(thumb);
      const card = screen.getByRole('dialog', { name: 'Card' });
      const viewer = screen.getByRole('dialog', { name: 'This build' });
      // later in the document at the same z-index: drawn over the card
      expect(card.compareDocumentPosition(viewer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: 'This build' })).toBeNull();
      expect(screen.getByRole('dialog', { name: 'Card' })).toBeInTheDocument();
      expect(document.activeElement).toBe(thumb);
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: 'Card' })).toBeNull();
    });
  });

  describe('gestures', () => {
    test('pinch: two fingers apart zoom around their midpoint', () => {
      openPage();
      // 100 apart to 200 apart, about the centre
      pinch([150, 400], [250, 400], [100, 400], [300, 400]);
      at(2);
    });

    test('pinch off centre keeps the point between the fingers under them', () => {
      openPage();
      // midpoint (320, 400): 120 right of the centre; 40 apart to 80
      pinch([300, 400], [340, 400], [280, 400], [360, 400]);
      at(2, -120, 0);
    });

    test('pinch pans as the midpoint moves', () => {
      openPage();
      pinch([150, 400], [250, 400], [130, 400], [330, 400]); // 2x, midpoint 30 right
      at(2, 30, 0);
    });

    test('pinch is clamped to 1x-5x', () => {
      openPage();
      pinch([190, 400], [210, 400], [0, 400], [400, 400]); // 20 to 400 apart: 20x
      at(5);
      pinch([0, 400], [400, 400], [195, 400], [205, 400]);
      at(1);
    });

    test('a pinch follows the fingers: no transition', () => {
      openPage();
      pinch([150, 400], [250, 400], [100, 400], [300, 400]);
      expect(content().style.transition).toBe('none');
    });

    test('a pinch and its last finger never close or count as taps', () => {
      openPage();
      pinch([150, 400], [250, 400], [100, 400], [300, 400]);
      fireEvent.click(surface());
      expect(isOpen()).toBe(true);
    });

    test('after a pinch the finger left down pans on', () => {
      openPage();
      pinch([150, 400], [250, 400], [100, 400], [300, 400], false); // 2x, both still down
      up(image(), 2, 300, 400);
      move(image(), 1, 150, 400); // finger 1 from 100 to 150
      at(2, 50, 0);
    });

    test('pointercancel during a press: no tap, no close', () => {
      openPage();
      // a press cancelled on the scrim (the browser took it): no click follows, and the viewer stays
      down(surface(), 1, 200, 50);
      fireEvent.pointerCancel(surface(), { pointerId: 1 });
      expect(isOpen()).toBe(true);
      // a cancelled press on the image is no first tap: one tap after it doesn't toggle the zoom
      down(image(), 1, 240, 400);
      fireEvent.pointerCancel(image(), { pointerId: 1 });
      tap(image(), 240, 400);
      at(1);
      expect(isOpen()).toBe(true);
    });

    test('pointercancel during a pinch: the zoom holds and the finger left down pans', () => {
      openPage();
      pinch([150, 400], [250, 400], [100, 400], [300, 400], false); // 2x, both still down
      fireEvent.pointerCancel(image(), { pointerId: 2 });
      at(2);
      move(image(), 1, 150, 400); // finger 1 from 100 to 150
      at(2, 50, 0);
      up(image(), 1, 150, 400);
      fireEvent.click(surface());
      expect(isOpen()).toBe(true);
    });

    test('a third finger down, then one of the first two lifted: the pinch carries on with no jump', () => {
      openPage();
      pinch([150, 400], [250, 400], [100, 400], [300, 400], false); // 2x, fingers at 100 and 300
      down(image(), 3, 200, 500);
      at(2);
      up(image(), 1, 100, 400);
      at(2); // fingers 2 (300, 400) and 3 (200, 500) now pinch, from where they are
      move(image(), 3, 100, 600); // twice as far from finger 2
      expect(transform()).toMatch(/scale\(4\)$/);
    });

    test('double tap on the image toggles 1x and 2.5x around the tap, eased', () => {
      openPage();
      tap(image(), 240, 400); // 40 right of the centre
      tap(image(), 240, 400);
      at(2.5, -60, 0); // 40 - 40 * 2.5
      expect(content().style.transition).toBe('transform var(--duration-shift) var(--ease-spring-out)');
      tap(image(), 240, 400);
      tap(image(), 240, 400);
      at(1);
    });

    test('two taps far apart or slow are no double tap', () => {
      openPage();
      const now = jest.spyOn(Date, 'now');
      now.mockReturnValue(1000);
      tap(image(), 200, 400);
      now.mockReturnValue(1000 + ZOOM.doubleMs + 1);
      tap(image(), 200, 400);
      at(1);
      tap(image(), 200, 400 + ZOOM.doublePx + 5);
      at(1);
      now.mockRestore();
    });

    test('one finger pans when zoomed, with the edges kept on screen', () => {
      openPage();
      pinch([150, 400], [250, 400], [100, 400], [300, 400]); // 2x
      down(image(), 3, 200, 400);
      move(image(), 3, 260, 430);
      at(2, 60, 0); // up and down: 600 tall on 800, centred
      move(image(), 3, 900, 400);
      at(2, 200, 0); // the left edge stops at the screen's
      up(image(), 3, 900, 400);
    });

    test('one finger at 1x does not move the image', () => {
      openPage();
      down(image(), 1, 200, 400);
      move(image(), 1, 300, 500);
      up(image(), 1, 300, 500);
      at(1);
    });

    test('mouse: wheel zooms around the cursor; ctrl+wheel (a trackpad pinch) zooms faster; the page does not scroll', () => {
      openPage();
      const wheel = (deltaY: number, ctrlKey = false) => {
        const e = new WheelEvent('wheel', { deltaY, ctrlKey, clientX: 200, clientY: 400, bubbles: true, cancelable: true });
        act(() => { surface().dispatchEvent(e); });
        return e;
      };
      const e = wheel(-100);
      expect(e.defaultPrevented).toBe(true);
      at(Math.exp(0.2));
      wheel(100);
      at(1);
      wheel(-10, true);
      at(Math.exp(0.1));
    });

    test('mouse: drag pans when zoomed; double click toggles', () => {
      openPage();
      tap(image(), 200, 400, 'mouse');
      tap(image(), 200, 400, 'mouse');
      at(2.5);
      down(image(), 1, 200, 400, 'mouse');
      move(image(), 1, 150, 400);
      up(image(), 1, 150, 400);
      at(2.5, -50, 0);
    });

    test('keys: + and - zoom about the centre, 0 resets, arrows pan when zoomed', () => {
      openPage();
      const key = (k: string) => fireEvent.keyDown(surface(), { key: k });
      key('+');
      at(1.5);
      key('=');
      at(2.25);
      key('-');
      at(1.5);
      key('ArrowLeft'); // the image moves right, as a drag left-to-right would
      at(1.5, ZOOM.pan, 0);
      key('0');
      at(1);
      expect(content().style.transition).toBe('transform var(--duration-shift) var(--ease-spring-out)');
    });

    test('arrows at 1x are left alone; ctrl/meta + and - stay the browser\'s', () => {
      openPage();
      expect(fireEvent.keyDown(surface(), { key: 'ArrowLeft' })).toBe(true); // not prevented
      expect(fireEvent.keyDown(surface(), { key: '+', ctrlKey: true })).toBe(true);
      at(1);
    });

    test('reset on close: reopened, it is at rest', () => {
      openPage();
      pinch([150, 400], [250, 400], [100, 400], [300, 400]);
      at(2);
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
      fireEvent.click(screen.getByRole('button', { name: 'View' }));
      at(1);
    });

    test('Reduce Motion: double tap, keys and reset change at once', () => {
      mockReduced = true;
      openPage();
      tap(image(), 200, 400);
      tap(image(), 200, 400);
      at(2.5);
      expect(content().style.transition).toBe('none');
      fireEvent.keyDown(surface(), { key: '0' });
      at(1);
      expect(content().style.transition).toBe('none');
    });
  });

  describe('a before/after pair', () => {
    const handle = () => screen.getByRole('slider');
    const layer = () => content();
    const afterImg = () => screen.getByRole('img', { name: 'After' });
    const value = () => Number(handle().getAttribute('aria-valuenow'));

    test('both images in one layer, fitted and zoomed together', () => {
      openPage(true);
      expect(layer()).toContainElement(screen.getByRole('img', { name: 'Before' }));
      expect(layer()).toContainElement(afterImg());
      fireEvent.keyDown(surface(), { key: '+' });
      expect(layer().style.transform).toBe('translate(0px, 0px) scale(1.5)');
    });

    test('the handle drags from itself, not from the image', () => {
      openPage(true);
      expect(value()).toBe(50);
      // a press and drag on the image: no handle move (and at 1x, no pan)
      const before = screen.getByRole('img', { name: 'Before' });
      down(before, 1, 100, 400);
      move(before, 1, 300, 400);
      up(before, 1, 300, 400);
      expect(value()).toBe(50);
      // on the handle: it follows
      down(handle(), 2, 200, 400);
      move(handle(), 2, 300, 400);
      up(handle(), 2, 300, 400);
      expect(value()).toBe(75);
      expect(afterImg().style.clipPath).toBe('inset(0 0 0 75%)');
    });

    test('zoomed: a drag off the handle pans both images; the handle stays put on screen and the reveal follows', () => {
      openPage(true);
      fireEvent.keyDown(surface(), { key: '+' });
      fireEvent.keyDown(surface(), { key: '+' }); // 2.25x
      const left = handle().style.left;
      expect(left).toBe('200px');
      expect(value()).toBe(50);
      const before = screen.getByRole('img', { name: 'Before' });
      down(before, 1, 200, 400);
      move(before, 1, 290, 400); // 90 right
      up(before, 1, 290, 400);
      expect(layer().style.transform).toBe('translate(90px, 0px) scale(2.25)');
      expect(handle().style.left).toBe(left);
      // the images are 900 wide, their left edge at 200 + 90 - 450 = -160: the handle is 360 / 900 across
      expect(value()).toBe(40);
      expect(afterImg().style.clipPath).toBe('inset(0 0 0 40%)');
    });

    test('a drag on the handle never pans; a tap on it never closes', () => {
      openPage(true);
      fireEvent.keyDown(surface(), { key: '+' });
      down(handle(), 1, 200, 400);
      move(handle(), 1, 260, 400);
      up(handle(), 1, 260, 400);
      fireEvent.click(handle());
      expect(layer().style.transform).toBe('translate(0px, 0px) scale(1.5)');
      expect(isOpen()).toBe(true);
    });

    test('one finger on the handle and one on the image pinch: the pair zooms and the handle stays put', () => {
      openPage(true);
      const before = screen.getByRole('img', { name: 'Before' });
      down(handle(), 1, 200, 400);
      down(before, 2, 300, 400);
      move(handle(), 1, 150, 400); // 100 apart to 200: 2x
      move(before, 2, 350, 400);
      expect(layer().style.transform).toMatch(/scale\(2\)$/);
      expect(handle().style.left).toBe('200px'); // the finger that started on it no longer drags it
      up(handle(), 1, 150, 400);
      up(before, 2, 350, 400);
      fireEvent.click(surface());
      expect(isOpen()).toBe(true);
    });

    test('the handle\'s keys move it; the viewer\'s arrows leave it be', () => {
      openPage(true);
      fireEvent.keyDown(surface(), { key: '+' });
      fireEvent.keyDown(handle(), { key: 'ArrowRight' });
      expect(value()).toBe(55);
      expect(layer().style.transform).toBe('translate(0px, 0px) scale(1.5)');
    });

    test('the handle stays inside the visible image', () => {
      openPage(true);
      down(handle(), 1, 200, 400);
      move(handle(), 1, 999, 400);
      expect(handle().style.left).toBe('400px');
      expect(value()).toBe(100);
    });

    test('a tap off the image still closes', () => {
      openPage(true);
      tap(document.querySelector('[data-image-compare-slider]')!, 200, 100);
      expect(isOpen()).toBe(false);
    });
  });
});
