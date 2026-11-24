// @levain/ui-react - Design System Components, Patterns, and Templates

// ============================================================================
// PROVIDER - what the app supplies: its link and image components, the current path, the theme state
// ============================================================================

export { LevainProvider, Link, Image, usePathname, useEnhancedTheme } from './src/provider/LevainProvider';
export type { LevainProviderProps, LevainLinkProps, LevainImageProps, LevainTheme } from './src/provider/LevainProvider';

// ============================================================================
// COMPONENTS - Atomic UI building blocks (L4 in hierarchy)
// ============================================================================

export { Button, buttonVariants } from './src/components/Button';
export type { ButtonProps } from './src/components/Button';
export { TextLink } from './src/components/TextLink';
export type { TextLinkProps, TextLinkSize } from './src/components/TextLink';
export { Card } from './src/components/Card';
export { default as CardContent } from './src/components/CardContent';
export { default as CardMedia } from './src/components/CardMedia';
export { default as CardTitle } from './src/components/CardTitle';
export { default as Section } from './src/components/Section';
export type { SectionProps } from './src/components/Section';
export { default as Heading } from './src/components/Heading';
export type { HeadingProps } from './src/components/Heading';
export { default as Tag } from './src/components/Tag';
export { CountBadge } from './src/components/CountBadge';
export type { CountBadgeProps, CountBadgeVariant, CountBadgeTone } from './src/components/CountBadge';
export { default as Switch } from './src/components/Switch';
export { default as RadioButton } from './src/components/RadioButton';
export { default as SegmentedControl } from './src/components/SegmentedControl';
export type {
  SegmentedControlProps,
  SegmentOption,
} from './src/components/SegmentedControl';
export { Toaster } from './src/components/Toaster';
export { Modal } from './src/components/Modal';
export type { ModalMenuOption } from './src/components/Modal';
export { Loader } from './src/components/Loader';
export { ProgressRing } from './src/components/ProgressRing';
export type { ProgressRingProps } from './src/components/ProgressRing';
export { ProgressBar } from './src/components/ProgressBar';
export type { ProgressBarProps } from './src/components/ProgressBar';
export type { ProgressSize, ProgressTone } from './src/components/progress';
export { RelativeTime } from './src/components/RelativeTime';
export type { RelativeTimeProps } from './src/components/RelativeTime';
export { formatSpan } from './src/utils/time';
export { DataTable } from './src/components/DataTable';
export { Pagination } from './src/components/Pagination';
export type { PaginationProps } from './src/components/Pagination';
export type {
  DataTableProps,
  ColumnMeta,
  DataTableStatus,
  DataTableStatusMessage,
  DataTableSelectionAction,
  DataTableAddAction,
  DataTableUtilityAction,
  FilterGroup,
  FilterOption,
} from './src/components/DataTable';
export { default as TextInput } from './src/components/TextInput';
export type { TextInputProps, TextInputSize } from './src/components/TextInput';
export { default as ColorInput } from './src/components/ColorInput';
export type {
  ColorInputProps,
  ColorInputSize,
} from './src/components/ColorInput';
export { default as ColorPickerPanel } from './src/components/ColorPickerPanel';
export type { ColorPickerPanelProps } from './src/components/ColorPickerPanel';
export { default as GradientInput } from './src/components/GradientInput';
export type {
  GradientInputProps,
  GradientInputSize,
} from './src/components/GradientInput';
export { default as TextArea } from './src/components/TextArea';
export type { TextAreaProps } from './src/components/TextArea';
export { default as ChatInput } from './src/components/ChatInput';
export type { ChatInputProps } from './src/components/ChatInput';
export {
  Tabs,
  tabsContainerVariants,
  tabVariants,
} from './src/components/Tabs';
export type { TabsProps, TabItem } from './src/components/Tabs';
export { default as Select } from './src/components/Select';
export type {
  SelectProps,
  SelectOption,
  SelectSize,
} from './src/components/Select';
export { default as TagInput } from './src/components/TagInput';
export type { TagInputProps, TagOption } from './src/components/TagInput';
export { default as DateInput } from './src/components/DateInput';
export type { DateInputProps } from './src/components/DateInput';
export { default as Calendar } from './src/components/Calendar';
export type { CalendarProps } from './src/components/Calendar';
export { default as SectionTabs } from './src/components/SectionTabs';
export type {
  SectionTabData,
  SectionTabsProps,
} from './src/components/SectionTabs';
export { EditableText } from './src/components/EditableText';
export type { EditableTextProps } from './src/components/EditableText';
export { default as Checkbox } from './src/components/Checkbox';
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './src/components/Accordion';
export { MenuItem } from './src/components/MenuItem';
export { Avatar } from './src/components/Avatar';
export { ImageWithLoadState } from './src/components/ImageWithLoadState';
export type { ImageWithLoadStateProps } from './src/components/ImageWithLoadState';
export { default as Slider } from './src/components/Slider';
export { default as DualSlider } from './src/components/DualSlider';
export type { SliderProps } from './src/components/Slider';
export type { DualSliderProps } from './src/components/DualSlider';

// Icons
export * from './src/components/icons';

// ============================================================================
// PATTERNS - Composed UI patterns (L3 in hierarchy)
// ============================================================================

export { MediaCard } from './src/patterns/MediaCard';
export type { MediaCardProps } from './src/patterns/MediaCard';
export { default as ContentNavigation } from './src/patterns/ContentNavigation';
export { default as ImageUploader } from './src/patterns/ImageUploader';
export { default as ThemeToggle } from './src/patterns/ThemeToggle';
export { default as ThemeColorButton } from './src/patterns/ThemeColorButton';
export { default as ThemeSwitcher } from './src/patterns/ThemeSwitcher';
export {
  default as NavigationLinks,
  type SubMenuItem,
  type NavigationItem,
} from './src/patterns/NavigationLinks';
export { default as PillNavigation } from './src/patterns/PillNavigation';
export { default as EditorialNavigation } from './src/patterns/EditorialNavigation';
export { default as SimpleAnimatedName } from './src/patterns/SimpleAnimatedName';
export { default as AsciiHeader } from './src/patterns/AsciiHeader';
export { Timeline, TimelineGroup, TimelineItem } from './src/patterns/Timeline';
export { TimelineList, TimelineEntry } from './src/patterns/TimelineList';
export type { TimelineEntryData } from './src/patterns/TimelineList';
export type {
  TimelineGroupData,
  TimelineItemData,
} from './src/patterns/Timeline';
export { ConfirmationModal } from './src/patterns/ConfirmationModal';
export type { ConfirmationModalProps } from './src/patterns/ConfirmationModal';
export { SurfaceCard, GradientCard } from './src/patterns/SurfaceCard';
export { Footer } from './src/patterns/Footer';
export type { FooterProps } from './src/patterns/Footer';
export { ToolInfo } from './src/patterns/ToolInfo';
export type { ToolInfoProps } from './src/patterns/ToolInfo';
export { ToolSidebar } from './src/patterns/ToolSidebar';
export type {
  ToolSidebarProps,
  ToolSidebarSize,
  ToolSection,
} from './src/patterns/ToolSidebar';
export type {
  SurfaceCardProps,
  GradientCardProps,
  GradientConfig,
  BorderConfig,
  GradientLayerConfig,
  SurfacePreset,
  GradientPreset,
  ShadowStyle,
  ShadowDirection,
} from './src/patterns/SurfaceCard';
export {
  default as TokenSelect,
  getTokensForCategory,
} from './src/patterns/TokenSelect';
export type {
  TokenSelectProps,
  TokenSelectSize,
  TokenCategory,
  TokenOption,
} from './src/patterns/TokenSelect';
export { default as DotMatrixReveal } from './src/patterns/DotMatrixReveal';
export {
  default as GradientEditor,
  gradientToCss,
} from './src/patterns/GradientEditor';
export type {
  GradientEditorProps,
  GradientValue,
  GradientStop,
} from './src/patterns/GradientEditor';

// ============================================================================
// TEMPLATES - Page-level layouts (L2 in hierarchy)
// ============================================================================

export { default as PageTemplate } from './src/templates/PageTemplate';
export type { PageTemplateProps } from './src/templates/PageTemplate';
export { AdminPageTemplate } from './src/templates/AdminPageTemplate';
export type { AdminPageTemplateProps } from './src/templates/AdminPageTemplate';

// ============================================================================
// UTILITIES
// ============================================================================

export { cn } from './src/utils/cn';
export { inputSizeConfig } from './src/utils/inputSizing';
export type { InputSize, InputSizeConfig } from './src/utils/inputSizing';

// ============================================================================
// DOCUMENTATION TYPES - For design system documentation pages
// ============================================================================

export type {
  HierarchyData,
  HierarchyLevel,
  HierarchyContext,
  ComponentRule,
  ComponentRuleSet,
  ColorToken,
  ElevationTokenInfo,
  PageHierarchy,
  SurfaceTokens,
  BaseColors,
  ElevationTokens,
  ActionTokens,
  StateTokens,
} from './docs/types';
export {
  calculatePopupPosition,
  getPositionStyles,
  usePopupPosition,
} from './src/utils/popupPosition';
export type {
  PopupPosition,
  PopupPlacement,
  PopupAlignment,
  PositionConfig,
} from './src/utils/popupPosition';
export { generatePaggaText } from './src/utils/pagga';

// ============================================================================
// MOTION PIECES - drag and drop, and the compact card that morphs into its dialog (assembly.json: motion rules)
// ============================================================================

export { SortableGroup, SortableList } from './src/components/SortableList';
export type { SortableGroupProps, SortableListProps, SortableMove } from './src/components/SortableList';
export { StatusCard, StatusCardDialog, StatusMarkers, morphId } from './src/patterns/StatusCard';
export type { StatusCardProps, StatusCardDialogProps, StatusMarker, StatusTone } from './src/patterns/StatusCard';
export { StatusCardDialogStack } from './src/patterns/StatusCardDialogStack';
export type { StatusCardDialogStackProps, StatusCardStackDialog } from './src/patterns/StatusCardDialogStack';
export { BottomSheet } from './src/patterns/BottomSheet';
export type { BottomSheetProps } from './src/patterns/BottomSheet';
export { useIsPhone } from './src/patterns/Sheet';
