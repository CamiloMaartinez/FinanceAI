import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useColors, fonts, radius, spacing, type ThemeColors } from '../../constants/theme';
import { springMomentum, springPress } from '../../constants/motion';
import { TAB_BAR_PILL_HEIGHT, TAB_BAR_GAP } from '../../constants/layout';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';
import { hapticToggle } from '../../utils/haptics';

// Las pantallas ocultas (href: null) se abren desde "Más": mientras una de
// ellas está activa, se resalta esa pestaña para no dejar la barra sin estado.
const FALLBACK_ROUTE = 'more';

/**
 * Barra flotante tipo píldora. Un indicador celeste se desliza con un
 * resorte hasta la pestaña activa, que se ensancha para mostrar su
 * etiqueta. Respeta el evento tabPress y las pestañas ocultas de Expo Router.
 */
export function AnimatedTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const { reduceMotion } = useAccessibilityPreferences();
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});

  const visibleRoutes = state.routes.filter(
    (route) => (StyleSheet.flatten(descriptors[route.key].options.tabBarItemStyle) as { display?: string } | undefined)?.display !== 'none'
  );
  const focusedName = state.routes[state.index]?.name;
  const activeName = visibleRoutes.some((r) => r.name === focusedName) ? focusedName : FALLBACK_ROUTE;
  const activeKey = visibleRoutes.find((r) => r.name === activeName)?.key;

  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  useEffect(() => {
    const target = activeKey ? layouts[activeKey] : undefined;
    if (!target) return;
    if (indicatorOpacity.value === 0 || reduceMotion) {
      // Primera medida (o movimiento reducido): aparece en su lugar, sin viajar
      indicatorX.value = target.x;
      indicatorW.value = target.width;
      indicatorOpacity.value = withTiming(1, { duration: 150 });
    } else {
      indicatorX.value = withSpring(target.x, springMomentum);
      indicatorW.value = withSpring(target.width, springMomentum);
    }
  }, [activeKey, layouts, reduceMotion, indicatorX, indicatorW, indicatorOpacity]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    width: indicatorW.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  const onItemLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => (prev[key]?.x === x && prev[key]?.width === width ? prev : { ...prev, [key]: { x, width } }));
  };

  return (
    <View
      pointerEvents="box-none"
      style={[s.wrapper, { paddingBottom: Math.max(insets.bottom, TAB_BAR_GAP) }]}
    >
      <View style={s.bar} accessibilityRole="tablist">
        <Animated.View style={[s.indicator, indicatorStyle]} pointerEvents="none" />
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = route.name === activeName;
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (route.name !== focusedName && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <TabItem
              key={route.key}
              label={label}
              focused={focused}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              testID={options.tabBarButtonTestID}
              renderIcon={(color) => options.tabBarIcon?.({ focused, color, size: 22 }) ?? null}
              onPress={onPress}
              onLongPress={onLongPress}
              onLayout={onItemLayout(route.key)}
              reduceMotion={reduceMotion}
              s={s}
              c={c}
            />
          );
        })}
      </View>
    </View>
  );
}

interface TabItemProps {
  label: string;
  focused: boolean;
  accessibilityLabel: string;
  testID?: string;
  renderIcon: (color: string) => React.ReactNode;
  onPress: () => void;
  onLongPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
  reduceMotion: boolean;
  s: ReturnType<typeof createStyles>;
  c: ThemeColors;
}

function TabItem({
  label, focused, accessibilityLabel, testID, renderIcon, onPress, onLongPress, onLayout, reduceMotion, s, c,
}: TabItemProps) {
  const scale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[s.item, focused ? s.itemFocused : null]}
      layout={reduceMotion ? undefined : LinearTransition.springify().dampingRatio(0.85).duration(380)}
      onLayout={onLayout}
    >
      <Pressable
        style={s.pressable}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => {
          hapticToggle();
          if (!reduceMotion) scale.value = withSequence(withTiming(0.85, { duration: 90 }), withSpring(1, springPress));
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        hitSlop={4}
      >
        <Animated.View style={iconStyle}>{renderIcon(focused ? c.onChip : c.textSecondary)}</Animated.View>
        {focused && (
          <Animated.Text
            entering={reduceMotion ? undefined : FadeIn.duration(180).delay(80)}
            exiting={reduceMotion ? undefined : FadeOut.duration(100)}
            numberOfLines={1}
            style={s.label}
          >
            {label}
          </Animated.Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.lg,
    },
    bar: {
      height: TAB_BAR_PILL_HEIGHT,
      borderRadius: radius.pill,
      backgroundColor: c.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...c.shadow.lg,
    },
    indicator: {
      position: 'absolute',
      left: 0,
      top: 8,
      bottom: 8,
      borderRadius: radius.pill,
      backgroundColor: c.chip,
    },
    item: { flex: 1, height: '100%' },
    itemFocused: { flex: 2.4 },
    pressable: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 6,
    },
    label: { fontFamily: fonts.semibold, fontSize: 13, color: c.onChip, flexShrink: 1 },
  });
}
