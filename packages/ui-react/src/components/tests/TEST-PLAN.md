# Design System Test Plan

## Overview

This document outlines the comprehensive testing strategy for the portfolio design system components. It tracks test coverage progress and establishes guidelines for consistent component testing.

## Testing Strategy

1. **Component Specification Review**

   - Check the design system specifications from `mcp_design_system_mcp_server` before writing tests
   - Review component documentation in `/src/lib/designsystem/docs/components/`
   - Analyze component implementation to understand key behaviors to test

2. **Test Structure Guidelines**

   - Use consistent describe/test blocks
   - Mock external dependencies (portals, animations, etc.)
   - Test both simple and complex interactions
   - Test accessibility aspects where appropriate
   - Verify responsive behavior when relevant

3. **Common Test Cases**
   - Rendering and appearance
   - Prop variations
   - User interactions
   - Callbacks and events
   - Accessibility attributes
   - State management

## Progress Tracker

| Component   | Status      | Date Completed | Notes                                                                                                        |
| ----------- | ----------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| Button      | ✅ Complete | Apr 05, 2024   | All variants and states tested                                                                               |
| Card        | ✅ Complete | Apr 05, 2024   | Includes Card, CardTitle, CardMedia, CardContent                                                             |
| Modal       | ✅ Complete | Apr 05, 2024   | Tests for rendering, keyboard interactions, callbacks                                                        |
| Heading     | ✅ Complete | Apr 05, 2024   | Tested levels, alignment, back link, and accent bar                                                          |
| Tag         | ✅ Complete | Apr 05, 2024   | Tested all variants and styling overrides                                                                    |
| Switch      | ✅ Complete | Apr 05, 2024   | Tested sizes, checked states, accessibility, callbacks                                                       |
| RadioButton | ✅ Complete | Apr 05, 2024   | Tested sizes, checked states, complex labels, callbacks                                                      |
| Toaster     | ✅ Complete | Apr 05, 2024   | Tested props passing to Sonner library, class customization                                                  |
| Slider      | ✅ Complete | Apr 06, 2024   | Tested rendering, props, callbacks, and appearance                                                           |
| DualSlider  | ✅ Complete | Apr 06, 2024   | Tested rendering, props, callbacks, and custom min/max values                                                |
| Icons       | ✅ Complete | Apr 06, 2024   | Tested LinkedinIcon rendering, sizing, and class customization                                               |
| Loader      | ✅ Complete | Apr 06, 2024   | Tested sizing, colors, and animation setups                                                                  |
| TextInput   | ✅ Complete | Apr 06, 2024   | Tested rendering, validation, accessibility, and error states                                                |
| TextArea    | ✅ Complete | Apr 06, 2024   | Tested rows property, validation, a11y attributes, and error states                                          |
| Select      | ✅ Complete | Apr 06, 2024   | Tested options rendering, placeholder, disabled options, and dropdown arrow                                  |
| TagInput    | ✅ Complete | Apr 06, 2024   | Tested tag selection, suggestions, creation, and removal                                                     |
| ColorInput  | ✅ Complete | Apr 06, 2024   | Tested color picker, validation, and color chip display                                                      |
| DateInput   | ✅ Complete | Apr 07, 2024   | Basic rendering, validation, calendar popup and date selection tested including format and custom validation |
| Calendar    | ✅ Complete | Apr 07, 2024   | Tested basic rendering, date selection, month/year navigation, and selector popups                           |
| Section     | ✅ Complete | Apr 07, 2024   | Tested layout modes, padding options, and conditional styling                                                |
| SectionTabs | ✅ Complete | Apr 07, 2024   | Tested controlled/uncontrolled modes, tab selection, and styling options                                     |
| DataTable   | ✅ Complete | Apr 07, 2024   | Tested data rendering, pagination, status messages, and row selection                                        |

## Mocking Strategy

For consistent testing across components, we employ these mocking approaches:

1. **Animation Libraries**

   ```js
   // Mock framer-motion to avoid animation issues
   jest.mock('framer-motion', () => {
     const mockDiv = ({ children, className, ...props }) => (
       <div
         data-testid={`motion-div-${className?.substring(0, 10) || 'default'}`}
         className={className}
         {...props}
       >
         {children}
       </div>
     );
     return {
       motion: { div: mockDiv },
       AnimatePresence: ({ children }) => children,
     };
   });
   ```

2. **Portal Rendering**

   ```js
   // Mock createPortal
   jest.mock('react-dom', () => ({
     ...jest.requireActual('react-dom'),
     createPortal: (node) => node,
   }));
   ```

3. **Icon Libraries**

   ```js
   // Mock lucide-react icons
   jest.mock('lucide-react', () => ({
     IconName: () => <div data-testid="icon-name">Icon</div>,
   }));
   ```

4. **Third-party Libraries**
   ```js
   // Example for Sonner toast library
   jest.mock('sonner', () => ({
     Toaster: jest.fn(({ position, toastOptions }) => (
       <div data-testid="mock-toaster" data-position={position}>
         Mock Toaster
       </div>
     )),
   }));
   ```

## Priority Order

Testing priority is based on component complexity and usage frequency:

**High Priority:**

- Modal, Button, Card, TextInput, Select

**Medium Priority:**

- Tag, Switch, RadioButton, Toaster, Calendar, DateInput

**Lower Priority:**

- Icons, Loader, ColorInput, DualSlider

## Test Coverage Summary

As of April 7, 2024:

- Total components tested: 22 / 22 (100%)
- Total test cases: 287
- All design system components have been fully tested with no skipped tests

## Updating This Document

After completing tests for each component:

1. Update the status in the Progress Tracker table
2. Add the completion date
3. Include any notable insights or challenges in the Notes column

## Running Tests

```bash
# Run all design system tests
pnpm jest --selectProjects 'Design System Tests'

# Run tests for a specific component
pnpm jest --selectProjects 'Design System Tests' src/lib/designsystem/components/tests/ComponentName.test.tsx
```
