import { useEffect, useRef, useState } from 'react';
import { useAccessibilityPreferences } from './useAccessibilityPreferences';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Número que cuenta desde su valor anterior hasta `target` (desde 0 la
 * primera vez). El texto tiene que cambiar en cada cuadro, así que el
 * conteo vive en el hilo de JS; dura menos de un segundo y se detiene al
 * llegar. Con "reducir movimiento" salta directo al valor final.
 */
export function useCountUp(target: number, duration = 700, startFrom = 0): number {
  const { reduceMotion } = useAccessibilityPreferences();
  const [value, setValue] = useState(reduceMotion ? target : startFrom);
  const fromRef = useRef(startFrom);

  useEffect(() => {
    if (reduceMotion || duration <= 0) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    if (from === target) return;

    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const next = from + (target - from) * easeOutCubic(t);
      fromRef.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduceMotion]);

  return value;
}
