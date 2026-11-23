# Gaps

What levain DS was missing when it was used to build something real, kept as a running list. Each entry says what was missing, what the consumer did instead, and where it stands. New gaps are added as they're found; closed ones stay, marked with the release that closed them.

The first consumer outside the portfolio was a web board for running a team of coding agents (columns of task cards, dialogs, drag and drop, a phone layout); most entries come from building it.

## Open

### Components and patterns
- **Copyable command block.** A block of one or more shell commands, each with a copy button and a "copy all". Built by hand from the `type-code` class plus an icon-only Button. Wanted anywhere developer-facing.
- **Side-by-side image compare.** Two images labelled (for example "This build" and "Target"), side by side on wide screens and stacked on narrow ones, each opening full size. Built by hand.
- **Relative time.** "35m ago", "2h 40m", with a warning colour past a threshold and a live update. Built by hand in several places.
- **Count badge.** The small number beside a column heading or on a tab. Built by hand.
- **Board column and layout primitives.** A column with a header, count and scrolling body; stack and cluster layouts. Composed from Card and Tailwind each time.
- **Timeline is career-specific.** Its props are `company` and `roles`, and it hard-codes a "History" heading, so a release history couldn't reuse it. Wants a general timeline (date, title, body) with the career version built on top.

- **Card stack.** Loose notes shown as a horizontal row whose trailing cards pile into a stack, peeled off right to left as you scroll (desktop), and as a pile that fans open into the full list or steps one card at a time (phone). Prototyped in the consumer.
- **StatusCard's kind label is forced to capitals.** The face sets `uppercase tracking-wide` on the kind ("QUEUED", "ALARM"), on the card and in `StatusCardDialog`, with no way to turn it off; the Ringmaster board's type rules say no all caps. Wants the casing left to the label (or a prop). The board lives with it for now.
- **Actions slot on StatusCard.** A decision card with its answer buttons on the face (the recommended one filled); today the buttons are passed as children.

### Phone patterns
- **Bottom sheet.** A panel that rises from the bottom with a drag handle and snap heights.
- **Swipeable column strip.** One column a screen wide, swiped with snap, with pills to jump; while a card is held, resting at either edge slides the strip one column on a spring. Built in the consumer on top of `SortableGroup`'s `onDragMove`.
- **Safe-area padding** for the notch and home indicator, as a token or utility.

### Foundations
- **Dark mode needs a set-up order.** Dark mode is a class on `<html>`; a non-Next app must call `initTheme()` before `themeManager.applyTheme()`, or cards keep their light styling. Documented in the README; levain could do it for the app.
- **Node types in a browser package.** ui-react uses the `NodeJS` namespace (DateInput, NavigationLinks), so browser-only consumers need `@types/node`.

## Closed
- **Text on accent per mode.** A theme chose its text-on-accent colour once for both modes, so a lighter dark-mode accent got unreadable white text. Closed in v0.3.0 by the theme field `textOn` (text on primary and accent fills, per mode), with contrast tests for both modes.
- **Next.js lock-in.** Components imported `next/link`, `next/image`, `next/navigation` and `next-auth`. Closed in v0.1.0 by `LevainProvider` (link, image, path and theme supplied by the app).
- **No motion system.** No duration, easing or spring tokens; components set their own timings. Closed in v0.2.0: motion tokens taken from the portfolio's OS shell, ten motion rules in `assembly.json` led by "shapes morph into each other rather than swap", and reduced motion everywhere.
- **No density mode.** Closed in v0.2.0 by `data-density="condensed"`.
- **No drag and drop.** Closed in v0.2.0 by `SortableList` / `SortableGroup`, and made to work on a real iPhone in v0.2.3–v0.2.6 (a grip that claims the gesture, a hold on the card, a group-long touch listener, moves heard on the touched element, `onDragChange`, `onDragMove`).
- **No compact status card.** Closed in v0.2.0 by `StatusCard` / `StatusCardDialog`.
- **SortableList read a token at import.** Partial token mocks broke consumers' tests. Closed in v0.2.1.
- **TextInput's label couldn't be hidden visually.** Closed in v0.2.1 by `hideLabel` (still read by screen readers).
- **List items vanished when removed.** Closed in v0.2.2: leaving items collapse while their neighbours close the gap.
