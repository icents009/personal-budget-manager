"use client";
/**
 * Dashboard — the main home page.
 * Shows income, expenses, balance, charts, and smart insights.
 */
import { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import { useTransactions, useCategories, useBudgets, useSavingsGoals, useDebts, useRecurringExpenses, useSettings } from "@/hooks/useDb";
import { StatCard } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { generateInsights } from "@/lib/insights";
import {
  isInMonth, formatCurrency, generateMonthOptions, monthToLabel,
  getCurrentMonth, pct, getUpcomingDates
} from "@/lib/utils";
import { format, subMonths } from "date-fns";
import { CHART_COLORS } from "@/lib/constants";

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const monthOptions = generateMonthOptions(12);

  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { budgets } = useBudgets();
  const { goals } = useSavingsGoals();
  const { debts } = useDebts();
  const { recurring } = useRecurringExpenses();
  const { settings } = useSettings();

  const currency = settings?.defaultCurrency ?? "NGN";

  // Monthly totals
  const monthExpenses = useMemo(
    () => transactions.filter((t) => t.type === "expense" && isInMonth(t.date, selectedMonth)),
    [transactions, selectedMonth]
  );
  const monthIncome = useMemo(
    () => transactions.filter((t) => t.type === "income" && isInMonth(t.date, selectedMonth)),
    [transactions, selectedMonth]
  );

  const totalIncome = monthIncome.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = monthExpenses.reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const map: Record<number, number> = {};
    monthExpenses.forEach((t) => {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === Number(catId));
        return { name: cat?.name ?? "Other", value: amount, color: cat?.color ?? "#6b7280" };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [monthExpenses, categories]);

  // Monthly trend for last 6 months
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const month = format(subMonths(new Date(), 5 - i), "yyyy-MM");
      const inc = transactions
        .filter((t) => t.type === "income" && isInMonth(t.date, month))
        .reduce((s, t) => s + t.amount, 0);
      const exp = transactions
        .filter((t) => t.type === "expense" && isInMonth(t.date, month))
        .reduce((s, t) => s + t.amount, 0);
      return { month: format(new Date(`${month}-01`), "MMM"), income: inc, expenses: exp };
    });
  }, [transactions]);

  // Budget progress for current month
  const budgetProgress = useMemo(() => {
    return budgets
      .filter((b) => b.month === selectedMonth)
      .map((b) => {
        const spent = monthExpenses
          .filter((t) => t.categoryId === b.categoryId)
          .reduce((s, t) => s + t.amount, 0);
        const cat = categories.find((c) => c.id === b.categoryId);
        return { budget: b, spent, cat, percentage: pct(spent, b.limitAmount) };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }, [budgets, monthExpenses, categories, selectedMonth]);

  // 50/30/20 breakdown
  const breakdown5030 = useMemo(() => {
    const needs = monthExpenses
      .filter((t) => categories.find((c) => c.id === t.categoryId)?.type === "need")
      .reduce((s, t) => s + t.amount, 0);
    const wants = monthExpenses
      .filter((t) => categories.find((c) => c.id === t.categoryId)?.type === "want")
      .reduce((s, t) => s + t.amount, 0);
    const savings = monthExpenses
      .filter((t) => categories.find((c) => c.id === t.categoryId)?.type === "saving_debt")
      .reduce((s, t) => s + t.amount, 0);
    const recNeeds = totalIncome * ((settings?.needsPercentage ?? 50) / 100);
    const recWants = totalIncome * ((settings?.wantsPercentage ?? 30) / 100);
    const recSavings = totalIncome * ((settings?.savingsPercentage ?? 20) / 100);
    return { needs, wants, savings, recNeeds, recWants, recSavings };
  }, [monthExpenses, categories, totalIncome, settings]);

  // Upcoming recurring expenses (next 14 days)
  const upcomingRecurring = useMemo(() => {
    return recurring
      .filter((r) => r.isActive)
      .flatMap((r) => {
        const dates = getUpcomingDates(r.startDate, r.frequency, 14);
        return dates.map((d) => ({ ...r, nextDate: d }));
      })
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
      .slice(0, 5);
  }, [recurring]);

  // Smart insights
  const insights = useMemo(() => {
    if (!settings) return [];
    const lastMonth = format(subMonths(new Date(`${selectedMonth}-01`), 1), "yyyy-MM");
    return generateInsights({
      transactions, budgets, savingsGoals: goals, debts, recurringExpenses: recurring,
      categories, settings, currentMonth: selectedMonth, lastMonth,
    });
  }, [transactions, budgets, goals, debts, recurring, categories, settings, selectedMonth]);

  const activeDebts = debts.filter((d) => !d.isCompleted).slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Month picker */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{monthToLabel(selectedMonth)}</h2>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Income" value={formatCurrency(totalIncome, currency)} icon="💵" color="emerald" />
        <StatCard title="Expenses" value={formatCurrency(totalExpenses, currency)} icon="💸" color="rose" />
        <StatCard title="Balance" value={formatCurrency(Math.abs(balance), currency)} icon={balance >= 0 ? "✅" : "⚠️"} color={balance >= 0 ? "indigo" : "amber"} subtitle={balance < 0 ? "Overspent" : undefined} />
        <StatCard
          title="Savings Rate"
          value={totalIncome > 0 ? `${Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)}%` : "—"}
          icon="📈" color="blue"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Spending by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} paddingAngle={2}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-slate-400 text-sm">No expenses this month</div>
          )}
        </div>
      </div>

      {/* 50/30/20 summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-slate-800 text-sm">50/30/20 Budget</h3>
          <a href="/budgets" className="text-xs text-indigo-600 hover:underline">Details →</a>
        </div>
        <div className="space-y-3">
          {[
            { label: `Needs (${settings?.needsPercentage ?? 50}%)`, actual: breakdown5030.needs, recommended: breakdown5030.recNeeds, color: "bg-blue-500" },
            { label: `Wants (${settings?.wantsPercentage ?? 30}%)`, actual: breakdown5030.wants, recommended: breakdown5030.recWants, color: "bg-violet-500" },
            { label: `Savings (${settings?.savingsPercentage ?? 20}%)`, actual: breakdown5030.savings, recommended: breakdown5030.recSavings, color: "bg-emerald-500" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{item.label}</span>
                <span>{formatCurrency(item.actual, currency)} / {formatCurrency(item.recommended, currency)}</span>
              </div>
              <ProgressBar value={item.recommended > 0 ? pct(item.actual, item.recommended) : 0} color={item.color} showPercentage={false} />
            </div>
          ))}
        </div>
      </div>

      {/* Budget progress */}
      {budgetProgress.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-slate-800 text-sm">Budget Progress</h3>
            <a href="/budgets" className="text-xs text-indigo-600 hover:underline">View all</a>
          </div>
          <div className="space-y-3">
            {budgetProgress.map(({ budget, spent, cat, percentage }) => (
              <div key={budget.id}>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{cat?.icon} {cat?.name}</span>
                  <span className="font-medium">
                    {formatCurrency(spent, budget.currency)} / {formatCurrency(budget.limitAmount, budget.currency)}
                    {percentage >= 100 && <span className="ml-1 text-red-500">Over!</span>}
                    {percentage >= 80 && percentage < 100 && <span className="ml-1 text-amber-500"> ⚠️</span>}
                  </span>
                </div>
                <ProgressBar value={percentage} showPercentage={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming recurring */}
        {upcomingRecurring.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">Upcoming Recurring</h3>
              <a href="/recurring" className="text-xs text-indigo-600 hover:underline">View all</a>
            </div>
            <div className="space-y-2">
              {upcomingRecurring.map((r, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.nextDate}</p>
                  </div>
                  <span className="text-sm font-semibold text-rose-600">-{formatCurrency(r.amount, r.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active debts */}
        {activeDebts.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">Active Debts</h3>
              <a href="/debts" className="text-xs text-indigo-600 hover:underline">View all</a>
            </div>
            <div className="space-y-3">
              {activeDebts.map((debt) => (
                <div key={debt.id}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span className="font-medium text-slate-700">{debt.name}</span>
                    <span>{formatCurrency(debt.totalAmount - debt.amountPaid, debt.currency)} left</span>
                  </div>
                  <ProgressBar value={pct(debt.amountPaid, debt.totalAmount)} showPercentage={false} color="bg-indigo-500" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Smart insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">💡 Smart Insights</h3>
          <div className="space-y-2">
            {insights.map((insight) => {
              const colors: Record<string, string> = {
                info: "bg-blue-50 border-blue-100 text-blue-800",
                warning: "bg-amber-50 border-amber-100 text-amber-800",
                success: "bg-emerald-50 border-emerald-100 text-emerald-800",
                danger: "bg-red-50 border-red-100 text-red-800",
              };
              return (
                <div key={insight.id} className={`text-xs p-3 rounded-xl border ${colors[insight.type]}`}>
                  {insight.message}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
