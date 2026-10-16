import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, {
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useColors, fonts, spacing, tabularNums } from '../../constants/theme';
import { TICKER } from '../../constants/motion';
import { FOREIGN_CURRENCIES, getExchangeRates } from '../../services/exchangeRates';
import { formatCurrency } from '../../utils/currency';
import { Text } from '../ui/Text';

/** "USD $3.950  ·  EUR $4.312" → una vuelta de la cinta. */
export function tickerItems(rates: Record<string, number>): { code: string; value: string }[] {
  return FOREIGN_CURRENCIES.filter((code) => rates[code] > 0).map((code) => ({
    code,
    value: formatCurrency(rates[code]),
  }));
}

interface RatesTickerProps {
  /** Scroll de Inicio: la cinta acelera según su velocidad. */
  scrollY: SharedValue<number>;
}

/**
 * Cinta de tasas de cambio (J5), de los marquees de Pixtta: avanza sola,
 * acelera con la velocidad del scroll (y cambia de sentido al subir) y se
 * pausa cuando sale de la pantalla. Todo corre en el hilo de UI. Con
 * "reducir movimiento" queda quieta. Se lee una vez como un solo texto.
 */
export function RatesTicker({ scrollY }: RatesTickerProps) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const { height: screenHeight } = useWindowDimensions();
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    getExchangeRates().then(setRates);
  }, []);

  const ref = useAnimatedRef<Animated.View>();
  const x = useSharedValue(0);
  const groupWidth = useSharedValue(0);
  const boost = useSharedValue(0);
  const direction = useSharedValue(1);
  const lastY = useSharedValue(0);
  const onScreen = useSharedValue(true);
  const frames = useSharedValue(0);

  useFrameCallback((frame) => {
    const dt = frame.timeSincePreviousFrame ?? 16;
    // Velocidad del scroll en px/s; el empuje decae poco a poco, como en la referencia
    const dy = scrollY.value - lastY.value;
    lastY.value = scrollY.value;
    if (dy !== 0) direction.value = dy > 0 ? 1 : -1;
    const speed = (Math.abs(dy) / dt) * 1000;
    boost.value = Math.max(boost.value * TICKER.decay, Math.min(speed / TICKER.boostDivisor, TICKER.maxBoost));

    // Fuera de pantalla no se mueve: se revisa cada tantos cuadros
    frames.value += 1;
    if (frames.value % TICKER.visibilityEveryFrames === 0) {
      const box = measure(ref);
      if (box) onScreen.value = box.pageY + box.height > 0 && box.pageY < screenHeight;
    }
    if (!onScreen.value || groupWidth.value === 0) return;

    let next = x.value - (dt * TICKER.baseSpeed + boost.value) * direction.value;
    // Dos copias seguidas: al pasar una vuelta completa se vuelve sin salto
    const w = groupWidth.value;
    if (next <= -w) next += w;
    if (next > 0) next -= w;
    x.value = next;
  }, !reduceMotion);

  const trackStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  if (!rates) return null;
  const items = tickerItems(rates);
  if (items.length === 0) return null;
  const spoken = `Tasas de cambio: ${items.map((i) => `1 ${i.code} vale ${i.value} pesos`).join(', ')}`;

  const onGroupLayout = (e: LayoutChangeEvent) => {
    groupWidth.value = e.nativeEvent.layout.width;
  };
  const group = (copy: number) => (
    <View style={styles.group} onLayout={copy === 0 ? onGroupLayout : undefined} key={copy}>
      {/* Se repite para llenar pantallas anchas */}
      {[0, 1, 2].flatMap((round) =>
        items.map((item) => (
          <View key={`${round}-${item.code}`} style={styles.item}>
            <Text style={[styles.code, { color: c.heroTextSecondary }]}>{item.code}</Text>
            <Text style={[styles.value, tabularNums, { color: c.heroText }]}>{item.value}</Text>
            <Text style={[styles.sep, { color: c.heroTextSecondary }]}>·</Text>
          </View>
        )),
      )}
    </View>
  );

  return (
    <Animated.View
      ref={ref}
      style={styles.clip}
      accessible
      accessibilityRole="text"
      accessibilityLabel={spoken}
      testID="cinta-tasas"
    >
      <Animated.View
        style={[styles.track, trackStyle]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {group(0)}
        {group(1)}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // De borde a borde: compensa el padding horizontal del encabezado de Inicio
  clip: { overflow: 'hidden', marginTop: spacing.md, marginHorizontal: -spacing.xl, paddingVertical: 6 },
  track: { flexDirection: 'row', alignSelf: 'flex-start' },
  group: { flexDirection: 'row' },
  item: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingLeft: 14 },
  code: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.8 },
  value: { fontFamily: fonts.semibold, fontSize: 13 },
  sep: { fontFamily: fonts.semibold, fontSize: 13, paddingLeft: 8 },
});
