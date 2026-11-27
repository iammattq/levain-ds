# Changelog

Every release is a git tag; install one as the README shows. Both packages, `@levain/tokens` and `@levain/ui-react`,
carry the same version. Newest first.

## Unreleased

Added
- Cobalt Warm, the ninth built-in theme: Cobalt Mono's warm sibling. White with a touch of warmth and a slightly warm
  black in light; a warm near-black with cream text in dark; links and focus a warmer blue.

Changed
- `SimpleAnimatedName`'s `name` is required. It had a default name; an app now passes its own.
- `AsciiHeader`'s `text`, and `asciiTitle` on `PageTemplate` and `AdminPageTemplate`, take any text (letters, digits
  and spaces are drawn). They used to accept only a fixed list of titles, which all still draw as before.
- The theme toggles, ImageUploader and the theme manager no longer print to the console in normal use. Warnings and
  errors stay.
- The docs' code examples import from `@levain/ui-react`, so they work when copied.

## v0.12.0 (2026-11-25)

Added
- `Notice`: a quiet, persistent one-line message in a container, under a header ("Offline, reconnecting…"). Not a
  toast and not a page banner: no timer, an optional action and Dismiss.

Fixed
- The image viewer sits on a fully opaque backdrop (Modal's new `scrim="solid"`), so nothing of the page shows behind
  the image.
- GAPS.md brought up to date.

## v0.11.0 (2026-11-25)

Added
- `ImageViewer`: one image, or a before/after pair, full screen. Pinch, wheel, double tap and keys zoom the image
  while the page stays put.

## v0.10.1 (2026-11-24)

Fixed
- The phone column strip snaps to a whole column on the iPhone.

## v0.10.0 (2026-11-24)

Changed
- The sixteen form inputs follow one convention for labels, sizes, errors, refs and class names, in four parts, with
  three rules the inputs had missed added to `assembly.json`.
- A migration guide for apps moving to the new inputs (`packages/ui-react/docs/migrations/forms.md`).

Fixed
- The column strip grows to fill a taller page, so a swipe below a short column still moves it.
- A failing CI test.

## v0.9.0 (2026-11-24)

Added
- `EmptyState`: what isn't here yet, with an optional action.
- `Skeleton` and `SkeletonGroup`: placeholders that pulse while a list loads.

Changed
- `Drawer`: a darker panel option, and the right height on the iPhone.

## v0.8.0 (2026-11-24)

Added
- `Popover`: a small panel anchored to a trigger, growing out of it.
- `Menu`: a list of choices that opens from a button, with arrow keys, Home and End.
- `Tooltip`: a short hint for one control, on hover after a delay and at once on keyboard focus.
- A before/after slider for `ImageCompare`.

Changed
- A darker backdrop behind dialogs in dark mode.

## v0.7.0 (2026-11-24)

Added
- `Drawer`: a side panel from the left edge for phone menus, with swipe to close.
- A test that every exported piece has a doc.

Changed
- Theme colours are plain CSS (`generated/themes.css`), so a page can have its colours before JavaScript runs.
- Dialogs are ready for the keyboard: focus moves in, stays in, and returns on close.
- One version everywhere: the root and both packages, checked in CI.

Fixed
- Colour names that no theme defined.
- Seven small bugs found in a review.

## v0.6.0 (2026-11-23)

Added
- `Column` (a titled column of cards), and the layout primitives `Stack` and `Cluster`.

## v0.5.0 (2026-11-23)

Added
- `ColumnStrip`: on a phone, columns a screen wide in a swiped strip, with pills that follow and jump. Holding a card
  at an edge pages to the next column.
- `ImageCompare`: two images side by side, stacked on phones, each opening full size.
- `BottomSheet` for any app, and dialogs that open as bottom sheets on phones (a handle, swipe down to close).
- `CommandBlock`: shell commands with a copy button each, and `CommandBlockCopyAll`.
- `CardStack`: a set of cards as a stack, a scrolling row on desktop and a swiped pile on phones.
- `TimelineList`: a general dated timeline (date, title, an optional body); `Timeline` is built on it.
- Safe-area padding: `--safe-*` variables and `pb-safe`, `pb-safe-md` and friends clear the notch and home bar.

## v0.4.0 (2026-11-23)

Added
- `CountBadge`: the number beside a column heading or on a tab, plain or a filled pill.
- `RelativeTime`: a live "how long ago" in a short format, turning to the caution colour past a threshold.
- `ProgressRing` and `ProgressBar`, in sizes and status tones, contrast-tested.
- `StatusCardDialogStack`: several card dialogs drawn as a pile.
- Cards can carry answer buttons; pressing one answers without opening or dragging the card.

Changed
- `applyTheme` and `applyUserTheme` set up dark mode on `<html>` themselves, so call order no longer matters.
- ui-react no longer needs `@types/node`.

Fixed
- Cobalt Mono's dark status colours pass contrast on every surface; its caution is a true amber, apart from error.
- The dialog behind in a stack sits 10 px below the front again, and a card grows into its dialog and back.

## v0.3.2 (2026-11-23)

Fixed
- `StatusCardDialog` no longer steals focus when it is given a new `onClose` on each render.

## v0.3.1 (2026-11-22)

Fixed
- A dragged card leans with its speed (6° at 600 px/s); before, it never tilted under framer-motion 12 and React 19.

## v0.3.0 (2026-11-22)

Added
- Cobalt Mono, a black-and-white theme with cobalt only on links and focus.
- `textOn`: a theme can name the text on its own fills per mode.

## v0.2.6 (2026-11-22)

Added
- `SortableGroup`'s `onDragMove`: where the finger is while a card is in the hand.

## v0.2.5 (2026-11-22)

Fixed
- A touch drag keeps hearing its moves after the card lifts out of the page.

## v0.2.4 (2026-11-22)

Added
- A touch hold anywhere on a SortableList item lifts it; `onDragChange`; the page scrolls at the edges while dragging;
  items fly between lists.

Fixed
- No text selection or callout during a touch drag; one touch listener per group, for iOS.

## v0.2.3 (2026-11-22)

Fixed
- On touch screens a SortableList item drags from a grip that claims the gesture.

## v0.2.2 (2026-11-22)

Fixed
- Items that leave a SortableList collapse while their neighbours close the gap.

## v0.2.1 (2026-11-22)

Fixed
- SortableList reads no token at load; StatusCardDialog floats on the elevated surface.

Added
- `TextInput`'s `hideLabel`.

## v0.2.0 (2026-11-22)

Added
- Motion tokens: durations, easings and springs, in CSS and as framer-motion recipes, with reduced motion; the
  checkable motion rules tested over every component.
- Density: `data-density="condensed"` moves the spacing, radius and body type scales one step tighter.
- `SortableList`: drag within and across lists by mouse, touch and keyboard.
- `StatusCard`, which morphs into its own dialog.
- A demo page for motion, density and drag, built in CI with the smoke app.

## v0.1.0 (2026-11-22)

The first release: the tokens and components taken out of mattquinn.ca into their own repository, as
`@levain/tokens` and `@levain/ui-react`. Next.js removed: `LevainProvider` supplies the link, image, current path and
theme state. MIT, with the DotMatrix5x7 glyphs (LGPL-3.0) in their own file and the Pagga letters (WTFPL) credited.
