import * as React from 'react';

interface IconProps extends React.SVGAttributes<SVGElement> {
  color?: string;
  size?: string | number;
  strokeWidth?: string | number;
  className?: string;
}

// Mock icon component
function createIconComponent(name: string) {
  const Icon = (props: IconProps) => {
    return React.createElement(
      'svg',
      {
        'data-testid': `icon-${name.toLowerCase()}`,
        width: props.size || 24,
        height: props.size || 24,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: props.color || 'currentColor',
        strokeWidth: props.strokeWidth || 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className: props.className || '',
        ...props,
      },
      React.createElement('path', {
        d: 'M0 0h24v24H0z',
      })
    );
  };

  Icon.displayName = name;
  return Icon;
}

// Export for common icons used in tests
export const Heart = createIconComponent('Heart');
export const PlusIcon = createIconComponent('PlusIcon');
export const ChevronRight = createIconComponent('ChevronRight');
export const ChevronLeft = createIconComponent('ChevronLeft');
export const ChevronsRight = createIconComponent('ChevronsRight');
export const ChevronsLeft = createIconComponent('ChevronsLeft');
export const ChevronDown = createIconComponent('ChevronDown');
export const ChevronUp = createIconComponent('ChevronUp');
export const Search = createIconComponent('Search');
export const HelpCircle = createIconComponent('HelpCircle');
export const Sun = createIconComponent('Sun');
export const Moon = createIconComponent('Moon');

// Provide the LucideProps type used by the real components
export type LucideProps = IconProps;

// Create and export default object
const LucideIcons = {
  Heart,
  PlusIcon,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  ChevronDown,
  ChevronUp,
  Search,
  HelpCircle,
  Sun,
  Moon,
};

export default LucideIcons;
export const X = createIconComponent('X');
