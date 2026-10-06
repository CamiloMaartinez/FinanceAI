import { router } from 'expo-router';
import type { View } from 'react-native';
import type { CardRect } from '../components/AccountCard';

/**
 * Abre el detalle de una cuenta. `origin` es dónde estaba la tarjeta (o la
 * fila) en pantalla: el detalle la hace crecer desde ahí hasta el encabezado.
 */
export function openAccountDetail(id: string, origin: CardRect | null) {
  const params: Record<string, string> = { id };
  if (origin) {
    params.ox = String(Math.round(origin.x));
    params.oy = String(Math.round(origin.y));
    params.ow = String(Math.round(origin.width));
    params.oh = String(Math.round(origin.height));
  }
  router.push({ pathname: '/account/[id]', params });
}

/**
 * Mide un elemento en pantalla y llama a `done` con su rectángulo. Si la
 * medida no llega en 80 ms (vista desmontada, o en pruebas), sigue sin origen.
 */
export function measureOrigin(node: View | null, done: (origin: CardRect | null) => void) {
  let called = false;
  const finish = (origin: CardRect | null) => {
    if (called) return;
    called = true;
    done(origin);
  };
  setTimeout(() => finish(null), 80);
  if (!node?.measureInWindow) return finish(null);
  node.measureInWindow((x, y, width, height) => finish(width > 0 ? { x, y, width, height } : null));
}

/** Lee el rectángulo de origen de los parámetros de la ruta. */
export function originFromParams(p: { ox?: string; oy?: string; ow?: string; oh?: string }): CardRect | null {
  const [x, y, width, height] = [p.ox, p.oy, p.ow, p.oh].map((v) => Number(v));
  return [x, y, width, height].every((n) => Number.isFinite(n)) && width > 0 ? { x, y, width, height } : null;
}
