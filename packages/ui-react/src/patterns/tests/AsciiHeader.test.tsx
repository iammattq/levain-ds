import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AsciiHeader from '../AsciiHeader';
import { generatePaggaText } from '../../utils/pagga';

const art = (container: HTMLElement) => container.querySelector('pre')!.textContent;

describe('AsciiHeader', () => {
  test('draws any text, named by the text itself', () => {
    const { container } = render(<AsciiHeader text="Garden 2" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Garden 2' })).toBeInTheDocument();
    expect(art(container)).toBe(generatePaggaText('GARDEN 2'));
  });

  test('the titles it used to list draw as before', () => {
    for (const title of ['Work', 'Sign In', 'Design System', 'ASCII Lab']) {
      const { container, unmount } = render(<AsciiHeader text={title} />);
      expect(art(container)).toBe(generatePaggaText(title.toUpperCase()));
      unmount();
    }
  });

  test('keeps the hand-drawn art for its one text', () => {
    const { container } = render(<AsciiHeader text="Matt Quinn" />);
    expect(art(container)).not.toBe(generatePaggaText('MATT QUINN'));
    expect(art(container)).toContain('█\\█');
  });

  test('a text that names an object member draws as letters', () => {
    for (const text of ['constructor', 'toString', '__proto__']) {
      const { container, unmount } = render(<AsciiHeader text={text} />);
      expect(art(container)).toBe(generatePaggaText(text));
      unmount();
    }
  });

  test('leaves out characters it has no letters for', () => {
    const { container } = render(<AsciiHeader text="Hi!" />);
    expect(art(container)).toBe(generatePaggaText('HI'));
  });
});
