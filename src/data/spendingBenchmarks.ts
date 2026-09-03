// Porcentaje de referencia del ingreso mensual que suele destinarse a cada
// categoría, según reglas generales de presupuesto personal (no son datos
// reales de otros usuarios de la app — aquí no hay backend ni analítica
// compartida). Sirven como punto de comparación orientativo, no como una
// verdad estadística exacta.
export const SPENDING_BENCHMARKS: Record<string, number> = {
  'cat-alimentacion':    0.15,
  'cat-transporte':      0.10,
  'cat-entretenimiento': 0.05,
  'cat-salud':           0.05,
  'cat-educacion':       0.05,
  'cat-tecnologia':      0.03,
  'cat-hogar':           0.20,
  'cat-viajes':          0.03,
  'cat-inversiones':     0.10,
  'cat-suscripciones':   0.02,
  'cat-mascotas':        0.02,
  'cat-otros':           0.05,
};
