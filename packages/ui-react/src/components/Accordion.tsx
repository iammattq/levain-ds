'use client';

import React, {
  createContext,
  useState,
  useContext,
  forwardRef,
  useCallback,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

// --- Types ---

type AccordionType = 'single' | 'multiple';
type TextSize = 'xs' | 'sm' | 'md' | 'lg';

interface AccordionContextProps {
  type: AccordionType;
  value: string | string[] | undefined;
  onValueChange: (value: string) => void;
  flushDividers?: boolean;
}

interface AccordionItemContextProps {
  value: string;
  isOpen: boolean;
  triggerId: string;
  contentId: string;
  disabled?: boolean;
}

// --- Contexts ---

const AccordionContext = createContext<AccordionContextProps | undefined>(
  undefined
);
const AccordionItemContext = createContext<
  AccordionItemContextProps | undefined
>(undefined);

const useAccordionContext = () => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error(
      'Accordion compound components must be used within an Accordion'
    );
  }
  return context;
};

const useAccordionItemContext = () => {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error(
      'AccordionItem compound components must be used within an AccordionItem'
    );
  }
  return context;
};

// --- Root Component ---

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Determines whether one or multiple items can be opened simultaneously. */
  type?: AccordionType;
  /** The controlled value of the accordion item(s) to be opened. */
  value?: string | string[];
  /** The value of the item(s) to be opened when initially rendered. Use this for uncontrolled state. */
  defaultValue?: string | string[] | undefined;
  /** Event handler called when the expanded state of an item changes.
   * For `type='single'`, receives `string | undefined`.
   * For `type='multiple'`, receives `string[]`. */
  onValueChange?: (value: string | string[] | undefined) => void;
  /** The content of the accordion, typically AccordionItem components. */
  children: React.ReactNode;
  /** When true, hides the bottom border on the last accordion item. */
  hideLastBorder?: boolean;
  /** When true, dividers extend to flush with container edges using pseudo-elements.
   * Parent should have horizontal padding (e.g., px-4) for this to work properly. */
  flushDividers?: boolean;
}

const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      type = 'single',
      value: controlledValue,
      defaultValue,
      onValueChange,
      children,
      className,
      hideLastBorder = false,
      flushDividers = false,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = useState<
      string | string[] | undefined
    >(defaultValue);
    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : uncontrolledValue;

    const handleValueChange = useCallback(
      (itemValue: string) => {
        let newValue: string | string[] | undefined;

        if (type === 'single') {
          newValue = currentValue === itemValue ? undefined : itemValue;
        } else {
          // type === 'multiple'
          const currentArray = Array.isArray(currentValue)
            ? currentValue
            : currentValue
              ? [currentValue]
              : [];
          if (currentArray.includes(itemValue)) {
            newValue = currentArray.filter((v) => v !== itemValue);
          } else {
            newValue = [...currentArray, itemValue];
          }
          if (newValue.length === 0) {
            newValue = undefined; // Match 'single' behavior when empty
          }
        }

        if (!isControlled) {
          setUncontrolledValue(newValue);
        }
        // Prepare the value for the callback based on the type
        const callbackValue =
          type === 'multiple'
            ? ((newValue as string[] | undefined) ?? []) // Ensure it's always string[] for multiple
            : (newValue as string | undefined); // Allow string | undefined for single

        onValueChange?.(callbackValue); // Call with the correctly typed value
      },
      [type, currentValue, isControlled, onValueChange]
    );

    const contextValue = {
      type,
      value: currentValue,
      onValueChange: handleValueChange,
      flushDividers,
    };

    // Clone children and mark the last one
    const childArray = React.Children.toArray(children);
    const enhancedChildren = hideLastBorder
      ? childArray.map((child, index) =>
          React.isValidElement(child) && index === childArray.length - 1
            ? React.cloneElement(
                child as React.ReactElement<{ className?: string }>,
                {
                  className: cn(
                    (child.props as { className?: string }).className,
                    'border-b-0 after:hidden'
                  ),
                }
              )
            : child
        )
      : children;

    return (
      <AccordionContext.Provider value={contextValue}>
        <div ref={ref} className={cn('w-full', className)} {...props}>
          {enhancedChildren}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = 'Accordion';

// --- Item Component ---

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A unique value for the accordion item. */
  value: string;
  /** When true, prevents the user from interacting with the item. */
  disabled?: boolean;
  /** The content of the accordion item, typically AccordionTrigger and AccordionContent. */
  children: React.ReactNode;
}

const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, disabled, children, className, ...props }, ref) => {
    // Remove unused onValueChange from destructuring
    const { type, value: contextValue, flushDividers } = useAccordionContext();
    const isOpen =
      type === 'single'
        ? contextValue === value
        : Array.isArray(contextValue) && contextValue.includes(value);

    const triggerId = React.useId();
    const contentId = React.useId();

    const itemContextValue = {
      value,
      isOpen,
      triggerId,
      contentId,
      disabled,
    };

    return (
      <AccordionItemContext.Provider value={itemContextValue}>
        <div
          ref={ref}
          className={cn(
            'relative',
            // Default border style (inline)
            !flushDividers && 'border-b border-[var(--color-border-subtle)]',
            // Flush dividers: use pseudo-element that extends beyond parent padding
            flushDividers &&
              'after:absolute after:right-[-1rem] after:bottom-0 after:left-[-1rem] after:h-px after:bg-[var(--color-border-subtle)]',
            className
          )}
          data-state={isOpen ? 'open' : 'closed'}
          data-disabled={disabled ? '' : undefined}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  }
);
AccordionItem.displayName = 'AccordionItem';

// --- Trigger Component ---

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The content of the trigger button. */
  children: React.ReactNode;
  /** Size of the text within the trigger. */
  textSize?: TextSize;
}

const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ children, className, textSize = 'sm', ...props }, ref) => {
    const { onValueChange } = useAccordionContext();
    const { value, isOpen, triggerId, contentId, disabled } =
      useAccordionItemContext();

    return (
      <h3>
        {' '}
        {/* Use h3 for semantics, can be overridden by user if needed */}
        <button
          ref={ref}
          id={triggerId}
          aria-controls={contentId}
          aria-expanded={isOpen}
          disabled={disabled}
          data-state={isOpen ? 'open' : 'closed'}
          data-disabled={disabled ? '' : undefined}
          onClick={() => onValueChange(value)}
          className={cn(
            'flex w-full flex-1 items-center justify-between py-4 transition-all',
            'hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-canvas)]',
            'text-[var(--color-text-default)]',
            {
              'type-label-sm': textSize === 'xs',
              'type-label': textSize === 'sm',
              'type-body': textSize === 'md' || textSize === 'lg',
              'cursor-not-allowed opacity-50': disabled,
            },
            className
          )}
          {...props}
        >
          {children}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
      </h3>
    );
  }
);
AccordionTrigger.displayName = 'AccordionTrigger';

// --- Content Component ---

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The content to display when the accordion item is open. */
  children: React.ReactNode;
}

// Open/close height animation uses the grid-rows 0fr→1fr technique: the outer
// grid transitions `grid-template-rows` and the inner item has `min-h-0`, so
// the content collapses/expands smoothly without measuring its height in JS.
// This is intentionally pure CSS — no animation state in React — so there is
// no re-render mid-transition to cause flicker or layout shift. The clipper is
// permanently `overflow-hidden` (toggling overflow would flip the block
// formatting context and visibly nudge the content). Closed content is taken
// out of the tab order and a11y tree with `inert`, which — unlike `display:
// none` — has no layout/paint effect and so never reflows when toggled, and
// (also unlike `display:none`) keeps the element laid out so the open
// transition can animate from a real 0fr starting frame.
const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ children, className, ...props }, ref) => {
    const { isOpen, contentId, triggerId } = useAccordionItemContext();

    return (
      <div
        ref={ref}
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        data-state={isOpen ? 'open' : 'closed'}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div
          inert={!isOpen}
          className={cn('min-h-0', className, 'overflow-hidden')}
          {...props}
        >
          <div className="type-body-sm pt-0 pb-4 text-[var(--color-text-muted)]">
            {children}
          </div>
        </div>
      </div>
    );
  }
);
AccordionContent.displayName = 'AccordionContent';

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  // Types can be exported if needed for external use
  // type AccordionProps,
  // type AccordionItemProps,
  // type AccordionTriggerProps,
  // type AccordionContentProps
};
