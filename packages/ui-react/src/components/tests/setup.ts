// Design system test setup
import '@testing-library/jest-dom';

// Mock next/link for all tests in this directory
jest.mock('next/link', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockLink = function (props: any) {
    const { href, className, children, ...rest } = props;
    return React.createElement(
      'a',
      {
        href,
        className,
        ...rest,
      },
      children
    );
  };

  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Add any other global mocks or setup needed for design system component tests
