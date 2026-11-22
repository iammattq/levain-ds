// Types for data structure in hierarchy.json

export interface HierarchyContext {
  description: string;
  parentLevel?: number[];
  validContainerLevels?: number[];
  pageType?: string;
}

export interface HierarchyPropsToSet {
  showBar?: boolean;
  align?: string;
  maxWidth?: boolean;
}

export interface HierarchyPlacementGuidance {
  parentComponent: string;
  avoidParentComponent: string;
}

export interface HierarchyStyleGuidance {
  surfaceToken: string;
  border: string;
  boxShadow: string;
}

export interface ComponentRule {
  context: HierarchyContext;
  propsToSet?: HierarchyPropsToSet;
  placementGuidance?: HierarchyPlacementGuidance;
  styleGuidance?: HierarchyStyleGuidance;
  reason: string;
}

export interface ComponentRuleSet {
  componentName: string | string[];
  rules: ComponentRule[];
}

export interface HierarchyLevel {
  level: number | string; // Allow string like "0 or 1"
  elementType?: string;
  location?: string;
  description: string;
  token?: string; // Used in surface/elevation levels
  usage?: string; // Used in elevation tokens
}

export interface PageHierarchy {
  title: string;
  description: string;
  levels: HierarchyLevel[];
  principles: string[];
  componentSpecificRules: ComponentRuleSet[];
}

export interface SurfaceTokens {
  title: string;
  description: string;
  componentSpecificRules: ComponentRuleSet[];
  /** Rungs of the surface ladder — renamed from `levels` to keep stacking
   *  depth distinct from composition level (L0-L4), which is a different axis. */
  rungs: SurfaceRung[];
  offLadder: ColorToken[];
  surfaceRamp: Record<string, string>;
  surfaceLadder: Record<string, unknown>;
  principles: string[];
}

export interface SurfaceRung {
  rung: number;
  token: string;
  usedAtCompositionLevel: string;
  description: string;
}

export interface ColorToken {
  token: string;
  usage: string;
}

export interface ActionTokenCategory {
  name: string;
  tokens: string[];
  usage: string;
}

export interface ActionTokens {
  description: string;
  categories: ActionTokenCategory[];
}

export interface StateTokens {
  description: string;
  tokens: ColorToken[];
}

export interface BaseColors {
  title: string;
  description: string;
  brandTokens: ColorToken[];
  gradientTokens: ColorToken[];
  textTokens: ColorToken[];
  borderTokens: ColorToken[];
  actionTokens: ActionTokens;
  stateTokens: StateTokens;
  principles: string[];
}

export interface ElevationTokenInfo {
  token: string;
  usage: string;
}

export interface ElevationTokens {
  title: string;
  description: string;
  tokens: ElevationTokenInfo[];
  principles: string[];
}

// Main interface for the entire hierarchy.json structure.
//
// Sections added after the original type definition are typed loosely — this
// file is not imported anywhere and exists as a reader's map of hierarchy.json,
// so precise shapes here would be maintenance with no consumer to serve.
export interface HierarchyData {
  guidelineTitle: string;
  introduction: string;
  readAlso: Record<string, string>;
  twoAxes: string;
  pageHierarchy: PageHierarchy;
  surfaceTokens: SurfaceTokens;
  baseColors: BaseColors;
  elevationTokens: ElevationTokens;
  spacingTokens: Record<string, unknown>;
  containmentTokens: Record<string, unknown>;
  borderRadiusTokens: Record<string, unknown>;
  typographyTokens: Record<string, unknown>;
  generalPrinciples: string[];
}
