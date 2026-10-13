// Freeze sheet (spec §4.3, design/exports/11-freeze-sheet@2x.png + 12-frozen-solid@2x.png).
//
// Header → top slot (the clipboard suggestion card, or the link field: Paste folds the card into
// the filled field) → photo tile beside name + price → mood chips → auto-guessed category chips →
// cooldown, with a sticky Ice "Freeze it for {cooldown}" CTA 24pt above the bottom edge. Spacing
// follows the Figma frame, so on an 852pt screen the whole form fits above the CTA.
// On submit: the item is frozen, the freezing moment plays (~1.6s), then the thaw reminder is set
// up (permission on the first own freeze) and the sheet is replaced by /item/[id].
// The CTA and the scroll area ride above the software keyboard.

import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type TextInput,
} from 'react-native';

import {
  AppText,
  BOTTOM_GAP,
  CooldownPicker,
  cooldownPhrase,
  IconButton,
  Screen,
  TextField,
} from '@/components';
import { readClipboardSuggestion, type ClipboardSuggestion } from '@/lib/clipboard';
import { useNow } from '@/lib/clock';
import { thawAtFor } from '@/lib/melt';
import { currencySymbol } from '@/lib/money';
import { guessNameFromUrl } from '@/lib/parse';
import { useChillStore } from '@/store/useChillStore';
import { colors } from '@/theme/tokens';
import type { Category, CooldownKey, Item, Mood } from '@/types';

import { ClipboardCard, Collapsible } from './ClipboardCard';
import {
  autoCategory,
  centsToPriceInput,
  formatThawMoment,
  isDraftValid,
  isFirstOwnFreeze,
  linkError,
  NAME_MAX_LENGTH,
  normalizeUrl,
  priceError,
  sanitizePriceInput,
  validPriceCents,
} from './formLogic';
import { CaptionNote, CategoryChips, FieldCaption, MoodChips } from './FormParts';
import { FREEZING_MOMENT_MS, FreezingMoment } from './FreezingMoment';
import { PhotoTile } from './PhotoTile';
import { pickPhoto } from './pickPhoto';
import { scheduleReminder, willNudge } from './scheduleReminder';
import { SheetChrome } from './SheetChrome';
import { StickyCta } from './StickyCta';
import { useKeyboardOverlap } from './useKeyboardOverlap';

/** Blocks holding text inputs that may need scrolling into view above the keyboard. */
type FieldKey = 'details';

/** Space between the end of the form and the sticky CTA when scrolled to the bottom. */
const CTA_CLEARANCE = 16;

/** Space the sticky CTA takes at the bottom of the scroll viewport (button + gap + breathing room). */
const CTA_SPACE = 60 + BOTTOM_GAP + 20;

/** Hidden content (pt) below the fold before the CTA fade switches on. */
const MORE_BELOW_SLACK = 2;

interface Moment {
  item: Item;
  nudge: boolean;
  thawLabel: string;
}

export function FreezeSheet() {
  const router = useRouter();
  const freeze = useChillStore((s) => s.freeze);
  const items = useChillStore((s) => s.items);
  const currency = useChillStore((s) => s.settings.currency);
  const defaultCooldown = useChillStore((s) => s.settings.defaultCooldown);
  const now = useNow(30_000);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [link, setLink] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [pickedCategory, setPickedCategory] = useState<Category | null>(null);
  const [cooldown, setCooldown] = useState<CooldownKey>(defaultCooldown);
  const [touched, setTouched] = useState({ price: false, link: false });
  const [suggestion, setSuggestion] = useState<ClipboardSuggestion | null>(null);
  const [suggestionUsed, setSuggestionUsed] = useState(false);
  const [moment, setMoment] = useState<Moment | null>(null);

  const mounted = useRef(true);
  const submitting = useRef(false);
  const priceRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Clipboard suggestion: read once when the sheet opens (user intent, so the iOS paste prompt is
  // expected). The top slot shows the link field right away and swaps it for the suggestion card if
  // one arrives (the read can wait on a permission prompt) while the field is still empty.
  useEffect(() => {
    let alive = true;
    readClipboardSuggestion().then((s) => {
      if (alive && s) setSuggestion(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Block Android back while the freezing moment plays (the item is already frozen).
  useEffect(() => {
    if (!moment) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [moment]);

  // --- derived ---------------------------------------------------------------

  const draft = { name, price, link };
  const valid = isDraftValid(draft) && moment == null;
  const category: Category = pickedCategory ?? autoCategory(name, link);
  const autoPicked = pickedCategory == null && category !== 'other';
  const thawLabel = formatThawMoment(thawAtFor(now, cooldown), now);
  const priceHint = touched.price ? priceError(price) : null;
  const linkHint = touched.link ? linkError(link) : null;
  const normalizedLink = normalizeUrl(link);
  // The suggestion never hides a link you typed, and isn't offered for something already frozen.
  const showSuggestion =
    suggestion != null && !suggestionUsed && !link.trim() && !items.some((i) => i.url === suggestion.url);

  // --- keyboard-aware scrolling -------------------------------------------------

  const rootRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const keyboard = useKeyboardOverlap(rootRef);
  const keyboardRef = useRef(0);
  const rootHeight = useRef(0);
  const scrollY = useRef(0);
  const boxes = useRef<Partial<Record<FieldKey, { y: number; h: number }>>>({});
  const focused = useRef<FieldKey | null>(null);

  /** Scrolls so the focused field sits between the header and the CTA above the keyboard. */
  const reveal = useCallback((key: FieldKey) => {
    const box = boxes.current[key];
    if (!box || rootHeight.current === 0) return;
    const visible = rootHeight.current - keyboardRef.current - CTA_SPACE;
    const top = scrollY.current + 16;
    const bottom = scrollY.current + visible;
    let target: number | null = null;
    if (box.y + box.h > bottom) target = box.y + box.h - visible;
    else if (box.y < top) target = box.y - 16;
    if (target != null) scrollRef.current?.scrollTo({ y: Math.max(0, target), animated: true });
  }, []);

  useEffect(() => {
    keyboardRef.current = keyboard;
    if (keyboard === 0 || focused.current == null) return;
    const key = focused.current;
    // Wait a frame for the shrunken viewport to lay out before scrolling.
    const t = setTimeout(() => reveal(key), 60);
    return () => clearTimeout(t);
  }, [keyboard, reveal]);

  const trackBox = (key: FieldKey, e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    boxes.current[key] = { y, h: height };
  };
  const focusField = (key: FieldKey) => {
    focused.current = key;
    if (keyboardRef.current > 0 || Platform.OS === 'web') reveal(key);
  };
  // --- CTA fade: only while part of the form is hidden below the fold ---------------

  const [moreBelow, setMoreBelow] = useState(false);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const updateMoreBelow = useCallback(() => {
    if (viewportHeight.current === 0) return;
    setMoreBelow(contentHeight.current - scrollY.current - viewportHeight.current > MORE_BELOW_SLACK);
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    contentHeight.current = e.nativeEvent.contentSize.height;
    viewportHeight.current = e.nativeEvent.layoutMeasurement.height;
    updateMoreBelow();
  };

  // --- actions -------------------------------------------------------------------

  const close = () => {
    if (moment) return;
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  /** Fills the link, plus the name and price where they are still empty (never overwrites typing). */
  const paste = () => {
    if (!suggestion) return;
    if (suggestion.name && !name.trim()) setName(suggestion.name.slice(0, NAME_MAX_LENGTH));
    if (suggestion.priceCents && !price.trim()) setPrice(centsToPriceInput(suggestion.priceCents));
    setLink(suggestion.url);
    setTouched({ price: true, link: true });
    setSuggestionUsed(true);
  };

  const choosePhoto = async () => {
    if (picking) return;
    Keyboard.dismiss();
    // Web: the file dialog may never report a cancel in older browsers, so don't lock the tile there.
    if (Platform.OS !== 'web') setPicking(true);
    const uri = await pickPhoto();
    if (!mounted.current) return;
    setPicking(false);
    if (uri) setPhotoUri(uri);
  };

  const onLinkBlur = () => {
    setTouched((t) => ({ ...t, link: true }));
    // A link with no name yet: suggest one from the URL ('…/chunky-sneakers' → 'Chunky Sneakers').
    const url = normalizeUrl(link);
    if (url && !name.trim()) setName(guessNameFromUrl(url).slice(0, NAME_MAX_LENGTH));
  };

  const submit = () => {
    const priceCents = validPriceCents(price);
    if (!isDraftValid(draft) || priceCents == null || submitting.current) return;
    submitting.current = true;
    Keyboard.dismiss();

    const state = useChillStore.getState();
    const firstOwnFreeze = isFirstOwnFreeze(state.items);
    const item = freeze({
      name: name.trim(),
      priceCents,
      url: normalizedLink ?? undefined,
      imageUri: photoUri ?? undefined,
      category,
      mood,
      cooldown,
    });
    setMoment({
      item,
      nudge: willNudge(state.settings.notificationsEnabled, firstOwnFreeze),
      thawLabel: formatThawMoment(item.thawAt, item.frozenAt),
    });

    void (async () => {
      await new Promise((resolve) => setTimeout(resolve, FREEZING_MOMENT_MS));
      // Permission prompt (first own freeze) lands on "We’ll nudge you." — then the item screen.
      await scheduleReminder(item, firstOwnFreeze);
      if (mounted.current) router.replace(`/item/${item.id}`);
    })();
  };

  // --- render ----------------------------------------------------------------------

  return (
    <View style={styles.fill}>
      <Stack.Screen options={{ gestureEnabled: moment == null }} />
      {Platform.OS === 'android' ? <StatusBar style={moment ? 'dark' : 'light'} /> : null}
      <SheetChrome>
        <View
          ref={rootRef}
          style={[styles.fill, { paddingBottom: keyboard }]}
          onLayout={(e) => {
            rootHeight.current = e.nativeEvent.layout.height;
          }}
        >
          <Screen
            scroll
            safeTop={false}
            scrollRef={scrollRef}
            contentStyle={styles.content}
            scrollProps={{
              onScroll,
              onLayout: (e) => {
                viewportHeight.current = e.nativeEvent.layout.height;
                updateMoreBelow();
              },
              onContentSizeChange: (_w, h) => {
                contentHeight.current = h;
                updateMoreBelow();
              },
              scrollEventThrottle: 32,
              keyboardDismissMode: Platform.OS === 'ios' ? 'interactive' : 'on-drag',
            }}
            bottomPadding={CTA_CLEARANCE}
            footer={
              <StickyCta
                fade={moreBelow}
                label={`Freeze it for ${cooldownPhrase(cooldown)}`}
                icon="snowflake"
                variant="ice"
                disabled={!valid}
                onPress={submit}
                accessibilityHint={valid ? undefined : 'Add a name and a price first'}
                testID="freeze-submit"
              />
            }
            testID="freeze-sheet"
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <AppText variant="titleL" accessibilityRole="header">
                  Freeze it
                </AppText>
                <AppText variant="bodyM" color={colors.text.secondary}>
                  Put the want on ice. Decide later.
                </AppText>
              </View>
              <IconButton icon="close" variant="glass" accessibilityLabel="Close" onPress={close} />
            </View>

            {/* Top slot: the clipboard suggestion, which folds into the (filled) link field on Paste. */}
            <Collapsible open={showSuggestion}>
              {suggestion ? (
                <View style={styles.slot}>
                  <ClipboardCard suggestion={suggestion} currency={currency} onPaste={paste} />
                </View>
              ) : null}
            </Collapsible>
            <Collapsible open={!showSuggestion}>
              <View style={styles.slot}>
                <TextField
                  label="Link (optional)"
                  icon="link"
                  placeholder="Paste a product link"
                  value={link}
                  onChangeText={setLink}
                  keyboardType="url"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => (name.trim() ? priceRef : nameRef).current?.focus()}
                  onBlur={onLinkBlur}
                  hint={linkHint ?? undefined}
                  error={linkHint != null}
                  testID="freeze-link"
                />
              </View>
            </Collapsible>

            <View style={styles.details} onLayout={(e) => trackBox('details', e)}>
              <PhotoTile
                name={name}
                category={category}
                photoUri={photoUri}
                busy={picking}
                onPick={choosePhoto}
                onRemove={() => setPhotoUri(null)}
              />
              <View style={styles.fields}>
                <TextField
                  ref={nameRef}
                  label="What is it?"
                  placeholder="Chunky sneakers"
                  value={name}
                  onChangeText={setName}
                  maxLength={NAME_MAX_LENGTH}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => priceRef.current?.focus()}
                  onFocus={() => focusField('details')}
                  testID="freeze-name"
                />
                <TextField
                  ref={priceRef}
                  label="Price"
                  placeholder="140"
                  prefix={currencySymbol(currency)}
                  value={price}
                  onChangeText={(t) => setPrice(sanitizePriceInput(t))}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  returnKeyType="done"
                  onFocus={() => focusField('details')}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, price: true }));
                    focused.current = null;
                  }}
                  hint={priceHint ?? undefined}
                  error={priceHint != null}
                  testID="freeze-price"
                />
              </View>
            </View>

            <View style={[styles.section, styles.moodSection]}>
              <FieldCaption label="Why do you want it?" style={styles.plainCaption} />
              <MoodChips value={mood} onChange={setMood} />
            </View>

            <View style={styles.section}>
              <FieldCaption
                label="Category"
                trailing={autoPicked ? <CaptionNote icon="sparkles" text="Guessed for you" /> : null}
              />
              <CategoryChips value={category} onChange={setPickedCategory} />
            </View>

            <View style={styles.section}>
              <FieldCaption label="Cooldown" trailing={<CaptionNote text={`Thaws ${thawLabel}`} />} />
              <CooldownPicker value={cooldown} onChange={setCooldown} testID="freeze-cooldown" />
            </View>
          </Screen>
        </View>
      </SheetChrome>

      {moment ? (
        <FreezingMoment
          item={moment.item}
          cooldownLabel={cooldownPhrase(moment.item.cooldown)}
          thawLabel={moment.thawLabel}
          nudge={moment.nudge}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingTop: 32 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1 },
  slot: { paddingTop: 14 },
  details: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 17 },
  fields: { flex: 1, gap: 14 },
  // Section rhythm from 11-freeze-sheet: 13 between sections, 9 under a caption row (20 high with
  // its accessory); the mood caption has none, so its row is the text height with a 10 gap.
  section: { marginTop: 13, gap: 9 },
  moodSection: { marginTop: 17, gap: 10 },
  plainCaption: { minHeight: 14 },
});
