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
  | 'loan'        // Préstamo recibido
  | 'payment';    // Pago de deuda

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
}

// Transacción con datos de categoría ya unidos (para mostrar en listas)
export interface TransactionWithCategory extends Transaction {
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  accountName?: string;
  accountColor?: string;
  toAccountName?: string;
}

// Lo que se necesita para crear o editar un movimiento
export interface TransactionInput {
  amount: number;
  type: TransactionType;
  date: string;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  notes: string;
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

export interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNet: number;
  savingsRate: number;
  monthlyChart: MonthlyChartPoint[];
  netWorthHistory: { label: string; value: number }[];
  recentTransactions: TransactionWithCategory[];
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