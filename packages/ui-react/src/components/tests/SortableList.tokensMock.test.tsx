// A consumer's test may mock @levain/tokens with only what it uses, then import a module that imports levain: loading
// SortableList must not read a token (v0.2.1; it read drag.liftScale at load, which broke portfolio's TypographyCard test).
jest.mock('@levain/tokens', () => ({ themeManager: { applyTypographyPreview: jest.fn() } }));

it('loads under a partial mock of the tokens', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const m = require('../SortableList');
  expect(typeof m.SortableGroup).toBe('function');
  expect(typeof m.SortableList).toBe('function');
});
