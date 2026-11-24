# Forms migration guide (for agents)

levain's 16 form inputs now follow one convention (T35, T53, T54, T55: the first release after v0.9.0). This guide is what an app must or
may change to move to them: an app already on an older levain, or one with its own copy of these components (the
portfolio's `@portfolio/ui-react`) moving to `@levain/ui-react`. It lists only what an app can see, not the
internals.

## How to use this

1. **Find the import.** `rg -n "from '@levain/ui-react|from '@portfolio/ui-react" src | rg -o '\b[A-Z][A-Za-z]+\b' | sort | uniq -c`
   lists the components the app imports. Keep the 16 below; skip the rest. A file can import under another name
   (`import { Switch as Toggle }`); `rg -n " as [A-Z]" src | rg ui-react` finds those.
2. **Go input by input, in the order below** (alphabetical; no input's change depends on another's). For each one the
   app uses, run its grep, read every hit, and sort what you find into the three kinds:
   - **Change now**: without an edit, something the app relies on breaks (a behaviour, a test query, a type).
   - **Deprecated**: the old name still works and only marks itself `@deprecated` in the editor. It is kept for one
     release (prop-conventions `deprecation`), so move it now.
   - **Notice**: no edit needed, but the app or its tests may see a difference. Read each against the app; if one
     matters there, it becomes a change.
3. **Edit the Change now and Deprecated hits.** Change nothing else: no "while I'm here" moves to new props.
4. **Check after each input** with its Check line, then once at the end with the checklist at the bottom: typecheck,
   the test files you touched (`jest --maxWorkers=2 <files>` or the app's equivalent), and the screens named.
5. **Write down what you changed and what you left**, per input, in the same three kinds. A Notice you judged harmless
   goes in the list too, with why.

Grep patterns use `rg` (ripgrep) from the app's `src`. JSX props often sit on the lines after the tag, so most
patterns list the files first and then search inside them, or use `-A` to read the props below each tag. A hit in a
file that has the prop on another component is a false positive: read it.

## The convention in ten lines

The full rules, with the reason for each, are `rules.formInputs` in
[`../prop-conventions.json`](../prop-conventions.json). Each component's doc JSON (`../components/<Name>.json`) lists
its sizes, keys and deprecated names.

1. Value is `value` (`checked` for Switch, Checkbox, RadioButton); the callback is `onChange`.
2. The five native text fields (TextInput, TextArea, Select, ChatInput, DateInput) call `onChange(event)`; the other
   eleven call `onChange(value)` with the whole new value.
3. Leave `value` out for uncontrolled use from `defaultValue` (`defaultChecked`). `value={undefined}` means uncontrolled.
4. `error` shows at once, unless `touched === false` or the input is disabled. Pass `touched` to wait until blur.
5. An input's own check (`validate`, a date or hex check) shows after its first blur, or at once with `touched`.
6. `size` is from `'2xs' | 'xs' | 'sm' | 'md' | 'lg'`, default `md`; `compact` is a deprecated alias of `size="xs"`.
7. The ref goes to the native element (`<input>`, `<textarea>`, `<select>`), a group's to its radiogroup, and an input
   with no native field's to its focusable root.
8. `id` and `label` are optional. Unnamed props (`name`, `aria-*`, `data-*`, handlers) reach the native element; an
   app's `aria-describedby` and handlers are merged with the input's, not replaced.
9. `className` is on the root, merged with `cn` (the app's class wins).
10. Non-text controls show a keyboard-only focus ring in `--color-border-focus`; groups and grids have WAI-ARIA keys.

Nothing below stops compiling except one type (ColorInput's ref, which no known app passes). Every renamed prop has an
alias, and every new prop is optional.

---

## Calendar

**Find:** `rg -n '<Calendar\b' -A8 src | rg 'selectedDate|onDateSelect'`, and in tests
`rg -n "getAllByRole\('button'|getByRole\('button'" $(rg -l '<Calendar\b|Calendar' -g '*test*' src)`.

**Deprecated: `selectedDate` / `onDateSelect` → `value` / `onChange`.**

```tsx
// before
<Calendar selectedDate={date} onDateSelect={setDate} />
// after
<Calendar value={date} onChange={setDate} />
```

`value` is `Date | null` (`null` is "none chosen" and stays controlled); leave it out for uncontrolled
(`defaultValue`). `onChange` gets the picked day at local midnight.

**Notice:**
- The days are a WAI-ARIA date grid: one Tab stop (the chosen day, else today, else the 1st), arrows by day and week,
  Home/End to the week's ends, PageUp/PageDown by month (Shift: by year). Before, each of the 42 days was a Tab stop. A
  test or script that tabs through days, or counts `button`s, needs the new shape: `getByRole('grid')`, rows, and
  `gridcell`s with `aria-selected`.
- The root is a `role="group"` named "Calendar" (or the app's `aria-label`); it takes the ref, `id` and other props.
- A parent that passes a new `Date` for the same day on each render no longer pulls the shown month back.
- New: `disabled`.

**Check:** the calendar renders on the chosen month; a click on a day calls the handler; Tab lands once in the grid
and the arrows move.

## ChatInput

**Find:** `rg -l '<ChatInput\b' src`, then in those files `rg -n -A12 '<ChatInput' <file>` and read `className`,
`onChange`, `onSubmit`, `onKeyDown`, `maxLength`.

**Change now (only if it applies):**
- **`className` lands on a wrapper.** The root is now a plain wrapper; the bordered box is its first child. Layout
  classes (`flex-1`, `w-full`, margins) still work. A class meant for the box itself (its border, padding, background)
  now styles the wrapper: move it, or drop it.
- **`onChange` is the native event**, as before. An app that passes a setter straight in
  (`onChange={setText}`) stores the event, not the text. This was already a bug; fix it while here:

  ```tsx
  // before
  <ChatInput value={text} onChange={setText} />
  // after
  <ChatInput value={text} onChange={e => setText(e.target.value)} />
  ```

**Notice:**
- `onSubmit` is called with the text: `(value: string) => void`. A handler that ignores the argument is unaffected.
- The app's `onKeyDown`, `onFocus` and `onBlur` now run, then ChatInput's own. Before, passing one replaced
  ChatInput's (an app `onKeyDown` silently turned off Enter-to-submit). `e.preventDefault()` in the app's `onKeyDown`
  now skips Enter-to-submit. If the app passed `onKeyDown` to work around the old replacement, remove the workaround.
- Enter while an IME is composing doesn't submit. Enter with the text over `maxLength` doesn't submit.
- A callback ref now reaches the textarea and auto-resize keeps working.
- The accessible name is the placeholder only when there is no `label` (and no `aria-label`). A test that finds it by
  placeholder still matches.
- `value` is optional (`defaultValue` for uncontrolled; it clears after a submit). New optional `label`,
  `helperText`, `error`, `touched`, with the convention's error rule.

**Check:** type, Enter submits and the handler gets the text; Shift+Enter adds a line and the field grows; the box
looks as before at its use site (the `className` item).

## Checkbox

**Find:** `rg -l '<Checkbox\b' src`; in tests `rg -n "Checkbox" -g '*test*' src`.

No Change now or Deprecated items. `onChange(checked: boolean)` is unchanged.

**Notice:**
- The ref reaches the `<input>` (it wasn't forwarded). New: `defaultChecked` (boolean or `'indeterminate'`), and `id`,
  `checked`, `onChange` are optional.
- Unnamed props now spread before the component's own, so an app can no longer override `type`, `checked` or
  `onChange` through them. An app that did so on purpose needs another way.
- The keyboard focus ring is `--color-border-focus` (was `--color-primary`).
- `size="lg"` labels in `type-label` (was `type-body`): slightly smaller text.

**Check:** a click toggles and the handler gets the boolean; keyboard focus shows the ring.

## ColorInput

**Find:** `rg -l '<ColorInput\b' src`, then `rg -n -A12 '<ColorInput' <file>` and read `ref`, `error`, `touched`,
`validate`, `compact`.

**Change now (only if the app passes a ref):** the ref moved from the colour chip `<button>` to the text `<input>`.
Its type is `HTMLInputElement` (was `HTMLButtonElement`), so `useRef<HTMLButtonElement>` stops compiling. `focus()`
now focuses the text field.

```tsx
// before
const ref = useRef<HTMLButtonElement>(null);
// after
const ref = useRef<HTMLInputElement>(null);
```

**Deprecated: `compact` → `size="xs"`** (`size` wins when both are given).

**Notice:**
- **Errors.** An `error` the app passes shows at once, unless `touched={false}`. Before, every error waited for
  `touched`. The built-in hex check ("Invalid hex color format.") and `validate` show after the field's first blur, or
  at once with `touched`. Before, without `touched`, they never showed: an app that passes no `touched` now shows an
  invalid hex message once the field is left.
- `id`, `label`, `value`, `onChange` are optional; `defaultValue` added. Unnamed props reach the text field.
- The chip's keyboard ring is `--color-border-focus` with offset 2 (was `--color-primary`, offset 1).
- The picker's saturation area calls `onChange` once per move in StrictMode (was twice).

**Check:** pick and type a colour, both reach the handler; type `#zz` and leave the field: decide if the message is
wanted there (pass `touched={false}` to hide it).

## DateInput

**Find:** `rg -l '<DateInput\b' src`, then `rg -n -A14 '<DateInput' <file>` and read `value`, `onChange`, `onBlur`,
`error`, `touched`. Then read the `onChange` handler's body.

**Change now (only if it applies): controlled means controlled.** With `value` given, the field shows `value`, always.
Before, it kept typed text the parent hadn't accepted. A handler that stores only complete dates (or rejects partial
ones) now makes the field impossible to type into: after "2026-0", `value` is still the old date. Fix by keeping the
typed text in its own state, or go uncontrolled:

```tsx
// before: stores only complete dates; the field can't be typed into now
<DateInput value={publishedAt} onChange={e => {
  const v = e.target.value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) setPublishedAt(v);
}} />

// after, option 1: the field's text is state; convert when complete
const [text, setText] = useState(publishedAt);
<DateInput value={text} onChange={e => {
  const v = e.target.value;
  setText(v);
  if (v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v)) setPublishedAt(v);
}} />

// after, option 2: uncontrolled, remounted when the record changes
<DateInput key={record.id} defaultValue={publishedAt} onChange={...same handler...} />
```

A handler that stores every `e.target.value` as given needs no edit.

**Notice:**
- `onChange(event)` is now the real ChangeEvent. `e.target.value` is the masked date for typing and for a calendar
  pick. Before, a pick sent a `{ target: { id, value } }` object: code that read anything else from the event (or
  checked `e.type`, `e.nativeEvent`) behaves differently now. Code that reads only `e.target.value` is unaffected.
- Blur on an empty field no longer fires an extra `onChange('')`, and the app's `onBlur` now always runs (it was
  skipped there). Clearing the text already fires `onChange` with `''`.
- One invalid-date message, "Please enter a valid date in YYYY-MM-DD format" (the typing-time "Please enter a valid
  date." is gone). A test that matched the old text needs the new one.
- An `error` the app passes shows at once unless `touched={false}`; the built-in checks still wait for the first blur.
- In tests: after a controlled change, React restores the field, so read `event.target.value` inside the handler.
- New: `size` (`md` is the old look), `defaultValue`; `id`, `label`, `value` optional. Escape closes the calendar;
  opening it moves focus into the grid, and a pick or Escape returns it to the calendar button.

**Check:** type a full date in a controlled field and see it reach the parent; type part of one and see it stay
visible; pick from the calendar; clear the field.

## DualSlider

**Find:** `rg -n '<DualSlider\b' -A10 src | rg 'minValue|maxValue|onMinChange|onMaxChange'`.

**Deprecated: the min/max pair → one `value` and `onChange`.**

```tsx
// before
<DualSlider minValue={lo} maxValue={hi} onMinChange={setLo} onMaxChange={setHi} min={0} max={100} />
// after
<DualSlider value={[lo, hi]} onChange={([nextLo, nextHi]) => { setLo(nextLo); setHi(nextHi); }} min={0} max={100} />
```

`onChange` gets the whole range whichever end moved. With one state for the range, it is
`value={range} onChange={setRange}`.

**Notice:**
- The two ranges are named by `minLabel`/`maxLabel` (default "Min"/"Max"), inside a `role="group"` named by `label`.
  Before, they had no names: a test that found them by position can now use `getByRole('slider', { name: 'Min' })`.
- New: `disabled`, `size` (`sm` | `md`), `id`, ref and passthrough (on the group), `defaultValue`, a keyboard ring.

**Check:** drag each end; the handler gets `[min, max]`; the shown values follow.

## EditableText

**Find:** `rg -l '<EditableText\b|<Heading[^>]*editable' src`; in tests
`rg -n "name: 'Edit'|getByRole\('button'|dblClick|doubleClick" -g '*test*' src`.

**Change now (tests only, if they apply):**
- The pencil (`showEditIcon`) is no longer a Tab stop or a named button: it is `tabIndex={-1}` and `aria-hidden`. A
  test that does `getByRole('button', { name: 'Edit' })` fails. Use the root, which is now the button:

  ```ts
  // before
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  // after: the root at rest is a button named "<text>, edit"
  await user.click(screen.getByRole('button', { name: 'Spring journal, edit' }));
  // or the pencil by its label, for a mouse-only test
  await user.click(container.querySelector('[aria-label="Edit"]')!);
  ```

**Notice:**
- `onChange(value)` now fires at save, beside `onSave`, with the saved text. It does not fire per keystroke. An app
  that already passed `onChange` (it was ignored before) now has it called: check it does what a save should.
- At rest the root is one Tab stop, `role="button"`, named "<text>, edit". Enter, F2 or Space start an edit (and a
  double-click, as before). After a save or cancel, focus returns to the root. The app's `aria-label` names the field
  while editing, not the root.
- Blur is unchanged: it neither saves nor cancels.
- `value` and `onSave` are optional; `defaultValue` added. The ref and `id` are on the root; the field's id is
  `${id}-input` (was random per render). Disabled: no Tab stop, `aria-disabled`.
- The pencil shows on keyboard focus as well as hover; a keyboard ring shows on the root.

**Check:** Tab to it, press Enter, type, Enter saves and the handler gets the text; Escape cancels; focus is back on
the text.

## GradientInput

**Find:** `rg -l '<GradientInput\b' src`, then `rg -n -A12 '<GradientInput' <file>` and read `error`, `touched`,
`compact`, `onClick`, `label`.

**Deprecated: `compact` → `size="xs"`.**

**Notice:**
- An `error` the app passes shows at once, unless `touched={false}` (it waited for `touched`).
- The error reaches the chip through `aria-describedby` only (a button takes no `aria-invalid`).
- The app's `onClick` now runs first, then the chip's own (it opens the editor) unless the app calls
  `e.preventDefault()`.
- `id`, `label`, `value`, `onChange` are optional; `defaultValue` (black to white at 90°). The ref, `id` and other
  props stay on the chip. `label=""` still keeps its blank label line; only a missing `label` renders none.
- The chip's keyboard ring is `--color-border-focus` with offset 2.

**Check:** open the editor, change a stop, the handler gets the whole gradient.
