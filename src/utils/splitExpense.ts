// División de un gasto en partes iguales entre `people` personas (incluido
// el usuario). Las partes de los demás se redondean a pesos enteros y lo que
// sobra o falta por el redondeo queda en la parte del usuario, para que
// todo sume exactamente el total.
export function splitAmount(total: number, people: number): { myShare: number; otherShare: number } {
  if (people < 2) return { myShare: total, otherShare: 0 };
  const otherShare = Math.round(total / people);
  return { myShare: total - otherShare * (people - 1), otherShare };
}
