/**
 * All TypeScript types and interfaces for the Personal Budget Manager.
 * These define the shape of all data stored in IndexedDB.
 */

// ─── Transaction (Income or Expense) ────────────────────────────────────────

export type TransactionType = "income" | "expense";

export interface Transaction {
  id?: number;
  type: TransactionType;
  amount: number;
  currency: string;
  categoryId: number;
  date: string; // ISO date string e.g. "2024-01-15"
  notes?: string;
  paymentMethod?: string; // for expenses: cash, card, bank transfer, etc.
  receiptPath?: string; // base64 data URL of uploaded receipt image
  receiptName?: string; // original filename of receipt
  isRecurring?: boolean;
  recurringExpenseId?: number; // link to recurring expense template
  createdAt: string;
  updatedAt: string;
}

// ─── Category ────────────────────────────────────────────────────────────────

export type CategoryType = "need" | "want" | "saving_debt";

export interface Category {
  id?: number;
  name: string;
  type: CategoryType; // for 50/30/20 rule classification
  icon?: string; // emoji or icon name
  color?: string; // hex color for charts
  isDefault: boolean; // default categories can't be deleted
  createdAt: string;
}

// ─── Monthly Budget ──────────────────────────────────────────────────────────

export interface Budget {
  id?: number;
  categoryId: number;
  month: string; // "YYYY-MM" format e.g. "2024-01"
  limitAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Savings Goals ───────────────────────────────────────────────────────────

export interface SavingsGoal {
  id?: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate?: string; // ISO date string
  notes?: string;
  isEmergencyFund: boolean; // special flag for emergency fund
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsContribution {
  id?: number;
  goalId: number;
  amount: number;
  currency: string;
  date: string;
  notes?: string;
  isLocked: boolean; // locked contributions can't be edited without confirmation
  createdAt: string;
}

// ─── Debt Tracking ───────────────────────────────────────────────────────────

export interface Debt {
  id?: number;
  name: string; // e.g. "Car Loan", "Credit Card"
  totalAmount: number;
  amountPaid: number;
  interestRate?: number; // annual percentage
  minimumPayment?: number;
  dueDate?: string;
  currency: string;
  notes?: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id?: number;
  debtId: number;
  amount: number;
  currency: string;
  date: string;
  notes?: string;
  createdAt: string;
}

// ─── Recurring Expenses ──────────────────────────────────────────────────────

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringExpense {
  id?: number;
  name: string;
  amount: number;
  currency: string;
  categoryId: number;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  notes?: string;
  isActive: boolean;
  lastGeneratedDate?: string; // track when we last auto-generated a transaction
  createdAt: string;
  updatedAt: string;
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export interface Reminder {
  id?: number;
  title: string;
  dueDate: string;
  amount?: number;
  currency?: string;
  categoryId?: number;
  notes?: string;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Currency & Exchange Rates ───────────────────────────────────────────────

export interface Currency {
  code: string; // e.g. "NGN", "USD"
  name: string; // e.g. "Nigerian Naira"
  symbol: string; // e.g. "₦"
}

export interface ExchangeRate {
  id?: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number; // 1 unit of fromCurrency = rate units of toCurrency
  updatedAt: string;
}

// ─── App Settings ────────────────────────────────────────────────────────────

export interface AppSettings {
  id?: number;
  defaultCurrency: string;
  // 50/30/20 rule: which category types map to needs/wants/savings
  needsPercentage: number; // default 50
  wantsPercentage: number; // default 30
  savingsPercentage: number; // default 20
  emergencyFundGoalId?: number; // link to the savings goal used as emergency fund
  createdAt: string;
  updatedAt: string;
}

// ─── UI / Helper Types ───────────────────────────────────────────────────────

export interface MonthOption {
  value: string; // "YYYY-MM"
  label: string; // "January 2024"
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface InsightMessage {
  id: string;
  type: "info" | "warning" | "success" | "danger";
  message: string;
  icon?: string;
}
