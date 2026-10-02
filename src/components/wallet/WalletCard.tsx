import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/theme';
import { projectMomentum, rubberband, springDefault, springMomentum, springPress } from '../../constants/motion';
import { hapticSave } from '../../utils/haptics';
import type { Account } from '../../models/types';
import { DISMISS_DISTANCE, SHADOW_PAD } from './walletLayout';
import {
  ACCOUNT_TYPE_ICONS,
  ACCOUNT_TYPE_LABELS,
  HIDDEN_AMOUNT,
  formatAccountBalance,
  getCardPalette,
  walletType,
} from './walletTheme';

const PRESS_SCALE = 0.98;

export interface WalletCardProps {
  account: Account;
  cardWidth: number;
  cardHeight: number;
  /** translateY al que el resorte debe llevar la tarjeta (lo calcula el mazo). */
  targetY: number;
  zIndex: number;
  /** Esta tarjeta es la abierta. */
  isSelected: boolean;
  /** La cara completa está a la vista (abierta, o la de más al frente del mazo cerrado). */
  isFull: boolean;
  hideBalance: boolean;
  /** Tap: abrir / cerrar / cambiar de tarjeta. El háptico lo decide quien maneja el estado. */
  onPress: (accountId: string) => void;
  /** Arrastre hacia abajo confirmado: cerrar. El háptico ya se disparó en el worklet. */
  onDismiss: () => void;
}

function WalletCardBase({
  account, cardWidth, cardHeight, targetY, zIndex,
  isSelected, isFull, hideBalance, onPress, onDismiss,
}: WalletCardProps) {
  const c = useColors();
  const reduced = useReducedMotion();
  const palette = useMemo(() => getCardPalette(account.colorHex, c.blue), [account.colorHex, c.blue]);

  const y = useSharedValue(targetY);        // posición en el mazo
  const drag = useSharedValue(0);           // desplazamiento del dedo, aditivo sobre y
  const pressScale = useSharedValue(1);

  // El mazo decide la posición; cada tarjeta la persigue con su propio resorte.
  // Si cambia a mitad de vuelo el resorte parte de donde está la tarjeta ahora.
  useEffect(() => {
    y.set(withSpring(targetY, springDefault));
  }, [targetY, y]);

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDistance(12)
      .onBegin(() => { pressScale.set(withSpring(PRESS_SCALE, springPress)); })
      .onFinalize(() => { pressScale.set(withSpring(1, springPress)); })
      .onEnd((_e, success) => {
        if (success) scheduleOnRN(onPress, account.id);
      });

    // Solo la tarjeta abierta se arrastra. Eje vertical declarado: sin
    // failOffsetX el pan compite con cualquier swipe horizontal futuro.
    const pan = Gesture.Pan()
      .enabled(isSelected)
      .activeOffsetY([-10, 10])
      .failOffsetX([-24, 24])
      .onUpdate((e) => {
        const t = e.translationY;
        // Hacia abajo sigue al dedo 1:1; hacia arriba resiste.
        drag.set(t >= 0 ? t : -rubberband(-t, cardHeight));
      })
      .onEnd((e) => {
        const projected = drag.get() + projectMomentum(e.velocityY);
        if (projected > DISMISS_DISTANCE) {
          scheduleOnRN(hapticSave);   // mismo instante que arranca el cierre
          scheduleOnRN(onDismiss);
        }
        // La velocidad del dedo pasa al resorte: sin costura entre soltar y animar.
        drag.set(withSpring(0, { ...springMomentum, velocity: e.velocityY }));
      });

    return Gesture.Race(pan, tap);
  }, [isSelected, account.id, cardHeight, onPress, onDismiss, drag, pressScale]);

  const animatedStyle = useAnimatedStyle(() => {
    const d = drag.get();
    const dragScale = interpolate(d, [0, 220], [1, 0.96], Extrapolation.CLAMP);
    return {
      transform: [
        { translateY: y.get() + d },
        { scale: reduced ? 1 : pressScale.get() * dragScale },
      ],
      // Movimiento reducido: el feedback de presión pasa a opacidad.
      opacity: reduced ? interpolate(pressScale.get(), [PRESS_SCALE, 1], [0.85, 1], Extrapolation.CLAMP) : 1,
    };
  });

  const balance = hideBalance ? HIDDEN_AMOUNT : formatAccountBalance(account);
  const typeLabel = ACCOUNT_TYPE_LABELS[account.type] ?? account.type;
  const icon = ACCOUNT_TYPE_ICONS[account.type] ?? 'wallet-outline';

  const shadow = useMemo(
    () => ({ ...c.shadow.md, elevation: zIndex + 1 }),   // Android ordena por elevation
    [c.shadow, zIndex],
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.shell,
          shadow,
          { width: cardWidth, height: cardHeight, left: SHADOW_PAD, zIndex, backgroundColor: palette.gradient[1] },
          animatedStyle,
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${account.name}, ${typeLabel}, ${hideBalance ? 'saldo oculto' : balance}`}
        accessibilityHint={isSelected ? 'Cierra los detalles de la cuenta' : 'Abre los detalles de la cuenta'}
        accessibilityState={{ expanded: isSelected }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={() => onPress(account.id)}
      >
        {/* overflow:hidden vive en la capa interior: en iOS clipa la sombra si comparte capa con ella. */}
        <View style={styles.face}>
          <LinearGradient
            colors={palette.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={palette.sheen}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.6, y: 0.7 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[styles.hairline, { borderColor: palette.hairline }]} pointerEvents="none" />

          {/* Franja superior: es lo único visible cuando la tarjeta está tapada por otra. */}
          <View style={styles.header}>
            <View style={[styles.iconBubble, { backgroundColor: palette.chip }]}>
              <Ionicons name={icon} size={22} color={palette.fg} />
            </View>
            <View style={styles.headerText}>
              <Text
                style={[walletType.cardName, { color: palette.fg }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                {account.name}
              </Text>
              <Text
                style={[walletType.meta, { color: palette.fgMuted }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                {typeLabel}
              </Text>
            </View>
            {/* Saldo compacto ↔ saldo grande: crossfade por transición CSS (dos estados, sin gesto). */}
            <Animated.Text
              style={[
                walletType.stripAmount,
                styles.stripAmount,
                { color: palette.fg, opacity: isFull ? 0 : 1, transitionProperty: 'opacity', transitionDuration: '180ms' },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {balance}
            </Animated.Text>
          </View>

          {/* Cara completa: el saldo grande, lo crítico. */}
          <Animated.View
            style={[
              styles.footer,
              { opacity: isFull ? 1 : 0, transitionProperty: 'opacity', transitionDuration: '180ms' },
            ]}
            pointerEvents="none"
          >
            <View style={[styles.currencyChip, { backgroundColor: palette.chip }]}>
              <Text style={[styles.currencyText, { color: palette.fgMuted }]}>{account.currency || 'COP'}</Text>
            </View>
            <Text
              style={[walletType.cardAmount, { color: palette.fg }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              maxFontSizeMultiplier={1.2}
            >
              {balance}
            </Text>
          </Animated.View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export const WalletCard = memo(WalletCardBase);

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    top: 0,
    borderRadius: 26,
  },
  face: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
  },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  stripAmount: { maxWidth: '42%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    gap: 8,
  },
  currencyChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  currencyText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
});
