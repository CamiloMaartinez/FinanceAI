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
}

// Transacción con datos de categoría ya unidos (para mostrar en listas)
export interface TransactionWithCategory extends Transaction {
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  accountName?: string;
  accountColor?: string;
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
  recentTransactions: TransactionWithCategory[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}