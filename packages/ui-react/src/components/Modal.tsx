'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, MotionProps, useReducedMotion } from 'framer-motion';
import { motion as motionFor } from '@levain/tokens';
import Heading from './Heading';
import { Button } from './Button';
import { X, MoreVertical } from 'lucide-react';
import { useDialogFocus } from '../utils/useDialogFocus';

export interface ModalMenuOption {
  label: string;
  onClick: () => void;
  className?: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** The dialog's accessible name when it has no `title` (with one, the title names it). */
  label?: string;
  menuOptions?: ModalMenuOption[];
  children: (handleClose: () => void) => React.ReactNode;
  motionProps?: MotionProps;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
}

export function Modal({
  isOpen,
  onClose,
  title,
  label,
  menuOptions,
  children,
  motionProps,
  size = 'md',
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Default motion props for fade and slide, timed by the motion tokens (instant under reduced motion)
  const reduce = useReducedMotion();
  const defaultMotionProps: MotionProps = {
    initial: { opacity: 0, y: reduce ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduce ? 0 : 20 },
    transition: motionFor('fadeIn', reduce),
  };

  // Use provided motion props or defaults
  const finalMotionProps = motionProps || defaultMotionProps;

  // Size classes for the modal
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-full',
  };

  // Focus held inside while open and given back on close; Escape closes the menu if it's open, else the modal, and
  // only when this modal is the top dialog (one over another closes alone)
  useDialogFocus(isOpen, panelRef, () => {
    if (showMenu) setShowMenu(false);
    else onClose();
  });

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Toggle menu
  const toggleMenu = () => {
    setShowMenu((prev) => !prev);
  };

  // Handle menu option click
  const handleMenuOptionClick = (option: ModalMenuOption) => {
    option.onClick();
    setShowMenu(false);
  };

  // Only render in browser environment
  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop with blur effect */}
          <motion.div
            className="fixed inset-0 bg-linear-to-b from-[var(--color-surface-inverted)]/10 to-[var(--color-accent)]/10 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionFor('contentIn', reduce)}
          />

          <div
            className="fixed inset-0 flex items-center justify-center p-4 md:p-6"
            ref={overlayRef}
            onClick={handleOverlayClick}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-label={title ? undefined : label}
              tabIndex={-1}
              className={`w-full outline-none rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] shadow-xl ${sizeClasses[size]} overflow-hidden`}
              {...finalMotionProps}
            >
              {(title || (menuOptions && menuOptions.length > 0)) && (
                <div className="flex items-center justify-between p-4 md:p-6 md:pt-4 md:pb-2">
                  <div className="flex-1" id={titleId}>
                    {typeof title === 'string'
                      ? title && (
                          <Heading
                            level="h4"
                            align="left"
                            showBar={false}
                            className="px-0 py-2 md:py-0 md:pt-2"
                          >
                            {title}
                          </Heading>
                        )
                      : title}
                  </div>

                  <div className="flex items-center">
                    {menuOptions && menuOptions.length > 0 && (
                      <div className="relative" ref={menuRef}>
                        <Button
                          onClick={toggleMenu}
                          variant="ghost"
                          size="icon"
                          className="mr-2 h-8 w-8"
                          aria-label="Menu options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>

                        {showMenu && (
                          <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-section)] shadow-lg">
                            <div
                              className="py-1"
                              role="menu"
                              aria-orientation="vertical"
                            >
                              {menuOptions.map((option, index) => (
                                <button
                                  key={index}
                                  className={`type-body-sm block w-full px-4 py-2 text-left transition-colors hover:bg-[var(--color-surface-inverted)] ${option.className || ''}`}
                                  onClick={() => handleMenuOptionClick(option)}
                                  role="menuitem"
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={onClose}
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Close modal"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-4 pt-0 pb-4 md:p-6 md:pt-0 md:pb-6">
                {children(onClose)}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
