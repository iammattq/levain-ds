import { describe, it, expect } from '@jest/globals';
import { themeGeneratorV2 } from '..';

describe('textOn: a theme names the text on its own fills, per mode', () => {
  const input = { name: 'Neutral', primary: '#2451C9', accent: '#2451C9', tokenMapping: { light: { primary: 1 }, dark: { primary: 25 } } } as const;
  it('without it, one text for both modes, picked against the picked colour', () => {
    const t = themeGeneratorV2.generate(input);
    expect(t.light.textOnPrimary).toBe(t.dark.textOnPrimary);
  });
  it('with it, the stop it names, per mode (a near-black button on light gets light text, a near-white one on dark gets dark)', () => {
    const t = themeGeneratorV2.generate({ ...input, textOn: { light: { primary: 25 }, dark: { primary: 1, accent: 'accent-900' } } });
    expect(t.light.textOnPrimary).toBe(t.light.surfaces[25]);
    expect(t.dark.textOnPrimary).toBe(t.dark.surfaces[1]);
    expect(t.dark.textOnAccent).toBe(t.dark.accentRamp[8]);
    expect(t.light.textOnAccent).toBe(themeGeneratorV2.generate(input).light.textOnAccent); // not named: as before
  });
});
