/**
 * Dexie.js database setup for IndexedDB storage.
 * All app data is stored locally in the browser — no server needed.
 *
 * Dexie makes IndexedDB easy to use with a simple API.
 */

import Dexie, { Table } from "dexie";
import {
  Transaction, Category, Budget, SavingsGoal, SavingsContribution,
  Debt, DebtPayment, RecurringExpense, Reminder, ExchangeRate, AppSettings
} from "./types";
import { DEFAULT_CATEGORIES, DEFAULT_EXCHANGE_RATES } from "./constants";

// Define the database schema by extending Dexie
class BudgetDatabase extends Dexie {
  // Declare typed tables — each table is like a database "table" or "collection"
  transactions!: Table<Transaction, number>;
  categories!: Table<Category, number>;
  budgets!: Table<Budget, number>;
  savingsGoals!: Table<SavingsGoal, number>;
  savingsContributions!: Table<SavingsContribution, number>;
  debts!: Table<Debt, number>;
  debtPayments!: Table<DebtPayment, number>;
  recurringExpenses!: Table<RecurringExpense, number>;
  reminders!: Table<Reminder, number>;
  exchangeRates!: Table<ExchangeRate, number>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super("PersonalBudgetDB");

    // Version 1: initial schema
    // The string after ++ means auto-increment primary key
    // Other strings are indexed fields (for fast lookups)
    this.version(1).stores({
      transactions: "++id, type, categoryId, date, currency, isRecurring",
      categories: "++id, name, type, isDefault",
      budgets: "++id, categoryId, month, currency",
      savingsGoals: "++id, isEmergencyFund, isCompleted",
      savingsContributions: "++id, goalId, date",
      debts: "++id, isCompleted",
      debtPayments: "++id, debtId, date",
      recurringExpenses: "++id, categoryId, frequency, isActive",
      reminders: "++id, dueDate, isDone",
      exchangeRates: "++id, fromCurrency, toCurrency",
      settings: "++id",
    });
  }
}

// Create a single database instance — this is the "db" used everywhere in the app
export const db = new BudgetDatabase();

// ─── Seed Data ────────────────────────────────────────────────────────────────

/**
 * Called once when the app first loads.
 * Adds default categories and settings if none exist.
 */
export async function seedDatabase() {
  const now = new Date().toISOString();

  // Only seed if there are no categories yet
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkAdd(
      DEFAULT_CATEGORIES.map((cat) => ({ ...cat, createdAt: now }))
    );
  }

  // Only seed if there are no settings yet
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      defaultCurrency: "NGN",
      needsPercentage: 50,
      wantsPercentage: 30,
      savingsPercentage: 20,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Seed exchange rates if none exist
  const rateCount = await db.exchangeRates.count();
  if (rateCount === 0) {
    await db.exchangeRates.bulkAdd(
      DEFAULT_EXCHANGE_RATES.map((r) => ({
        fromCurrency: r.from,
        toCurrency: r.to,
        rate: r.rate,
        updatedAt: now,
      }))
    );
  }
}

// ─── Settings Helpers ─────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.toArray();
  if (settings.length === 0) {
    await seedDatabase();
    return (await db.settings.toArray())[0];
  }
  return settings[0];
}

export async function updateSettings(updates: Partial<AppSettings>) {
  const settings = await getSettings();
  if (settings.id) {
    await db.settings.update(settings.id, { ...updates, updatedAt: new Date().toISOString() });
  }
}

// ─── Currency Conversion ──────────────────────────────────────────────────────

/**
 * Convert an amount from one currency to another using stored manual rates.
 * Falls back to 1:1 if no rate is found (and shows a warning).
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<number> {
  if (from === to) return amount;

  // Try direct rate
  const direct = await db.exchangeRates
    .where("fromCurrency").equals(from)
    .filter((r) => r.toCurrency === to)
    .first();

  if (direct) return amount * direct.rate;

  // Try via USD as intermediate (from → USD → to)
  const toUsd = await db.exchangeRates
    .where("fromCurrency").equals(from)
    .filter((r) => r.toCurrency === "USD")
    .first();
  const fromUsd = await db.exchangeRates
    .where("fromCurrency").equals("USD")
    .filter((r) => r.toCurrency === to)
    .first();

  if (toUsd && fromUsd) return amount * toUsd.rate * fromUsd.rate;

  // No rate found — return as-is (1:1)
  console.warn(`No exchange rate found for ${from} → ${to}, using 1:1`);
  return amount;
}

// ─── Export / Import ──────────────────────────────────────────────────────────

/** Export all data as a JSON backup object */
export async function exportAllData() {
  const [
    transactions, categories, budgets, savingsGoals, savingsContributions,
    debts, debtPayments, recurringExpenses, reminders, exchangeRates, settings
  ] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.budgets.toArray(),
    db.savingsGoals.toArray(),
    db.savingsContributions.toArray(),
    db.debts.toArray(),
    db.debtPayments.toArray(),
    db.recurringExpenses.toArray(),
    db.reminders.toArray(),
    db.exchangeRates.toArray(),
    db.settings.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions, categories, budgets, savingsGoals, savingsContributions,
    debts, debtPayments, recurringExpenses, reminders, exchangeRates, settings,
  };
}

// Type for the backup data shape
type BackupData = {
  version: number;
  exportedAt: string;
  transactions?: Transaction[];
  categories?: Category[];
  budgets?: Budget[];
  savingsGoals?: SavingsGoal[];
  savingsContributions?: SavingsContribution[];
  debts?: Debt[];
  debtPayments?: DebtPayment[];
  recurringExpenses?: RecurringExpense[];
  reminders?: Reminder[];
  exchangeRates?: ExchangeRate[];
  settings?: AppSettings[];
};

/** Import a JSON backup — replaces ALL existing data after confirmation */
export async function importAllData(data: BackupData) {
  // Clear all existing data
  await Promise.all([
    db.transactions.clear(),
    db.categories.clear(),
    db.budgets.clear(),
    db.savingsGoals.clear(),
    db.savingsContributions.clear(),
    db.debts.clear(),
    db.debtPayments.clear(),
    db.recurringExpenses.clear(),
    db.reminders.clear(),
    db.exchangeRates.clear(),
    db.settings.clear(),
  ]);

  // Re-insert all data (strip ids so they auto-increment fresh)
  if (data.categories?.length) await db.categories.bulkAdd(data.categories);
  if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions);
  if (data.budgets?.length) await db.budgets.bulkAdd(data.budgets);
  if (data.savingsGoals?.length) await db.savingsGoals.bulkAdd(data.savingsGoals);
  if (data.savingsContributions?.length) await db.savingsContributions.bulkAdd(data.savingsContributions);
  if (data.debts?.length) await db.debts.bulkAdd(data.debts);
  if (data.debtPayments?.length) await db.debtPayments.bulkAdd(data.debtPayments);
  if (data.recurringExpenses?.length) await db.recurringExpenses.bulkAdd(data.recurringExpenses);
  if (data.reminders?.length) await db.reminders.bulkAdd(data.reminders);
  if (data.exchangeRates?.length) await db.exchangeRates.bulkAdd(data.exchangeRates);
  if (data.settings?.length) await db.settings.bulkAdd(data.settings);
}

/** Delete all data from every table (used in Settings "Clear all data") */
export async function clearAllData() {
  await Promise.all([
    db.transactions.clear(),
    db.budgets.clear(),
    db.savingsGoals.clear(),
    db.savingsContributions.clear(),
    db.debts.clear(),
    db.debtPayments.clear(),
    db.recurringExpenses.clear(),
    db.reminders.clear(),
  ]);
  // Re-seed defaults
  await seedDatabase();
}
