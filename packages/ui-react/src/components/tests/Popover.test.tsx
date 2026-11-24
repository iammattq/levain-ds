import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popover, anchorPopup } from '../Popover';
import { Modal } from '../Modal';

// framer-motion as plain elements: no animation, its props dropped
jest.mock('framer-motion', () => {
  const R = jest.requireActual('react') as typeof React;
  const strip = ({ initial, animate, exit, transition, layout, ...rest }: Record<string, unknown>) => rest;
  const div = R.forwardRef<HTMLDivElement, Record<string, unknown>>((props, ref) =>
    R.createElement('div', { ...strip(props), ref })
  );
  return {
    motion: { div },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => false,
  };
});

// jsdom lays nothing out: the trigger's box and the panel's size are given
let triggerBox = { left: 100, top: 100, width: 40, height: 28 };
const PANEL = { width: 200, height: 150 };
beforeEach(() => {
  triggerBox = { left: 100, top: 100, width: 40, height: 28 };
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const b = this.dataset.testid === 'trigger' ? triggerBox : { left: 0, top: 0, width: 0, height: 0 };
    return { ...b, x: b.left, y: b.top, right: b.left + b.width, bottom: b.top + b.height, toJSON: () => b } as DOMRect;
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return this.getAttribute('role') ? PANEL.width : 0; } });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.getAttribute('role') ? PANEL.height : 0; } });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
});
afterEach(() => jest.restoreAllMocks());

const Basic = (props: Partial<React.ComponentProps<typeof Popover>>) => (
  <>
    <Popover
      label="Workers"
      trigger={p => <button type="button" data-testid="trigger" {...p}>Open</button>}
      {...props}
    >
      {props.children ?? (
        <>
          <button type="button">First</button>
          <button type="button">Last</button>
        </>
      )}
    </Popover>
    <button type="button">Elsewhere</button>
  </>
);

const trigger = () => screen.getByTestId('trigger');
const surface = () => document.querySelector<HTMLElement>('[data-popover]');

describe('Popover', () => {
  it('opens and closes from its trigger, with aria-expanded and aria-controls', async () => {
    render(<Basic />);
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).not.toHaveAttribute('aria-controls');
    expect(screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(trigger());
    const panel = screen.getByRole('dialog', { name: 'Workers' });
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-controls', panel.id);

    await userEvent.click(trigger());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('is controlled by open and onOpenChange', async () => {
    const onOpenChange = jest.fn();
    const { rerender } = render(<Basic open={false} onOpenChange={onOpenChange} />);
    await userEvent.click(trigger());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole('dialog')).toBeNull(); // the parent hasn't opened it

    rerender(<Basic open onOpenChange={onOpenChange} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens at first with defaultOpen, and hands close to its content', async () => {
    render(<Basic defaultOpen>{close => <button type="button" onClick={close}>Done</button>}</Basic>);
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves focus to its first control', async () => {
    render(<Basic />);
    await userEvent.click(trigger());
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('moves focus to initialFocus when given', async () => {
    const Picked = () => {
      const last = React.useRef<HTMLButtonElement>(null);
      return (
        <Basic initialFocus={last}>
          <button type="button">First</button>
          <button type="button" ref={last}>Last</button>
        </Basic>
      );
    };
    render(<Picked />);
    await userEvent.click(trigger());
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
  });

  it('focuses the panel when it has no control', async () => {
    render(<Basic>Just words</Basic>);
    await userEvent.click(trigger());
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('closes on Escape and gives focus back to the trigger', async () => {
    render(<Basic />);
    await userEvent.click(trigger());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('closes on a press outside, not on one inside', async () => {
    render(<Basic />);
    await userEvent.click(trigger());
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Last' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('leaves on Tab past the last control and Shift+Tab before the first, back to the trigger', async () => {
    render(<Basic />);
    await userEvent.click(trigger());
    await userEvent.tab(); // First -> Last: still inside
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger()).toHaveFocus();

    await userEvent.click(trigger());
    await userEvent.tab({ shift: true });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('sits under the trigger with the gap, or flips above it when there is no room below', async () => {
    const { unmount } = render(<Basic />);
    await userEvent.click(trigger());
    expect(surface()).toHaveAttribute('data-placement', 'bottom');
    unmount();

    triggerBox = { left: 100, top: 740, width: 40, height: 28 }; // 32px left below
    render(<Basic />);
    await userEvent.click(trigger());
    expect(surface()).toHaveAttribute('data-placement', 'top');
  });

  it('portals to the body above dialogs, and closes alone on Escape inside a Modal', async () => {
    const Both = () => {
      const [modal, setModal] = useState(true);
      return (
        <Modal isOpen={modal} onClose={() => setModal(false)} label="Settings">
          {() => <Basic />}
        </Modal>
      );
    };
    render(<Both />);
    await userEvent.click(trigger());
    expect(surface()!.parentElement).toBe(document.body);
    expect(surface()!.style.zIndex).toBe('60');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Workers' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('renders beside the trigger with portal={false}', async () => {
    const { container } = render(<Basic portal={false} />);
    await userEvent.click(trigger());
    expect(container.contains(surface())).toBe(true);
  });

  it('names the panel by role for Menu', async () => {
    render(<Basic role="menu" />);
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    await userEvent.click(trigger());
    expect(screen.getByRole('menu', { name: 'Workers' })).toBeInTheDocument();
  });
});

describe('anchorPopup', () => {
  const el = (box: typeof triggerBox) => {
    const b = document.createElement('button');
    b.dataset.testid = 'trigger';
    triggerBox = box;
    return b;
  };

  it('places under the trigger, start-aligned, with the gap', () => {
    expect(anchorPopup(el({ left: 100, top: 100, width: 40, height: 28 }), PANEL)).toEqual({
      left: 100, top: 134, placement: 'bottom', alignment: 'start',
    });
  });

  it('aligns to the end and reaches past it by alignOffset', () => {
    const a = anchorPopup(el({ left: 600, top: 100, width: 40, height: 28 }), PANEL, { align: 'end', alignOffset: 4 });
    expect(a.left).toBe(640 - 200 + 4);
  });

  it('flips above when below is short', () => {
    const a = anchorPopup(el({ left: 100, top: 740, width: 40, height: 28 }), PANEL);
    expect(a).toMatchObject({ placement: 'top', top: 740 - 150 - 6 });
  });

  it('keeps viewportMargin from the window edges', () => {
    const a = anchorPopup(el({ left: 1250, top: 100, width: 20, height: 28 }), PANEL, { viewportMargin: 8 });
    expect(a.left).toBe(1280 - 8 - 200);
    const b = anchorPopup(el({ left: 2, top: 100, width: 20, height: 28 }), PANEL, { align: 'start', alignOffset: 12 });
    expect(b.left).toBe(8);
  });
});
