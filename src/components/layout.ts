// Layout constants shared by screens and the tab bar (spec §2 "Canvas and layout", "No home indicator").
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Screen side gutter. */
export const GUTTER = 20;
/** Content max width (393 frame − 2 × 20). */
export const CONTENT_MAX_WIDTH = 353;
/** The design frame width; content columns are centred in it on wider screens. */
export const FRAME_WIDTH = 393;

/**
 * Bottom-anchored elements (tab bar, sticky CTAs, onboarding buttons) sit 24pt above the screen's
 * bottom edge. The designs have NO home indicator, and the 34pt iPhone inset is NOT added on top.
 */
export const BOTTOM_GAP = 24;

/** Floating tab bar height (spec §3 TabBar). */
export const TAB_BAR_HEIGHT = 76;

/** Height of the cream fade under the tab bar, anchored to the screen bottom (spec §4.2: 170). */
export const TAB_BAR_FADE_HEIGHT = 170;

/**
 * Bottom padding for scroll content on tab screens. The spec's 130 clears the bar itself, but the
 * last ~40pt would then never leave the 170pt cream fade (a washed-out last row / footer even at
 * max scroll), so the padding covers the whole fade plus a little air. At rest nothing moves.
 */
export const TAB_BAR_SCROLL_PADDING = TAB_BAR_FADE_HEIGHT + 8;

/**
 * What a non-scrolling, vertically centred tab state (the empty freezer) reserves for the bar —
 * the spec's 130, which the 13-freezer-empty frame is laid out around.
 */
export const TAB_BAR_CLEARANCE = 130;

/**
 * Distance of bottom-anchored UI from the screen bottom for a given safe-area bottom inset:
 * always 24 — except under a tall Android 3-button navigation bar (inset > 40), which would
 * otherwise cover the UI; then it sits 8pt above that bar.
 */
export function bottomGap(bottomInset: number): number {
  return bottomInset > 40 ? bottomInset + 8 : BOTTOM_GAP;
}

/** `bottomGap()` for the current device insets. */
export function useBottomGap(): number {
  return bottomGap(useSafeAreaInsets().bottom);
}

/**
 * TAB_BAR_SCROLL_PADDING adjusted for the device (only grows under an Android 3-button nav bar).
 * `centered`: TAB_BAR_CLEARANCE instead, for a state centred in the space above the bar.
 */
export function useTabBarScrollPadding(centered = false): number {
  return (centered ? TAB_BAR_CLEARANCE : TAB_BAR_SCROLL_PADDING) + (useBottomGap() - BOTTOM_GAP);
}

/** Top padding used on web, where there is no status bar to clear. */
export const WEB_TOP_INSET = 20;

/** Top content inset: the status-bar safe area, or WEB_TOP_INSET on web (where it is 0). */
export function topInset(safeAreaTop: number): number {
  return safeAreaTop > 0 ? safeAreaTop : Platform.OS === 'web' ? WEB_TOP_INSET : 0;
}

/** `topInset()` for the current device. Use for screens that don't use <Screen>. */
export function useTopInset(): number {
  return topInset(useSafeAreaInsets().top);
}
