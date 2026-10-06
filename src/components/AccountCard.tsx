import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { fonts, radius, spacing } from '../constants/theme';
import { springPress } from '../constants/motion';
import { ACCOUNT_TYPE_LABELS, balanceHint } from '../constants/accounts';
import { currencyIcon } from '../constants/accountStyles';
import { useAccessibilityPreferences } from '../hooks/useAccessibilityPreferences';
import { useCountUp } from '../hooks/useCountUp';
import { hapticToggle } from '../utils/haptics';
import { readableTextOn } from '../utils/color';
import { measureOrigin } from '../utils/accountNavigation';
import { formatWithCurrency } from '../constants/currencies';
import { AppIcon } from './icons/AppIcon';
import { AmountText } from './ui/AmountText';
import { IconBadge } from './ui/IconBadge';
import { Text } from './ui/Text';
import type { Account } from '../models/types';

export interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ACCOUNT_CARD_HEIGHT = 176;
const MAX_TILT = 7; // grados
const SHIMMER_WIDTH = 90;

interface AccountCardProps {
  account: Account;
  /** Posición en la lista, para la entrada escalonada. */
  index?: number;
  hidden?: boolean;
  /** Recibe dónde está la tarjeta en pantalla, para expandirla al abrir el detalle. */
  onPress?: (account: Account, origin: CardRect | null) => void;
  onLongPress?: (account: Account) => void;
  /** Sin entrada ni brillo (la tarjeta del detalle ya viene animada). */
  still?: boolean;
  height?: number;
}

/**
 * Tarjeta de cuenta con el color o degradado de la cuenta. Entra
 * escalonada, se inclina hacia el dedo al presionarla, un brillo diagonal
 * la cruza una vez al aparecer y el saldo se anima cuando cambia.
 */
export function AccountCard({
  account, index = 0, hidden, onPress, onLongPress, still, height = ACCOUNT_CARD_HEIGHT,
}: AccountCardProps) {
  const { reduceMotion } = useAccessibilityPreferences();
  const cardRef = useRef<View>(null);
  const size = useSharedValue({ width: 1, height: 1 });
  const scale = useSharedValue(1);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const shimmerX = useSharedValue(-SHIMMER_WIDTH * 2);
  const balance = useCountUp(account.balance, 600, account.balance);

  const text = readableTextOn(account.colorHex);
  const textSoft = text === '#FFFFFF' ? 'rgba(255,255,255,0.78)' : 'rgba(42,27,107,0.72)';
  const typeLabel = ACCOUNT_TYPE_LABELS[account.type] ?? account.type;
  const hint = balanceHint(account.type);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { scale: scale.value },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { rotate: '20deg' }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout;
    size.value = { width, height: h };
    if (!still && !reduceMotion && shimmerX.value < 0) {
      // El brillo pasa una sola vez, después de que la tarjeta terminó de entrar
      shimmerX.value = withDelay(
        250 + Math.min(index, 6) * 70,
        withTiming(width + SHIMMER_WIDTH, { duration: 1100, easing: Easing.inOut(Easing.quad) })
      );
    }
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    if (onPress) hapticToggle();
    if (reduceMotion) return;
    const { locationX, locationY } = e.nativeEvent;
    const { width, height: h } = size.value;
    // La esquina que tocas se hunde: el dedo "empuja" la tarjeta
    rotateY.value = withSpring(((locationX / width) - 0.5) * MAX_TILT * 2, springPress);
    rotateX.value = withSpring(-((locationY / h) - 0.5) * MAX_TILT * 2, springPress);
    scale.value = withSpring(0.97, springPress);
  };
  const handlePressOut = () => {
    rotateX.value = withSpring(0, springPress);
    rotateY.value = withSpring(0, springPress);
    scale.value = withSpring(1, springPress);
  };

  const handlePress = () => {
    if (!onPress) return;
    measureOrigin(cardRef.current, (origin) => onPress(account, origin));
  };

  const balanceText = hidden ? '••••' : formatWithCurrency(account.balance, account.currency);

  return (
    <Animated.View
      entering={still || reduceMotion ? undefined : FadeInDown.springify().damping(18).delay(Math.min(index, 8) * 70)}
      style={styles.outer}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress ? () => onLongPress(account) : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress && !onLongPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${account.name}, ${typeLabel}. ${hint}: ${balanceText}`}
        accessibilityHint={onPress ? 'Abre el detalle de la cuenta' : undefined}
      >
        <Animated.View ref={cardRef} style={[styles.card, { height }, pressStyle]} onLayout={onLayout} collapsable={false}>
          <LinearGradient
            colors={[account.colorHex, account.gradientTo ?? account.colorHex]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {!still && !reduceMotion && (
            <Animated.View pointerEvents="none" style={[styles.shimmer, shimmerStyle]}>
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.42)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}

          <View style={styles.topRow}>
            <IconBadge color="rgba(255,255,255,0.62)" size={42}>
              <AppIcon name={account.iconName} size={24} color="#2A1B6B" accent="#FFFFFF" />
            </IconBadge>
            <View style={[styles.currencyPill, { borderColor: textSoft }]}>
              <AppIcon name={currencyIcon(account.currency)} size={16} color={text} strokeWidth={2.2} />
              <Text style={[styles.currencyText, { color: text }]}>{account.currency}</Text>
            </View>
          </View>

          <View>
            <Text style={[styles.name, { color: text }]} numberOfLines={1}>{account.name}</Text>
            <Text style={[styles.type, { color: textSoft }]}>{typeLabel}</Text>
          </View>

          <View style={styles.balanceRow}>
            {hidden ? (
              <Text style={[styles.hidden, { color: text }]}>••••</Text>
            ) : (
              <AmountText value={balance} currency={account.currency} size={28} color={text} mutedColor={textSoft} style={styles.amount} />
            )}
            <Text style={[styles.hint, { color: textSoft }]}>{hint}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { marginBottom: spacing.md },
  card: {
    borderRadius: radius.xl + 6,
    padding: spacing.lg,
    overflow: 'hidden',
    justifyContent: 'space-between',
    shadowColor: '#2A1B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  shimmer: { position: 'absolute', top: -60, bottom: -60, width: SHIMMER_WIDTH, left: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currencyText: { fontFamily: fonts.semibold, fontSize: 12 },
  name: { fontFamily: fonts.bold, fontSize: 18 },
  type: { fontFamily: fonts.medium, fontSize: 13, marginTop: 1 },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  amount: { flexShrink: 1 },
  hidden: { fontFamily: fonts.extrabold, fontSize: 28 },
  hint: { fontFamily: fonts.medium, fontSize: 13 },
});
