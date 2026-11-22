import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Section } from '../Section';

describe('Section Component', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(
        <Section>
          <div data-testid="test-child">Test Content</div>
        </Section>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('applies default classes for styling', () => {
      const { container } = render(
        <Section>
          <div>Test Content</div>
        </Section>
      );

      // The component structure is <div><div>content</div></div>
      const innerContainer = container.firstChild?.firstChild as HTMLElement;
      expect(innerContainer).not.toBeNull();
      expect(innerContainer).toHaveClass('bg-[var(--color-surface-section)]');
      expect(innerContainer).toHaveClass('text-[var(--color-text-default)]');
      expect(innerContainer).toHaveClass('rounded-b-lg');
      expect(innerContainer).toHaveClass('rounded-t-lg'); // Default roundedTop is true
    });

    it('accepts and applies custom className', () => {
      const { container } = render(
        <Section className="custom-class">
          <div>Test Content</div>
        </Section>
      );

      const outerContainer = container.firstChild as HTMLElement;
      expect(outerContainer).toHaveClass('custom-class');
    });
  });

  describe('Props', () => {
    it('applies correct padding based on padding prop', () => {
      const { container: containerNone } = render(
        <Section padding="none">Test</Section>
      );
      const { container: containerSm } = render(
        <Section padding="sm">Test</Section>
      );
      const { container: containerMd } = render(
        <Section padding="md">Test</Section>
      );
      const { container: containerLg } = render(
        <Section padding="lg">Test</Section>
      );

      const innerNone = containerNone.firstChild?.firstChild as HTMLElement;
      const innerSm = containerSm.firstChild?.firstChild as HTMLElement;
      const innerMd = containerMd.firstChild?.firstChild as HTMLElement;
      const innerLg = containerLg.firstChild?.firstChild as HTMLElement;

      // Test padding classes
      expect(innerNone).not.toHaveClass('p-2xs');
      expect(innerSm).toHaveClass('p-2xs');
      expect(innerMd).toHaveClass('p-sm');
      expect(innerLg).toHaveClass('p-md');

      // Test responsive padding
      expect(innerSm).toHaveClass('md:p-sm');
      expect(innerMd).toHaveClass('md:p-lg');
      expect(innerLg).toHaveClass('md:p-xl');
    });

    it('renders with rounded top when roundedTop=true', () => {
      const { container } = render(
        <Section roundedTop={true}>
          <div>Test Content</div>
        </Section>
      );

      const innerContainer = container.firstChild?.firstChild as HTMLElement;
      expect(innerContainer).toHaveClass('rounded-t-lg');
    });

    it('renders without rounded top when roundedTop=false', () => {
      const { container } = render(
        <Section roundedTop={false}>
          <div>Test Content</div>
        </Section>
      );

      const innerContainer = container.firstChild?.firstChild as HTMLElement;
      expect(innerContainer).not.toHaveClass('rounded-t-lg');
    });
  });

  describe('Layouts', () => {
    it('applies single-column layout by default', () => {
      const { container } = render(<Section>Test</Section>);
      const innerContainer = container.firstChild?.firstChild as HTMLElement;

      expect(innerContainer).toHaveClass('flex');
      expect(innerContainer).toHaveClass('flex-col');
      expect(innerContainer).not.toHaveClass('grid');
    });

    it('applies two-column-equal layout', () => {
      const { container } = render(
        <Section layout="two-column-equal">Test</Section>
      );
      const innerContainer = container.firstChild?.firstChild as HTMLElement;

      expect(innerContainer).toHaveClass('grid');
      expect(innerContainer).toHaveClass('grid-cols-1');
      expect(innerContainer).toHaveClass('md:grid-cols-2');
      expect(innerContainer).toHaveClass('gap-lg'); // Default padding is 'md' so gap should be 'gap-lg'
    });

    it('applies two-column-sidebar layout', () => {
      const { container } = render(
        <Section layout="two-column-sidebar-right">Test</Section>
      );
      const innerContainer = container.firstChild?.firstChild as HTMLElement;

      expect(innerContainer).toHaveClass('grid');
      expect(innerContainer).toHaveClass('grid-cols-1');
      expect(innerContainer).toHaveClass('lg:grid-cols-12');
      expect(innerContainer).toHaveClass('gap-lg'); // Default padding is 'md' so gap should be 'gap-lg'
    });

    it('adjusts gap size based on padding prop', () => {
      const { container: containerSm } = render(
        <Section layout="two-column-equal" padding="sm">
          Test
        </Section>
      );
      const { container: containerLg } = render(
        <Section layout="two-column-sidebar-right" padding="lg">
          Test
        </Section>
      );

      const innerSm = containerSm.firstChild?.firstChild as HTMLElement;
      const innerLg = containerLg.firstChild?.firstChild as HTMLElement;

      expect(innerSm).toHaveClass('gap-sm');
      expect(innerLg).toHaveClass('gap-xl');
    });
  });
});
