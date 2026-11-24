# Forms migration guide (for agents)

levain's 16 form inputs now follow one convention (T35, T53, T54, T55: the first release after v0.9.0). This guide is what an app must or
may change to move to them: an app already on an older levain, or one with its own copy of these components (the
portfolio's `@portfolio/ui-react`) moving to `@levain/ui-react`. It lists only what an app can see, not the
internals.

## How to use this

1. **Find the import.** This counts the files that import each component, multi-line imports included (put the
   app's own package name in place of `portfolio` if it has a copy):

   ```sh
   rg -U -o --no-filename "import \{[^}]*\} from '@(levain|portfolio)/ui-react'" src | rg -o '\b[A-Z][A-Za-z]+\b' | sort | uniq -c
   ```

   Keep the 16 below; skip the rest. Three ways a use hides from the `<Name` greps below:
   - an import under another name (`import { Switch as Toggle }`): `rg -n ' as [A-Z]' src`, then grep the new name;
   - a registry or preview that renders `<Component {...props} />` from a name (a design-system page):
     `rg -l '<Component\b' src` finds the files; read the props each case passes. The alias greps in the
     checklist (`selectedTags`, `onDateSelect`, `onMinChange`…) find these too;
   - a local component with the same name (`components/.../TagInput.tsx`, or a game's own `Select`): check the
     import of every file you edit.
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
   **Snapshot tests change.** Every input's markup changed (roles, ids, classes, wrappers), so a snapshot of a screen
   that holds a form input (`toMatchSnapshot()` of `container`, of `innerHTML` or a hash of it, or of a field list a
   helper builds) fails. Find them with `rg -l 'toMatchSnapshot|toMatchInlineSnapshot' src` and keep those whose
   screen renders one of the 16. Read the diff before `-u`: it should show only the changes this guide names (for
   example `aria-pressed` options becoming `role="radio"`). A helper that reads `aria-pressed` or `role="checkbox"`
   to describe a control needs the new attribute, not only a new snapshot.
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
  // after: the root at rest is a button named "<text>, edit"; one mouse click on it doesn't start an edit,
  // so double-click the text, or focus the root and press Enter
  await user.dblClick(screen.getByText('Spring journal'));
  // or
  screen.getByRole('button', { name: 'Spring journal, edit' }).focus();
  await user.keyboard('{Enter}');
  // or the pencil by its label, for a mouse-only test
  await user.click(container.querySelector('[aria-label="Edit"]')!);
  ```

**Notice:**
- `onChange(value)` now fires at save, beside `onSave`, with the saved text. It does not fire per keystroke. An app
  that already passed `onChange` (it was ignored before) now has it called: check it does what a save should.
- At rest the root is one Tab stop, `role="button"`, named "<text>, edit". Enter, F2 or Space start an edit, and so does
  a double-click, as before. A single mouse click on the text does not (only a click with no mouse behind it, from a
  screen reader, does). After a save or cancel, focus returns to the root. The app's `aria-label` names the field while
  editing, not the root.
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

## RadioButton

**Find:** `rg -l '<RadioButton\b' src`; in tests `rg -n "RadioButton|radio" -g '*test*' src` and look for queries on
the dot (`span` inside the circle, `querySelector`).

No Change now or Deprecated items in app code. `onChange(value)` (this radio's value) is unchanged.

**Change now (tests only, if they apply):** the dot is drawn from the input's `:checked` and its `span` sits beside the
circle, not inside it (same place on screen). A test that looked for the dot inside the circle needs the new shape; the
reliable check is `expect(radio).toBeChecked()`.

**Notice:**
- A keyboard focus ring (there was none). The ref reaches the `<input>`; `className` is on the root; unnamed props
  (`aria-label`, `required`, `data-*`, handlers) reach the input (before, only eight named props did).
- `id`, `checked`, `onChange` optional; `defaultChecked` added. Uncontrolled radios are native: give the group one
  `name`, and the browser keeps the choice.
- `size="sm"` labels in `type-label-sm` (was `type-label`): slightly smaller text.

**Check:** a click selects; the arrows move within a `name` group; keyboard focus shows the ring.

## SegmentedControl

**Find:** `rg -n '<SegmentedControl\b' src`, then read each tag to its `/>`: one with no `label`, `aria-label` or
`aria-labelledby` needs a name (an `id` alone names nothing). Apps often have many: the portfolio has 14 unnamed. In
tests, search every test file, not only those that import it (a test of a screen renders it indirectly):
`rg -n "aria-pressed" -g '*test*' -g '*spec*' src`, then keep the hits whose button is a SegmentedControl option
(its text is one of an `options` label).

**Change now (if it applies):**
- **Name every SegmentedControl.** It is now a radio group. One with no `label` and no `aria-label` is announced as
  only "radio group". Add a name:

  ```tsx
  // before
  <SegmentedControl options={views} value={view} onChange={setView} />
  // after
  <SegmentedControl aria-label="Releases" options={views} value={view} onChange={setView} />
  ```

- **Tests that query buttons.** Options are `role="radio"` with `aria-checked` (were buttons with `aria-pressed`).

  ```ts
  // before
  expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true');
  // after
  expect(screen.getByRole('radio', { name: 'Grid' })).toHaveAttribute('aria-checked', 'true');
  ```

  Queries by text (`getByText('Grid')`) still match.

**Notice:**
- Choosing the option that is already chosen no longer calls `onChange`. Code that used the repeat call (to toggle or
  refresh) needs another trigger.
- One Tab stop; the arrows move and select (skipping disabled options, wrapping), Home/End go to the ends. The focus
  ring is inset.
- The ref and `id` are on the radiogroup (the ref was on the outer wrapper). The label is a span the group names with
  `aria-labelledby`.
- `value` and `onChange` are optional; `defaultValue` added.

**Check:** every SegmentedControl has a name; a click and the arrows change the value; tests pass.

## Select

**Find:** `rg -n '<Select\b' -A10 src | rg 'compact|touched|disabled|aria-describedby|inline'`.

**Deprecated: `compact` → `size="xs"`.**

```tsx
// before
<Select id="sort" label="Sort" compact value={sort} onChange={e => setSort(e.target.value)} options={options} />
// after
<Select id="sort" label="Sort" size="xs" value={sort} onChange={e => setSort(e.target.value)} options={options} />
```

**Notice:**
- `touched` no longer defaults to `true`; it has no default. What shows is the same: an error shows unless
  `touched={false}`.
- A disabled Select with an error shows its helper instead, and is no longer `aria-invalid`.
- `id` and `label` are optional; `value` optional with `defaultValue`. An app's `aria-describedby` is merged with
  the Select's (it replaced it). In `inline` mode, an app's `aria-label` wins over the label.
- `className` and `selectClassName` are merged with `cn`: on a conflict the app's class wins now.

**Check:** choose an option, the handler gets the event; a Select with an error shows it.

## Slider

**Find:** `rg -l '<Slider\b' src`; `rg -n -A10 '<Slider' <file>` and read `label`, `aria-label`, `showInput`,
`onMouseDown`/`onMouseUp`/`onTouchStart`/`onTouchEnd`, `value`. In tests: `rg -n "getByLabelText|aria-label" ` in
files that render one.

No Change now or Deprecated items. `onChange(value: number)` is unchanged.

**Notice:**
- `label` no longer also sets `aria-label`; the visible label names the range by `<label htmlFor>`. Queries by role
  `slider` and by label text still match.
- The number field (`showInput`) keeps what is typed and clamps on blur or Enter (it clamped per keystroke: typing 15
  with min 20 jumped to 20 after the "1"). It is named "<label> value", or "Value". A value changed from outside
  replaces what is being typed.
- The app's `onMouseDown`, `onMouseUp`, `onTouchStart`, `onTouchEnd` now run (they were dropped).
- The ref and unnamed props reach the range input; new `id`, `defaultValue`; `value` and `onChange` optional.
  **`value={undefined}` now means uncontrolled.** A Slider fed from optional state that starts `undefined` and later
  gets a number switches mode and warns in development: pass a number from the start (`value={opacity ?? 0}`).
- No NaN fill when `min === max`.

**Check:** drag, the arrows and (with `showInput`) typing reach the handler; no "changed from uncontrolled to
controlled" warning in the console.

## Switch

**Find:** `rg -l '<Switch\b' src`; in all tests and e2e `rg -n "role=\"checkbox\"|'checkbox'|type=checkbox" -g '*test*' -g '*spec*' -g '*e2e*' src`,
then keep the hits that are a Switch.

No Change now or Deprecated items. `onChange(checked: boolean)` is unchanged.

**Notice:**
- The input has `role="switch"` (it is still `input[type=checkbox]`). `getByRole('checkbox')` no longer finds it: use
  `getByRole('switch')`. CSS or e2e selectors on `input[type=checkbox]` still match.
- The ref reaches the input; unnamed props (`aria-label`, `name`, `data-*`) reach it. New: `defaultChecked`,
  `className`; `checked`, `onChange`, `id` optional. It can be labelled from outside with `<label htmlFor={id}>`.
- The focus ring shows for the keyboard only, in `--color-border-focus` (a mouse click showed a primary ring before).

**Check:** a click and Space toggle; tests find it by role `switch`.

## TagInput

**Find:** `rg -n '<TagInput\b' -A12 src | rg 'selectedTags|compact|error|touched|onKeyDown'`; in tests
`rg -n "getByRole\('textbox'" ` in files that render one.

**Deprecated: `selectedTags` → `value`; `compact` → `size="xs"`.**

```tsx
// before
<TagInput id="tags" label="Tags" availableTags={tags} selectedTags={ids} onChange={setIds} compact />
// after
<TagInput id="tags" label="Tags" availableTags={tags} value={ids} onChange={setIds} size="xs" />
```

**Change now (tests only, if they apply):** the text field is a `combobox` over a `listbox` of options (was a
`textbox`). `getByRole('textbox')` no longer finds it: use `getByRole('combobox')`.

**Notice:**
- **An `error` shows at once**, unless `touched={false}` (it waited for `touched`). It is never shown while disabled.
  The input now has `aria-invalid` and `aria-describedby`.
- Suggestions take ArrowDown/ArrowUp; Enter adds the active one (with none active, the typed name, as before); Escape
  closes the list and stops there, so a dialog around it stays open. The app's `onKeyDown` runs first;
  `e.preventDefault()` there skips TagInput's keys.
- `required` sets the native attribute while no tag is chosen. `placeholder` can be set.
- A tag made by `onCreateTag` is added to the latest list, not the one from before the await.
- `id`, `label`, `onChange` optional; `defaultValue` added; unnamed props reach the input; `className` merged with
  `cn`.

**Check:** add a tag by typing and by the arrows; remove one; the handler gets the whole id list.

## TextArea

**Find:** `rg -n '<TextArea\b' -A10 src | rg 'compact|touched|disabled|aria-describedby'`.

**Deprecated: `compact` → `size="xs"`.**

```tsx
// before
<TextArea id="prompt" label="Prompt" compact value={prompt} onChange={e => setPrompt(e.target.value)} />
// after
<TextArea id="prompt" label="Prompt" size="xs" value={prompt} onChange={e => setPrompt(e.target.value)} />
```

**Notice:**
- `touched` no longer defaults to `true`; it has no default. What shows is the same: an error shows unless
  `touched={false}`.
- An error no longer shows while disabled; the helper shows instead.
- `id` and `label` are optional. An app's `aria-describedby` is merged with the TextArea's (it replaced it).
  `className` merged with `cn`.

**Check:** type, the handler gets the event; a TextArea with an error shows it.

## TextInput

**Find:** `rg -n '<TextInput\b' -A12 src | rg 'compact|error|touched|validate|aria-describedby|inputClassName'`. For
every TextInput with `error`, check whether it also passes `touched`.

**Deprecated: `compact` → `size="xs"`.**

```tsx
// before
<TextInput id="name" label="Name" compact value={name} onChange={e => setName(e.target.value)} />
// after
<TextInput id="name" label="Name" size="xs" value={name} onChange={e => setName(e.target.value)} />
```

**Notice:**
- **An `error` passed without `touched` now shows at once** (`touched` defaulted to `false`, which hid it). This is
  the intended fix for a server error that never showed. If an error should wait until the field is left, pass the
  field's touched state: `touched={touched.name}`. A TextInput that already passes `touched` shows no change.
- `validate`'s message shows after the field's first blur (or at once with `touched`). Before, it showed only with
  `touched`. An app `error` wins over it.
- `id`, `label`, `value`, `onChange` are optional; `defaultValue` added. An app's `aria-describedby` is merged with
  the TextInput's (it replaced it). Unnamed props now spread before the TextInput's own.
- `className` and `inputClassName` are merged with `cn`: on a conflict the app's class wins now.

**Check:** each TextInput with an `error`: is showing it at once wanted? Type; the handler gets the event.

---

## Final checklist

- [ ] Every one of the 16 the app uses has been through its section; the ones it doesn't use are listed as unused.
- [ ] No deprecated name left: `rg -n -A12 '<(TextInput|TextArea|Select|ColorInput|GradientInput|TagInput)\b' src | rg '\bcompact\b'`,
      `rg -n 'selectedTags|selectedDate|onDateSelect|onMinChange|onMaxChange|\bminValue=|\bmaxValue=' src` both empty
      (a hit on another component is fine: read it).
- [ ] Every SegmentedControl has a `label` or `aria-label`.
- [ ] Snapshot tests of screens with form inputs reviewed and updated; helpers that read `aria-pressed` or
      `role="checkbox"` updated.
- [ ] Every TextInput, TagInput, ColorInput, GradientInput and DateInput that passes `error` without `touched` has
      been looked at: showing at once is wanted, or `touched` is passed.
- [ ] Every controlled DateInput's handler accepts partial text (or the field is uncontrolled).
- [ ] No ChatInput `onChange={setX}` storing the event; no ChatInput `className` meant for the bordered box.
- [ ] Tests: no `getByRole('checkbox')` for a Switch, `'button'`/`aria-pressed` for SegmentedControl options,
      `'textbox'` for TagInput, `{ name: 'Edit' }` for EditableText's pencil, or the RadioButton dot inside the circle.
- [ ] A ColorInput ref, if any, is `HTMLInputElement`.
- [ ] Typecheck clean; the test files of every changed file pass; no "changed from controlled to uncontrolled" (or
      back) warning in the console on the screens with forms.
- [ ] Your list of changes, per input, in Change now / Deprecated / Notice, with any Notice judged harmless and why.
