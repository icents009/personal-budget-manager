/**
 * Local rule-based smart insights — no external AI APIs.
 * Analyzes the user's data and generates friendly financial tips.
 */

import { Transaction, Budget, SavingsGoal, Debt, RecurringExpense, Category, AppSettings } from "./types";
import { isInMonth, pct, formatCurrency } from "./utils";
import { format, addDays } from "date-fns";
import { InsightMessage } from "./types";

interface InsightInput {
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  debts: Debt[];
  recurringExpenses: RecurringExpense[];
  categories: Category[];
  settings: AppSettings;
  currentMonth: string;
  lastMonth: string;
}

export function generateInsights(input: InsightInput): InsightMessage[] {
  const insights: InsightMessage[] = [];
  const {
    transactions, budgets, savingsGoals, debts, recurringExpenses,
    categories, settings, currentMonth, lastMonth
  } = input;

  // Filter transactions for current and last month
  const currentExpenses = transactions.filter(
    (t) => t.type === "expense" && isInMonth(t.date, currentMonth)
  );
  const lastExpenses = transactions.filter(
    (t) => t.type === "expense" && isInMonth(t.date, lastMonth)
  );
  const currentIncome = transactions.filter(
    (t) => t.type === "income" && isInMonth(t.date, currentMonth)
  );

  const totalIncome = currentIncome.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = currentExpenses.reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  // ── 1. Balance warning ──────────────────────────────────────────────────────
  if (totalIncome > 0 && balance < totalIncome * 0.1) {
    insights.push({
      id: "low-balance",
      type: "warning",
      message: `⚠️ Your remaining balance (${formatCurrency(balance, settings.defaultCurrency)}) is less than 10% of your income. Watch your spending!`,
    });
  }

  // ── 2. 50/30/20 savings check ───────────────────────────────────────────────
  if (totalIncome > 0) {
    const savingCategories = categories.filter((c) => c.type === "saving_debt");
    const savingCategoryIds = savingCategories.map((c) => c.id!);
    const savingsSpent = currentExpenses
      .filter((t) => savingCategoryIds.includes(t.categoryId))
      .reduce((s, t) => s + t.amount, 0);
    const savingsPct = pct(savingsSpent, totalIncome);
    const target = settings.savingsPercentage;
    if (savingsPct < target) {
      insights.push({
        id: "savings-below-target",
        type: "warning",
        message: `📉 You're saving ${savingsPct}% of your income, below your ${target}% target. Try to save ${formatCurrency((totalIncome * target) / 100 - savingsSpent, settings.defaultCurrency)} more.`,
      });
    } else {
      insights.push({
        id: "savings-on-track",
        type: "success",
        message: `✅ Great job! You're saving ${savingsPct}% of income, meeting your ${target}% savings target.`,
      });
    }
  }

  // ── 3. Top spending category ────────────────────────────────────────────────
  if (currentExpenses.length > 0) {
    const byCat: Record<number, number> = {};
    currentExpenses.forEach((t) => {
      byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount;
    });
    const topCatId = Number(Object.keys(byCat).sort((a, b) => byCat[+b] - byCat[+a])[0]);
    const topCat = categories.find((c) => c.id === topCatId);
    if (topCat) {
      insights.push({
        id: "top-category",
        type: "info",
        message: `🏆 Your top spending category this month is "${topCat.name}" (${formatCurrency(byCat[topCatId], settings.defaultCurrency)}).`,
      });
    }
  }

  // ── 4. Compare to last month by category ───────────────────────────────────
  const categorySpendingChanges: string[] = [];
  categories.forEach((cat) => {
    const currAmt = currentExpenses
      .filter((t) => t.categoryId === cat.id)
      .reduce((s, t) => s + t.amount, 0);
    const lastAmt = lastExpenses
      .filter((t) => t.categoryId === cat.id)
      .reduce((s, t) => s + t.amount, 0);
    if (lastAmt > 0 && currAmt > lastAmt * 1.25) {
      categorySpendingChanges.push(cat.name);
    }
  });
  if (categorySpendingChanges.length > 0) {
    const catName = categorySpendingChanges[0];
    insights.push({
      id: "category-increase",
      type: "warning",
      message: `📈 You spent more on "${catName}" this month than last month. Consider reviewing this category.`,
    });
  }

  // ── 5. Budget limits almost reached ────────────────────────────────────────
  budgets
    .filter((b) => b.month === currentMonth)
    .forEach((budget) => {
      const spent = currentExpenses
        .filter((t) => t.categoryId === budget.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      const percentage = pct(spent, budget.limitAmount);
      const cat = categories.find((c) => c.id === budget.categoryId);
      if (percentage >= 100) {
        insights.push({
          id: `budget-exceeded-${budget.categoryId}`,
          type: "danger",
          message: `🚨 You've exceeded your "${cat?.name}" budget! Spent ${formatCurrency(spent, budget.currency)} of ${formatCurrency(budget.limitAmount, budget.currency)}.`,
        });
      } else if (percentage >= 80) {
        insights.push({
          id: `budget-warning-${budget.categoryId}`,
          type: "warning",
          message: `⚠️ "${cat?.name}" budget is at ${percentage}%. Only ${formatCurrency(budget.limitAmount - spent, budget.currency)} remaining.`,
        });
      }
    });

  // ── 6. Emergency fund coverage ──────────────────────────────────────────────
  const emergencyFund = savingsGoals.find((g) => g.isEmergencyFund);
  if (emergencyFund && totalExpenses > 0) {
    // Average monthly expenses across last 3 months
    const avgMonthly = totalExpenses;
    const monthsCovered = emergencyFund.currentAmount / Math.max(avgMonthly, 1);
    insights.push({
      id: "emergency-fund",
      type: monthsCovered >= 3 ? "success" : "warning",
      message: monthsCovered >= 3
        ? `🛡️ Great! Your emergency fund covers about ${monthsCovered.toFixed(1)} months of expenses.`
        : `🛡️ Your emergency fund covers only ${monthsCovered.toFixed(1)} months of expenses. Target: 3–6 months.`,
    });
  }

  // ── 7. Upcoming recurring expenses this week ────────────────────────────────
  const today = new Date();
  const nextWeek = addDays(today, 7);
  const upcoming = recurringExpenses.filter((r) => {
    if (!r.isActive) return false;
    const start = new Date(r.startDate);
    return start >= today && start <= nextWeek;
  });
  if (upcoming.length > 0) {
    insights.push({
      id: "upcoming-recurring",
      type: "info",
      message: `📅 You have ${upcoming.length} recurring expense(s) due this week. Total: ${formatCurrency(
        upcoming.reduce((s, r) => s + r.amount, 0),
        settings.defaultCurrency
      )}.`,
    });
  }

  // ── 8. Debt progress ────────────────────────────────────────────────────────
  const activeDebts = debts.filter((d) => !d.isCompleted);
  if (activeDebts.length > 0) {
    const totalDebt = activeDebts.reduce((s, d) => s + (d.totalAmount - d.amountPaid), 0);
    insights.push({
      id: "active-debts",
      type: "info",
      message: `💳 You have ${activeDebts.length} active debt(s) with ${formatCurrency(totalDebt, settings.defaultCurrency)} remaining.`,
    });
  }

  // ── 9. No income recorded ───────────────────────────────────────────────────
  if (currentIncome.length === 0) {
    insights.push({
      id: "no-income",
      type: "info",
      message: `💡 No income recorded for this month yet. Add your income to get accurate budget insights.`,
    });
  }

  // Return max 6 insights to keep the UI clean
  return insights.slice(0, 6);
}
