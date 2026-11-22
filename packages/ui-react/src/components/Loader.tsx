'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface LoaderProps {
  /**
   * The color of the loader dots
   */
  color?: string;

  /**
   * The size of the loader
   */
  size?: 'xs' | 'sm' | 'md' | 'lg';

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * A simple animated loader component that displays bouncing dots
 */
export function Loader({
  color = 'var(--color-primary)',
  size = 'md',
  className = '',
}: LoaderProps) {
  // Under reduced motion the dots pulse in place instead of bouncing.
  const reduce = useReducedMotion();
  const getDotSize = () => {
    switch (size) {
      case 'xs':
        return 'w-1.5 h-1.5';
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-4 h-4';
      default:
        return 'w-3 h-3';
    }
  };

  const getSpacing = () => {
    return size === 'xs' ? 'space-x-1' : 'space-x-2';
  };

  return (
    <div className={`flex ${getSpacing()} ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`${getDotSize()} rounded-full`}
          style={{ backgroundColor: color }}
          animate={reduce ? { opacity: [0.4, 1, 0.4] } : { y: ['0%', '-50%', '0%'] }}
          // motion: continuous indicator, exempt from the size scale (assembly.json, motion-from-tokens)
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}
