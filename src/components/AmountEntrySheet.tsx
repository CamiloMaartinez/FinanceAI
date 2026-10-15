import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors, fonts, radius, spacing, ink, inkDanger, pastels, tabularNums, type ThemeColors } from '../constants/theme';
import { getCurrencyInfo, formatWithCurrency } from '../constants/currencies';
import { useAccessibilityPreferences } from '../hooks/useAccessibilityPreferences';
import { applyAmountKey, amountFromRaw, displayParts, rawFromAmount } from '../utils/amountInput';
import { hapticToggle } from '../utils/haptics';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { Keypad, KEY_DELETE } from './ui/Keypad';
import { SwipeToConfirm } from './ui/SwipeToConfirm';
import { Text } from './ui/Text';
import { splitAmount } from './ui/AmountText';
import { RollingDigits } from './ui/RollingDigits';
import { timingFit } from '../constants/motion';

interface AmountEntrySheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  currency?: string;
  initialValue?: number | null;
  /** Saldo de la cuenta elegida, en la misma moneda ("Disponible: $X"). */
  available?: number | null;
  /** Equivalencia en otra moneda ("≈ US$12,30"), o null si no aplica. */
  equivalence?: (value: number) => string | null;
  confirmLabel?: string;
  /** Fondo del encabezado; rosa pastel por defecto. */
  headerColor?: string;
  onConfirm: (value: number) => void;
  onClose: () => void;
  /** Contenido extra bajo el monto (por ejemplo, la cuenta). */
  children?: React.ReactNode;
}

/**
 * Pantalla de monto al estilo de la referencia: encabezado pastel con el
 * monto gigante (decimales en gris), teclado de teclas redondeadas y
 * "Desliza para confirmar".
 */
export function AmountEntrySheet({
  visible, title, subtitle, currency = 'COP', initialValue, available, equivalence,
  confirmLabel = 'Desliza para confirmar', headerColor = pastels.pink, onConfirm, onClose, children,
}: AmountEntrySheetProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const { reduceMotion } = useAccessibilityPreferences();
  const decimals = currency === 'COP' ? 0 : 2;
  const [raw, setRaw] = useState('');

  useEffect(() => {
    if (visible) setRaw(rawFromAmount(initialValue ?? 0, decimals));
  }, [visible, initialValue, decimals]);

  const value = amountFromRaw(raw);
  const { integer, fraction } = displayParts(raw);
  const symbol = getCurrencyInfo(currency).symbol;
  const equiv = value > 0 && equivalence ? equivalence(value) : null;
  const overAvailable = available != null && value > available;
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', decimals > 0 ? ',' : '', '0', KEY_DELETE];
  const spokenParts = splitAmount(value, currency);
  const spoken = value > 0 ? `${spokenParts.symbol}${spokenParts.integer}${spokenParts.fraction}` : 'cero';

  // G1: si el monto no cabe, se encoge suave (escala, no fontSize)
  const fit = useSharedValue(1);
  const available_ = useRef(0);
  const natural = useRef(0);
  const refit = () => {
    if (!available_.current || !natural.current) return;
    fit.value = withTiming(Math.min(1, available_.current / natural.current), timingFit);
  };
  const onWrapLayout = (e: LayoutChangeEvent) => {
    available_.current = e.nativeEvent.layout.width;
    refit();
  };
  const onAmountLayout = (e: LayoutChangeEvent) => {
    natural.current = e.nativeEvent.layout.width;
    refit();
  };
  const fitStyle = useAnimatedStyle(() => ({ transform: [{ scale: fit.value }] }));

  return (
    <Modal visible={visible} animationType={reduceMotion ? 'fade' : 'slide'} presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[s.root, { backgroundColor: c.background }]}>
        <View style={[s.header, { backgroundColor: headerColor }]}>
          <SafeAreaView edges={['top']}>
            <View style={s.topRow}>
              <AnimatedPressable
                onPress={onClose}
                onPressFeedback={hapticToggle}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                style={s.close}
              >
                <Ionicons name="close" size={22} color={ink} />
              </AnimatedPressable>
              <View style={s.titles}>
                <Text style={s.title} accessibilityRole="header">{title}</Text>
                {!!subtitle && <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>}
              </View>
              <View style={s.close} />
            </View>

            <View style={s.amountWrap} accessible accessibilityLabel={`Monto: ${spoken}`} accessibilityLiveRegion="polite">
              <View style={s.amountFit} onLayout={onWrapLayout}>
                <Animated.View style={[s.amountRow, fitStyle]} onLayout={onAmountLayout}>
                  <Text style={[s.amount, s.symbol]}>{symbol}</Text>
                  {/* Cada dígito tecleado entra desde abajo; los anteriores no se mueven */}
                  <RollingDigits text={integer} anchor="left" style={s.amount} accessibilityLabel={spoken} testID="monto-cifras" />
                  <RollingDigits
                    text={fraction || (decimals > 0 ? ',00' : '')}
                    anchor="left"
                    style={[s.amount, s.fraction]}
                  />
                </Animated.View>
              </View>
              {!!equiv && (
                <Animated.Text entering={reduceMotion ? undefined : FadeIn.duration(200)} style={s.equiv}>
                  {equiv}
                </Animated.Text>
              )}
            </View>

            {available != null && (
              <View style={s.availableRow}>
                <Text style={[s.available, overAvailable && s.availableOver]}>
                  Disponible: {formatWithCurrency(available, currency)}
                </Text>
                {overAvailable && (
                  <Animated.View entering={reduceMotion ? undefined : ZoomIn.duration(180)}>
                    <Ionicons name="alert-circle" size={16} color={s.availableOver.color as string} />
                  </Animated.View>
                )}
              </View>
            )}
          </SafeAreaView>
        </View>

        <ScrollView style={s.extras} contentContainerStyle={s.extrasContent} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={s.bottom}>
          <Keypad
            keys={keys}
            variant="rounded"
            keyHeight={68}
            onKey={(k) => setRaw((prev) => applyAmountKey(prev, k, decimals))}
            onClear={() => setRaw('')}
          />
          <View style={s.swipe}>
            <SwipeToConfirm label={confirmLabel} disabled={!(value > 0)} onConfirm={() => onConfirm(value)} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: {
      borderBottomLeftRadius: radius.sheet,
      borderBottomRightRadius: radius.sheet,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xl,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
    close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.55)' },
    titles: { flex: 1, alignItems: 'center' },
    title: { fontFamily: fonts.bold, fontSize: 18, color: ink },
    subtitle: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(42,27,107,0.72)', marginTop: 2 },
    amountWrap: { alignItems: 'center', marginTop: spacing.xl },
    amountFit: { alignSelf: 'stretch', alignItems: 'center' },
    amountRow: { flexDirection: 'row', alignItems: 'baseline' },
    amount: { fontFamily: fonts.extrabold, fontSize: 60, lineHeight: 70, color: ink, letterSpacing: -1.5, ...tabularNums },
    symbol: { fontFamily: fonts.bold, fontSize: 32, color: 'rgba(42,27,107,0.55)' },
    fraction: { color: 'rgba(42,27,107,0.4)' },
    equiv: { fontFamily: fonts.semibold, fontSize: 15, color: 'rgba(42,27,107,0.72)', marginTop: 2, ...tabularNums },
    availableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md },
    available: { fontFamily: fonts.medium, fontSize: 14, color: 'rgba(42,27,107,0.72)', ...tabularNums },
    availableOver: { color: inkDanger },
    extras: { flexGrow: 0, maxHeight: 140 },
    extrasContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
    bottom: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    swipe: { marginTop: spacing.md, paddingHorizontal: spacing.xs },
  });
}
