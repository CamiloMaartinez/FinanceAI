export type InvestmentRisk = 'bajo' | 'medio' | 'alto' | 'muy_alto';

export interface InvestmentOption {
  id: string;
  name: string;
  category: string;
  description: string;
  minRate: number; // % E.A. aproximado, extremo bajo
  maxRate: number; // % E.A. aproximado, extremo alto
  risk: InvestmentRisk;
  liquidity: string;
  minAmount: string;
  examples: string[];
  iconName: string;
}

// Rangos ILUSTRATIVOS basados en comportamiento histórico típico del mercado
// colombiano — NO son tasas en vivo. Cambian constantemente según el emisor,
// el plazo y las condiciones del mercado. Antes de invertir, siempre verifica
// la tasa vigente directamente con la entidad.
export const INVESTMENT_OPTIONS: InvestmentOption[] = [
  {
    id: 'cdt',
    name: 'CDT',
    category: 'Certificado de Depósito a Término',
    description: 'Depositas un monto fijo por un plazo determinado (30 a 360+ días) y no puedes retirarlo antes sin penalización. Protegido por Fogafín hasta $50 millones.',
    minRate: 8,
    maxRate: 12,
    risk: 'bajo',
    liquidity: 'Bloqueado durante el plazo pactado',
    minAmount: 'Desde $500.000 (varía por banco)',
    examples: ['Bancolombia', 'Davivienda', 'Banco de Bogotá', 'Bancos digitales'],
    iconName: 'lock-closed-outline',
  },
  {
    id: 'cuenta_remunerada',
    name: 'Cuenta de ahorro remunerada',
    category: 'Cuenta digital con rendimientos',
    description: 'Tu dinero genera intereses diarios y puedes retirarlo cuando quieras, sin plazo forzoso. La tasa suele ser variable y puede bajar sin previo aviso.',
    minRate: 8,
    maxRate: 13,
    risk: 'bajo',
    liquidity: 'Inmediata, sin penalización',
    minAmount: 'Desde $0',
    examples: ['Nu', 'Lulo Bank', 'Ualá +', 'RappiPay'],
    iconName: 'flash-outline',
  },
  {
    id: 'fic_renta_fija',
    name: 'Fondo de Inversión Colectiva (renta fija)',
    category: 'Fondo administrado',
    description: 'Un gestor profesional invierte tu dinero junto con el de otras personas en instrumentos de bajo riesgo (CDTs, bonos). Cobra una comisión de administración.',
    minRate: 7,
    maxRate: 10,
    risk: 'bajo',
    liquidity: '1 a 3 días hábiles',
    minAmount: 'Desde $100.000',
    examples: ['Fiduciarias bancarias', 'Skandia', 'Old Mutual'],
    iconName: 'layers-outline',
  },
  {
    id: 'fic_mixto',
    name: 'Fondo de Inversión Colectiva (mixto/renta variable)',
    category: 'Fondo administrado',
    description: 'Combina acciones y renta fija. Mayor potencial de ganancia, pero el valor puede bajar en meses malos del mercado. Pensado para plazos de varios años.',
    minRate: 5,
    maxRate: 15,
    risk: 'medio',
    liquidity: '1 a 3 días hábiles',
    minAmount: 'Desde $100.000',
    examples: ['Fondos accionarios', 'Fondos balanceados'],
    iconName: 'trending-up-outline',
  },
  {
    id: 'acciones',
    name: 'Acciones (bolsa de valores)',
    category: 'Renta variable directa',
    description: 'Compras una parte de una empresa listada en bolsa. El valor sube y baja todos los días según el mercado — puedes ganar más, pero también perder capital.',
    minRate: -20,
    maxRate: 25,
    risk: 'alto',
    liquidity: 'Inmediata en día hábil (requiere comitente)',
    minAmount: 'Desde ~$50.000 con brokers digitales',
    examples: ['BVC (Colombia)', 'Trii', 'Interactive Brokers'],
    iconName: 'bar-chart-outline',
  },
  {
    id: 'cripto',
    name: 'Criptomonedas',
    category: 'Activo digital',
    description: 'Alta volatilidad: el valor puede subir o bajar drásticamente en horas. No está regulado como los productos financieros tradicionales ni protegido por Fogafín.',
    minRate: -50,
    maxRate: 50,
    risk: 'muy_alto',
    liquidity: 'Inmediata (24/7)',
    minAmount: 'Sin mínimo',
    examples: ['Bitcoin', 'Ethereum', 'Exchanges como Buda o Binance'],
    iconName: 'logo-bitcoin',
  },
];
