// Geometría de "La Billetera". Función pura: dado cuántas tarjetas hay y cuál
// está abierta, devuelve la posición Y de cada una. Las tarjetas se animan a
// esa posición con un resorte (translateY), nunca animando height/top.

export const CARD_ASPECT = 1.586;   // proporción ISO/IEC 7810 ID-1 (tarjeta real)
export const MAX_CARD_WIDTH = 460;  // tope en tablets / web

/** Franja visible de cada tarjeta mientras el mazo está cerrado. */
export const STACK_PEEK = 76;
/** Con una tarjeta abierta, las demás se comprimen abajo con este paso. */
export const OPEN_STEP = 14;
export const OPEN_MAX_STEPS = 3;
/** Parte visible de la última tarjeta restante (alcanza para ícono + nombre). */
export const OPEN_LAST_VISIBLE = 64;

export const DETAILS_GAP = 12;
export const DETAILS_OVERLAP = 20;      // el panel de vidrio tapa el borde superior del mazo
export const DETAILS_MIN_HEIGHT = 176;  // hasta que onLayout mida el real

/** Margen para que la sombra no quede recortada por el contenedor. */
export const SHADOW_PAD = 24;

/** Distancia (o proyección de momentum) de arrastre hacia abajo que cierra la tarjeta. */
export const DISMISS_DISTANCE = 96;

export interface StackLayout {
  /** translateY objetivo de cada tarjeta, en el mismo orden que `accounts`. */
  ys: number[];
  /** Alto del mazo sin contar SHADOW_PAD. */
  height: number;
  /** Y donde vive el panel de detalles de la tarjeta abierta. */
  detailsY: number;
}

export function computeStackLayout(
  count: number,
  expandedIndex: number | null,
  cardHeight: number,
  detailsHeight: number,
): StackLayout {
  const detailsY = cardHeight + DETAILS_GAP;

  if (expandedIndex === null || expandedIndex < 0 || expandedIndex >= count) {
    return {
      ys: Array.from({ length: count }, (_, i) => i * STACK_PEEK),
      height: count > 0 ? (count - 1) * STACK_PEEK + cardHeight : 0,
      detailsY,
    };
  }

  const detailsBottom = detailsY + detailsHeight;
  const base = detailsBottom - DETAILS_OVERLAP;
  const others = count - 1;

  let k = 0;
  const ys = Array.from({ length: count }, (_, i) => {
    if (i === expandedIndex) return 0;
    const y = base + Math.min(k, OPEN_MAX_STEPS) * OPEN_STEP;
    k += 1;
    return y;
  });

  const height =
    others === 0
      ? detailsBottom
      : base + Math.min(others - 1, OPEN_MAX_STEPS) * OPEN_STEP + OPEN_LAST_VISIBLE;

  return { ys, height, detailsY };
}
