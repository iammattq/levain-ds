'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
} from 'react';
import { cn } from '../utils/cn';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  isValidHexColor,
} from '../utils/color';

export interface ColorPickerPanelProps {
  /** Current color value with hex and alpha */
  value: { hex: string; alpha: number };
  /** Callback when color changes */
  onChange: (color: { hex: string; alpha: number }) => void;
  /** Hide alpha slider and input (default: false) */
  hideAlpha?: boolean;
  /**
   * When provided, locks the hue to this hex color.
   * Only the alpha slider/input will be shown, allowing opacity-only editing.
   * Useful for shine/glow layers where all stops share the same base color.
   */
  lockedHue?: string;
  /** Additional class name for the container */
  className?: string;
}

/**
 * A color picker panel with saturation/brightness square, hue slider,
 * optional alpha slider, and hex input.
 */
export default function ColorPickerPanel({
  value,
  onChange,
  hideAlpha = false,
  lockedHue,
  className,
}: ColorPickerPanelProps) {
  // When lockedHue is provided, we're in alpha-only mode
  const isLockedHueMode = Boolean(lockedHue);
  // Ids unique to this panel, so two panels on a page keep their own labels
  const uid = useId();
  const ids = {
    hue: `${uid}-hue`,
    alpha: `${uid}-alpha`,
    hex: `${uid}-hex`,
    hexError: `${uid}-hex-error`,
    alphaInput: `${uid}-alpha-input`,
  };
  // Convert hex to HSV for internal state (computed once on mount)
  const [hsv, setHsv] = useState(() => {
    const rgb = hexToRgb(value.hex);
    if (rgb) {
      return rgbToHsv(rgb);
    }
    return { h: 0, s: 100, v: 100 };
  });
  // The latest hsv, for handlers that mustn't be recreated on every change (the saturation drag)
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const [hexInput, setHexInput] = useState(value.hex.toUpperCase());
  const [hexTouched, setHexTouched] = useState(false);
  const [hexError, setHexError] = useState<string | null>(null);

  // Dragging state for saturation square
  const [isDraggingSaturation, setIsDraggingSaturation] = useState(false);
  const saturationRef = useRef<HTMLDivElement>(null);

  // Sync external value changes to internal state
  useEffect(() => {
    const rgb = hexToRgb(value.hex);
    if (rgb) {
      const newHsv = rgbToHsv(rgb);
      // Preserve hue when color is grayscale (saturation is 0)
      if (newHsv.s === 0) {
        setHsv((prev) => ({ h: prev.h, s: newHsv.s, v: newHsv.v }));
      } else {
        setHsv(newHsv);
      }
      setHexInput(value.hex.toUpperCase());
      setHexError(null);
    }
  }, [value.hex]);

  // Calculate current color from HSV
  const currentHex = useMemo(() => {
    const rgb = hsvToRgb(hsv);
    return rgbToHex(rgb);
  }, [hsv]);

  // Emit change when HSV changes (not from external)
  const emitChange = useCallback(
    (newHsv: { h: number; s: number; v: number }, alpha?: number) => {
      const rgb = hsvToRgb(newHsv);
      const hex = rgbToHex(rgb);
      onChange({ hex, alpha: alpha ?? value.alpha });
    },
    [onChange, value.alpha]
  );

  // Saturation square handlers
  const updateSaturationFromPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!saturationRef.current) return;

      const rect = saturationRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

      const newS = Math.round(x * 100);
      const newV = Math.round((1 - y) * 100);
      // Read hsv from a ref, so the callback isn't recreated during a drag, and call onChange outside the state
      // updater: an updater runs twice in StrictMode, and onChange fired twice (A3)
      const newHsv = { ...hsvRef.current, s: newS, v: newV };
      hsvRef.current = newHsv;
      setHsv(newHsv);
      emitChange(newHsv);
    },
    [emitChange]
  );

  const handleSaturationMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingSaturation(true);
      updateSaturationFromPosition(e.clientX, e.clientY);
    },
    [updateSaturationFromPosition]
  );

  const handleSaturationTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setIsDraggingSaturation(true);
      const touch = e.touches[0];
      updateSaturationFromPosition(touch.clientX, touch.clientY);
    },
    [updateSaturationFromPosition]
  );

  // Global mouse/touch move handlers for saturation drag
  useEffect(() => {
    if (!isDraggingSaturation) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateSaturationFromPosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      updateSaturationFromPosition(touch.clientX, touch.clientY);
    };

    const handleMouseUp = () => setIsDraggingSaturation(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingSaturation, updateSaturationFromPosition]);

  // Hue slider handler
  const handleHueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newH = parseInt(e.target.value, 10);
      const newHsv = { ...hsv, h: newH };
      setHsv(newHsv);
      emitChange(newHsv);
    },
    [hsv, emitChange]
  );

  // The hex to use for alpha changes - either locked hue or current hex
  const effectiveHex = isLockedHueMode ? lockedHue! : currentHex;

  // Alpha slider handler
  const handleAlphaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newAlpha = parseInt(e.target.value, 10);
      onChange({ hex: effectiveHex, alpha: newAlpha });
    },
    [effectiveHex, onChange]
  );

  // Hex input handlers
  const handleHexInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value.toUpperCase();

      // Auto-prepend # if missing
      if (inputValue && !inputValue.startsWith('#')) {
        inputValue = '#' + inputValue;
      }

      setHexInput(inputValue);

      // Validate and update color if valid
      if (isValidHexColor(inputValue)) {
        const rgb = hexToRgb(inputValue);
        if (rgb) {
          const newHsv = rgbToHsv(rgb);
          setHsv(newHsv);
          setHexError(null);
          onChange({ hex: inputValue, alpha: value.alpha });
        }
      } else if (inputValue && inputValue !== '#') {
        setHexError('Invalid hex color');
      } else {
        setHexError(null);
      }
    },
    [onChange, value.alpha]
  );

  const handleHexInputBlur = useCallback(() => {
    setHexTouched(true);
  }, []);

  // Alpha input handler
  const handleAlphaInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value.replace('%', '');
      const parsed = parseInt(inputValue, 10);
      if (!isNaN(parsed)) {
        const clamped = Math.max(0, Math.min(100, parsed));
        onChange({ hex: effectiveHex, alpha: clamped });
      }
    },
    [effectiveHex, onChange]
  );

  const showHexError = hexTouched && hexError;

  // Calculate indicator position for saturation square
  const indicatorX = (hsv.s / 100) * 100;
  const indicatorY = ((100 - hsv.v) / 100) * 100;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Saturation/Brightness Square - hidden in locked hue mode */}
      {!isLockedHueMode && (
        <div
          ref={saturationRef}
          data-testid="saturation-square"
          className="relative h-40 w-full cursor-crosshair rounded-md"
          style={{
            backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          }}
          onMouseDown={handleSaturationMouseDown}
          onTouchStart={handleSaturationTouchStart}
        >
          {/* White overlay (left to right) */}
          <div
            className="absolute inset-0 rounded-md"
            style={{
              background: 'linear-gradient(to right, #fff, transparent)',
            }}
          />
          {/* Black overlay (bottom to top) */}
          <div
            className="absolute inset-0 rounded-md"
            style={{
              background: 'linear-gradient(to top, #000, transparent)',
            }}
          />
          {/* Position indicator */}
          <div
            data-testid="saturation-indicator"
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
            style={{
              left: `${indicatorX}%`,
              top: `${indicatorY}%`,
              backgroundColor: currentHex,
            }}
          />
        </div>
      )}

      {/* Hue Slider - hidden in locked hue mode */}
      {!isLockedHueMode && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={ids.hue}
            className="type-label-sm text-[var(--color-text-muted)]"
          >
            Hue
          </label>
          <input
            id={ids.hue}
            data-testid="hue-slider"
            type="range"
            min={0}
            max={360}
            value={hsv.h}
            onChange={handleHueChange}
            className="h-3 w-full cursor-pointer appearance-none rounded-md [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[var(--color-primary)] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[var(--color-primary)] [&::-webkit-slider-thumb]:shadow-md"
            style={{
              background:
                'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            }}
          />
        </div>
      )}

      {/* Alpha Slider */}
      {!hideAlpha && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={ids.alpha}
            className="type-label-sm text-[var(--color-text-muted)]"
          >
            Opacity
          </label>
          <div className="relative h-3 w-full overflow-hidden rounded-md">
            {/* Checkered background */}
            <div
              data-testid="alpha-slider-track"
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #ccc 25%, transparent 25%),
                  linear-gradient(-45deg, #ccc 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #ccc 75%),
                  linear-gradient(-45deg, transparent 75%, #ccc 75%)
                `,
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
              }}
            />
            {/* Color overlay - uses effectiveHex for locked hue mode */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, transparent, ${effectiveHex})`,
              }}
            />
            {/* Invisible range input positioned absolutely over the track */}
            <input
              id={ids.alpha}
              data-testid="alpha-slider"
              type="range"
              min={0}
              max={100}
              value={value.alpha}
              onChange={handleAlphaChange}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[var(--color-primary)] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[var(--color-primary)] [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>
        </div>
      )}

      {/* Hex and Alpha Inputs */}
      <div className="flex gap-2">
        {/* Hex Input - hidden in locked hue mode */}
        {!isLockedHueMode && (
          <div className="flex-1">
            <label
              htmlFor={ids.hex}
              className="type-label-sm mb-1 block text-[var(--color-text-muted)]"
            >
              Hex
            </label>
            <input
              id={ids.hex}
              data-testid="hex-input"
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              onBlur={handleHexInputBlur}
              className={cn(
                'type-body-sm h-8 w-full rounded-md border px-2 transition-colors focus:ring-1 focus:outline-none',
                showHexError
                  ? 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]'
                  : 'border-[var(--color-border-default)] bg-[var(--color-surface-card)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]',
                'text-[var(--color-text-default)]'
              )}
              aria-invalid={showHexError ? true : undefined}
              aria-describedby={showHexError ? ids.hexError : undefined}
            />
            {showHexError && (
              <p
                id={ids.hexError}
                data-testid="hex-error"
                className="type-caption mt-1 text-[var(--color-error)]"
              >
                {hexError}
              </p>
            )}
          </div>
        )}

        {/* Alpha Input */}
        {!hideAlpha && (
          <div className={cn(isLockedHueMode ? 'flex-1' : 'w-20')}>
            <label
              htmlFor={ids.alphaInput}
              className="type-label-sm mb-1 block text-[var(--color-text-muted)]"
            >
              Alpha
            </label>
            <div className="relative">
              <input
                id={ids.alphaInput}
                data-testid="alpha-input"
                type="text"
                value={value.alpha}
                onChange={handleAlphaInputChange}
                className="type-body-sm h-8 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-2 pr-6 text-[var(--color-text-default)] transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none"
              />
              <span className="type-body-sm pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[var(--color-text-muted)]">
                %
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

ColorPickerPanel.displayName = 'ColorPickerPanel';
