/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Lucide icon — render as a plain div so the test isn't entangled with svg.
jest.mock('lucide-react', () => ({
  Linkedin: () => <div data-testid="linkedin-icon">LinkedIn Icon</div>,
}));

import { Footer } from '../Footer';

const FOOTER_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../Footer.tsx'),
  'utf8'
);

const BARREL_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../../index.ts'),
  'utf8'
);

const LINKEDIN_URL = 'https://www.linkedin.com/in/matthewquinn/';

describe('Footer pattern', () => {
  it('renders copyright with current year and a LinkedIn link', () => {
    const year = new Date().getFullYear();
    render(<Footer name="Matt Quinn" linkedInUrl={LINKEDIN_URL} />);

    // Copyright with current year + name.
    expect(screen.getByText(`© ${year} Matt Quinn`)).toBeInTheDocument();
    // LinkedIn link is present.
    expect(
      screen.getByRole('link', { name: /Matt Quinn on LinkedIn/i })
    ).toBeInTheDocument();
  });

  it('does NOT render the brand name as a separate heading line (only in the copyright)', () => {
    // Brand-line removal: the name should appear ONLY inside the copyright,
    // not as a standalone prominent heading. Assert exactly one "Matt Quinn"
    // text node, and that it's the copyright.
    render(<Footer name="Matt Quinn" linkedInUrl={LINKEDIN_URL} />);
    const matches = screen.getAllByText(/Matt Quinn/);
    expect(matches).toHaveLength(1);
    expect(matches[0].textContent).toMatch(/©\s+\d{4}\s+Matt Quinn/);
  });

  it('LinkedIn link uses the linkedInUrl prop with target=_blank and rel=noopener noreferrer', () => {
    render(<Footer name="Matt Quinn" linkedInUrl={LINKEDIN_URL} />);
    const link = screen.getByRole('link', { name: /LinkedIn/i });
    expect(link).toHaveAttribute('href', LINKEDIN_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders themeToggle and themeColorButton slot nodes when provided', () => {
    render(
      <Footer
        name="Matt Quinn"
        linkedInUrl={LINKEDIN_URL}
        themeToggle={<button data-testid="footer-theme-toggle-marker" />}
        themeColorButton={
          <button data-testid="footer-theme-color-button-marker" />
        }
      />
    );

    expect(
      screen.getByTestId('footer-theme-toggle-marker')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('footer-theme-color-button-marker')
    ).toBeInTheDocument();
  });

  it('does NOT render slot wrappers when slot props are omitted', () => {
    const { container } = render(
      <Footer name="Matt Quinn" linkedInUrl={LINKEDIN_URL} />
    );
    expect(container.querySelector('[data-slot="theme-toggle"]')).toBeNull();
    expect(
      container.querySelector('[data-slot="theme-color-button"]')
    ).toBeNull();
  });

  it('does NOT import any `@/` app-local path (static import scan)', () => {
    // Strict scan: any `from '@/...'` or `from "@/..."` is a violation.
    expect(FOOTER_SOURCE).not.toMatch(/from\s+['"]@\//);
    // Belt-and-suspenders: also ensure the most likely violator is absent.
    expect(FOOTER_SOURCE).not.toMatch(/@\/config\/navigation/);
  });

  it('is exported from packages/ui-react/index.ts', () => {
    // Runtime import already verifies named export resolves; static check
    // verifies the barrel itself names the symbol.
    expect(BARREL_SOURCE).toMatch(/export\s+\{\s*Footer\s*\}/);
    expect(typeof Footer).toBe('function');
  });

  describe('keyboard shortcuts (now lifted out of Footer)', () => {
    // The l/t shortcuts moved to the consuming app's
    // `ThemeKeyboardShortcuts` component (mounted at public layout level)
    // so they work on every public route, not just routes mounting Footer.
    // Footer should NOT register any keydown listeners.

    it('does NOT attach a window keydown listener', () => {
      const addSpy = jest.spyOn(window, 'addEventListener');

      render(<Footer name="Matt Quinn" linkedInUrl={LINKEDIN_URL} />);

      const keydownAdds = addSpy.mock.calls.filter(
        ([type]) => type === 'keydown'
      );
      expect(keydownAdds).toHaveLength(0);

      addSpy.mockRestore();
    });

    it('source does NOT reference `replayIntro`, `themeManager`, or token mutation helpers', () => {
      // Footer is now purely visual — keyboard logic moved out.
      expect(FOOTER_SOURCE).not.toMatch(/replayIntro/);
      expect(FOOTER_SOURCE).not.toMatch(/themeManager/);
      expect(FOOTER_SOURCE).not.toMatch(/\bsetTheme\b/);
      expect(FOOTER_SOURCE).not.toMatch(/\bgetTheme\b/);
      expect(FOOTER_SOURCE).not.toMatch(/\bisDarkMode\b/);
    });
  });
});
