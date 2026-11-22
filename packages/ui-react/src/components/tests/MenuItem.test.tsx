import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { MenuItem } from '../MenuItem';

jest.mock('../../provider/LevainProvider', () => {
  const actual = jest.requireActual('../../provider/LevainProvider');
  const link = (() => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))();
  return { ...actual, Link: link.default ?? link };
});

// React 19 hands `ref` to function components as a plain prop, so the mock can
// spread it without forwardRef — which a jest.mock factory could not reference
// anyway, being unable to close over imports.

describe('MenuItem', () => {
  describe('rendered element follows behaviour', () => {
    it('renders an anchor when given href', () => {
      render(<MenuItem href="/profile">Profile</MenuItem>);

      expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
        'href',
        '/profile'
      );
    });

    it('renders a real button when given onClick', () => {
      render(<MenuItem onClick={() => {}}>Settings</MenuItem>);

      const button = screen.getByRole('button', { name: 'Settings' });
      expect(button.tagName).toBe('BUTTON');
      // type=button so it cannot submit a surrounding form by accident.
      expect(button).toHaveAttribute('type', 'button');
    });

    it('is operable by keyboard without added ARIA', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();
      render(<MenuItem onClick={onClick}>Settings</MenuItem>);

      await user.tab();
      expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('stays a div when it carries its own interactive slot', () => {
      // A button cannot contain a button, so rightContent forces the plain
      // container even though onClick is present.
      render(
        <MenuItem
          onClick={() => {}}
          rightContent={<button type="button">Edit</button>}
        >
          Preset
        </MenuItem>
      );

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Preset/ })
      ).not.toBeInTheDocument();
    });

    it('renders a plain div when it does nothing', () => {
      render(<MenuItem>Static</MenuItem>);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('Static')).toBeInTheDocument();
    });
  });

  describe('focus indication', () => {
    it('puts the focus ring on the element that actually receives focus', () => {
      // Regression: the styled node used to be wrapped in a bare anchor, so
      // focus landed on the anchor while the ring sat on the inner div.
      render(<MenuItem href="/profile">Profile</MenuItem>);

      expect(screen.getByRole('link', { name: 'Profile' }).className).toContain(
        'focus-visible:ring-2'
      );
    });
  });

  describe('active state', () => {
    it('marks an active link as the current page', () => {
      render(
        <MenuItem href="/profile" isActive>
          Profile
        </MenuItem>
      );

      expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
        'aria-current',
        'page'
      );
    });

    it('leaves aria-current off an inactive link', () => {
      render(<MenuItem href="/profile">Profile</MenuItem>);

      expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveAttribute(
        'aria-current'
      );
    });
  });

  describe('radius', () => {
    it('defaults to the md token step', () => {
      render(<MenuItem href="/a">A</MenuItem>);

      expect(screen.getByRole('link').className).toContain(
        'rounded-[var(--radius-md)]'
      );
    });

    it('emits a literal class for every documented value', () => {
      // Regression: this was built by interpolation, which Tailwind cannot see
      // when it scans source for candidates. Half the values generated no rule
      // at all and rendered square, while a test asserting the string was
      // present passed regardless.
      const values = ['none', 'xs', 'sm', 'md', 'lg', 'full'] as const;

      for (const value of values) {
        const { container, unmount } = render(
          <MenuItem href="/a" radius={value}>
            A
          </MenuItem>
        );
        expect(container.firstElementChild?.className).toContain(
          `rounded-[var(--radius-${value})]`
        );
        unmount();
      }
    });

    it('takes a token step so callers can satisfy the nested-radius rule', () => {
      // A menu on --radius-xl (12px) inset by --space-2xs (8px) wants 4px.
      render(
        <MenuItem href="/a" radius="sm">
          A
        </MenuItem>
      );

      expect(screen.getByRole('link').className).toContain(
        'rounded-[var(--radius-sm)]'
      );
    });
  });

  describe('text step', () => {
    it('maps xl to heading-4, for a primary navigation menu', () => {
      render(
        <MenuItem href="/a" size="xl">
          A
        </MenuItem>
      );

      expect(screen.getByRole('link').className).toContain('type-heading-4');
    });

    it('does not clip descenders — no leading-none under truncate', () => {
      // truncate brings overflow:hidden; a 1em line box is shorter than the
      // glyphs' ink, which sliced descenders at heading steps.
      const { container } = render(
        <MenuItem href="/a" size="xl">
          Photography
        </MenuItem>
      );

      expect(container.querySelector('.leading-none')).toBeNull();
    });
  });

  describe('hover surface', () => {
    it('does not fill with a surface a menu is commonly drawn on', () => {
      // Regression: hover used to fill with surface-section, which is also a
      // container surface — on a menu drawn there (the OS menu panel, the
      // tool sidebar) the hover painted the background colour and vanished.
      render(<MenuItem href="/a">A</MenuItem>);

      const className = screen.getByRole('link').className;
      expect(className).toContain('hover:bg-[var(--color-surface-canvas)]');
      expect(className).not.toContain(
        'hover:bg-[var(--color-surface-section)]'
      );
    });

    it('has no hover fill while active', () => {
      render(
        <MenuItem href="/a" isActive>
          A
        </MenuItem>
      );

      expect(screen.getByRole('link').className).not.toContain('hover:bg-');
    });
  });

  describe('icon scale and weight', () => {
    const Chevron = (props: React.SVGProps<SVGSVGElement>) => (
      <svg data-testid="chevron" {...props} />
    );

    it('sizes icons from the text size by default', () => {
      render(
        <MenuItem size="lg" RightIcon={Chevron}>
          Settings
        </MenuItem>
      );

      expect(screen.getByTestId('chevron').getAttribute('class')).toContain(
        'h-6 w-6'
      );
    });

    it('lets the icon scale be set apart from the text', () => {
      // Body-sized rows usually want a smaller icon: it is an affordance, not
      // the content.
      render(
        <MenuItem size="lg" iconSize="sm" RightIcon={Chevron}>
          Settings
        </MenuItem>
      );

      const className = screen.getByTestId('chevron').getAttribute('class');
      expect(className).toContain('h-4 w-4');
      expect(className).not.toContain('h-6 w-6');
    });

    it('passes a stroke weight through to the icon', () => {
      render(
        <MenuItem RightIcon={Chevron} iconStrokeWidth={1.5}>
          Settings
        </MenuItem>
      );

      expect(screen.getByTestId('chevron')).toHaveAttribute(
        'stroke-width',
        '1.5'
      );
    });
  });

  it('passes through DOM attributes such as tabIndex', () => {
    render(
      <MenuItem onClick={() => {}} tabIndex={-1}>
        Settings
      </MenuItem>
    );

    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute(
      'tabindex',
      '-1'
    );
  });
});
