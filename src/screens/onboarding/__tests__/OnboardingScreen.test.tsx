import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { useChillStore } from '@/store/useChillStore';

import { OnboardingScreen } from '../OnboardingScreen';

const store = () => useChillStore.getState();

beforeEach(() => {
  store().resetAll();
});

describe('Onboarding', () => {
  it('shows the three slides with their copy', async () => {
    await render(<OnboardingScreen />);
    expect(screen.getByText('Wants melt.\nMoney doesn’t.')).toBeTruthy();
    // Slides out of view are hidden from screen readers.
    const hidden = { includeHiddenElements: true };
    expect(screen.queryByText('Give it time\nto cool.')).toBeNull();
    expect(screen.getByText('Give it time\nto cool.', hidden)).toBeTruthy();
    expect(screen.getByText('Let it go,\nwatch it grow.', hidden)).toBeTruthy();
    expect(
      screen.getByText('Pick a cooldown — a day, three, a week. We’ll nudge you when it’s ready.', hidden)
    ).toBeTruthy();
    expect(screen.getByTestId('onboarding-skip')).toBeTruthy();
    expect(screen.getByLabelText('Page 1 of 3')).toBeTruthy();
  });

  it('pages with Next, then "Start my freezer" finishes with an empty freezer', async () => {
    await render(<OnboardingScreen />);
    const primary = screen.getByTestId('onboarding-primary');
    await fireEvent.press(primary); // → slide 2
    await fireEvent.press(primary); // → slide 3
    expect(store().settings.onboarded).toBe(false);
    await fireEvent.press(primary); // Start my freezer
    expect(store().settings.onboarded).toBe(true);
    expect(store().items).toHaveLength(0);
  });

  it('Skip jumps to the last slide', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByTestId('onboarding-skip'));
    await fireEvent.press(screen.getByTestId('onboarding-primary'));
    expect(store().settings.onboarded).toBe(true);
  });

  it('"Try it with a sample freezer" seeds the demo and finishes', async () => {
    await render(<OnboardingScreen />);
    // The Ghost button only becomes reachable once the pager has scrolled to the last slide.
    expect(screen.queryByTestId('onboarding-sample')).toBeNull();
    const { width } = Dimensions.get('window');
    await fireEvent.scroll(screen.getByTestId('onboarding-pager'), {
      nativeEvent: {
        contentOffset: { x: width * 2, y: 0 },
        contentSize: { width: width * 3, height: 800 },
        layoutMeasurement: { width, height: 800 },
      },
    });
    await waitFor(() => expect(screen.getByTestId('onboarding-sample')).toBeTruthy());
    expect(screen.getByLabelText('Start my freezer')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('onboarding-sample'));
    expect(store().settings.onboarded).toBe(true);
    expect(store().items.length).toBeGreaterThan(0);
    expect(store().settings.goal?.name).toBe('Weekend in Lisbon');
  });
});
