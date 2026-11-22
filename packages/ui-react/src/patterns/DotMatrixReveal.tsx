'use client';

/**
 * DotMatrixReveal - Animated theme name reveal using dot matrix display
 *
 * Glyphs from DotMatrix5x7 by felias-fogg (LGPL-3.0), kept in ./dotMatrix5x7.ts
 * Source: https://github.com/felias-fogg/DotMatrix5x7
 *
 * Each character is 5 columns x 7 rows, stored as 5 bytes (column-major).
 * Bit 0 = top row, bit 6 = bottom row.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { CHAR_MAP } from './dotMatrix5x7';

// ============================================================================
// CONFIGURATION CONSTANTS - Adjust these to tune the animation
// ============================================================================

/** Animation timing (milliseconds) */
const TIMING = {
  FADE_IN: 150, // Scrim + canvas fade in
  FILL_DURATION: 400, // Dots filling left-to-right
  HOLD_DURATION: 400, // Full display hold
  DRAIN_DURATION: 500, // Dots draining left-to-right
  FADE_OUT: 150, // Scrim + canvas fade out
} as const;

/** Visual constants */
const VISUAL = {
  SCRIM_OPACITY: 0.7, // 70% opacity
  DOT_GAP: 1, // Gap between dots in pixels
  CHAR_GAP: 1, // Gap between characters (in dot units)
} as const;

/** Responsive dot sizes based on viewport width */
const DOT_SIZES: { minWidth: number; dotSize: number }[] = [
  { minWidth: 1024, dotSize: 2 },
  { minWidth: 768, dotSize: 2 },
  { minWidth: 480, dotSize: 2 },
  { minWidth: 0, dotSize: 2 },
];

/** Breakpoint for mobile vs desktop layout */
const MOBILE_BREAKPOINT = 768;

/** Number of steps in pre-calculated color gradient (performance optimization) */
const GRADIENT_STEPS = 64;

/** Easing functions for smooth animation (module scope for stable references) */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;

// The glyphs (LGPL-3.0, in their own file; see its header).

// ============================================================================
// TYPES
// ============================================================================

type AnimationPhase = 'idle' | 'fadeIn' | 'fill' | 'hold' | 'drain' | 'fadeOut';

interface Dot {
  // Final position (where the dot should end up)
  targetX: number;
  targetY: number;
  // Starting position (off-screen right)
  startX: number;
  startY: number;
  // Exit position (off-screen left)
  exitX: number;
  exitY: number;
  // Column index (for animation stagger)
  col: number;
  // Pre-calculated color index for gradient lookup (performance optimization)
  colorIndex: number;
}

// Pre-calculated RGB color for gradient
interface RGB {
  r: number;
  g: number;
  b: number;
}

interface DotMatrixRevealProps {
  themeName: string;
  primaryColor: string;
  accentColor: string;
  onComplete: () => void;
  /** If true, animation plays at 50% speed (for debugging/demo) */
  slowMotion?: boolean;
  /** If true, use dark scrim; if false, use light scrim */
  isDarkMode?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Get responsive dot size based on viewport width */
function getDotSize(width: number): number {
  for (const { minWidth, dotSize } of DOT_SIZES) {
    if (width >= minWidth) return dotSize;
  }
  return DOT_SIZES[DOT_SIZES.length - 1].dotSize;
}

/** Convert text to array of dots with positions */
function textToDots(
  text: string,
  dotSize: number,
  gap: number,
  canvasWidth: number
): { dots: Dot[]; width: number; height: number; totalCols: number } {
  const dots: Dot[] = [];
  const charWidth = 5; // 5 columns per character
  const charHeight = 7; // 7 rows per character
  const cellSize = dotSize + gap;

  let currentCol = 0;

  // Calculate text dimensions first
  const totalTextCols =
    text.length * (charWidth + VISUAL.CHAR_GAP) - VISUAL.CHAR_GAP;
  const textWidth = totalTextCols * cellSize;

  // Offset to center the text
  const offsetX = (canvasWidth - textWidth) / 2;

  for (const char of text) {
    const charCode = char.charCodeAt(0);
    const charData = CHAR_MAP[charCode] || CHAR_MAP[32]; // Fallback to space

    // Each character has 5 columns
    for (let col = 0; col < charWidth; col++) {
      const colByte = charData[col];
      for (let row = 0; row < charHeight; row++) {
        // Check if this dot is "on" (bit is set)
        if ((colByte >> row) & 1) {
          const targetX = offsetX + (currentCol + col) * cellSize;
          const targetY = row * cellSize;

          // Start position: off-screen to the right, with some vertical spread
          const startX = canvasWidth + 50 + Math.random() * 100;
          const startY = targetY + (Math.random() - 0.5) * 50;

          // Exit position: off-screen to the left, with some vertical spread
          const exitX = -50 - Math.random() * 100;
          const exitY = targetY + (Math.random() - 0.5) * 50;

          // Calculate color index based on position within text (0 to GRADIENT_STEPS-1)
          // Use position relative to text bounds, not canvas
          const positionInText =
            (currentCol + col) / Math.max(totalTextCols - 1, 1);
          const colorIndex = Math.floor(positionInText * (GRADIENT_STEPS - 1));

          dots.push({
            targetX,
            targetY,
            startX,
            startY,
            exitX,
            exitY,
            col: currentCol + col,
            colorIndex: Math.max(0, Math.min(GRADIENT_STEPS - 1, colorIndex)),
          });
        }
      }
    }

    currentCol += charWidth + VISUAL.CHAR_GAP;
  }

  const totalCols = currentCol - VISUAL.CHAR_GAP; // Remove trailing gap
  const width = canvasWidth; // Use full canvas width
  const height = charHeight * cellSize;

  return { dots, width, height, totalCols };
}

/** Parse hex color to RGB (called once per color) */
function parseHexColor(hex: string): RGB {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/** Pre-calculate color gradient array for fast lookup during animation */
function createColorGradient(
  primaryColor: string,
  accentColor: string,
  steps: number
): RGB[] {
  const c1 = parseHexColor(primaryColor);
  const c2 = parseHexColor(accentColor);
  const gradient: RGB[] = new Array(steps);

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    gradient[i] = {
      r: Math.round(c1.r + (c2.r - c1.r) * t),
      g: Math.round(c1.g + (c2.g - c1.g) * t),
      b: Math.round(c1.b + (c2.b - c1.b) * t),
    };
  }

  return gradient;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DotMatrixReveal({
  themeName,
  primaryColor,
  accentColor,
  onComplete,
  slowMotion: initialSlowMotion = false,
  isDarkMode = true,
}: DotMatrixRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const [opacity, setOpacity] = useState(0);
  const [scrimOpacity, setScrimOpacity] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Track last opacity values to avoid unnecessary React re-renders
  const lastOpacityRef = useRef(0);
  const lastScrimOpacityRef = useRef(0);

  // Slow motion mode when Control key is held (initialized from prop)
  const slowMotionRef = useRef(initialSlowMotion);

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Detect mobile vs desktop on mount
  useEffect(() => {
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
  }, []);

  // Listen for Control key to toggle slow motion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') slowMotionRef.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') slowMotionRef.current = false;
    };
    // Check Control state via mouse/pointer events (works if Control was held before mount)
    const handlePointerMove = (e: PointerEvent) => {
      slowMotionRef.current = e.ctrlKey;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  // Calculate total animation duration
  const totalDuration = prefersReducedMotion
    ? TIMING.FADE_IN + TIMING.HOLD_DURATION + TIMING.FADE_OUT
    : TIMING.FADE_IN +
      TIMING.FILL_DURATION +
      TIMING.HOLD_DURATION +
      TIMING.DRAIN_DURATION +
      TIMING.FADE_OUT;

  // Draw a single frame - optimized to use pre-calculated color gradient
  const draw = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      dots: Dot[],
      totalCols: number,
      dotSize: number,
      elapsed: number,
      currentPhase: AnimationPhase,
      colorGradient: RGB[]
    ) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      const waveWidth = 0.4;

      for (const dot of dots) {
        let x = dot.targetX;
        let y = dot.targetY;
        let dotOpacity = 1;

        const colProgress = dot.col / Math.max(totalCols - 1, 1);

        if (currentPhase === 'fill') {
          const fillElapsed = elapsed - TIMING.FADE_IN;
          const fillProgress = Math.max(
            0,
            Math.min(1, fillElapsed / TIMING.FILL_DURATION)
          );
          // Left columns (low colProgress) arrive first, right columns (high colProgress) arrive last
          const dotDelay = colProgress * (1 - waveWidth);
          const dotProgress = Math.max(
            0,
            Math.min(1, (fillProgress - dotDelay) / waveWidth)
          );
          const easedProgress = easeOutCubic(dotProgress);

          x = dot.startX + (dot.targetX - dot.startX) * easedProgress;
          y = dot.startY + (dot.targetY - dot.startY) * easedProgress;
          dotOpacity = Math.min(1, dotProgress * 2);
        } else if (currentPhase === 'drain') {
          const drainStart =
            TIMING.FADE_IN + TIMING.FILL_DURATION + TIMING.HOLD_DURATION;
          const drainElapsed = elapsed - drainStart;
          const drainProgress = Math.max(
            0,
            Math.min(1, drainElapsed / TIMING.DRAIN_DURATION)
          );
          const dotDelay = colProgress * (1 - waveWidth);
          const dotProgress = Math.max(
            0,
            Math.min(1, (drainProgress - dotDelay) / waveWidth)
          );
          const easedProgress = easeInCubic(dotProgress);

          x = dot.targetX + (dot.exitX - dot.targetX) * easedProgress;
          y = dot.targetY + (dot.exitY - dot.targetY) * easedProgress;
          dotOpacity = Math.max(0, 1 - dotProgress);
        } else if (currentPhase === 'hold') {
          x = dot.targetX;
          y = dot.targetY;
          dotOpacity = 1;
        } else if (currentPhase === 'fadeIn' || currentPhase === 'fadeOut') {
          dotOpacity = prefersReducedMotion ? 1 : 0;
        }

        if (dotOpacity <= 0) continue;

        // Use pre-calculated color from gradient (no object allocation in hot path)
        const color = colorGradient[dot.colorIndex];
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${dotOpacity})`;

        // Add 1px drop shadow
        ctx.shadowColor = `rgba(0, 0, 0, ${dotOpacity * 0.8})`;
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillRect(x, y, dotSize, dotSize);
      }
    },
    [prefersReducedMotion]
  );

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get dot size and calculate dimensions
    const dotSize = getDotSize(window.innerWidth);
    const gap = VISUAL.DOT_GAP;

    // Handle high-DPI displays for sharp rendering
    const dpr = window.devicePixelRatio || 1;

    // Set canvas width first (we need it for dot positioning)
    const canvasWidth = window.innerWidth;

    const { dots, height, totalCols } = textToDots(
      themeName.toUpperCase(),
      dotSize,
      gap,
      canvasWidth
    );

    // Set canvas dimensions accounting for device pixel ratio
    canvas.width = canvasWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${height}px`;

    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);

    // Pre-calculate color gradient once (performance optimization)
    const colorGradient = createColorGradient(
      primaryColor,
      accentColor,
      GRADIENT_STEPS
    );

    // Track virtual elapsed time for slow motion support
    let virtualElapsed = 0;
    let lastFrameTime = performance.now();
    const SLOW_MOTION_FACTOR = 0.5; // 50% speed when Control held

    const animate = (currentTime: number) => {
      // Calculate delta time and apply slow motion factor if Control is held
      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      virtualElapsed +=
        deltaTime * (slowMotionRef.current ? SLOW_MOTION_FACTOR : 1);

      const elapsed = virtualElapsed;
      const progress = Math.min(elapsed / totalDuration, 1);

      // Determine current phase
      let currentPhase: AnimationPhase = 'fadeIn';
      let phaseOpacity = 0;

      if (prefersReducedMotion) {
        // Simplified phases for reduced motion
        if (elapsed < TIMING.FADE_IN) {
          currentPhase = 'fadeIn';
          phaseOpacity = elapsed / TIMING.FADE_IN;
        } else if (elapsed < TIMING.FADE_IN + TIMING.HOLD_DURATION) {
          currentPhase = 'hold';
          phaseOpacity = 1;
        } else {
          currentPhase = 'fadeOut';
          const fadeOutElapsed =
            elapsed - TIMING.FADE_IN - TIMING.HOLD_DURATION;
          phaseOpacity = 1 - fadeOutElapsed / TIMING.FADE_OUT;
        }
      } else {
        // Full animation phases
        if (elapsed < TIMING.FADE_IN) {
          currentPhase = 'fadeIn';
          phaseOpacity = elapsed / TIMING.FADE_IN;
        } else if (elapsed < TIMING.FADE_IN + TIMING.FILL_DURATION) {
          currentPhase = 'fill';
          phaseOpacity = 1;
        } else if (
          elapsed <
          TIMING.FADE_IN + TIMING.FILL_DURATION + TIMING.HOLD_DURATION
        ) {
          currentPhase = 'hold';
          phaseOpacity = 1;
        } else if (
          elapsed <
          TIMING.FADE_IN +
            TIMING.FILL_DURATION +
            TIMING.HOLD_DURATION +
            TIMING.DRAIN_DURATION
        ) {
          currentPhase = 'drain';
          phaseOpacity = 1;
        } else {
          currentPhase = 'fadeOut';
          const fadeOutStart =
            TIMING.FADE_IN +
            TIMING.FILL_DURATION +
            TIMING.HOLD_DURATION +
            TIMING.DRAIN_DURATION;
          const fadeOutElapsed = elapsed - fadeOutStart;
          phaseOpacity = 1 - fadeOutElapsed / TIMING.FADE_OUT;
        }
      }

      // Only update React state when opacity changes significantly (reduces re-renders)
      const newOpacity = Math.max(0, Math.min(1, phaseOpacity));
      if (Math.abs(newOpacity - lastOpacityRef.current) > 0.01) {
        lastOpacityRef.current = newOpacity;
        setOpacity(newOpacity);
      }

      // Calculate scrim opacity for desktop - fades in during fill, out during drain
      let scrim = 0;
      if (currentPhase === 'fill') {
        const fillElapsed = elapsed - TIMING.FADE_IN;
        scrim = Math.min(1, fillElapsed / (TIMING.FILL_DURATION * 0.5));
      } else if (currentPhase === 'hold') {
        scrim = 1;
      } else if (currentPhase === 'drain') {
        const drainStart =
          TIMING.FADE_IN + TIMING.FILL_DURATION + TIMING.HOLD_DURATION;
        const drainElapsed = elapsed - drainStart;
        scrim = Math.max(0, 1 - drainElapsed / (TIMING.DRAIN_DURATION * 0.8));
      }

      // Only update scrim state when it changes significantly
      if (Math.abs(scrim - lastScrimOpacityRef.current) > 0.01) {
        lastScrimOpacityRef.current = scrim;
        setScrimOpacity(scrim);
      }

      // Draw the frame
      draw(ctx, dots, totalCols, dotSize, elapsed, currentPhase, colorGradient);

      // Continue or complete
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    themeName,
    primaryColor,
    accentColor,
    draw,
    totalDuration,
    onComplete,
    prefersReducedMotion,
  ]);

  // Mobile: full screen centered with full scrim
  // Desktop: bottom bar with localized scrim
  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Screen reader announcement */}
        <div role="status" aria-live="polite" className="sr-only">
          Theme changed to {themeName}
        </div>

        {/* Full screen scrim */}
        <div
          className={`absolute inset-0 transition-opacity duration-100 ${isDarkMode ? 'bg-black' : 'bg-white'}`}
          style={{ opacity: opacity * VISUAL.SCRIM_OPACITY }}
        />

        {/* Canvas container - centered */}
        <div
          className="relative transition-opacity duration-100"
          style={{ opacity }}
        >
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>
    );
  }

  // Desktop: bottom bar layout
  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed right-0 bottom-0 left-0 z-50"
    >
      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        Theme changed to {themeName}
      </div>
      {/* Localized scrim - fades in with fill, out with drain */}
      <div
        className={`absolute inset-0 ${isDarkMode ? 'bg-black' : 'bg-white'}`}
        style={{ opacity: scrimOpacity * VISUAL.SCRIM_OPACITY }}
      />

      {/* Canvas container - centered in bar */}
      <div className="relative flex items-center justify-center py-4">
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}
