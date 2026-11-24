import { besideTrigger } from '../besideTrigger';

// D13: a picker opened near the left edge stays on screen
describe('besideTrigger', () => {
  const viewport = { width: 1024, height: 768 };
  const at = (left: number, top = 100) => ({ left, right: left + 32, top });

  it('opens to the left of the trigger when there is room, as before', () => {
    expect(besideTrigger({ trigger: at(600), width: 256, height: 300, viewport })).toEqual({ left: 336, top: 100 });
  });

  it('opens to the right of a trigger near the left edge', () => {
    expect(besideTrigger({ trigger: at(20), width: 256, height: 300, viewport })).toEqual({ left: 60, top: 100 });
  });

  it('stays inside a window too narrow for either side', () => {
    const narrow = { width: 300, height: 768 };
    const { left } = besideTrigger({ trigger: at(40), width: 256, height: 300, viewport: narrow });
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left + 256).toBeLessThanOrEqual(300 - 8 + 0.0001);
  });

  it('keeps its height inside the window, top and bottom', () => {
    expect(besideTrigger({ trigger: at(600, 700), width: 256, height: 300, viewport }).top).toBe(460);
    expect(besideTrigger({ trigger: at(600, -20), width: 256, height: 300, viewport }).top).toBe(8);
  });
});
