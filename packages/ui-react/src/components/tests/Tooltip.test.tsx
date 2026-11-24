import React, { createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from '../Tooltip';
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

// jsdom has no PointerEvent; React's pointer handlers need one carrying pointerType
class FakePointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'mouse';
  }
}
const realPointerEvent = (window as { PointerEvent?: unknown }).PointerEvent;
beforeAll(() => { (window as { PointerEvent?: unknown }).PointerEvent = FakePointerEvent; });
afterAll(() => { (window as { PointerEvent?: unknown }).PointerEvent = realPointerEvent; });

// jsdom lays nothing out: the trigger's box and the tooltip's size are given
let triggerBox = { left: 100, top: 100, width: 80, height: 20 };
const TIP = { width: 160, height: 60 };
beforeEach(() => {
  triggerBox = { left: 100, top: 100, width: 80, height: 20 };
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const b = this.dataset.testid === 'trigger' ? triggerBox : { left: 0, top: 0, width: 0, height: 0 };
    return { ...b, x: b.left, y: b.top, right: b.left + b.width, bottom: b.top + b.height, toJSON: () => b } as DOMRect;
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return this.getAttribute('role') === 'tooltip' ? TIP.width : 0; } });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.getAttribute('role') === 'tooltip' ? TIP.height : 0; } });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const Basic = ({ children, ...props }: Partial<React.ComponentProps<typeof Tooltip>>) => (
  <>
    <Tooltip content="Restart PM" {...props}>
      {children ?? <button type="button" data-testid="trigger">Restart</button>}
    </Tooltip>
    <button type="button">Elsewhere</button>
  </>
);

const trigger = () => screen.getByTestId('trigger');
const tip = () => screen.queryByRole('tooltip');
const hover = (pointerType = 'mouse') => fireEvent.pointerEnter(trigger(), { pointerType });
const leave = (pointerType = 'mouse') => fireEvent.pointerLeave(trigger(), { pointerType });
// a tap or a click: pointerdown, then the click (detail 1, as a pointer's click has)
const press = (pointerType: string, el: HTMLElement = trigger()) => {
  fireEvent.pointerDown(el, { pointerType });
  fireEvent.click(el, { detail: 1 });
};

describe('Tooltip', () => {
  it('opens after the hover delay, not before, and closes when the mouse leaves', () => {
    jest.useFakeTimers();
    render(<Basic />);
    hover();
    act(() => { jest.advanceTimersByTime(299); });
    expect(tip()).toBeNull();
    act(() => { jest.advanceTimersByTime(1); });
    expect(tip()).toHaveTextContent('Restart PM');
    leave();
    expect(tip()).toBeNull();
  });

  it('never opens if the mouse leaves before the delay, and takes its own delay', () => {
    jest.useFakeTimers();
    render(<Basic delay={600} />);
    hover();
    act(() => { jest.advanceTimersByTime(400); });
    leave();
    act(() => { jest.advanceTimersByTime(1000); });
    expect(tip()).toBeNull();
    hover();
    act(() => { jest.advanceTimersByTime(599); });
    expect(tip()).toBeNull();
    act(() => { jest.advanceTimersByTime(1); });
    expect(tip()).not.toBeNull();
  });

  it('opens at once on keyboard focus, closes on blur, and keeps focus on the trigger', async () => {
    const user = userEvent.setup();
    render(<Basic />);
    await user.tab();
    expect(trigger()).toHaveFocus();
    expect(tip()).not.toBeNull();
    await user.tab();
    expect(tip()).toBeNull();
    expect(screen.getByText('Elsewhere')).toHaveFocus();
  });

  it("doesn't open on a focus that isn't keyboard focus", () => {
    render(<Basic />);
    const t = trigger();
    jest.spyOn(t, 'matches').mockImplementation(sel => sel !== ':focus-visible');
    fireEvent.focus(t);
    expect(tip()).toBeNull();
  });

  it('closes on Escape and claims it, so a Modal around it stays open', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <Modal isOpen onClose={onClose} title="Card">
        {() => (
          <Tooltip content="Restart PM">
            <button type="button" data-testid="trigger">Restart</button>
          </Tooltip>
        )}
      </Modal>
    );
    trigger().focus();
    fireEvent.focus(trigger());
    expect(tip()).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(tip()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    // closed, Escape is the Modal's again
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sets role="tooltip" and aria-describedby on the trigger while open, beside its own', async () => {
    const user = userEvent.setup();
    render(
      <Basic>
        <button type="button" data-testid="trigger" aria-describedby="hint">Restart</button>
      </Basic>
    );
    expect(trigger()).toHaveAttribute('aria-describedby', 'hint');
    await user.tab();
    const id = tip()!.id;
    expect(id).toBeTruthy();
    expect(trigger().getAttribute('aria-describedby')).toBe(`hint ${id}`);
    expect(trigger()).toHaveAccessibleDescription('Restart PM');
    await user.tab();
    expect(trigger()).toHaveAttribute('aria-describedby', 'hint');
  });

  it('a press on the trigger closes it, and touch shows nothing (a control with its own action)', () => {
    jest.useFakeTimers();
    const onClick = jest.fn();
    render(<Basic><button type="button" data-testid="trigger" onClick={onClick}>Restart</button></Basic>);
    hover();
    act(() => { jest.advanceTimersByTime(300); });
    expect(tip()).not.toBeNull();
    press('mouse');
    expect(tip()).toBeNull();
    expect(onClick).toHaveBeenCalledTimes(1);
    hover('touch');
    press('touch');
    act(() => { jest.advanceTimersByTime(1000); });
    expect(tip()).toBeNull();
  });

  describe('toggle (a trigger that is there for its tooltip)', () => {
    it('a tap toggles it; a tap elsewhere closes it', () => {
      render(<Basic toggle />);
      press('touch');
      expect(tip()).not.toBeNull();
      // the tap's own pointerleave doesn't close it
      leave('touch');
      expect(tip()).not.toBeNull();
      press('touch');
      expect(tip()).toBeNull();
      press('touch');
      expect(tip()).not.toBeNull();
      press('touch', screen.getByText('Elsewhere'));
      expect(tip()).toBeNull();
    });

    it('a key press toggles it; a mouse click shows it at once', async () => {
      const user = userEvent.setup();
      render(<Basic toggle />);
      await user.tab(); // keyboard focus opens it
      expect(tip()).not.toBeNull();
      await user.keyboard('{Enter}');
      expect(tip()).toBeNull();
      await user.keyboard(' ');
      expect(tip()).not.toBeNull();
      await user.tab();
      expect(tip()).toBeNull();
      press('mouse');
      expect(tip()).not.toBeNull();
      press('mouse');
      expect(tip()).not.toBeNull();
    });

    it('a press on the tooltip stays with it: it never reaches the trigger’s ancestors', () => {
      const onCard = jest.fn();
      render(
        <div onClick={onCard} onPointerDown={onCard}>
          <Tooltip content="Building · step 2 of 4" toggle>
            <button type="button" data-testid="trigger">Building</button>
          </Tooltip>
        </div>
      );
      press('touch');
      onCard.mockClear();
      press('touch', tip()!);
      expect(onCard).not.toHaveBeenCalled();
      expect(tip()).not.toBeNull();
    });
  });

  it('is placed below the trigger, start-aligned, 6 px away, and flips above when there is no room', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Basic />);
    await user.tab();
    expect(tip()).toHaveAttribute('data-placement', 'bottom');
    expect(tip()!.style.left).toBe('100px');
    expect(tip()!.style.top).toBe('126px');
    expect(tip()!.style.visibility).toBe('');
    unmount();

    triggerBox = { left: 1250, top: 760, width: 24, height: 24 };
    render(<Basic />);
    await user.tab();
    expect(tip()).toHaveAttribute('data-placement', 'top');
    expect(tip()!.style.top).toBe(`${760 - 6 - TIP.height}px`);
    // kept 8 px inside the window's right side
    expect(tip()!.style.left).toBe(`${1280 - 8 - TIP.width}px`);
  });

  it('portals to the body at the popover layer', async () => {
    const user = userEvent.setup();
    const { container } = render(<Basic />);
    await user.tab();
    expect(container.contains(tip())).toBe(false);
    expect(tip()!.parentElement).toBe(document.body);
    expect(tip()!.className).toContain('z-[60]');
  });

  it('keeps the child’s ref and handlers', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLButtonElement>();
    const onFocus = jest.fn(), onBlur = jest.fn(), onPointerEnter = jest.fn();
    render(
      <Basic>
        <button type="button" data-testid="trigger" ref={ref} onFocus={onFocus} onBlur={onBlur} onPointerEnter={onPointerEnter}>Restart</button>
      </Basic>
    );
    expect(ref.current).toBe(trigger());
    await user.tab();
    await user.tab();
    hover();
    expect([onFocus, onBlur, onPointerEnter].map(f => f.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('is off while its content is empty, and closes when the content empties', async () => {
    const user = userEvent.setup();
    const Switchable = () => {
      const [text, setText] = useState('Restart PM');
      return (
        <>
          <Tooltip content={text}><button type="button" data-testid="trigger">Restart</button></Tooltip>
          <button type="button" onClick={() => setText('')}>Empty</button>
        </>
      );
    };
    render(<Switchable />);
    await user.tab();
    expect(tip()).not.toBeNull();
    fireEvent.click(screen.getByText('Empty'));
    expect(tip()).toBeNull();
    fireEvent.blur(trigger());
    fireEvent.focus(trigger());
    expect(tip()).toBeNull();
  });
});
