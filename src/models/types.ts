// ─── Cuentas ───────────────────────────────────────────────
export type AccountType =
  | 'checking'    // Cuenta corriente
  | 'savings'     // Ahorros
  | 'cash'        // Efectivo
  | 'digital'     // Nequi, Daviplata, Nu
  | 'investment'  // Inversiones
  | 'credit';     // Tarjeta de crédito

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string; // 'COP' | 'USD' | 'EUR'
  colorHex: string;
  /** Segundo color del degradado de la tarjeta (null = color sólido). */
  gradientTo?: string | null;
  iconName: string;
  isActive: boolean;
  createdAt: string; // ISO string: "2024-01-15T10:30:00.000Z"
}

// ─── Categorías ────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  iconName: string;
  colorHex: string;
  isDefault: boolean;
  subcategories: string[];
}

// ─── Transacciones ─────────────────────────────────────────
export type TransactionType =
  | 'income'      // Ingreso
  | 'expense'     // Gasto
  | 'transfer'    // Transferencia entre cuentas
  | 'investment'  // Inversión
  | 'loan'        // Préstamo recibido (antiguo)
  | 'payment'     // Pago de deuda (antiguo; cuenta como gasto)
  // Módulo de deudas: mueven dinero pero NO son ingreso ni gasto
  | 'debt_in'     // Entra dinero: me prestan o me pagan lo que me deben
  | 'debt_out';   // Sale dinero: presto o pago lo que debo

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: string;
  accountId: string;
  categoryId: string | null;
  notes: string;
  tags: string[];
  createdAt: string;
  // Solo en transferencias: la cuenta que recibe el dinero (accountId es
  // la que lo envía)
  toAccountId?: string | null;
  // Transferencias entre monedas: monto que llega, en la moneda de la
  // cuenta destino (null = mismo monto)
  toAmount?: number | null;
  // Ruta relativa de la foto del recibo (services/receiptStorage.ts)
  receiptUri?: string | null;
}

// Transacción con datos de categoría ya unidos (para mostrar en listas)
export interface TransactionWithCategory extends Transaction {
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  accountName?: string;
  accountColor?: string;
  toAccountName?: string;
  toAccountCurrency?: string;
}

// Lo que se necesita para crear o editar un movimiento
export interface TransactionInput {
  amount: number;
  type: TransactionType;
  date: string;
  accountId: string;
  toAccountId: string | null;
  toAmount?: number | null;
  categoryId: string | null;
  notes: string;
  receiptUri?: string | null;
}

// ─── Movimientos recurrentes ───────────────────────────────
// Regla que genera un movimiento automáticamente cada cierto tiempo
// (salario, arriendo, servicios). Ver src/utils/recurrence.ts.
export interface RecurringTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  accountId: string;
  categoryId: string | null;
  notes: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  anchorDay: number;   // día del mes original (para la frecuencia mensual)
  nextDate: string;    // ISO: próxima vez que se genera
  isActive: boolean;
  createdAt: string;
  accountName?: string;
  categoryName?: string;
}

// ─── Metas ─────────────────────────────────────────────────
export type GoalPriority = 'low' | 'medium' | 'high';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: GoalPriority;
  iconName: string;
  colorHex: string;
  isCompleted: boolean;
  createdAt: string;
}

// Aporte automático a una meta ("$100.000 cada quincena")
export interface GoalAutoContribution {
  id: string;
  goalId: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  anchorDay: number;
  nextDate: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Suscripciones ─────────────────────────────────────────
export type BillingFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: BillingFrequency;
  nextBillingDate: string;
  iconName: string;
  colorHex: string;
  isActive: boolean;
  createdAt: string;
  // Día del mes en que se cobra originalmente (31 → 28 feb → 31 mar).
  // null en suscripciones creadas antes de existir este campo.
  anchorDay?: number | null;
}

// ─── Presupuestos ───────────────────────────────────────────
export interface Budget {
  id: string;
  month: number;  // 1-12
  year: number;
  totalLimit: number;
  categoryLimits: Record<string, number>; // { categoryId: limite }
  isAIGenerated: boolean;
  createdAt: string;
}

// ─── Dashboard ─────────────────────────────────────────────
export interface MonthlyChartPoint {
  month: string;   // "Ene", "Feb", ...
  income: number;
  expense: number;
}

/** Periodos de la gráfica de patrimonio del dashboard. */
export type NetWorthPeriod = '7d' | '30d' | '3m' | '6m' | '1a' | 'all';

export interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNet: number;
  savingsRate: number;
  monthlyChart: MonthlyChartPoint[];
  netWorthHistory: { label: string; value: number }[];
  recentTransactions: TransactionWithCategory[];
  /** Cambio del saldo de cada cuenta en el mes, en su moneda (id → monto). */
  accountChanges: Record<string, number>;
  netWorthPeriod: NetWorthPeriod;
  setNetWorthPeriod: (period: NetWorthPeriod) => void;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ─── Tarjetas ──────────────────────────────────────────────
export interface Card {
  id: string;
  name: string;
  bank: string;
  annualFee: number;
  cashbackPercent: number;
  interestRate: number;
  benefits: string[];
  colorHex: string;
  isFavorite: boolean;
  createdAt: string;
}

// ─── Alertas ───────────────────────────────────────────────
export type AlertType =
  | 'balance_below'
  | 'monthly_expense_above'
  | 'category_expense_above'
  | 'goal_progress'
  | 'savings_rate_below';

export interface Alert {
  id: string;
  title: string;
  type: AlertType;
  condition: string;
  threshold: number;
  categoryId: string | null;
  isActive: boolean;
  lastTriggered: string | null;
  createdAt: string;
}

// ─── Retos financieros ───────────────────────────────────────
export type ChallengeStatus = 'active' | 'completed' | 'failed';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  createdAt: string;
}

// ─── Deudas y préstamos ──────────────────────────────────────
// owed_to_me: le presté a alguien (me debe). i_owe: alguien me prestó.
export type DebtDirection = 'owed_to_me' | 'i_owe';

export interface Debt {
  id: string;
  direction: DebtDirection;
  personName: string;
  amount: number;            // monto original
  notes: string;
  date: string;              // cuándo se prestó
  dueDate: string | null;    // fecha límite para pagar, si la hay
  accountId: string | null;  // cuenta de donde salió / a donde entró el dinero
  transactionId: string | null;
  isSettled: boolean;
  settledAt: string | null;
  createdAt: string;
  // Calculados al leer
  paidAmount: number;
  remaining: number;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  accountId: string | null;
  transactionId: string | null;
  createdAt: string;
}