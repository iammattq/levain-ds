import { render, screen, within } from '@testing-library/react';
import { Column } from '../Column';
import { CountBadge } from '../../components/CountBadge';

const parts = (c: HTMLElement) => ({
  col: c.querySelector('[data-column]') as HTMLElement,
  head: c.querySelector('[data-column-head]') as HTMLElement,
  body: c.querySelector('[data-column-body]') as HTMLElement,
});

describe('Column', () => {
  it('is a region named by its title, with an h2 and the children in the body', () => {
    const { container } = render(<Column title="Queued"><p>Card one</p><p>Card two</p></Column>);
    const region = screen.getByRole('region', { name: 'Queued' });
    expect(within(region).getByRole('heading', { level: 2, name: 'Queued' })).toBeInTheDocument();
    const { body } = parts(container);
    expect(body.children).toHaveLength(2);
    expect(body).toHaveTextContent('Card one');
  });

  it("is the board's surface: border-subtle in light, the section surface in dark, the cards' radius plus 4 px", () => {
    const { col } = parts(render(<Column title="Ideas" />).container);
    expect(col).toHaveClass(
      'flex', 'flex-col', 'min-w-0', 'pt-2xs', 'rounded-[calc(var(--radius-lg)+0.25rem)]',
      'bg-[var(--color-border-subtle)]', 'dark:bg-[var(--color-surface-section)]',
    );
  });

  it("the header is the board's: 32 px, 14 px medium, its items 8 px apart, inset to the cards' text", () => {
    const { head } = parts(render(<Column title="Ideas" />).container);
    expect(head).toHaveClass('flex', 'h-8', 'shrink-0', 'items-center', 'gap-2xs', 'mx-xs', 'px-md', 'text-sm', 'font-medium');
  });

  it('the body spaces its children 24 px apart, inside the column inset', () => {
    const { body } = parts(render(<Column title="Ideas" />).container);
    expect(body).toHaveClass('flex', 'flex-col', 'gap-md', 'px-xs', 'pb-xs', 'pt-[calc(var(--spacing-3xs)+4px)]');
  });

  it('a number count renders a plain CountBadge after the title', () => {
    const { head } = parts(render(<Column title="Ideas" count={3} />).container);
    const badge = head.querySelector('[data-count-badge]') as HTMLElement;
    expect(badge).toHaveTextContent('3');
    expect(badge).toHaveClass('text-[var(--color-text-faint)]');
    expect(head.querySelector('h2')!.nextElementSibling).toBe(badge);
  });

  it('a count of 0 still shows', () => {
    const { head } = parts(render(<Column title="Ideas" count={0} />).container);
    expect(head.querySelector('[data-count-badge]')).toHaveTextContent('0');
  });

  it('an element count is rendered as given', () => {
    const { head } = parts(render(<Column title="Waiting" count={<CountBadge count={2} tone="caution" label="2 waiting on you" />} />).container);
    const badge = head.querySelector('[data-count-badge]') as HTMLElement;
    expect(badge).toHaveClass('text-[var(--color-caution-fg)]');
    expect(badge).toHaveTextContent('2 waiting on you');
  });

  it('no count, no badge', () => {
    const { head } = parts(render(<Column title="Ideas" />).container);
    expect(head.querySelector('[data-count-badge]')).toBeNull();
  });

  it('the slots go in order: icon, title, count, marks, then the action pushed right', () => {
    const { head } = parts(render(
      <Column title="In progress" count={2} icon={<svg data-testid="icon" aria-hidden />} marks={<span data-testid="mark">PR</span>}
        action={<button type="button">Add</button>} />,
    ).container);
    const kids = Array.from(head.children);
    expect(kids[0]).toBe(screen.getByTestId('icon'));
    expect(kids[1].tagName).toBe('H2');
    expect(kids[2]).toHaveAttribute('data-count-badge');
    expect(kids[3]).toBe(screen.getByTestId('mark'));
    expect(kids[4]).toHaveClass('ml-auto');
    expect(within(kids[4] as HTMLElement).getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('without an action there is no right-hand slot', () => {
    const { head } = parts(render(<Column title="Ideas" count={1} />).container);
    expect(head.querySelector('.ml-auto')).toBeNull();
  });

  it('without scroll the body does not scroll and the column takes its content height', () => {
    const { col, body } = parts(render(<Column title="Ideas" />).container);
    expect(col).not.toHaveAttribute('data-scroll');
    expect(col).not.toHaveClass('h-full', 'overflow-hidden');
    expect(body).not.toHaveClass('overflow-y-auto');
  });

  it('scroll: the column fills its given height and the body scrolls under a header that stays put', () => {
    const { col, head, body } = parts(render(<Column title="Ideas" scroll />).container);
    expect(col).toHaveAttribute('data-scroll');
    expect(col).toHaveClass('h-full', 'min-h-0', 'overflow-hidden');
    expect(body).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto', 'overscroll-contain');
    expect(head).toHaveClass('shrink-0');
    expect(head).not.toHaveClass('overflow-y-auto');
    expect(body.contains(head)).toBe(false);
  });

  it('className goes on the column', () => {
    const { col } = parts(render(<Column title="Ideas" className="w-80" />).container);
    expect(col).toHaveClass('w-80');
  });
});
