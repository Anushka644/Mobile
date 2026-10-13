// Chill design-system components (spec §3). Import from '@/components'.

export { AppText, type AppTextProps } from './AppText';
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './Button';
export { Chip, type ChipProps } from './Chip';
export { Coin, type CoinProps } from './Coin';
export { CoinBurst, Confetti, type BurstTrigger, type CoinBurstProps, type ConfettiProps } from './Confetti';
export { COOLDOWN_OPTION_TEXT, CooldownPicker, cooldownPhrase, type CooldownPickerProps } from './CooldownPicker';
export { Cube, ItemCube, type CubeProps, type ItemCubeProps } from './Cube';
export {
  DESIGN_FRAME_WIDTH,
  GLOW_PRESETS,
  GlowBackground,
  GlowEllipse,
  PrimaryGlow,
  TOP_GLOW,
  TopGlow,
  type FrameGradientSpec,
  type GlowBackgroundProps,
  type GlowEllipseProps,
  type GlowEllipseSpec,
  type GlowPreset,
  type GlowPresetSpec,
  type PrimaryGlowProps,
  type TopGlowProps,
} from './Glow';
export { CATEGORY_ACCENT, CATEGORY_ICONS, glyphForItem, MOOD_ICONS, MOOD_INK, MOOD_TINT } from './glyphs';
export { Icon, ICON_NAMES, type IconName, type IconProps } from './Icon';
export { IconBadge, type IconBadgeProps } from './IconBadge';
export { IconButton, type IconButtonProps, type IconButtonVariant } from './IconButton';
export { ItemCard, type ItemCardProps } from './ItemCard';
export { Jar, JAR_MAX_ROWS, jarLevel, jarRows, type JarProps } from './Jar';
export {
  BOTTOM_GAP,
  bottomGap,
  CONTENT_MAX_WIDTH,
  FRAME_WIDTH,
  GUTTER,
  TAB_BAR_FADE_HEIGHT,
  TAB_BAR_HEIGHT,
  TAB_BAR_CLEARANCE,
  TAB_BAR_SCROLL_PADDING,
  topInset,
  useBottomGap,
  useTabBarScrollPadding,
  useTopInset,
  WEB_TOP_INSET,
} from './layout';
export {
  PRESS_SCALE,
  springCalm,
  springPop,
  springPress,
  springSheet,
  timingFade,
  timingMelt,
  useReducedMotion,
} from './motion';
export { Pill, type PillProps, type PillTone } from './Pill';
export { PressableScale, type HapticKind, type PressableScaleProps } from './PressableScale';
export {
  PRODUCT_IMAGES,
  productImageFor,
  ProductThumb,
  ProductTile,
  toImageSource,
  type ProductImageKey,
  type ProductImageSource,
  type ProductThumbProps,
  type ProductTileProps,
} from './ProductImage';
export { ProgressBar, type ProgressBarProps, type ProgressTone } from './ProgressBar';
export { ReadyBanner, type ReadyBannerProps } from './ReadyBanner';
export { ReflectionCard, type ReflectionCardProps } from './ReflectionCard';
export { CoinStack, SavedBanner, type SavedBannerProps } from './SavedBanner';
export { Screen, type ScreenProps } from './Screen';
export { SectionHeader, type SectionHeaderProps } from './SectionHeader';
export {
  ConfirmDialog,
  Sheet,
  SheetGrabber,
  type ConfirmDialogAction,
  type ConfirmDialogProps,
  type SheetProps,
} from './Sheet';
export { SnowField, type SnowFieldProps } from './SnowField';
export { TAB_META, TabBar, type TabBarProps } from './TabBar';
export { TextField, type TextFieldProps } from './TextField';
export { Toggle, type ToggleProps } from './Toggle';
export { ariaState, type AriaStateProps } from './a11y';
