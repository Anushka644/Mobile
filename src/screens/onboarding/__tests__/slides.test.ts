import { cubeTopAt } from '../OnboardingIllustrations';
import {
  BUTTON_GAP,
  BUTTON_HEIGHT,
  clampSlide,
  controlsHeight,
  COPY_TO_DOTS,
  copyBottomInset,
  DOT_SIZE,
  DOTS_TO_BUTTON,
  LAST_SLIDE,
  LAST_SLIDE_RISE,
  SLIDES,
} from '../slides';

describe('onboarding slides', () => {
  it('has the spec’s three slides, copy and glow presets', () => {
    expect(SLIDES.map((s) => s.title)).toEqual([
      'Wants melt.\nMoney doesn’t.',
      'Give it time\nto cool.',
      'Let it go,\nwatch it grow.',
    ]);
    expect(SLIDES.map((s) => s.glow)).toEqual(['onboarding1', 'onboarding2', 'onboarding3']);
    expect(SLIDES[0].body).toBe(
      'Freeze the things you’re itching to buy. If you still want them when they thaw, go for it.'
    );
    expect(LAST_SLIDE).toBe(2);
  });

  it('clamps pager positions to a slide', () => {
    expect(clampSlide(-1)).toBe(0);
    expect(clampSlide(0.4)).toBe(0);
    expect(clampSlide(1.6)).toBe(2);
    expect(clampSlide(9)).toBe(LAST_SLIDE);
    expect(clampSlide(Number.NaN)).toBe(0);
  });

  it('stacks the controls 24pt above the bottom, rising on the last slide for the Ghost button', () => {
    expect(controlsHeight(false)).toBe(DOT_SIZE + DOTS_TO_BUTTON + BUTTON_HEIGHT);
    expect(controlsHeight(true)).toBe(DOT_SIZE + 8 + BUTTON_HEIGHT + BUTTON_GAP + BUTTON_HEIGHT);
    expect(LAST_SLIDE_RISE).toBe(BUTTON_HEIGHT + BUTTON_GAP);
    expect(copyBottomInset(0, 24)).toBe(24 + 84 + COPY_TO_DOTS);
    // The copy sits 60pt higher on the last slide (68 rise − the 8pt tighter dots gap), as in the PNGs.
    expect(copyBottomInset(LAST_SLIDE, 24) - copyBottomInset(0, 24)).toBe(60);
  });
});

describe('cubeTopAt', () => {
  it('follows the body when frozen and the product once it pokes out', () => {
    expect(cubeTopAt(0)).toBe(26); // body top: 176 − 150
    expect(cubeTopAt(0.5)).toBeCloseTo(70); // body top, still above the settled product (76)
    expect(cubeTopAt(0.75)).toBe(76); // the product pokes out of the 84-high body (top 92)
  });
});
