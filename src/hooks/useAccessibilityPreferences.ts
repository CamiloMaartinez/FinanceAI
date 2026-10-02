import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

// apple-design §14: motion/transparency reducida no significa "sin
// feedback", significa un equivalente más sobrio. Este hook centraliza
// las dos señales del sistema para que los componentes decidan su fallback.
export function useAccessibilityPreferences() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => mounted && setReduceMotion(v))
      .catch(() => {});

    // isReduceTransparencyEnabled solo existe en iOS.
    if (Platform.OS === 'ios' && AccessibilityInfo.isReduceTransparencyEnabled) {
      AccessibilityInfo.isReduceTransparencyEnabled()
        .then((v) => mounted && setReduceTransparency(v))
        .catch(() => {});
    }

    const motionSub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (mounted) setReduceMotion(v);
    });
    const transparencySub = Platform.OS === 'ios'
      ? AccessibilityInfo.addEventListener('reduceTransparencyChanged', (v) => {
          if (mounted) setReduceTransparency(v);
        })
      : null;

    return () => {
      mounted = false;
      motionSub?.remove?.();
      transparencySub?.remove?.();
    };
  }, []);

  return { reduceMotion, reduceTransparency };
}
