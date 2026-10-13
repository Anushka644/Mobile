// Accessibility helpers.
//
// react-native-web (0.21) ignores the `accessibilityState` object: on web only `aria-*` props (and
// a few flat legacy props) reach the DOM. So anything that passes accessibilityState also spreads
// `ariaState(state)`, which iOS / Android read too (RN 0.71+ maps aria-* onto the same state).

import type { AccessibilityState } from 'react-native';

export interface AriaStateProps {
  'aria-selected'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-expanded'?: boolean;
  'aria-busy'?: boolean;
  'aria-disabled'?: boolean;
}

/** The aria-* props equivalent to an accessibilityState (only the keys that are set). Pure. */
export function ariaState(state: AccessibilityState | null | undefined): AriaStateProps {
  if (!state) return {};
  const aria: AriaStateProps = {};
  if (state.selected != null) aria['aria-selected'] = state.selected;
  if (state.checked != null) aria['aria-checked'] = state.checked;
  if (state.expanded != null) aria['aria-expanded'] = state.expanded;
  if (state.busy != null) aria['aria-busy'] = state.busy;
  if (state.disabled != null) aria['aria-disabled'] = state.disabled;
  return aria;
}
