import React from 'react';

interface LinkProps {
  href: string;
  className?: string;
  external?: boolean;
  children: React.ReactNode;
  [key: string]: unknown;
}

const MockLink = function (props: LinkProps) {
  const { href, className, external, children, ...rest } = props;

  return React.createElement(
    'a',
    {
      href,
      className,
      target: external ? '_blank' : undefined,
      rel: external ? 'noopener noreferrer' : undefined,
      ...rest,
    },
    children
  );
};

MockLink.displayName = 'MockedNextLink';

export default MockLink;
