import { renderHook, act } from '@testing-library/react';
import { useControlled } from '../useControlled';

describe('useControlled', () => {
  test('undefined value means uncontrolled: own state from defaultValue, onChange still called', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useControlled<number>(undefined, 1, onChange)
    );
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  test('a defined value is controlled: set only calls onChange', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useControlled<number>(5, 1, onChange));
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(5);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  test('warns in development when the mode flips, naming the input', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = renderHook(
      ({ v }: { v: number | undefined }) =>
        useControlled<number>(v, 0, undefined, 'Slider'),
      { initialProps: { v: undefined as number | undefined } }
    );
    expect(warn).not.toHaveBeenCalled();
    rerender({ v: 3 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(
      /^Slider changed from uncontrolled to controlled/
    );
    rerender({ v: 4 });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
