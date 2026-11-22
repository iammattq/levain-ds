'use client';

import { FC, useState, useEffect, ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import NavigationLinks, { type NavigationItem } from './NavigationLinks';
import { Button } from '../components/Button';
import AsciiHeader from './AsciiHeader';

export interface AppNavProps {
  /**
   * Application name to display in the header
   */
  appName: 'Matt Quinn' | 'Work' | 'Photos' | 'Journal' | 'Dashboard' | 'Admin';

  /**
   * Navigation items to display in the header
   */
  navigationItems: NavigationItem[];

  /**
   * Optional toolbar to render below the main navigation
   */
  toolbar?: ReactNode;

  /**
   * Whether to enable animation when scrolling
   * @default true
   */
  scrollAnimation?: boolean;

  /**
   * Additional class names to apply to the header
   */
  className?: string;
}

/**
 * AppNav component provides a consistent navigation header for applications.
 * It includes a customizable app name, navigation links, theme toggle, and mobile support.
 *
 * @example
 * ```tsx
 * const navItems = [
 *   { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
 *   { href: '/settings', label: 'Settings', icon: Settings },
 *   { href: '#', label: 'Sign Out', icon: LogOut, onClick: () => signOut() }
 * ];
 *
 * <AppNav
 *   appName="My Application"
 *   navigationItems={navItems}
 *   toolbar={<div className="px-4 py-2 bg-primary/10">Additional controls</div>}
 * />
 * ```
 */
export const AppNav: FC<AppNavProps> = ({
  appName,
  navigationItems,
  toolbar,
  scrollAnimation = true,
  className = '',
}) => {
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (scrollAnimation) {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 0);
      };

      window.addEventListener('scroll', handleScroll);
      handleScroll(); // Check initial scroll position

      return () => window.removeEventListener('scroll', handleScroll);
    } else {
      setIsScrolled(true); // Always show the background if scroll animation is disabled
    }
  }, [scrollAnimation]);

  return (
    <header className={`animate-fade-in sticky top-0 z-40 ${className}`}>
      <div
        className={`w-full backdrop-blur-sm transition-all duration-350 ${
          isScrolled ? 'bg-[var(--color-surface-canvas)]/70 shadow-2xl' : ''
        } `}
      >
        {/* Main Navigation */}
        <div className="py-4 sm:py-6 md:py-6">
          <div className="px-4 sm:px-6 md:px-9">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AsciiHeader text={appName} size="sm" />
              </div>

              <div className="hidden items-center gap-4 md:flex">
                <NavigationLinks
                  navigationItems={navigationItems}
                  showThemeToggle={true}
                />
              </div>

              {/* Mobile Navigation */}
              <div className="flex items-center gap-2 md:hidden">
                <span className="type-body-sm text-[var(--color-text-muted)]">
                  {session?.user?.email}
                </span>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar Slot */}
        {toolbar}
      </div>
    </header>
  );
};
