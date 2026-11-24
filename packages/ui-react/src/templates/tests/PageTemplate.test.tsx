import React from 'react';
import { render, screen } from '@testing-library/react';
// the node build: jsdom would pick the browser one, which needs MessageChannel
import { renderToString } from 'react-dom/server.node';
import '@testing-library/jest-dom';
import { PageTemplate } from '../PageTemplate';

// D5: the page renders its content at once, with no timer, so a server-rendered page isn't empty
describe('PageTemplate', () => {
  test('renders the title and content in the first render', () => {
    render(
      <PageTemplate title="Journal">
        <p>Entry body</p>
      </PageTemplate>
    );
    expect(screen.getByRole('heading', { level: 1, name: /Journal/ })).toBeInTheDocument();
    expect(screen.getByText('Entry body')).toBeInTheDocument();
  });

  test('a server render carries the title and content', () => {
    const html = renderToString(
      <PageTemplate title="Journal" layout="two-column-sidebar-right" sidebar={<p>Side</p>}>
        <p>Entry body</p>
      </PageTemplate>
    );
    expect(html).toContain('Journal');
    expect(html).toContain('Entry body');
    expect(html).toContain('Side');
  });
});
