import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ColumnStrip,
  COLUMN_STRIP_DWELL,
  COLUMN_STRIP_EDGE,
  COLUMN_STRIP_REPEAT,
  edgeSide,
  snapIndex,
  useColumnStrip,
  type ColumnStripDrag,
  type ColumnStripProps,
} from '../ColumnStrip';
import { SortableGroup, SortableList } from '../../components/SortableList';

const W = 390; // the phone's width, and so a column's

// The slide: framer's own clock doesn't follow jest's fake timers, so `animate` goes straight to its target, and is
// held until the test lets it finish, as the slide would after its length. The transition it was given is checked.
// framer paints a motion value to the style on its own frame, which jsdom with fake timers doesn't run reliably from
// test to test, so these tests read the rail's x (the value its transform is bound to); the Reduce Motion file checks
// the painted transform.
const slides: { resolve: () => void; transition: unknown }[] = [];
let railValue: { get: () => number } = { get: () => 0 };
jest.mock('framer-motion', () => {
  const actual = jest.requireActual('framer-motion');
  return {
    ...actual,
    animate: (value: { set: (v: number) => void; get: () => number }, to: number, transition: unknown) => {
      railValue = value;
      value.set(to);
      let resolve = () => {};
      const finished = new Promise<void>(r => { resolve = r; });
      slides.push({ resolve, transition });
      return { stop: () => {}, finished };
    },
  };
});
const finishSlides = async () => { await act(async () => { slides.splice(0).forEach(s => s.resolve()); jest.advanceTimersByTime(20); }); };

const columns = ['Ideas', 'Queued', 'In progress', 'Review'].map((k, i) => ({ key: k, label: k, count: i + 1, content: <p>{k} body</p> }));

let drag: ColumnStripDrag;
function Harness(props: Partial<ColumnStripProps>) {
  drag = useColumnStrip();
  return <ColumnStrip columns={columns} drag={drag} {...props} />;
}

const strip = () => document.querySelector('[data-strip]') as HTMLDivElement;
const pill = (k: string) => screen.getByRole('button', { name: new RegExp(`^${k}`) });
const cue = () => document.querySelector('[data-page-cue]');
const scrollTo = jest.fn(function (this: HTMLElement, o: ScrollToOptions) { this.scrollLeft = o.left ?? 0; });

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return W; } });
  (HTMLElement.prototype as { scrollTo: unknown }).scrollTo = scrollTo;
  // the strip spans the screen, as on a phone
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ left: 0, right: W, top: 0, bottom: 600, width: W, height: 600, x: 0, y: 0, toJSON: () => ({}) }));
  window.innerWidth = W;
});
afterAll(() => {
  delete (HTMLElement.prototype as { clientWidth?: unknown }).clientWidth;
  delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo;
});
beforeEach(() => { scrollTo.mockClear(); slides.length = 0; railValue = { get: () => 0 }; });

function swipeTo(left: number) {
  strip().scrollLeft = left;
  fireEvent.scroll(strip());
}

describe('snapIndex and edgeSide', () => {
  it('rests on the nearest whole column, within the columns', () => {
    expect(snapIndex(0, W, 4)).toBe(0);
    expect(snapIndex(W * 0.49, W, 4)).toBe(0);
    expect(snapIndex(W * 0.51, W, 4)).toBe(1);
    expect(snapIndex(W * 2, W, 4)).toBe(2);
    expect(snapIndex(W * 9, W, 4)).toBe(3);
    expect(snapIndex(-50, W, 4)).toBe(0);
    expect(snapIndex(100, 0, 4)).toBe(0);
  });
  it('the edge zones are edge px wide inside each side of the strip, and past it', () => {
    expect(edgeSide(0, 0, W, 56)).toBe('left');
    expect(edgeSide(55, 0, W, 56)).toBe('left');
    expect(edgeSide(56, 0, W, 56)).toBeNull();
    expect(edgeSide(W - 56, 0, W, 56)).toBeNull();
    expect(edgeSide(W - 55, 0, W, 56)).toBe('right');
    // a strip from 100 to 490 in a wider window
    expect(edgeSide(20, 100, 490, 56)).toBe('left');
    expect(edgeSide(150, 100, 490, 56)).toBe('left');
    expect(edgeSide(160, 100, 490, 56)).toBeNull();
    expect(edgeSide(440, 100, 490, 56)).toBe('right');
    expect(edgeSide(900, 100, 490, 56)).toBe('right');
  });
  it('the defaults are the board\'s: 56 px, 500 ms, 600 ms', () => {
    expect([COLUMN_STRIP_EDGE, COLUMN_STRIP_DWELL, COLUMN_STRIP_REPEAT]).toEqual([56, 500, 600]);
  });
});

describe('the strip and its pills', () => {
  it('renders a pill (label and count) and a column per entry; the first is current', () => {
    render(<Harness />);
    expect(screen.getByRole('navigation', { name: 'Columns' })).toBeInTheDocument();
    expect(pill('Queued')).toHaveTextContent('Queued2');
    expect(pill('Ideas')).toHaveAttribute('aria-current', 'true');
    expect(pill('Queued')).toHaveAttribute('aria-current', 'false');
    expect(screen.getByRole('region', { name: 'Review' })).toHaveTextContent('Review body');
    expect(strip().className).toContain('snap-x');
    expect(strip().className).toContain('snap-mandatory');
  });

  it('the pills follow a swipe, and onCurrentChange hears each new column once', () => {
    const on = jest.fn();
    render(<Harness onCurrentChange={on} />);
    swipeTo(W * 0.4);
    expect(pill('Ideas')).toHaveAttribute('aria-current', 'true');
    swipeTo(W * 0.6);
    expect(pill('Queued')).toHaveAttribute('aria-current', 'true');
    swipeTo(W * 1.1);
    swipeTo(W * 2);
    expect(pill('In progress')).toHaveAttribute('aria-current', 'true');
    expect(on.mock.calls).toEqual([['Queued'], ['In progress']]);
  });

  it('the strip never scrolls up and down: it is as tall as the column in view, the others clipped to it', () => {
    const tall = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
    render(<Harness />);
    expect(strip().style.height).toBe('300px');
    const col = (k: string) => document.querySelector(`[data-column="${k}"]`) as HTMLElement;
    expect(col('Ideas').style.maxHeight).toBe('');
    expect(col('Queued').style.maxHeight).toBe('300px');
    expect(col('Queued').style.overflow).toBe('hidden');
    swipeTo(W);
    expect(col('Queued').style.maxHeight).toBe('');
    expect(col('Ideas').style.maxHeight).toBe('300px');
    tall.mockRestore();
    strip().scrollTop = 40;
    fireEvent.scroll(strip());
    expect(strip().scrollTop).toBe(0);
  });

  it('a pill jumps there smoothly', () => {
    render(<Harness />);
    fireEvent.click(pill('In progress'));
    expect(scrollTo).toHaveBeenCalledWith({ left: W * 2, behavior: 'smooth' });
  });

  it('uncontrolled, defaultCurrent is in view from the start', () => {
    render(<Harness defaultCurrent="Review" />);
    expect(pill('Review')).toHaveAttribute('aria-current', 'true');
    expect(strip().scrollLeft).toBe(W * 3);
  });

  it('controlled, a new current scrolls there', () => {
    function Controlled() {
      const [k, setK] = useState('Ideas');
      return <><button onClick={() => setK('Review')}>external</button><Harness current={k} onCurrentChange={setK} /></>;
    }
    render(<Controlled />);
    fireEvent.click(screen.getByText('external'));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: W * 3, behavior: 'smooth' });
  });

  it('pillsEnd sits in the pills\' row', () => {
    render(<Harness pillsEnd={<button>Add</button>} />);
    expect(document.querySelector('[data-pills]')).toContainElement(screen.getByRole('button', { name: 'Add' }));
  });
});

describe('a held card', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const flush = async (ms: number) => { await act(async () => { jest.advanceTimersByTime(ms); }); };
  const lift = () => act(() => drag.onDragChange(true));
  const drop = () => act(() => drag.onDragChange(false));
  const at = (x: number) => act(() => drag.onDragMove(x, 300));

  it('lifting turns snap off; the strip does not scroll while held, and the pills ignore scroll events', async () => {
    render(<Harness />);
    lift();
    expect(strip().style.scrollSnapType).toBe('none');
    swipeTo(W);
    expect(pill('Ideas')).toHaveAttribute('aria-current', 'true');
    fireEvent.click(pill('Queued'));
    expect(scrollTo).not.toHaveBeenCalled();
    drop();
    expect(strip().style.scrollSnapType).toBe('');
  });

  it('resting at the right edge pages after the dwell by a transform, not a scroll', async () => {
    render(<Harness />);
    lift();
    at(W - 10);
    expect(cue()).toHaveAttribute('data-page-cue', 'right');
    await flush(COLUMN_STRIP_DWELL - 1);
    expect(pill('Ideas')).toHaveAttribute('aria-current', 'true');
    await flush(1);
    expect(pill('Queued')).toHaveAttribute('aria-current', 'true');
    // the slide: sheetIn's easing (no overshoot) at an arrival's length
    expect(slides[0]!.transition).toEqual({ duration: 0.62, ease: [0.4, 0, 0.2, 1] });
    await finishSlides();
    expect(railValue.get()).toBe(-W);
    expect(strip().scrollLeft).toBe(0);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('on drop the transform is swapped for the same scroll position', async () => {
    render(<Harness />);
    lift();
    at(W - 10);
    await flush(COLUMN_STRIP_DWELL);
    await finishSlides();
    drop();
    // the transform is off in the same frame as the scroll (not on framer's next): snapped under it, the strip lands off
    expect((document.querySelector('[data-rail]') as HTMLElement).style.transform).toBe('none');
    await flush(20);
    expect(railValue.get()).toBe(0);
    expect(strip().scrollLeft).toBe(W);
    expect(strip().style.scrollBehavior).toBe('');
    expect(pill('Queued')).toHaveAttribute('aria-current', 'true');
    expect(cue()).toBeNull();
  });

  it('dropped mid-slide, the strip lands on the column paged to', async () => {
    render(<Harness />);
    lift();
    at(W - 10);
    await flush(COLUMN_STRIP_DWELL + 50);
    drop();
    await flush(200);
    expect(strip().scrollLeft).toBe(W);
    expect(railValue.get()).toBe(0);
  });

  it('staying pages again every repeat; leaving the edge stops it', async () => {
    render(<Harness />);
    lift();
    at(W - 10);
    await flush(COLUMN_STRIP_DWELL);
    expect(pill('Queued')).toHaveAttribute('aria-current', 'true');
    await flush(COLUMN_STRIP_REPEAT * 2);
    expect(pill('Queued')).toHaveAttribute('aria-current', 'true'); // the repeat waits for the slide
    await finishSlides(); // slid; the repeat is armed
    expect(cue()).toHaveAttribute('data-page-cue', 'right');
    await flush(COLUMN_STRIP_REPEAT);
    expect(pill('In progress')).toHaveAttribute('aria-current', 'true');
    await finishSlides();
    at(W / 2);
    expect(cue()).toBeNull();
    await flush(5000);
    expect(pill('In progress')).toHaveAttribute('aria-current', 'true');
  });

  it('moving within the same edge does not restart the dwell', async () => {
    render(<Harness />);
    lift();
    at(W - 10);
    await flush(300);
    at(W - 20);
    await flush(200);
    expect(pill('Queued')).toHaveAttribute('aria-current', 'true');
  });

  it('the left edge pages back', async () => {
    render(<Harness defaultCurrent="Queued" />);
    lift();
    at(10);
    expect(cue()).toHaveAttribute('data-page-cue', 'left');
    await flush(COLUMN_STRIP_DWELL);
    await finishSlides();
    expect(pill('Ideas')).toHaveAttribute('aria-current', 'true');
    drop();
    expect(strip().scrollLeft).toBe(0);
  });

  it('paging stays within pageable: no cue and no page at the last column a card may land in', async () => {
    render(<Harness pageable={['Ideas', 'Queued']} />);
    lift();
    at(W - 10);
    await flush(COLUMN_STRIP_DWELL);
    await finishSlides();
    expect(pill('Queued')).toHaveAttribute('aria-current', 'true');
    expect(cue()).toBeNull();
    // stays at the edge: Queued is the last it may reach, so no repeat
    await flush(COLUMN_STRIP_REPEAT * 3);
    expect(pill('Queued')).toHaveAttribute('aria-current', 'true');
    at(W / 2);
    at(W - 10);
    expect(cue()).toBeNull();
    // and nothing past the first column
    at(W / 2);
    at(10);
    expect(cue()).toHaveAttribute('data-page-cue', 'left');
  });

  it('no paging at the ends of the strip', async () => {
    render(<Harness />);
    lift();
    at(10);
    expect(cue()).toBeNull();
    await flush(2000);
    expect(pill('Ideas')).toHaveAttribute('aria-current', 'true');
  });

  it('the edge, dwell and repeat can be set', async () => {
    render(<Harness edge={100} dwell={200} repeat={300} />);
    lift();
    at(W - 90);
    await flush(200);
    expect(pill('Queued')).toHaveAttribute('aria-current', 'true');
    await finishSlides();
    await flush(300);
    expect(pill('In progress')).toHaveAttribute('aria-current', 'true');
  });

  it('in a strip narrower than the window, the zones and the cue are at the strip\'s edges', async () => {
    render(<Harness />);
    const own = jest.spyOn(strip(), 'getBoundingClientRect').mockReturnValue({ left: 100, right: 100 + W, top: 0, bottom: 600, width: W, height: 600, x: 100, y: 0, toJSON: () => ({}) });
    window.innerWidth = 1000;
    try {
      lift();
      at(W - 10); // inside the strip, not at its edge
      expect(cue()).toBeNull();
      at(100 + W - 10);
      expect(cue()).toHaveAttribute('data-page-cue', 'right');
      expect((cue() as HTMLElement).style.right).toBe(`${1000 - 100 - W}px`);
      await flush(COLUMN_STRIP_DWELL);
      expect(pill('Queued')).toHaveAttribute('aria-current', 'true');
    } finally { own.mockRestore(); window.innerWidth = W; }
  });

  it('a move without a lifted card does nothing', async () => {
    render(<Harness />);
    at(W - 10);
    expect(cue()).toBeNull();
  });
});

describe('with SortableGroup', () => {
  it('takes the group\'s onDragChange and onDragMove', () => {
    function Board() {
      const d = useColumnStrip();
      return (
        <SortableGroup onMove={() => {}} onDragChange={d.onDragChange} onDragMove={d.onDragMove}>
          <ColumnStrip drag={d} columns={['a', 'b'].map(k => ({
            key: k, label: k,
            content: <SortableList id={k} label={k} items={[`${k}1`]} getKey={x => x} renderItem={x => <span>{x}</span>} />,
          }))} />
        </SortableGroup>
      );
    }
    render(<Board />);
    expect(screen.getByText('a1')).toBeInTheDocument();
    expect(screen.getByText('b1')).toBeInTheDocument();
  });
});
