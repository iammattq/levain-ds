import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { ToolSidebar } from '../ToolSidebar';

/**
 * A pointer event the drag handler can actually read.
 *
 * jsdom implements neither PointerEvent nor pointer capture, and its event
 * shim drops the coordinates fireEvent is handed — so the gesture is built by
 * hand, carrying only the fields the handler looks at.
 */
function pointer(type: string, clientY: number) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, clientY });
  return event;
}

beforeAll(() => {
  // Not implemented in jsdom; the grip captures the pointer during a drag.
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = jest.fn();
  }
  window.innerHeight = 800;
});

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * The collapsible variant is a bottom panel below `md` and a sidebar above it,
 * which is CSS. What is not CSS, and so is what these cover: that the sections
 * become a tab strip small and a labelled stack wide, that both are present
 * rather than switched on a breakpoint read at render, and that a plain
 * sidebar is untouched by any of it.
 */

const SECTIONS = [
  { id: 'presets', label: 'Presets', content: <p>Preset buttons</p> },
  { id: 'grid', label: 'Grid', content: <p>Grid controls</p> },
  { id: 'glass', label: 'Glass', content: <p>Glass controls</p> },
];

describe('ToolSidebar', () => {
  test('renders children and an optional footer', () => {
    render(
      <ToolSidebar footer={<button type="button">Apply</button>}>
        <p>Controls</p>
      </ToolSidebar>
    );

    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  test('a plain sidebar takes its width from an inline style', () => {
    render(
      <ToolSidebar size="lg">
        <p>Controls</p>
      </ToolSidebar>
    );

    expect(screen.getByRole('complementary')).toHaveStyle({ width: '320px' });
  });

  test('a plain sidebar has no tab strip', () => {
    render(
      <ToolSidebar>
        <p>Controls</p>
      </ToolSidebar>
    );

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  test('a collapsible panel takes its width from a class, not a style', () => {
    // An inline width would apply below the breakpoint too, where the panel
    // spans the screen.
    render(<ToolSidebar collapsible size="lg" sections={SECTIONS} />);

    const aside = screen.getByRole('complementary');
    expect(aside).not.toHaveStyle({ width: '320px' });
    expect(aside.className).toContain('md:w-[320px]');
  });

  test('opens at a share of the viewport, not a pixel height', () => {
    // A fraction rather than pixels, so it survives a rotation. Under half,
    // because the canvas has to stay watchable while a control moves.
    render(<ToolSidebar collapsible sections={SECTIONS} />);

    const aside = screen.getByRole('complementary');
    expect(aside.className).toContain('h-[42dvh]');
    expect(aside.style.height).toBe('');
  });

  test('the grip resizes the panel, clamped at both ends', () => {
    render(<ToolSidebar collapsible sections={SECTIONS} />);

    const aside = screen.getByRole('complementary');
    const grip = screen.getByRole('separator', { name: 'Resize controls' });
    jest
      .spyOn(aside, 'getBoundingClientRect')
      .mockReturnValue({ height: 336 } as DOMRect);

    fireEvent(grip, pointer('pointerdown', 700));
    fireEvent(grip, pointer('pointermove', 600));

    // Dragging up is taller, and a dragged height wins over the class.
    expect(aside).toHaveStyle({ height: '436px' });
    expect(aside.className).not.toContain('h-[42dvh]');

    // Never the whole screen, and never smaller than a usable control.
    fireEvent(grip, pointer('pointermove', -2000));
    expect(aside).toHaveStyle({ height: '640px' });
    fireEvent(grip, pointer('pointermove', 2000));
    expect(aside).toHaveStyle({ height: '176px' });
  });

  test('a cancelled pointer keeps the height it reached', () => {
    render(<ToolSidebar collapsible sections={SECTIONS} />);

    const aside = screen.getByRole('complementary');
    const grip = screen.getByRole('separator', { name: 'Resize controls' });
    jest
      .spyOn(aside, 'getBoundingClientRect')
      .mockReturnValue({ height: 336 } as DOMRect);

    fireEvent(grip, pointer('pointerdown', 700));
    fireEvent(grip, pointer('pointermove', 600));
    fireEvent(grip, pointer('pointercancel', 600));

    expect(aside).toHaveStyle({ height: '436px' });
    // And the drag is over, so a later move is not tracked.
    fireEvent(grip, pointer('pointermove', 300));
    expect(aside).toHaveStyle({ height: '436px' });
  });

  test('renders every section for the wide layout and one for the narrow', () => {
    render(<ToolSidebar collapsible sections={SECTIONS} />);

    // Both layouts are in the DOM, hidden from each other by CSS, so the
    // server and the first client paint agree. The wide one carries all three
    // section headings; the narrow one carries only the active section.
    expect(screen.getByRole('heading', { name: 'Grid' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Glass' })).toBeInTheDocument();
    expect(screen.getAllByText('Preset buttons')).toHaveLength(2);
    expect(screen.getAllByText('Glass controls')).toHaveLength(1);
  });

  test('opens on the first section', () => {
    render(<ToolSidebar collapsible sections={SECTIONS} />);

    expect(screen.getByRole('tab', { name: 'Presets' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  test('a tab swaps which section the narrow layout shows', () => {
    render(<ToolSidebar collapsible sections={SECTIONS} />);

    expect(screen.getAllByText('Glass controls')).toHaveLength(1);

    fireEvent.click(screen.getByRole('tab', { name: 'Glass' }));

    expect(screen.getByRole('tab', { name: 'Glass' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    // Now in both layouts; the wide stack always had it.
    expect(screen.getAllByText('Glass controls')).toHaveLength(2);
    expect(screen.getAllByText('Preset buttons')).toHaveLength(1);
  });

  test('a lone section gets no tab strip to choose between', () => {
    render(<ToolSidebar collapsible sections={[SECTIONS[0]]} />);

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getAllByText('Preset buttons')).toHaveLength(2);
  });

  test('sections win over children when both are given', () => {
    render(
      <ToolSidebar collapsible sections={SECTIONS}>
        <p>Ignored</p>
      </ToolSidebar>
    );

    expect(screen.queryByText('Ignored')).not.toBeInTheDocument();
  });
});
