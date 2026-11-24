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
