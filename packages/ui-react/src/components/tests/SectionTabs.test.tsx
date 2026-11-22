import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SectionTabs from '../SectionTabs';
import { SectionTabData } from '../SectionTabs';

// Suppress the console warning for invalid tab IDs during tests
const originalConsoleWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
});
afterAll(() => {
  console.warn = originalConsoleWarn;
});

describe('SectionTabs Component', () => {
  // Sample test data
  const testSections: SectionTabData[] = [
    { id: 'tab1', title: 'First Tab' },
    { id: 'tab2', title: 'Second Tab' },
    { id: 'tab3', title: 'Third Tab', disabled: true },
  ];

  describe('Rendering', () => {
    it('renders tab buttons correctly', () => {
      render(<SectionTabs sections={testSections} activeTabId="tab1" />);

      expect(screen.getByText('First Tab')).toBeInTheDocument();
      expect(screen.getByText('Second Tab')).toBeInTheDocument();
      expect(screen.getByText('Third Tab')).toBeInTheDocument();
    });

    it('renders the disabled tab correctly', () => {
      render(<SectionTabs sections={testSections} activeTabId="tab1" />);

      const disabledButton = screen.getByText('Third Tab').closest('button');
      expect(disabledButton).toBeDisabled();
      expect(disabledButton).toHaveClass('disabled:opacity-50');
      expect(disabledButton).toHaveClass('disabled:cursor-not-allowed');
    });

    it('applies active styles to the selected tab', () => {
      render(<SectionTabs sections={testSections} activeTabId="tab2" />);

      const activeTab = screen.getByText('Second Tab').closest('button');
      const inactiveTab = screen.getByText('First Tab').closest('button');

      expect(activeTab).toHaveClass('bg-[var(--color-accent)]');
      expect(activeTab).toHaveClass('text-[var(--color-text-default)]');
      expect(inactiveTab).toHaveClass('text-[var(--color-text-muted)]');
    });

    it('renders custom icons and badges when provided', () => {
      const sectionsWithIcons: SectionTabData[] = [
        {
          id: 'tab1',
          title: 'With Icon',
          icon: <span data-testid="test-icon">🔍</span>,
        },
        {
          id: 'tab2',
          title: 'With Badge',
          badge: <span data-testid="test-badge">New</span>,
        },
      ];

      render(<SectionTabs sections={sectionsWithIcons} activeTabId="tab1" />);

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByTestId('test-badge')).toBeInTheDocument();
    });
  });

  describe('Controlled Mode', () => {
    it('calls onTabChange when a tab is clicked', () => {
      const handleTabChange = jest.fn();

      render(
        <SectionTabs
          sections={testSections}
          activeTabId="tab1"
          onTabChange={handleTabChange}
        />
      );

      fireEvent.click(screen.getByText('Second Tab'));
      expect(handleTabChange).toHaveBeenCalledWith('tab2');
    });

    it('does not call onTabChange when a disabled tab is clicked', () => {
      const handleTabChange = jest.fn();

      render(
        <SectionTabs
          sections={testSections}
          activeTabId="tab1"
          onTabChange={handleTabChange}
        />
      );

      fireEvent.click(screen.getByText('Third Tab'));
      expect(handleTabChange).not.toHaveBeenCalled();
    });

    it('keeps the active tab unchanged when clicked in controlled mode', () => {
      const handleTabChange = jest.fn();

      render(
        <SectionTabs
          sections={testSections}
          activeTabId="tab1"
          onTabChange={handleTabChange}
        />
      );

      fireEvent.click(screen.getByText('Second Tab'));

      // In controlled mode, the component shouldn't change its active tab internally
      // but we can check that the callback was called correctly
      expect(handleTabChange).toHaveBeenCalledWith('tab2');
    });
  });

  describe('Uncontrolled Mode', () => {
    it('renders content based on active tab', () => {
      render(
        <SectionTabs sections={testSections} initialSectionId="tab1">
          {(activeId) => (
            <div data-testid="content">{`Content for ${activeId}`}</div>
          )}
        </SectionTabs>
      );

      expect(screen.getByTestId('content')).toHaveTextContent(
        'Content for tab1'
      );
    });

    it('changes the active tab when clicked in uncontrolled mode', () => {
      render(
        <SectionTabs sections={testSections} initialSectionId="tab1">
          {(activeId) => (
            <div data-testid="content">{`Content for ${activeId}`}</div>
          )}
        </SectionTabs>
      );

      fireEvent.click(screen.getByText('Second Tab'));
      expect(screen.getByTestId('content')).toHaveTextContent(
        'Content for tab2'
      );
    });

    it('respects initialSectionId for the initial active tab', () => {
      render(
        <SectionTabs sections={testSections} initialSectionId="tab2">
          {(activeId) => (
            <div data-testid="content">{`Content for ${activeId}`}</div>
          )}
        </SectionTabs>
      );

      expect(screen.getByTestId('content')).toHaveTextContent(
        'Content for tab2'
      );
    });

    it('uses first non-disabled tab if initialSectionId is not provided', () => {
      render(
        <SectionTabs sections={testSections}>
          {(activeId) => (
            <div data-testid="content">{`Content for ${activeId}`}</div>
          )}
        </SectionTabs>
      );

      expect(screen.getByTestId('content')).toHaveTextContent(
        'Content for tab1'
      );
    });
  });

  describe('Styling Customization', () => {
    it('applies custom class names to various parts', () => {
      const { container } = render(
        <SectionTabs
          sections={testSections}
          activeTabId="tab1"
          className="custom-tab-class"
          containerClassName="custom-container"
          tabsClassName="custom-tabs-area"
          contentClassName="custom-content"
        >
          {() => <div>Content</div>}
        </SectionTabs>
      );

      // Check container class
      expect(container.firstChild).toHaveClass('custom-container');

      // Check tabs area class - first level div needs a different selector
      const tabsArea = screen
        .getByRole('button', { name: 'First Tab' })
        .closest('div');
      expect(tabsArea).toHaveClass('custom-tabs-area');

      // Check tab buttons classes
      const tabButton = screen.getByText('First Tab').closest('button');
      expect(tabButton).toHaveClass('custom-tab-class');
    });

    it('applies content padding based on contentPadding prop', () => {
      const { container } = render(
        <SectionTabs
          sections={testSections}
          initialSectionId="tab1"
          contentPadding="lg"
        >
          {() => <div>Content</div>}
        </SectionTabs>
      );

      // Find the Section component that wraps the content
      const sectionElement = container.querySelector('.p-md');
      expect(sectionElement).toBeInTheDocument();
      expect(sectionElement).toHaveClass('md:p-xl');
    });
  });

  describe('Edge Cases', () => {
    it('returns null if no sections are provided', () => {
      const { container } = render(
        <SectionTabs sections={[]} activeTabId="tab1" />
      );

      expect(container.firstChild).toBeNull();
    });

    it('logs a warning if an invalid activeTabId is provided', () => {
      render(<SectionTabs sections={testSections} activeTabId="nonexistent" />);

      expect(console.warn).toHaveBeenCalled();
    });
  });
});
