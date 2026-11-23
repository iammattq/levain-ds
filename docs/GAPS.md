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
- **Popover / Menu.** A small anchored panel that opens from a button (the board's project switcher, and again for another panel). Built by hand in the consumer, twice.
- **StatusCardDialog cuts off tall dialogs.** No max-height or scrolling, so a long dialog runs off the screen.
- **Drag overlay width misses the grip.** The overlay is sized without the grip, so the card jumps in width when picked up.
- **Image attachment by paste or pick, with thumbnails.** ImageUploader is drag-and-drop only (react-dropzone, multipart uploads, no paste). The consumer built its own from Button, TextArea and tokens.
- **Plain Dialog without a card face.** The only dialog is StatusCardDialog, which needs a kind and title; a simple form dialog (Add to-do) had to borrow it.
- **StatusCardDialog can't stack.** Two open dialogs render as two identical overlays, one over the other. Missing: placement for a dialog behind (offset up and scaled like a pile), a behind state (inert, aria-hidden, no focus, no Escape, no overlay of its own), and an "away" exit for the front one while the one behind animates forward on the morph recipe (cross-fade under Reduce Motion). Wanted for a look and its decision opened as a pile. The consumer is building the non-visual parts and waiting on levain.
- **Tooltip / Toggletip.** Hover delay, focus, tap, Escape, collision placement, portal. The consumer built one by hand on its switcher's surface recipe, on `--color-surface-component`, because dark info and success miss 4.5:1 on the elevated surface.

### Phone patterns
- **Bottom sheet.** A panel that rises from the bottom with a drag handle and snap heights.
- **Swipeable column strip.** One column a screen wide, swiped with snap, with pills to jump; while a card is held, resting at either edge slides the strip one column on a spring. Built in the consumer on top of `SortableGroup`'s `onDragMove`.
- **Safe-area padding** for the notch and home indicator, as a token or utility.

### Foundations
- **Node types in a browser package.** ui-react uses the `NodeJS` namespace (DateInput, NavigationLinks), so browser-only consumers need `@types/node`.
- **Portals render unstyled without the theme on `<body>`.** Dialogs portal to `<body>`, so the theme's look classes have to be on `<body>` too, or they render unstyled. The consumer adds them by hand.
- **No dashed-border token.** An empty state needed a dashed border; the consumer used a raw Tailwind dashed border.
- **Status colours fail contrast on the dark dialog surface.** In dark mode on StatusCardDialog's surface (about #323232), `--color-info-fg` measures 4.40:1 and `--color-error-fg` about 4.0:1, under 4.5:1; on the card surface they pass (info-fg 6.18:1). The consumer held the dialog to red's level instead.
- **No sunken surface token.** Nothing is darker than the page: in Cobalt Mono light every surface token is lighter than the canvas (#f2f2f2; section #f6f6f6, card #f9f9f9, component #fcfcfc). The consumer's light-mode columns use `--color-border-subtle` (#e4e4e4) as a background instead.
- **No caution (amber) status hue.** The consumer hand-picks its own amber (light #975d04), which misses 4.5:1 on darker light surfaces (4.25:1 on #e4e4e4); it falls back to the text colour for words there and keeps amber only for small pips.

## Closed
- **Actions slot on StatusCard.** A decision card with its answer buttons on the face (the recommended one filled); the buttons went in as children, inside the card's open target, so each needed a hand-wired stopPropagation on click and pointerdown. Closed by StatusCard's `actions` (T17): a row under the markers and children, outside the open target, where a click, a key or a pointerdown never opens the card nor starts a SortableGroup drag; the buttons stay in the Tab order.
- **Dark mode needs a set-up order.** Dark mode is a class on `<html>`, and a non-Next app had to call `initTheme()` before `themeManager.applyTheme()`, or cards kept their light styling. Closed in v0.3.3: `applyTheme` puts `<html>` in the mode it writes (one helper shared with `setTheme`), so one call is enough and the order doesn't matter.
- **Progress ring and progress bar / meter.** Closed by `ProgressRing` and `ProgressBar` (T18): xs to lg, default/caution/danger on the existing action tokens, `role="meter"`. xs matches the board's hand-drawn ring and bar.
- **Text on accent per mode.** A theme chose its text-on-accent colour once for both modes, so a lighter dark-mode accent got unreadable white text. Closed in v0.3.0 by the theme field `textOn` (text on primary and accent fills, per mode), with contrast tests for both modes.
- **Next.js lock-in.** Components imported `next/link`, `next/image`, `next/navigation` and `next-auth`. Closed in v0.1.0 by `LevainProvider` (link, image, path and theme supplied by the app).
- **No motion system.** No duration, easing or spring tokens; components set their own timings. Closed in v0.2.0: motion tokens taken from the portfolio's OS shell, ten motion rules in `assembly.json` led by "shapes morph into each other rather than swap", and reduced motion everywhere.
- **No density mode.** Closed in v0.2.0 by `data-density="condensed"`.
- **No drag and drop.** Closed in v0.2.0 by `SortableList` / `SortableGroup`, and made to work on a real iPhone in v0.2.3–v0.2.6 (a grip that claims the gesture, a hold on the card, a group-long touch listener, moves heard on the touched element, `onDragChange`, `onDragMove`).
- **No compact status card.** Closed in v0.2.0 by `StatusCard` / `StatusCardDialog`.
- **SortableList read a token at import.** Partial token mocks broke consumers' tests. Closed in v0.2.1.
- **TextInput's label couldn't be hidden visually.** Closed in v0.2.1 by `hideLabel` (still read by screen readers).
- **List items vanished when removed.** Closed in v0.2.2: leaving items collapse while their neighbours close the gap.
