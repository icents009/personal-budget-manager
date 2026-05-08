"use client";
/**
 * Reports page — monthly charts, export to Excel/PDF, and summary stats.
 */
import { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar
} from "recharts";
import { useTransactions, useCategories, useSavingsGoals, useDebts, useSettings } from "@/hooks/useDb";
import { isInMonth, formatCurrency, generateMonthOptions, monthToLabel, pct, getCurrentMonth } from "@/lib/utils";
import {
  exportExpensesToExcel, exportIncomeToExcel, exportSavingsToExcel,
  exportDebtsToExcel, exportMonthlyReportPDF
} from "@/lib/export";
import { CHART_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";
import { format, subMonths } from "date-fns";

export default function ReportsPage() {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { goals } = useSavingsGoals();
  const { debts } = useDebts();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [startMonth, setStartMonth] = useState(() => format(subMonths(new Date(), 5), "yyyy-MM"));
  const [endMonth, setEndMonth] = useState(getCurrentMonth());
  const [exporting, setExporting] = useState(false);

  const currency = settings?.defaultCurrency ?? "NGN";
  const monthOptions = generateMonthOptions(12);

  // All months in range
  const monthsInRange = useMemo(() => {
    const months = [];
    let cur = startMonth;
    while (cur <= endMonth) {
      months.push(cur);
      const d = new Date(`${cur}-01`);
      d.setMonth(d.getMonth() + 1);
      cur = format(d, "yyyy-MM");
    }
    return months;
  }, [startMonth, endMonth]);

  // Trend data for the range
  const trendData = useMemo(() => {
    return monthsInRange.map((month) => {
      const inc = transactions.filter((t) => t.type === "income" && isInMonth(t.date, month)).reduce((s, t) => s + t.amount, 0);
      const exp = transactions.filter((t) => t.type === "expense" && isInMonth(t.date, month)).reduce((s, t) => s + t.amount, 0);
      return { month: format(new Date(`${month}-01`), "MMM yy"), income: inc, expenses: exp, net: inc - exp };
    });
  }, [transactions, monthsInRange]);

  // Category breakdown for end month
  const catData = useMemo(() => {
    const map: Record<number, number> = {};
    transactions
      .filter((t) => t.type === "expense" && isInMonth(t.date, endMonth))
      .forEach((t) => { map[t.categoryId] = (map[t.categoryId] || 0) + t.amount; });
    return Object.entries(map)
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === Number(catId));
        return { name: cat?.name ?? "Other", value: amount, color: cat?.color ?? "#6b7280" };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, endMonth]);

  // Top 5 categories
  const top5 = catData.slice(0, 5);

  // Summary totals for range
  const rangeIncome = transactions
    .filter((t) => t.type === "income" && monthsInRange.some((m) => isInMonth(t.date, m)))
    .reduce((s, t) => s + t.amount, 0);
  const rangeExpenses = transactions
    .filter((t) => t.type === "expense" && monthsInRange.some((m) => isInMonth(t.date, m)))
    .reduce((s, t) => s + t.amount, 0);

  async function handlePDFExport() {
    setExporting(true);
    try {
      const endMonthExpenses = transactions.filter((t) => t.type === "expense" && isInMonth(t.date, endMonth));
      const endMonthIncome = transactions.filter((t) => t.type === "income" && isInMonth(t.date, endMonth)).reduce((s, t) => s + t.amount, 0);
      const endMonthExpTotal = endMonthExpenses.reduce((s, t) => s + t.amount, 0);
      const topCats = top5.map((c) => ({ name: c.name, amount: c.value }));
      await exportMonthlyReportPDF({
        month: monthToLabel(endMonth),
        totalIncome: endMonthIncome,
        totalExpenses: endMonthExpTotal,
        balance: endMonthIncome - endMonthExpTotal,
        currency,
        topCategories: topCats,
        transactions: endMonthExpenses,
        categories,
      });
      showToast("PDF exported! 📄");
    } catch {
      showToast("PDF export failed", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="hidden md:block text-xl font-bold text-slate-800">Reports</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">From</span>
          <select value={startMonth} onChange={(e) => setStartMonth(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="text-sm text-slate-500">to</span>
          <select value={endMonth} onChange={(e) => setEndMonth(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-xs text-slate-400">Total Income</p>
          <p className="font-bold text-emerald-600 text-lg mt-1">{formatCurrency(rangeIncome, currency)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-xs text-slate-400">Total Expenses</p>
          <p className="font-bold text-rose-600 text-lg mt-1">{formatCurrency(rangeExpenses, currency)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-xs text-slate-400">Net Saved</p>
          <p className={`font-bold text-lg mt-1 ${rangeIncome - rangeExpenses >= 0 ? "text-indigo-600" : "text-amber-600"}`}>
            {formatCurrency(rangeIncome - rangeExpenses, currency)}
          </p>
        </div>
      </div>

      {/* Income vs Expenses chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <h3 className="font-semibold text-slate-800 text-sm mb-3">Income vs Expenses</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net savings line */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <h3 className="font-semibold text-slate-800 text-sm mb-3">Net Savings Trend</h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
            <Line type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Net" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-2">Spending by Category — {monthToLabel(endMonth)}</h3>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} paddingAngle={2}>
                  {catData.map((entry, i) => (
                    <Cell key={i} fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">No expense data</p>
          )}
        </div>

        {/* Top 5 categories */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Top Spending Categories</h3>
          <div className="space-y-3">
            {top5.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No data for {monthToLabel(endMonth)}</p>
            ) : top5.map((cat, i) => {
              const total = catData.reduce((s, c) => s + c.value, 0);
              return (
                <div key={cat.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">#{i + 1} {cat.name}</span>
                    <span>{formatCurrency(cat.value, currency)}</span>
                  </div>
                  <ProgressBar value={pct(cat.value, total)} color="bg-indigo-500" showPercentage={false} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Savings goals progress */}
      {goals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Savings Goals Progress</h3>
          <div className="space-y-3">
            {goals.slice(0, 5).map((g) => (
              <ProgressBar
                key={g.id}
                value={pct(g.currentAmount, g.targetAmount)}
                label={g.name}
                sublabel={`${formatCurrency(g.currentAmount, g.currency)} / ${formatCurrency(g.targetAmount, g.currency)}`}
                color="bg-emerald-500"
              />
            ))}
          </div>
        </div>
      )}

      {/* Debt repayment */}
      {debts.filter((d) => !d.isCompleted).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Debt Repayment</h3>
          <div className="space-y-3">
            {debts.filter((d) => !d.isCompleted).map((d) => (
              <ProgressBar
                key={d.id}
                value={pct(d.amountPaid, d.totalAmount)}
                label={d.name}
                sublabel={`${formatCurrency(d.amountPaid, d.currency)} paid of ${formatCurrency(d.totalAmount, d.currency)}`}
                color="bg-indigo-500"
              />
            ))}
          </div>
        </div>
      )}

      {/* Export section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <h3 className="font-semibold text-slate-800 text-sm mb-3">Export Data</h3>
        <p className="text-xs text-slate-400 mb-3">Export your data to Excel (.xlsx) or PDF for record keeping.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            exportExpensesToExcel(transactions.filter((t) => t.type === "expense"), categories);
            showToast("Expenses exported! 📊");
          }}>
            📊 Expenses (Excel)
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            exportIncomeToExcel(transactions.filter((t) => t.type === "income"), categories);
            showToast("Income exported! 📊");
          }}>
            📊 Income (Excel)
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            exportSavingsToExcel(goals);
            showToast("Savings exported! 📊");
          }}>
            📊 Savings (Excel)
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            exportDebtsToExcel(debts);
            showToast("Debts exported! 📊");
          }}>
            📊 Debts (Excel)
          </Button>
          <Button variant="secondary" size="sm" loading={exporting} onClick={handlePDFExport} className="col-span-2 md:col-span-2">
            📄 Monthly Report PDF ({monthToLabel(endMonth)})
          </Button>
        </div>
      </div>
    </div>
  );
}
