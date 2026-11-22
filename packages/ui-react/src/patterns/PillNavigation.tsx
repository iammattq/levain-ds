'use client';

import { usePathname } from '../provider/LevainProvider';
import React from 'react';
import { Linkedin } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ThemeColorButton from './ThemeColorButton';
import { Button } from '../components/Button';
import type { NavigationItem } from './NavigationLinks';

interface PillNavigationProps {
  navigationItems: NavigationItem[];
  toolsItems?: NavigationItem[];
  showThemeToggle?: boolean;
  showThemeColorButton?: boolean;
  onLinkClick?: () => void;
}

export default function PillNavigation({
  navigationItems,
  toolsItems = [],
  showThemeToggle = true,
  showThemeColorButton = false,
  onLinkClick,
}: PillNavigationProps) {
  const pathname = usePathname();

  // Get icon component
  const getIconComponent = (iconName?: string) => {
    if (!iconName) return null;

    switch (iconName.toLowerCase()) {
      case 'linkedin':
        return Linkedin;
      default:
        return null;
    }
  };

  // Check if path is active
  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="flex w-full flex-col items-start justify-start gap-4 md:flex-row md:gap-5">
      {/* Group 1: Main navigation items */}
      <div className="flex w-full max-w-[250px] flex-col items-stretch gap-2 md:w-auto md:max-w-none md:flex-row">
        {navigationItems.map((item) => {
          const active = isActive(item.href, item.exact);

          if (item.onClick) {
            return (
              <Button
                key={item.href}
                onClick={() => {
                  item.onClick?.();
                  onLinkClick?.();
                }}
                active={active}
                aria-label={item.label}
                className="flex-1 lowercase md:flex-initial"
              >
                {item.label.toLowerCase()}
              </Button>
            );
          }

          return (
            <Button
              key={item.href}
              href={item.href}
              active={active}
              external={item.external}
              aria-label={item.label}
              className="flex-1 lowercase md:flex-initial"
            >
              {item.label.toLowerCase()}
            </Button>
          );
        })}
      </div>

      {/* Group 2: Theme buttons */}
      <div className="flex flex-row items-center gap-2">
        {/* Theme toggle */}
        {showThemeToggle && (
          <ThemeToggle className="pill-gradient-border inline-flex h-9 flex-1 items-center justify-center rounded-lg px-4 text-[var(--color-text-default)] shadow-[0px_0px_10px_0px_rgba(0,0,0,0.05)] transition-all duration-200 hover:shadow-none md:flex-initial" />
        )}

        {/* Theme color button */}
        {showThemeColorButton && (
          <ThemeColorButton className="pill-gradient-border inline-flex h-9 flex-1 items-center justify-center rounded-lg px-4 text-[var(--color-text-default)] shadow-[0px_0px_10px_0px_rgba(0,0,0,0.05)] transition-all duration-200 hover:shadow-none md:flex-initial" />
        )}
      </div>

      {/* Group 3: LinkedIn */}
      {toolsItems.length > 0 && (
        <div className="flex flex-row items-center gap-2">
          {toolsItems.map((item) => {
            const Icon = item.iconName
              ? getIconComponent(item.iconName)
              : item.icon;

            return (
              <Button
                key={item.href}
                href={item.href}
                external={item.external}
                aria-label={item.label}
                className="flex-1 !px-4 md:flex-initial"
              >
                {Icon && <Icon size={16} strokeWidth={1} />}
              </Button>
            );
          })}
        </div>
      )}
    </nav>
  );
}
