import { render, screen } from '@testing-library/react';
import { Cluster, Stack, gapClass, type Space } from '../Layout';

const STEPS: Space[] = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl'];

describe('Stack', () => {
  it('is a vertical flex column with a md gap by default, in a div', () => {
    const { container } = render(<Stack><p>a</p><p>b</p></Stack>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveAttribute('data-stack');
    expect(el).toHaveClass('flex', 'flex-col', 'gap-md');
    expect(el.children).toHaveLength(2);
  });

  it.each(STEPS)('gap %s takes the scale class gap-%s', step => {
    const { container } = render(<Stack gap={step} />);
    expect(container.firstElementChild).toHaveClass(`gap-${step}`);
    expect(gapClass[step]).toBe(`gap-${step}`);
  });

  it('renders as another element, and passes attributes and className through', () => {
    render(<Stack as="ul" aria-label="Cards" className="pt-sm" gap="xs"><li>one</li></Stack>);
    const list = screen.getByRole('list', { name: 'Cards' });
    expect(list.tagName).toBe('UL');
    expect(list).toHaveClass('flex', 'flex-col', 'gap-xs', 'pt-sm');
    expect(screen.getByRole('listitem')).toHaveTextContent('one');
  });
});

describe('Cluster', () => {
  it('is a wrapping row, gap sm, centred, from the start, by default', () => {
    const { container } = render(<Cluster><span>a</span><span>b</span></Cluster>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveAttribute('data-cluster');
    expect(el).toHaveClass('flex', 'flex-wrap', 'gap-sm', 'items-center', 'justify-start');
    expect(el).not.toHaveClass('flex-col');
  });

  it.each(STEPS)('gap %s takes gap-%s', step => {
    const { container } = render(<Cluster gap={step} />);
    expect(container.firstElementChild).toHaveClass(`gap-${step}`);
  });

  it.each([
    ['start', 'items-start'], ['center', 'items-center'], ['end', 'items-end'], ['baseline', 'items-baseline'], ['stretch', 'items-stretch'],
  ] as const)('align %s is %s', (align, cls) => {
    const { container } = render(<Cluster align={align} />);
    expect(container.firstElementChild).toHaveClass(cls);
  });

  it.each([
    ['start', 'justify-start'], ['center', 'justify-center'], ['end', 'justify-end'], ['between', 'justify-between'],
  ] as const)('justify %s is %s', (justify, cls) => {
    const { container } = render(<Cluster justify={justify} />);
    expect(container.firstElementChild).toHaveClass(cls);
  });

  it('renders as another element with attributes', () => {
    render(<Cluster as="nav" aria-label="Filters"><a href="#a">A</a></Cluster>);
    expect(screen.getByRole('navigation', { name: 'Filters' })).toHaveClass('flex-wrap');
  });
});
