import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { buildDemoItems } from '../../store/demo';
import { colors } from '../../theme/tokens';
import type { Item } from '../../types';
import {
  AppText,
  bottomGap,
  Button,
  Chip,
  CoinBurst,
  Confetti,
  ConfirmDialog,
  CooldownPicker,
  cooldownPhrase,
  Cube,
  GLOW_PRESETS,
  GlowBackground,
  glyphForItem,
  Icon,
  ICON_NAMES,
  ItemCard,
  ItemCube,
  Jar,
  jarLevel,
  jarRows,
  Pill,
  PRODUCT_IMAGES,
  productImageFor,
  ProductThumb,
  ProgressBar,
  ReadyBanner,
  ReflectionCard,
  SavedBanner,
  Screen,
  Sheet,
  TextField,
  Toggle,
  topInset,
  type GlowPreset,
} from '..';
import { gaussianStops } from '../Glow';

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 9, 14, 18, 0, 0);

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    name: 'Chunky sneakers',
    priceCents: 14000,
    currency: 'USD',
    category: 'fashion',
    mood: 'hyped',
    frozenAt: NOW - 43 * HOUR,
    thawAt: NOW + 29 * HOUR,
    cooldown: '72h',
    refreezeCount: 0,
    ...overrides,
  };
}

describe('pure helpers', () => {
  it('jarRows rounds level × 6 and clamps', () => {
    expect(jarRows(0)).toBe(0);
    expect(jarRows(0.78)).toBe(5);
    expect(jarRows(1)).toBe(6);
    expect(jarRows(3)).toBe(6);
    expect(jarRows(-1)).toBe(0);
    expect(jarRows(NaN)).toBe(0);
  });

  it('jarLevel uses goal progress, else min(6, letGoCount) rows', () => {
    expect(jarLevel(0.5, 99)).toBe(0.5);
    expect(jarLevel(null, 3)).toBe(0.5);
    expect(jarLevel(undefined, 12)).toBe(1);
    expect(jarLevel(null, 0)).toBe(0);
  });

  it('glyphForItem prefers a name-specific glyph', () => {
    expect(glyphForItem({ name: 'Chunky sneakers', category: 'fashion' })).toBe('footprints');
    expect(glyphForItem({ name: 'Air fryer XL', category: 'home' })).toBe('cooking-pot');
    expect(glyphForItem({ name: 'Puffer jacket', category: 'fashion' })).toBe('shirt');
    expect(glyphForItem({ name: 'Mystery box', category: 'other' })).toBe('bag');
    expect(glyphForItem({ name: 'Serum', category: 'beauty' })).toBe('sparkles');
  });

  it('productImageFor resolves imageUri, then demo renders (demo items only), else null', () => {
    expect(productImageFor({ id: 'u1', name: 'Anything', imageUri: 'file:///a.jpg' })).toEqual({
      uri: 'file:///a.jpg',
    });
    expect(productImageFor({ id: 'demo-sneakers', name: 'Chunky sneakers' })).toBe(PRODUCT_IMAGES.sneakers);
    expect(productImageFor({ id: 'demo-watch', name: 'Smart watch' })).toBeNull(); // no bundled render
    expect(productImageFor({ id: 'u2', name: 'My own thing' })).toBeNull();
    // A user item named like a demo item keeps its category tile (spec §7).
    expect(productImageFor({ id: 'u3', name: 'Puffer jacket' })).toBeNull();
    expect(productImageFor({ id: 'u4', name: 'Chunky sneakers' })).toBeNull();
  });

  it('a product image that fails to load falls back to the category tile', async () => {
    await render(<ProductThumb item={{ id: 'u5', name: 'Gone', category: 'tech', imageUri: 'file:///gone.jpg' }} />);
    await fireEvent(screen.getByTestId('product-photo'), 'error', { nativeEvent: { error: 'missing' } });
    expect(screen.queryByTestId('product-photo')).toBeNull();
  });

  it('bottomGap is 24 except under a tall Android nav bar', () => {
    expect(bottomGap(0)).toBe(24);
    expect(bottomGap(34)).toBe(24); // iPhone home-indicator inset is NOT added
    expect(bottomGap(48)).toBe(56);
  });

  it('topInset uses the safe area when present', () => {
    expect(topInset(54)).toBe(54);
  });

  it('gaussianStops fall off monotonically to 0', () => {
    const stops = gaussianStops(264, 179, 100, 260);
    expect(stops[0].offset).toBe(0);
    expect(stops[stops.length - 1]).toEqual({ offset: 1, opacity: 0 });
    for (let i = 1; i < stops.length; i++) expect(stops[i].opacity).toBeLessThanOrEqual(stops[i - 1].opacity);
    expect(stops[0].opacity).toBeGreaterThan(0.5);
  });

  it('cooldownPhrase', () => {
    expect(cooldownPhrase('72h')).toBe('3 days');
    expect(cooldownPhrase('7d')).toBe('1 week');
  });
});

describe('rendering', () => {
  it('renders every icon', async () => {
    await render(
      <>
        {ICON_NAMES.map((n) => (
          <Icon key={n} name={n} testID={`icon-${n}`} />
        ))}
      </>
    );
    expect(screen.getByTestId('icon-snowflake')).toBeTruthy();
  });

  it('AppText upper-cases captions', async () => {
    await render(<AppText variant="caption">while it melts</AppText>);
    expect(screen.getByText('while it melts')).toHaveStyle({ textTransform: 'uppercase' });
  });

  it('Cube renders at every stage, with image and fallback', async () => {
    await render(
      <>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <Cube key={`a${p}`} progress={p} image={PRODUCT_IMAGES.sneakers} testID={`img-${p}`} />
        ))}
        {[0, 0.5, 1].map((p) => (
          <Cube key={`b${p}`} progress={p} category="tech" testID={`tile-${p}`} />
        ))}
        <Cube progress={NaN} thawed size={80} image="https://example.com/x.png" />
      </>
    );
    expect(screen.getByTestId('img-0')).toHaveProp('accessibilityLabel', '0% melted');
    expect(screen.getByTestId('img-0.5')).toHaveProp('accessibilityLabel', '50% melted');
    expect(screen.getByTestId('tile-1')).toHaveProp('accessibilityLabel', 'Thawed');
  });

  it('ItemCube derives progress and thawed from now', async () => {
    await render(
      <>
        <ItemCube item={item()} now={NOW} testID="cooling" />
        <ItemCube item={item()} now={NOW + 30 * HOUR} testID="thawed" />
      </>
    );
    expect(screen.getByTestId('cooling')).toHaveProp('accessibilityLabel', 'Chunky sneakers, 60% melted');
    expect(screen.getByTestId('thawed')).toHaveProp('accessibilityLabel', 'Chunky sneakers, thawed');
  });

  it('ItemCard shows price and a compact time-left pill, or Ready', async () => {
    const onPress = jest.fn();
    await render(
      <>
        <ItemCard item={item()} now={NOW} onPress={onPress} testID="card" />
        <ItemCard item={item({ id: 'i2', name: 'Lamp', priceCents: 6500 })} now={NOW + 30 * HOUR} onPress={onPress} />
      </>
    );
    expect(screen.getByText('$140')).toBeTruthy();
    expect(screen.getByText('29h left')).toBeTruthy();
    expect(screen.getByText('Ready')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('card'));
    expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1' }));
  });

  it('ReadyBanner and SavedBanner copy', async () => {
    const onDecide = jest.fn();
    await render(
      <>
        <ReadyBanner
          item={item({ name: 'Mushroom lamp', priceCents: 6500, thawAt: NOW - 2 * HOUR })}
          now={NOW}
          onDecide={onDecide}
        />
        <SavedBanner savedCents={93400} letGoCount={8} onPress={() => undefined} />
      </>
    );
    expect(screen.getByText('$65 · thawed 2h ago')).toBeTruthy();
    expect(screen.getByText('$934')).toBeTruthy();
    expect(screen.getByText('saved by letting 8 wants melt away')).toBeTruthy();
    await fireEvent.press(screen.getByText('Decide'));
    expect(onDecide).toHaveBeenCalled();
  });

  it('Button presses unless disabled', async () => {
    const onPress = jest.fn();
    await render(
      <>
        <Button label="Go" onPress={onPress} />
        <Button label="Nope" disabled onPress={onPress} />
      </>
    );
    await fireEvent.press(screen.getByText('Go'));
    await fireEvent.press(screen.getByText('Nope'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Nope')).toBeDisabled();
  });

  it('Chip, Pill, Toggle, CooldownPicker, TextField, ReflectionCard', async () => {
    const onChip = jest.fn();
    const onToggle = jest.fn();
    const onCooldown = jest.fn();
    const onNext = jest.fn();
    await render(
      <>
        <Chip label="Hyped" icon="flame" selected onPress={onChip} />
        <Pill label="6h left" />
        <Toggle value={false} onValueChange={onToggle} accessibilityLabel="Thaw reminders" />
        <CooldownPicker value="72h" onChange={onCooldown} testID="cd" />
        <TextField label="Price" prefix="$" value="140" onChangeText={() => undefined} />
        <ReflectionCard prompt="Where would it live?" onNext={onNext} />
      </>
    );
    await fireEvent.press(screen.getByText('Hyped'));
    await fireEvent.press(screen.getByLabelText('Thaw reminders'));
    await fireEvent.press(screen.getByTestId('cd-7d'));
    await fireEvent.press(screen.getByText('Another question'));
    expect(onChip).toHaveBeenCalled();
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(onCooldown).toHaveBeenCalledWith('7d');
    expect(onNext).toHaveBeenCalled();
    expect(screen.getByText('6h left')).toBeTruthy();
    expect(screen.getByTestId('cd-72h')).toBeSelected();
  });

  it('Jar and ProgressBar', async () => {
    await render(
      <>
        <Jar level={0.5} testID="jar" />
        <ProgressBar progress={0.58} testID="bar" />
      </>
    );
    expect(screen.getByTestId('jar')).toHaveProp('accessibilityLabel', 'Savings glass, 50% full');
    expect(screen.getByTestId('bar')).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 58 });
  });

  it('Screen renders glows, content and a footer for every preset', async () => {
    const presets = Object.keys(GLOW_PRESETS) as GlowPreset[];
    await render(
      <>
        {presets.map((p) => (
          <Screen key={p} glow={p} scroll footer={<Text>footer-{p}</Text>}>
            <Text>body-{p}</Text>
          </Screen>
        ))}
        <GlowBackground top={colors.white} />
      </>
    );
    for (const p of presets) {
      expect(screen.getByText(`body-${p}`)).toBeTruthy();
      expect(screen.getByText(`footer-${p}`)).toBeTruthy();
    }
  });

  it('Sheet and ConfirmDialog show content when visible', async () => {
    const onClose = jest.fn();
    const keep = jest.fn();
    const thaw = jest.fn();
    await render(
      <>
        <Sheet visible title="Why waiting works" onClose={onClose}>
          <Text>sheet body</Text>
        </Sheet>
        <ConfirmDialog
          visible
          title="Thaw it now?"
          message="Waiting is the whole trick — but it’s your call."
          primary={{ label: 'Keep it frozen', onPress: keep }}
          secondary={{ label: 'Thaw now', onPress: thaw }}
          onDismiss={() => undefined}
        />
        <Sheet visible={false} onClose={onClose}>
          <Text>hidden body</Text>
        </Sheet>
      </>
    );
    expect(screen.getByText('sheet body')).toBeTruthy();
    expect(screen.queryByText('hidden body')).toBeNull();
    await fireEvent.press(screen.getByText('Keep it frozen'));
    await fireEvent.press(screen.getByText('Thaw now'));
    expect(keep).toHaveBeenCalled();
    expect(thaw).toHaveBeenCalled();
    await fireEvent.press(screen.getAllByLabelText('Close')[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('CoinBurst fires onBurst and onLanded; Confetti renders without crashing', async () => {
    jest.useFakeTimers();
    const onBurst = jest.fn();
    const onLanded = jest.fn();
    await render(
      <>
        <CoinBurst
          trigger={1}
          origin={{ x: 100, y: 100 }}
          target={{ x: 100, y: 300 }}
          onBurst={onBurst}
          onLanded={onLanded}
        />
        <Confetti trigger={1} />
      </>
    );
    expect(onBurst).toHaveBeenCalledTimes(1);
    await act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onLanded).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('renders the demo freezer cards', async () => {
    const demo = buildDemoItems(NOW).filter((i) => !i.decision);
    await render(
      <>
        {demo.map((i) => (
          <ItemCard key={i.id} item={i} now={NOW} onPress={() => undefined} />
        ))}
      </>
    );
    expect(screen.getByText('Mushroom lamp')).toBeTruthy();
  });
});
