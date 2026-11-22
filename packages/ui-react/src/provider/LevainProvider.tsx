'use client';

/**
 * LevainProvider: what levain DS needs from the app it runs in, so the components import no framework.
 *
 * - `linkComponent`: renders every link (Next: `next/link`). Default: a plain `<a>`.
 * - `imageComponent`: renders every image (Next: `next/image`). Default: a plain `<img>`, with `fill` and `priority`
 *   done in CSS and loading attributes.
 * - `usePathname`: the current path, for marking the active navigation item (Next: `usePathname` from
 *   `next/navigation`). Default: `window.location.pathname`.
 * - `useTheme`: the app's theme state, for ThemeToggle, ThemeColorButton and SimpleAnimatedName. No default.
 *
 * The components import `Link`, `Image`, `usePathname` and `useEnhancedTheme` from here, as they once imported them from
 * Next and the app. In a Next app, wrap the root layout's children in a small client component that passes them in.
 */
import {
  createContext,
  forwardRef,
  useContext,
  type AnchorHTMLAttributes,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  type ReactEventHandler,
  type Ref,
} from 'react';
import type { ThemeMode } from '@levain/tokens';

export type LevainLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  ref?: Ref<HTMLAnchorElement>;
};

export type LevainImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  /** Fill the positioned parent (`next/image`'s `fill`). */
  fill?: boolean;
  sizes?: string;
  /** Load at once, not lazily (`next/image`'s `priority`). */
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
  onLoad?: ReactEventHandler<HTMLImageElement>;
  onError?: ReactEventHandler<HTMLImageElement>;
};

/** The theme state the theme patterns read: the app's own provider supplies it. */
export interface LevainTheme {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  themeIndex: number;
  setThemeIndex: (index: number) => void;
  saveThemePreference: () => void;
}

export interface LevainProviderProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkComponent?: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageComponent?: ComponentType<any>;
  usePathname?: () => string;
  useTheme?: () => LevainTheme;
  children: ReactNode;
}

const PlainLink = forwardRef<HTMLAnchorElement, LevainLinkProps>(function PlainLink(props, ref) {
  return <a ref={ref} {...props} />;
});

function PlainImage({ fill, priority, style, ...rest }: LevainImageProps) {
  return (
    <img
      {...rest}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...style } : style}
    />
  );
}

const windowPathname = () => (typeof window === 'undefined' ? '' : window.location.pathname);
const noTheme = (): LevainTheme => {
  throw new Error('useEnhancedTheme must be used within a LevainProvider given useTheme');
};

type Levain = Required<Omit<LevainProviderProps, 'children'>>;
const LevainContext = createContext<Levain>({
  linkComponent: PlainLink,
  imageComponent: PlainImage,
  usePathname: windowPathname,
  useTheme: noTheme,
});

export function LevainProvider({ linkComponent, imageComponent, usePathname, useTheme, children }: LevainProviderProps) {
  const value: Levain = {
    linkComponent: linkComponent ?? PlainLink,
    imageComponent: imageComponent ?? PlainImage,
    usePathname: usePathname ?? windowPathname,
    useTheme: useTheme ?? noTheme,
  };
  return <LevainContext.Provider value={value}>{children}</LevainContext.Provider>;
}

/** A link, drawn by the app's link component. */
export const Link = forwardRef<HTMLAnchorElement, LevainLinkProps>(function Link(props, ref) {
  const C = useContext(LevainContext).linkComponent;
  return <C ref={ref} {...props} />;
});

/** An image, drawn by the app's image component. */
export function Image(props: LevainImageProps) {
  const C = useContext(LevainContext).imageComponent;
  return <C {...props} />;
}

/** The current path, from the app's router. */
export function usePathname(): string {
  return useContext(LevainContext).usePathname();
}

/** The app's theme state. */
export function useEnhancedTheme(): LevainTheme {
  return useContext(LevainContext).useTheme();
}
