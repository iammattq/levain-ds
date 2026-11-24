import React from 'react';
import { render, screen } from '@testing-library/react';
import PillNavigation from '../PillNavigation';

// D6: the icon-only tools link keeps its accessible name
describe('PillNavigation', () => {
  test('an icon-only tools link is named by its label', () => {
    render(
      <PillNavigation
        navigationItems={[]}
        toolsItems={[
          { label: 'LinkedIn', href: 'https://linkedin.com', external: true, iconName: 'linkedin' },
        ]}
        showThemeToggle={false}
      />
    );
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://linkedin.com'
    );
  });
});
