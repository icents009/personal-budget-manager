/**
 * Custom hooks for reading and writing data from IndexedDB via Dexie.
 * These hooks use React state to keep the UI in sync with the database.
 */

"use client";
import { useState, useEffect, useCallback } from "react";
import { db, seedDatabase } from "@/lib/db";
import {
  Transaction, Category, Budget, SavingsGoal, SavingsContribution,
  Debt, DebtPayment, RecurringExpense, Reminder, ExchangeRate, AppSettings
} from "@/lib/types";

// ─── Generic hook factory ─────────────────────────────────────────────────────

/** Generic hook to load all records from a table and refresh when needed */
function useTable<T>(fetchFn: () => Promise<T[]>, deps: unknown[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFn();
      setData(result);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}

// ─── Seed hook ────────────────────────────────────────────────────────────────

/** Run once on app load to seed default data */
export function useInitDb() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedDatabase().then(() => setReady(true));
  }, []);

  return ready;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export function useTransactions() {
  const { data, loading, refresh } = useTable(() => db.transactions.orderBy("date").reverse().toArray());

  const addTransaction = useCallback(async (t: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    await db.transactions.add({ ...t, createdAt: now, updatedAt: now });
    await refresh();
  }, [refresh]);

  const updateTransaction = useCallback(async (id: number, updates: Partial<Transaction>) => {
    await db.transactions.update(id, { ...updates, updatedAt: new Date().toISOString() });
    await refresh();
  }, [refresh]);

  const deleteTransaction = useCallback(async (id: number) => {
    await db.transactions.delete(id);
    await refresh();
  }, [refresh]);

  return { transactions: data, loading, refresh, addTransaction, updateTransaction, deleteTransaction };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export function useCategories() {
  const { data, loading, refresh } = useTable(() => db.categories.toArray());

  const addCategory = useCallback(async (cat: Omit<Category, "id" | "createdAt">) => {
    await db.categories.add({ ...cat, createdAt: new Date().toISOString() });
    await refresh();
  }, [refresh]);

  const updateCategory = useCallback(async (id: number, updates: Partial<Category>) => {
    await db.categories.update(id, updates);
    await refresh();
  }, [refresh]);

  const deleteCategory = useCallback(async (id: number) => {
    // Check if any transactions use this category
    const count = await db.transactions.where("categoryId").equals(id).count();
    if (count > 0) throw new Error("Category is in use and cannot be deleted.");
    await db.categories.delete(id);
    await refresh();
  }, [refresh]);

  return { categories: data, loading, refresh, addCategory, updateCategory, deleteCategory };
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

export function useBudgets() {
  const { data, loading, refresh } = useTable(() => db.budgets.toArray());

  const upsertBudget = useCallback(async (budget: Omit<Budget, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    // Check if budget for this category/month already exists
    const existing = await db.budgets
      .where("categoryId").equals(budget.categoryId)
      .filter((b) => b.month === budget.month)
      .first();
    if (existing?.id) {
      await db.budgets.update(existing.id, { ...budget, updatedAt: now });
    } else {
      await db.budgets.add({ ...budget, createdAt: now, updatedAt: now });
    }
    await refresh();
  }, [refresh]);

  const deleteBudget = useCallback(async (id: number) => {
    await db.budgets.delete(id);
    await refresh();
  }, [refresh]);

  return { budgets: data, loading, refresh, upsertBudget, deleteBudget };
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export function useSavingsGoals() {
  const { data, loading, refresh } = useTable(() => db.savingsGoals.toArray());

  const addGoal = useCallback(async (goal: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    await db.savingsGoals.add({ ...goal, createdAt: now, updatedAt: now });
    await refresh();
  }, [refresh]);

  const updateGoal = useCallback(async (id: number, updates: Partial<SavingsGoal>) => {
    await db.savingsGoals.update(id, { ...updates, updatedAt: new Date().toISOString() });
    await refresh();
  }, [refresh]);

  const deleteGoal = useCallback(async (id: number) => {
    await db.savingsGoals.delete(id);
    await db.savingsContributions.where("goalId").equals(id).delete();
    await refresh();
  }, [refresh]);

  return { goals: data, loading, refresh, addGoal, updateGoal, deleteGoal };
}

export function useSavingsContributions(goalId?: number) {
  const { data, loading, refresh } = useTable(
    () => goalId
      ? db.savingsContributions.where("goalId").equals(goalId).sortBy("date")
      : db.savingsContributions.toArray(),
    [goalId]
  );

  const addContribution = useCallback(async (c: Omit<SavingsContribution, "id" | "createdAt">) => {
    await db.savingsContributions.add({ ...c, createdAt: new Date().toISOString() });
    // Also update currentAmount on the goal
    const goal = await db.savingsGoals.get(c.goalId);
    if (goal?.id) {
      await db.savingsGoals.update(goal.id, {
        currentAmount: goal.currentAmount + c.amount,
        updatedAt: new Date().toISOString(),
      });
    }
    await refresh();
  }, [refresh]);

  const deleteContribution = useCallback(async (id: number, goalId: number, amount: number) => {
    await db.savingsContributions.delete(id);
    const goal = await db.savingsGoals.get(goalId);
    if (goal?.id) {
      await db.savingsGoals.update(goal.id, {
        currentAmount: Math.max(0, goal.currentAmount - amount),
        updatedAt: new Date().toISOString(),
      });
    }
    await refresh();
  }, [refresh]);

  return { contributions: data, loading, refresh, addContribution, deleteContribution };
}

// ─── Debts ────────────────────────────────────────────────────────────────────

export function useDebts() {
  const { data, loading, refresh } = useTable(() => db.debts.toArray());

  const addDebt = useCallback(async (debt: Omit<Debt, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    await db.debts.add({ ...debt, createdAt: now, updatedAt: now });
    await refresh();
  }, [refresh]);

  const updateDebt = useCallback(async (id: number, updates: Partial<Debt>) => {
    await db.debts.update(id, { ...updates, updatedAt: new Date().toISOString() });
    await refresh();
  }, [refresh]);

  const deleteDebt = useCallback(async (id: number) => {
    await db.debts.delete(id);
    await db.debtPayments.where("debtId").equals(id).delete();
    await refresh();
  }, [refresh]);

  return { debts: data, loading, refresh, addDebt, updateDebt, deleteDebt };
}

export function useDebtPayments(debtId?: number) {
  const { data, loading, refresh } = useTable(
    () => debtId
      ? db.debtPayments.where("debtId").equals(debtId).sortBy("date")
      : db.debtPayments.toArray(),
    [debtId]
  );

  const addPayment = useCallback(async (payment: Omit<DebtPayment, "id" | "createdAt">) => {
    await db.debtPayments.add({ ...payment, createdAt: new Date().toISOString() });
    // Update amountPaid on the debt
    const debt = await db.debts.get(payment.debtId);
    if (debt?.id) {
      const newAmountPaid = debt.amountPaid + payment.amount;
      await db.debts.update(debt.id, {
        amountPaid: newAmountPaid,
        isCompleted: newAmountPaid >= debt.totalAmount,
        updatedAt: new Date().toISOString(),
      });
    }
    await refresh();
  }, [refresh]);

  return { payments: data, loading, refresh, addPayment };
}

// ─── Recurring Expenses ───────────────────────────────────────────────────────

export function useRecurringExpenses() {
  const { data, loading, refresh } = useTable(() => db.recurringExpenses.toArray());

  const addRecurring = useCallback(async (r: Omit<RecurringExpense, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    await db.recurringExpenses.add({ ...r, createdAt: now, updatedAt: now });
    await refresh();
  }, [refresh]);

  const updateRecurring = useCallback(async (id: number, updates: Partial<RecurringExpense>) => {
    await db.recurringExpenses.update(id, { ...updates, updatedAt: new Date().toISOString() });
    await refresh();
  }, [refresh]);

  const deleteRecurring = useCallback(async (id: number) => {
    await db.recurringExpenses.delete(id);
    await refresh();
  }, [refresh]);

  return { recurring: data, loading, refresh, addRecurring, updateRecurring, deleteRecurring };
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export function useReminders() {
  const { data, loading, refresh } = useTable(() => db.reminders.orderBy("dueDate").toArray());

  const addReminder = useCallback(async (r: Omit<Reminder, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    await db.reminders.add({ ...r, createdAt: now, updatedAt: now });
    await refresh();
  }, [refresh]);

  const updateReminder = useCallback(async (id: number, updates: Partial<Reminder>) => {
    await db.reminders.update(id, { ...updates, updatedAt: new Date().toISOString() });
    await refresh();
  }, [refresh]);

  const deleteReminder = useCallback(async (id: number) => {
    await db.reminders.delete(id);
    await refresh();
  }, [refresh]);

  return { reminders: data, loading, refresh, addReminder, updateReminder, deleteReminder };
}

// ─── Exchange Rates ───────────────────────────────────────────────────────────

export function useExchangeRates() {
  const { data, loading, refresh } = useTable(() => db.exchangeRates.toArray());

  const updateRate = useCallback(async (id: number, rate: number) => {
    await db.exchangeRates.update(id, { rate, updatedAt: new Date().toISOString() });
    await refresh();
  }, [refresh]);

  const addRate = useCallback(async (r: Omit<ExchangeRate, "id">) => {
    await db.exchangeRates.add(r);
    await refresh();
  }, [refresh]);

  return { rates: data, loading, refresh, updateRate, addRate };
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await db.settings.toArray();
    setSettings(s[0] ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    if (settings?.id) {
      await db.settings.update(settings.id, { ...updates, updatedAt: new Date().toISOString() });
      await refresh();
    }
  }, [settings, refresh]);

  return { settings, loading, refresh, updateSettings };
}
