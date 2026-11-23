'use client';

import { Link, usePathname } from '../provider/LevainProvider';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ThemeSwitcher from './ThemeSwitcher';
import ThemeColorButton from './ThemeColorButton';
import { LinkedinIcon } from '../components/icons';
import { cn } from '../utils/cn';

// Navigation types - exported for consumers to use
export interface SubMenuItem {
  href: string;
  label: string;
}

export interface NavigationItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  iconName?: string;
  external?: boolean;
  showSubMenu?: boolean;
  subMenu?: SubMenuItem[];
  onClick?: () => void;
  /** When true, only match this route exactly (no prefix matching) */
  exact?: boolean;
}

interface NavigationLinksProps {
  className?: string;
  showThemeToggle?: boolean;
  showThemeColorButton?: boolean;
  themeComponent?: 'toggle' | 'switcher';
  onLinkClick?: () => void;
  navigationItems: NavigationItem[];
  iconsOnly?: boolean;
  spacing?: 'none' | 'small' | 'medium' | 'large';
  iconSize?: number;
}

export default function NavigationLinks({
  showThemeToggle = true,
  showThemeColorButton = false,
  themeComponent = 'toggle',
  onLinkClick,
  navigationItems = [],
  iconsOnly = false,
  spacing = 'medium',
  iconSize = 20,
}: NavigationLinksProps) {
  const pathname = usePathname();

  // Animation timing constant
  const TRANSITION_TIMING = 500; // ms - reduced for quicker feedback

  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState(0);
  const [currentSubmenuItems, setCurrentSubmenuItems] = useState<SubMenuItem[]>(
    []
  );
  const [isItemsTransitioning, setIsItemsTransitioning] = useState(false);
  const [isClosingSubmenu, setIsClosingSubmenu] = useState(false);
  const [isNavigatingBetweenSubmenus, setIsNavigatingBetweenSubmenus] =
    useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Map<string, HTMLElement>>(new Map());
  const themeToggleRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isHoverDevice, setIsHoverDevice] = useState(false);
  const themeColorButtonRef = useRef<HTMLButtonElement>(null);

  // Set spacing class based on the spacing prop
  const getSpacingClass = () => {
    switch (spacing) {
      case 'none':
        return '';
      case 'small':
        return 'md:mr-2';
      case 'large':
        return 'md:mr-6';
      case 'medium':
      default:
        return 'md:mr-4';
    }
  };

  const spacingClass = getSpacingClass();

  // Helper function to get the icon component based on iconName
  const getIconComponent = (iconName?: string) => {
    if (!iconName) return null;

    switch (iconName.toLowerCase()) {
      case 'linkedin':
        return LinkedinIcon;
      default:
        return null;
    }
  };

  // Helper function to check if current path is part of a section
  const isPathInSection = useCallback(
    (sectionPath: string) => {
      if (sectionPath === '/admin' && pathname !== '/admin') {
        return false;
      }
      return (
        pathname === sectionPath ||
        (pathname.startsWith(`${sectionPath}/`) && sectionPath !== '/admin')
      );
    },
    [pathname]
  );

  // Add this new helper function
  const isCurrentSubSection = useCallback(
    (href: string) => {
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname]
  );

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    return () => clearTimer();
  }, []);

  // Define updateHighlight first using useCallback
  const updateHighlight = useCallback(
    (href: string | null) => {
      // Only update highlight on hover-capable devices
      if (!isHoverDevice) return;

      const highlight = highlightRef.current;
      let targetElement: Element | null = null;

      if (href === 'active') {
        // Find the active link, considering nested paths
        const activeItem = navigationItems.find((item) =>
          isPathInSection(item.href)
        );
        const activeLink = activeItem
          ? linkRefs.current.get(activeItem.href)
          : null;
        targetElement = activeLink || null;
      } else if (href === 'theme') {
        targetElement = themeToggleRef.current;
      } else if (href === 'themeColor') {
        targetElement = themeColorButtonRef.current;
      } else {
        targetElement = href ? (linkRefs.current.get(href) ?? null) : null;
      }

      if (highlight && targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const parentRect = highlight.parentElement?.getBoundingClientRect();

        if (parentRect) {
          // For icon-only mode, use 40px fixed width
          if (iconsOnly) {
            highlight.style.width = '40px';
          } else {
            highlight.style.width = `${rect.width}px`;
          }
          highlight.style.transform = `translateX(${rect.left - 4 - parentRect.left}px)`;
          highlight.style.opacity = '1';
        }
      } else if (highlight) {
        highlight.style.opacity = '0';
      }
    },
    [navigationItems, isHoverDevice, isPathInSection, iconsOnly]
  );

  // Now use updateHighlight in this useEffect
  useEffect(() => {
    // Check if device supports hover
    setIsHoverDevice(window.matchMedia('(hover: hover)').matches);
    // Initial highlight update after determining hover capability
    updateHighlight('active');
  }, [updateHighlight]); // Add updateHighlight dependency

  // Update submenu dimensions when items change
  useEffect(() => {
    const updateSubmenuSize = () => {
      if (submenuRef.current && currentSubmenuItems.length > 0) {
        // Temporarily remove explicit widths
        submenuRef.current.style.width = 'auto';

        const contentDiv = submenuRef.current.querySelector('div');
        if (contentDiv) {
          // Force layout recalculation
          void contentDiv.offsetWidth;

          // Measure natural content size
          const contentRect = contentDiv.getBoundingClientRect();

          // Store the measurements as CSS variables for transitions
          submenuRef.current.style.setProperty(
            '--submenu-width',
            `${Math.ceil(contentRect.width) + 16}px`
          );
          submenuRef.current.style.setProperty(
            '--submenu-height',
            `${Math.ceil(contentRect.height)}px`
          );

          // Set explicitly after measuring
          submenuRef.current.style.width = `var(--submenu-width)`;
          submenuRef.current.style.height = `var(--submenu-height)`;
        }
      }
    };

    if (currentSubmenuItems.length > 0) {
      requestAnimationFrame(() => {
        updateSubmenuSize();
      });
    }
  }, [currentSubmenuItems, isItemsTransitioning]);

  // useEffect that depends on updateHighlight
  useEffect(() => {
    // Update highlight based on path OR hoveredLink only if it's a hover device
    if (isHoverDevice) {
      if (!hoveredLink) {
        updateHighlight('active');
      }
      // If hoveredLink exists, updateHighlight(hoveredLink) is called in handleMouseEnter
    } else {
      // Ensure highlight is off for non-hover devices
      if (highlightRef.current) {
        highlightRef.current.style.opacity = '0';
      }
    }
  }, [pathname, hoveredLink, updateHighlight, isHoverDevice]); // Added isHoverDevice dependency

  const handleMouseEnter = (href: string) => {
    // Immediately return if not a hover device
    if (!isHoverDevice) return;

    clearTimer();
    setIsClosingSubmenu(false);

    const item = navigationItems.find((item) => item.href === href);
    const link = linkRefs.current.get(href);

    if (item?.showSubMenu && item.subMenu && link) {
      // Mark that we're navigating between submenus if we already have one active
      if (activeSubmenu) {
        setIsNavigatingBetweenSubmenus(true);
      }

      const rect = link.getBoundingClientRect();
      const parentRect =
        link.parentElement?.parentElement?.getBoundingClientRect();

      if (parentRect) {
        const leftOffset = rect.left - parentRect.left;
        setSubmenuPosition(leftOffset);

        // Reset the navigating flag after animation completes
        if (activeSubmenu) {
          setTimeout(() => {
            setIsNavigatingBetweenSubmenus(false);
          }, TRANSITION_TIMING);
        }

        if (activeSubmenu && item.subMenu !== currentSubmenuItems) {
          setIsItemsTransitioning(true);
          setTimeout(
            () => {
              setCurrentSubmenuItems(item.subMenu || []);
              setIsItemsTransitioning(false);
            },
            Math.floor(TRANSITION_TIMING / 2)
          );
        } else {
          setCurrentSubmenuItems(item.subMenu || []);
        }

        setActiveSubmenu(href);
      }
    } else {
      setActiveSubmenu(null);
      setCurrentSubmenuItems([]);
    }

    setHoveredLink(href);
    updateHighlight(href);
  };

  const handleThemeToggleEnter = () => {
    clearTimer();
    setHoveredLink('theme');
    updateHighlight('theme');
  };

  const handleThemeColorButtonEnter = () => {
    clearTimer();
    setHoveredLink('themeColor');
    updateHighlight('themeColor');
  };

  const handleMouseLeave = () => {
    clearTimer();

    // Only set closing immediately if we're not navigating between submenus
    if (!isNavigatingBetweenSubmenus) {
      setIsClosingSubmenu(true);
    }

    timeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
      setCurrentSubmenuItems([]);
      setHoveredLink(null);
      updateHighlight('active');

      // Reset closing state after the menu is fully closed
      setTimeout(() => {
        setIsClosingSubmenu(false);
        setIsNavigatingBetweenSubmenus(false);
      }, 50);
    }, 300);
  };

  return (
    <>
      <div
        className={`relative flex ${iconsOnly ? 'flex-row' : 'flex-col md:flex-row'} w-fit items-center rounded-3xl bg-[var(--color-surface-section)] p-1 md:rounded-full`}
      >
        {isHoverDevice && (
          <div
            ref={highlightRef}
            className="highlight-pill absolute h-[40px] rounded-full bg-[var(--color-accent)] opacity-0 transition-all duration-300 ease-in-out"
            style={{
              pointerEvents: 'none',
              // Add custom style for better sizing
              minWidth: '40px',
            }}
          />
        )}

        {navigationItems.map((item, index) => {
          const Icon = item.iconName
            ? getIconComponent(item.iconName)
            : item.icon;
          const isLinkedIn = item.href.includes('linkedin');

          const commonClasses = `type-label font-bold rounded-full tracking-tight transition-colors flex justify-center items-center
                                ${
                                  iconsOnly
                                    ? 'w-10 h-10 p-0'
                                    : 'px-4 py-2 w-[180px] md:w-auto'
                                }
                                text-[var(--color-text-default)]`;

          return (
            <div
              key={item.href}
              className={`relative ${
                index !== navigationItems.length - 1 || showThemeToggle
                  ? spacingClass
                  : ''
              }`}
              onMouseEnter={
                isHoverDevice ? () => handleMouseEnter(item.href) : undefined
              }
              onMouseLeave={isHoverDevice ? handleMouseLeave : undefined}
            >
              {item.onClick ? (
                <button
                  onClick={item.onClick}
                  ref={(el) => {
                    if (el) linkRefs.current.set(item.href, el);
                  }}
                  className={`${commonClasses} cursor-pointer`}
                  aria-label={item.label}
                >
                  {Icon && (
                    <Icon
                      className={`${!iconsOnly ? 'mr-2' : ''}`}
                      size={iconSize}
                    />
                  )}
                  {!iconsOnly && item.label}
                  {!iconsOnly && item.showSubMenu && item.subMenu && (
                    <ChevronDown className="ml-1" size={(iconSize / 5) * 4} />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  ref={(el: HTMLAnchorElement | null) => {
                    if (el) linkRefs.current.set(item.href, el);
                  }}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  onClick={onLinkClick}
                  className={commonClasses}
                  aria-label={isLinkedIn ? 'LinkedIn Profile' : item.label}
                >
                  {Icon && (
                    <Icon
                      className={`${!iconsOnly ? 'mr-2' : ''}`}
                      size={iconSize}
                    />
                  )}
                  {!iconsOnly && item.label}
                  {!iconsOnly && item.showSubMenu && item.subMenu && (
                    <ChevronDown className="ml-1" size={(iconSize / 5) * 4} />
                  )}
                </Link>
              )}
            </div>
          );
        })}

        {/* Single Submenu */}
        {!iconsOnly && isHoverDevice && (
          <div
            className={`absolute top-full left-0 mt-2 w-full ${
              activeSubmenu ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            style={{
              transition: isClosingSubmenu
                ? 'none'
                : 'opacity 300ms ease-in-out',
            }}
            onMouseEnter={
              isHoverDevice
                ? () => {
                    if (activeSubmenu) {
                      handleMouseEnter(activeSubmenu);
                      setIsNavigatingBetweenSubmenus(true);
                    }
                  }
                : undefined
            }
            onMouseLeave={isHoverDevice ? handleMouseLeave : undefined}
          >
            <div
              ref={submenuRef}
              className="absolute rounded-3xl bg-[var(--color-surface-section)] whitespace-nowrap text-[var(--color-text-muted)] shadow-lg"
              style={{
                transform: `translateX(${submenuPosition}px)`,
                width: 'var(--submenu-width, auto)',
                height: 'var(--submenu-height, auto)',
                willChange: 'transform, width, height',
                transition: isClosingSubmenu
                  ? 'none'
                  : `transform ${TRANSITION_TIMING}ms cubic-bezier(0.16, 1, 0.3, 1),
                     width ${TRANSITION_TIMING}ms cubic-bezier(0.16, 1, 0.3, 1),
                     height ${TRANSITION_TIMING}ms cubic-bezier(0.16, 1, 0.3, 1)`,
                overflow: 'hidden',
              }}
            >
              <div
                className={`px-0 py-4 transition-opacity duration-150 ease-in-out ${
                  isItemsTransitioning ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {currentSubmenuItems.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    onClick={onLinkClick}
                    className={cn(
                      'type-label block px-4 py-2 font-bold whitespace-nowrap transition-colors',
                      isCurrentSubSection(subItem.href)
                        ? 'bg-[var(--color-primary)] text-[var(--color-text-inverted)]'
                        : 'hover:bg-[var(--color-primary)] hover:text-[var(--color-text-inverted)]'
                    )}
                  >
                    <div className="">{subItem.label}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Theme Toggle */}
        {showThemeToggle && (
          <div
            onMouseEnter={isHoverDevice ? handleThemeToggleEnter : undefined}
            onMouseLeave={isHoverDevice ? handleMouseLeave : undefined}
            className="group relative cursor-pointer"
          >
            {themeComponent === 'toggle' ? (
              <ThemeToggle ref={themeToggleRef} />
            ) : (
              <ThemeToggle ref={themeToggleRef} className="hidden" />
            )}
            {themeComponent === 'switcher' && <ThemeSwitcher />}
          </div>
        )}

        {/* Theme Color Button */}
        {showThemeColorButton && (
          <div
            onMouseEnter={
              isHoverDevice ? handleThemeColorButtonEnter : undefined
            }
            onMouseLeave={isHoverDevice ? handleMouseLeave : undefined}
            className="group relative cursor-pointer"
          >
            <ThemeColorButton ref={themeColorButtonRef} />
          </div>
        )}
      </div>
    </>
  );
}
