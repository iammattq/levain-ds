import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageCompare } from '../ImageCompare';

const PAIR = [
  { label: 'This build', src: '/compare/build.png' },
  { label: 'Target', src: '/compare/target.png', href: '/full/target.png' },
];

describe('ImageCompare', () => {
  test('two images: stacked below md, side by side at equal width from md up, top-aligned', () => {
    const { container } = render(<ImageCompare images={PAIR} />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'items-start');
    expect(grid.querySelectorAll('[data-image-compare-item]')).toHaveLength(2);
  });

  test('one image renders alone at full width', () => {
    const { container } = render(<ImageCompare images={[PAIR[0]]} />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).not.toHaveClass('md:grid-cols-2');
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  test('each label is its image\'s alt text and its caption, under the image', () => {
    render(<ImageCompare images={PAIR} />);
    for (const { label, src } of PAIR) {
      const img = screen.getByRole('img', { name: label });
      expect(img).toHaveAttribute('src', src);
      expect(img).toHaveClass('w-full', 'h-auto');
      const figure = img.closest('figure')!;
      const caption = figure.querySelector('figcaption')!;
      expect(caption).toHaveTextContent(label);
      expect(caption).toHaveClass('type-caption');
      expect(img.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  test('each image is a link that opens the full image in a new tab; href defaults to src', () => {
    render(<ImageCompare images={PAIR} />);
    const links = screen.getAllByRole('link');
    expect(links.map(a => a.getAttribute('href'))).toEqual(['/compare/build.png', '/full/target.png']);
    for (const a of links) {
      expect(a).toHaveAttribute('target', '_blank');
      expect(a).toHaveAttribute('rel', 'noreferrer');
    }
    expect(within(links[0]).getByRole('img', { name: 'This build' })).toBeInTheDocument();
  });

  test('the image sits on the section surface with the subtle border and medium radius', () => {
    render(<ImageCompare images={PAIR} />);
    expect(screen.getByRole('img', { name: 'Target' })).toHaveClass(
      'bg-[var(--color-surface-section)]',
      'border-[var(--color-border-subtle)]',
      'rounded-[var(--radius-md)]'
    );
  });

  test('a broken image falls back to its label and path as text, the other unchanged', () => {
    render(<ImageCompare images={PAIR} />);
    fireEvent.error(screen.getByRole('img', { name: 'This build' }));
    expect(screen.queryByRole('img', { name: 'This build' })).toBeNull();
    expect(screen.getByText('This build: /compare/build.png')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Target' })).toBeInTheDocument();
  });
});

describe('ImageCompare mode="slider"', () => {
  const BA = [
    { label: 'Before', src: '/compare/before.png', href: '/full/before.png' },
    { label: 'After', src: '/compare/after.png' },
  ];
  const after = () => screen.getByRole('img', { name: 'After' });
  const handle = () => screen.getByRole('slider');
  const at = (n: number) => {
    expect(handle()).toHaveAttribute('aria-valuenow', String(n));
    expect(handle().style.left).toBe(`${n}%`);
    expect(after().style.clipPath).toBe(`inset(0 0 0 ${n}%)`);
  };

  test('the two images in one frame: before in flow, after over it, fitted and top-aligned; no links', () => {
    const { container } = render(<ImageCompare mode="slider" images={BA} />);
    const frame = container.querySelector('[data-image-compare-slider]')!;
    expect(frame).toHaveClass('relative', 'overflow-hidden', 'touch-pan-y', 'select-none');
    expect(screen.getByRole('img', { name: 'Before' })).toHaveClass('w-full', 'h-auto');
    expect(screen.getByRole('img', { name: 'Before' })).not.toHaveClass('absolute');
    expect(after()).toHaveClass('absolute', 'inset-0', 'object-contain', 'object-top');
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  test('the handle starts at 50% and is a named slider with its value', () => {
    render(<ImageCompare mode="slider" images={BA} />);
    at(50);
    expect(handle()).toHaveAccessibleName('Before and After');
    expect(handle()).toHaveAttribute('aria-valuemin', '0');
    expect(handle()).toHaveAttribute('aria-valuemax', '100');
    expect(handle()).toHaveAttribute('aria-valuetext', 'Before 50%, After 50%');
    expect(handle()).toHaveAttribute('tabindex', '0');
  });

  test('arrow keys move it 5%, Home and End to the ends, clamped', () => {
    render(<ImageCompare mode="slider" images={BA} />);
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    at(55);
    fireEvent.keyDown(handle(), { key: 'ArrowUp' });
    at(60);
    fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
    fireEvent.keyDown(handle(), { key: 'ArrowDown' });
    at(50);
    fireEvent.keyDown(handle(), { key: 'Home' });
    at(0);
    fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
    at(0);
    fireEvent.keyDown(handle(), { key: 'End' });
    at(100);
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    at(100);
    expect(handle()).toHaveAttribute('aria-valuetext', 'Before 100%, After 0%');
  });

  describe('dragging', () => {
    // jsdom 20 has no PointerEvent; React's pointer handlers need one carrying pointerId and pointerType
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

    const frameAt = (container: HTMLElement) => {
      const frame = container.querySelector('[data-image-compare-slider]') as HTMLElement;
      frame.getBoundingClientRect = () => ({ left: 100, width: 400, top: 0, height: 300, right: 500, bottom: 300, x: 100, y: 0, toJSON: () => ({}) });
      return frame;
    };

    test('a mouse press jumps the handle to the point and a drag follows it, clamped to the frame', () => {
      const { container } = render(<ImageCompare mode="slider" images={BA} />);
      const frame = frameAt(container);
      fireEvent.pointerDown(frame, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 200 });
      at(25);
      fireEvent.pointerMove(frame, { pointerId: 1, clientX: 400 });
      at(75);
      fireEvent.pointerMove(frame, { pointerId: 1, clientX: 900 });
      at(100);
      fireEvent.pointerUp(frame, { pointerId: 1 });
      fireEvent.pointerMove(frame, { pointerId: 1, clientX: 200 });
      at(100);
    });

    test('a touch takes the handle once it moves sideways, and stops on cancel', () => {
      const { container } = render(<ImageCompare mode="slider" images={BA} />);
      const frame = frameAt(container);
      fireEvent.pointerDown(frame, { pointerId: 2, pointerType: 'touch', button: 0, clientX: 300, clientY: 100 });
      at(50);
      fireEvent.pointerMove(frame, { pointerId: 2, clientX: 296, clientY: 100 }); // inside the slop
      at(50);
      fireEvent.pointerMove(frame, { pointerId: 2, clientX: 180, clientY: 104 });
      at(20);
      fireEvent.pointerMove(frame, { pointerId: 2, clientX: 200, clientY: 160 }); // taken: it follows x from here
      at(25);
      fireEvent.pointerCancel(frame, { pointerId: 2 });
      fireEvent.pointerMove(frame, { pointerId: 2, clientX: 400, clientY: 160 });
      at(25);
    });

    test('losing pointer capture ends the drag', () => {
      const { container } = render(<ImageCompare mode="slider" images={BA} />);
      const frame = frameAt(container);
      fireEvent.pointerDown(frame, { pointerId: 4, pointerType: 'mouse', button: 0, clientX: 200 });
      at(25);
      fireEvent(frame, new FakePointerEvent('lostpointercapture', { pointerId: 4, bubbles: true }));
      fireEvent.pointerMove(frame, { pointerId: 4, clientX: 400 });
      at(25);
    });

    test('a touch that moves down more than sideways (a page scroll) leaves the handle where it was', () => {
      const { container } = render(<ImageCompare mode="slider" images={BA} />);
      const frame = frameAt(container);
      fireEvent.pointerDown(frame, { pointerId: 3, pointerType: 'touch', button: 0, clientX: 200, clientY: 200 });
      fireEvent.pointerMove(frame, { pointerId: 3, clientX: 208, clientY: 180 });
      fireEvent.pointerMove(frame, { pointerId: 3, clientX: 212, clientY: 120 });
      at(50);
      fireEvent.pointerCancel(frame, { pointerId: 3 });
      at(50);
    });
  });

  test('each label sits in its top corner and fades while the handle is over it', () => {
    const sizes = jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
    const left = jest.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.imageCompareLabel === 'right' ? 330 : 8;
    });
    const width = jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(60);
    try {
      const { container } = render(<ImageCompare mode="slider" images={BA} />);
      const label = (side: string) => container.querySelector(`[data-image-compare-label="${side}"]`)!;
      expect(label('left')).toHaveTextContent('Before');
      expect(label('left')).toHaveClass('left-xs', 'top-xs');
      expect(label('right')).toHaveTextContent('After');
      expect(label('right')).toHaveClass('right-xs', 'top-xs');
      expect(label('left')).toHaveAttribute('aria-hidden', 'true');
      expect(label('left')).toHaveClass('opacity-100');
      expect(label('right')).toHaveClass('opacity-100');
      // the before chip ends at 68 px: the handle at 15% (60 px) is over it
      fireEvent.keyDown(handle(), { key: 'Home' });
      for (let i = 0; i < 3; i++) fireEvent.keyDown(handle(), { key: 'ArrowRight' });
      expect(label('left')).toHaveClass('opacity-0');
      expect(label('right')).toHaveClass('opacity-100');
      // at 20% (80 px) it is clear again
      fireEvent.keyDown(handle(), { key: 'ArrowRight' });
      expect(label('left')).toHaveClass('opacity-100');
      // the after chip starts at 330 px: the handle at 85% (340 px) is over it
      fireEvent.keyDown(handle(), { key: 'End' });
      for (let i = 0; i < 3; i++) fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
      expect(label('right')).toHaveClass('opacity-0');
      expect(label('left')).toHaveClass('opacity-100');
    } finally {
      sizes.mockRestore();
      left.mockRestore();
      width.mockRestore();
    }
  });

  test('a broken image falls back to side by side, with the broken one as text', () => {
    render(<ImageCompare mode="slider" images={BA} />);
    fireEvent.error(after());
    expect(screen.queryByRole('slider')).toBeNull();
    // remounted side by side; the after image fails again there and shows as text
    fireEvent.error(screen.getByRole('img', { name: 'After' }));
    expect(screen.getByText('After: /compare/after.png')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Before' })).toBeInTheDocument();
  });

  test('a new pair after a broken one gets the slider back', () => {
    const { rerender } = render(<ImageCompare mode="slider" images={BA} />);
    fireEvent.error(after());
    expect(screen.queryByRole('slider')).toBeNull();
    rerender(<ImageCompare mode="slider" images={[BA[0], { label: 'After', src: '/compare/after-2.png' }]} />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
    rerender(<ImageCompare mode="slider" images={BA} />);
    expect(screen.queryByRole('slider')).toBeNull();
  });

  test('the chips are on the inverted surface, in the inverted text colour', () => {
    const { container } = render(<ImageCompare mode="slider" images={BA} />);
    for (const side of ['left', 'right']) {
      const chip = container.querySelector(`[data-image-compare-label="${side}"]`)!;
      expect(chip).toHaveClass('bg-[var(--color-surface-inverted)]');
      // on the inner span, so .type-caption's colour on the chip doesn't win
      expect(chip.firstElementChild).toHaveClass('text-[var(--color-text-inverted)]');
    }
  });

  test('fewer than two images render side by side', () => {
    render(<ImageCompare mode="slider" images={[BA[0]]} />);
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/full/before.png');
  });
});

// T61: the slider in ImageViewer (its `zoom`); the zoom math and gestures are tested with the viewer (ImageViewer.test)
describe('ImageCompare mode="slider" zoom (ImageViewer\'s)', () => {
  const BA = [
    { label: 'Before', src: '/compare/before.png' },
    { label: 'After', src: '/compare/after.png' },
  ];

  test('fills its parent with no frame of its own; every touch is the viewer\'s', () => {
    const { container } = render(<ImageCompare images={BA} mode="slider" zoom={{ scale: 1, x: 0, y: 0 }} />);
    const frame = container.querySelector('[data-image-compare-slider]') as HTMLElement;
    expect(frame).toHaveClass('absolute', 'inset-0', 'touch-none', 'overflow-hidden');
    expect(frame).not.toHaveClass('border', 'rounded-[var(--radius-md)]', 'bg-[var(--color-surface-section)]', 'touch-pan-y', 'cursor-ew-resize');
  });

  test('both images in one layer, transformed by the zoom; the handle and labels outside it', () => {
    const { container } = render(<ImageCompare images={BA} mode="slider" zoom={{ scale: 2, x: 30, y: -10, ease: '1s linear' }} />);
    const layer = container.querySelector('[data-image-viewer-content]') as HTMLElement;
    expect(layer.style.transform).toBe('translate(30px, -10px) scale(2)');
    expect(layer.style.transition).toBe('transform 1s linear');
    expect(layer.querySelectorAll('img')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'After' }).style.transition).toBe('clip-path 1s linear');
    expect(layer).not.toContainElement(screen.getByRole('slider'));
    for (const l of container.querySelectorAll('[data-image-compare-label]')) expect(layer).not.toContainElement(l as HTMLElement);
  });

  test('the labels sit at the bottom corners (the viewer\'s ✕ takes the top right)', () => {
    const { container } = render(<ImageCompare images={BA} mode="slider" zoom={{ scale: 1, x: 0, y: 0 }} />);
    const [b, a] = container.querySelectorAll<HTMLElement>('[data-image-compare-label]');
    expect(b).toHaveClass('left-[calc(max(var(--edge-x),var(--safe-left))+var(--spacing-xs))]');
    expect(a).toHaveClass('right-[calc(max(var(--edge-x),var(--safe-right))+var(--spacing-xs))]');
    for (const l of container.querySelectorAll<HTMLElement>('[data-image-compare-label]')) {
      expect(l).toHaveClass('bottom-[calc(max(var(--edge-b),var(--safe-bottom))+var(--spacing-xs))]');
      expect(l).not.toHaveClass('top-xs');
    }
  });

  test('no zoom: the framed slider as before', () => {
    const { container } = render(<ImageCompare images={BA} mode="slider" />);
    const frame = container.querySelector('[data-image-compare-slider]') as HTMLElement;
    expect(frame).toHaveClass('relative', 'border', 'touch-pan-y', 'cursor-ew-resize');
    expect(container.querySelector('[data-image-viewer-content]')).toBeNull();
  });
});
