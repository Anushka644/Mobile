// Smoke tests for the scaffold: domain contract, tokens, and test mocks.
// Keep tests out of app/ — every file there becomes a route.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { AppText } from '../components/AppText';
import { colors, radius, shadows, space, typography } from '../theme/tokens';
import { COOLDOWN_HOURS, getItemStatus, MOOD_LABELS, type Item } from '../types';

describe('domain contract', () => {
  it('maps cooldowns to hours', () => {
    expect(COOLDOWN_HOURS).toEqual({ '24h': 24, '72h': 72, '7d': 168, '30d': 720 });
  });

  it('labels moods with emoji', () => {
    expect(MOOD_LABELS.need).toBe('✅ Need it');
  });

  it('derives cooling / ready / decided status', () => {
    const item: Item = {
      id: '1',
      name: 'Sneakers',
      priceCents: 12000,
      currency: 'USD',
      category: 'fashion',
      frozenAt: 0,
      thawAt: 1000,
      cooldown: '24h',
      refreezeCount: 0,
    };
    expect(getItemStatus(item, 999)).toBe('cooling');
    expect(getItemStatus(item, 1000)).toBe('ready');
    expect(getItemStatus({ ...item, decision: 'let-go' }, 0)).toBe('let-go');
  });
});

describe('tokens', () => {
  it('exposes primitive and semantic colors', () => {
    expect(colors.cream100).toBe('#FFF4EC');
    expect(colors.bg.canvas).toBe('#FFF4EC');
    expect(colors.text.primary).toBe('#2B2140');
  });

  it('converts letter spacing percent to px', () => {
    expect(typography.displayXL.letterSpacing).toBeCloseTo(-1.44);
    expect(typography.caption.letterSpacing).toBeCloseTo(0.66);
    expect(typography.bodyM.letterSpacing).toBe(0);
  });

  it('has spacing, radius and shadows', () => {
    expect(space[16]).toBe(16);
    expect(radius['2xl']).toBe(48);
    expect(shadows.iceGlow.boxShadow).toBe('0px 16px 32px -6px rgba(143, 211, 255, 0.45)');
  });
});

describe('test environment mocks', () => {
  it('mocks AsyncStorage in memory', async () => {
    await AsyncStorage.setItem('k', 'v');
    expect(await AsyncStorage.getItem('k')).toBe('v');
  });

  it('mocks expo-notifications', async () => {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'Thawed' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date() },
    });
    expect(typeof id).toBe('string');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });
});

describe('rendering', () => {
  it('renders design-system text', async () => {
    await render(<AppText variant="displayXL">Chill</AppText>);
    expect(screen.getByText('Chill')).toBeOnTheScreen();
  });
});
