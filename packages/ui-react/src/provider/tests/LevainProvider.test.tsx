import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Image, LevainProvider, Link, useEnhancedTheme, usePathname } from '../LevainProvider';

function Path() {
  return <span data-testid="path">{usePathname()}</span>;
}
function Theme() {
  return <span data-testid="theme">{useEnhancedTheme().theme}</span>;
}

describe('LevainProvider', () => {
  it('draws a plain <a> and <img> with no provider', () => {
    render(
      <>
        <Link href="/work" className="x">Work</Link>
        <Image src="/a.png" alt="A" fill priority sizes="100vw" />
      </>
    );
    expect(screen.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '/work');
    const img = screen.getByAltText('A');
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('sizes', '100vw');
    expect(img).toHaveStyle({ position: 'absolute', width: '100%' });
  });

  it('forwards a ref to the plain link', () => {
    const ref = React.createRef<HTMLAnchorElement>();
    render(<Link ref={ref} href="/a">A</Link>);
    expect(ref.current?.tagName).toBe('A');
  });

  it('uses the app\'s link and image components, path and theme', () => {
    const AppLink = ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href} data-testid="app-link">{children}</a>;
    const AppImage = ({ alt }: { alt: string }) => <img alt={alt} data-testid="app-image" />;
    const theme = { theme: 'dark' as const, setTheme: jest.fn(), themeIndex: 2, setThemeIndex: jest.fn(), saveThemePreference: jest.fn() };
    render(
      <LevainProvider linkComponent={AppLink} imageComponent={AppImage} usePathname={() => '/now'} useTheme={() => theme}>
        <Link href="/b">B</Link>
        <Image src="/b.png" alt="B" />
        <Path />
        <Theme />
      </LevainProvider>
    );
    expect(screen.getByTestId('app-link')).toHaveAttribute('href', '/b');
    expect(screen.getByTestId('app-image')).toHaveAttribute('alt', 'B');
    expect(screen.getByTestId('path')).toHaveTextContent('/now');
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('the theme patterns need the app\'s theme', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Theme />)).toThrow(/LevainProvider given useTheme/);
  });
});
