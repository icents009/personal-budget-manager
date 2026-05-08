"use client";
/**
 * Budgets page — set monthly budget limits per category and view the 50/30/20 breakdown.
 */
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransactions, useCategories, useBudgets, useSettings, useSavingsContributions, useDebtPayments } from "@/hooks/useDb";
import {
  isInMonth, formatCurrency, getCurrentMonth, generateMonthOptions, monthToLabel, pct
} from "@/lib/utils";
import { SUPPORTED_CURRENCIES, CATEGORY_TYPE_LABELS } from "@/lib/constants";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

const schema = z.object({
  categoryId: z.coerce.number().min(1, "Select a category"),
  limitAmount: z.coerce.number().positive("Budget amount must be > 0"),
  currency: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

export default function BudgetsPage() {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { budgets, upsertBudget, deleteBudget } = useBudgets();
  const { settings } = useSettings();
  const { contributions } = useSavingsContributions();
  const { payments: debtPayments } = useDebtPayments();
  const { showToast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showModal, setShowModal] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"budgets" | "50-30-20" | "per-income">("budgets");

  const currency = settings?.defaultCurrency ?? "NGN";
  const monthOptions = generateMonthOptions(12);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency },
  });

  const expenseCategories = categories.filter((c) =>
    !["Salary", "Freelance", "Business", "Investment", "Gift"].includes(c.name)
  );

  const monthExpenses = useMemo(
    () => transactions.filter((t) => t.type === "expense" && isInMonth(t.date, selectedMonth)),
    [transactions, selectedMonth]
  );

  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === "income" && isInMonth(t.date, selectedMonth))
      .reduce((s, t) => s + t.amount, 0),
    [transactions, selectedMonth]
  );

  // Budget rows with spending data
  const budgetRows = useMemo(() => {
    return budgets
      .filter((b) => b.month === selectedMonth)
      .map((b) => {
        const spent = monthExpenses
          .filter((t) => t.categoryId === b.categoryId)
          .reduce((s, t) => s + t.amount, 0);
        const cat = categories.find((c) => c.id === b.categoryId);
        const percentage = pct(spent, b.limitAmount);
        return { budget: b, spent, cat, percentage };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [budgets, monthExpenses, categories, selectedMonth]);

  // 50/30/20 data
  const breakdown = useMemo(() => {
    const needs = monthExpenses
      .filter((t) => categories.find((c) => c.id === t.categoryId)?.type === "need")
      .reduce((s, t) => s + t.amount, 0);
    const wants = monthExpenses
      .filter((t) => categories.find((c) => c.id === t.categoryId)?.type === "want")
      .reduce((s, t) => s + t.amount, 0);
    // Savings/Debt actual = saving_debt expense categories + savings goal contributions + debt payments
    const savingsFromExpenses = monthExpenses
      .filter((t) => categories.find((c) => c.id === t.categoryId)?.type === "saving_debt")
      .reduce((s, t) => s + t.amount, 0);
    const savingsFromContributions = contributions
      .filter((c) => isInMonth(c.date, selectedMonth))
      .reduce((s, c) => s + c.amount, 0);
    const savingsFromDebtPayments = debtPayments
      .filter((p) => isInMonth(p.date, selectedMonth))
      .reduce((s, p) => s + p.amount, 0);
    const savings = savingsFromExpenses + savingsFromContributions + savingsFromDebtPayments;
    const recNeeds = totalIncome * ((settings?.needsPercentage ?? 50) / 100);
    const recWants = totalIncome * ((settings?.wantsPercentage ?? 30) / 100);
    const recSavings = totalIncome * ((settings?.savingsPercentage ?? 20) / 100);
    return [
      { label: "Needs", type: "need", target: settings?.needsPercentage ?? 50, actual: needs, recommended: recNeeds, color: "bg-blue-500", advice: needs > recNeeds ? "You're overspending on needs. Review rent, food, and utilities." : "Your needs spending is on track. 👍" },
      { label: "Wants", type: "want", target: settings?.wantsPercentage ?? 30, actual: wants, recommended: recWants, color: "bg-violet-500", advice: wants > recWants ? "You're overspending on wants. Cut back on entertainment and shopping." : "Your wants spending is within target. 👍" },
      { label: "Savings/Debt", type: "saving_debt", target: settings?.savingsPercentage ?? 20, actual: savings, recommended: recSavings, color: "bg-emerald-500", advice: savings < recSavings ? `You're saving below your ${settings?.savingsPercentage ?? 20}% target. Try to save ${formatCurrency(recSavings - savings, currency)} more.` : "Great savings discipline! 🎉" },
    ];
  }, [monthExpenses, categories, totalIncome, settings, currency, contributions, debtPayments, selectedMonth]);

  // Per-income breakdown: each income transaction → its own 50/30/20 split
  const incomeTransactions = useMemo(
    () => transactions.filter((t) => t.type === "income" && isInMonth(t.date, selectedMonth)),
    [transactions, selectedMonth]
  );

  const perIncomeBreakdown = useMemo(() => {
    const needsPct = (settings?.needsPercentage ?? 50) / 100;
    const wantsPct = (settings?.wantsPercentage ?? 30) / 100;
    const savingsPct = (settings?.savingsPercentage ?? 20) / 100;
    return incomeTransactions.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      return {
        id: t.id,
        source: cat?.name ?? "Income",
        icon: cat?.icon ?? "💰",
        date: t.date,
        amount: t.amount,
        needs: t.amount * needsPct,
        wants: t.amount * wantsPct,
        savings: t.amount * savingsPct,
        needsPct: settings?.needsPercentage ?? 50,
        wantsPct: settings?.wantsPercentage ?? 30,
        savingsPct: settings?.savingsPercentage ?? 20,
      };
    });
  }, [incomeTransactions, categories, settings]);

  function openAdd() {
    setEditingBudgetId(null);
    reset({ currency });
    setShowModal(true);
  }

  function openEdit(b: typeof budgetRows[0]) {
    setEditingBudgetId(b.budget.id ?? null);
    reset({ categoryId: b.budget.categoryId, limitAmount: b.budget.limitAmount, currency: b.budget.currency });
    setShowModal(true);
  }

  async function onSubmit(values: FormValues) {
    await upsertBudget({ ...values, month: selectedMonth });
    showToast(editingBudgetId ? "Budget updated!" : "Budget set!");
    setShowModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-xl font-bold text-slate-800">Budgets</h1>
        <div className="flex items-center gap-2 ml-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Button onClick={openAdd} size="sm">+ Set Budget</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(["budgets", "50-30-20", "per-income"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-xl border transition ${activeTab === tab ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
          >
            {tab === "budgets" ? "📊 Category Budgets" : tab === "50-30-20" ? "⚖️ 50/30/20 Rule" : "💰 Per Income"}
          </button>
        ))}
      </div>

      {activeTab === "per-income" ? (
        /* Per Income tab */
        <div className="space-y-4">
          {perIncomeBreakdown.length === 0 ? (
            <EmptyState
              icon="💰"
              title="No income this month"
              description={`Add income transactions for ${monthToLabel(selectedMonth)} to see per-income 50/30/20 breakdowns.`}
            />
          ) : (
            <>
              {/* Summary totals card */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                <p className="text-sm font-semibold text-indigo-800 mb-3">
                  📊 Total for {monthToLabel(selectedMonth)} — {perIncomeBreakdown.length} income source{perIncomeBreakdown.length > 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: `Needs (${perIncomeBreakdown[0]?.needsPct}%)`, value: perIncomeBreakdown.reduce((s, i) => s + i.needs, 0), color: "text-blue-700" },
                    { label: `Wants (${perIncomeBreakdown[0]?.wantsPct}%)`, value: perIncomeBreakdown.reduce((s, i) => s + i.wants, 0), color: "text-violet-700" },
                    { label: `Savings (${perIncomeBreakdown[0]?.savingsPct}%)`, value: perIncomeBreakdown.reduce((s, i) => s + i.savings, 0), color: "text-emerald-700" },
                  ].map((col) => (
                    <div key={col.label} className="bg-white rounded-xl p-2 shadow-sm">
                      <p className="text-xs text-slate-400">{col.label}</p>
                      <p className={`font-bold text-sm ${col.color}`}>{formatCurrency(col.value, currency)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual income cards */}
              {perIncomeBreakdown.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className="font-semibold text-slate-800">{item.source}</p>
                        <p className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-800">{formatCurrency(item.amount, currency)}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-blue-500 font-medium">🏠 Needs</p>
                      <p className="text-xs text-blue-400 mt-0.5">{item.needsPct}%</p>
                      <p className="font-bold text-sm text-blue-700 mt-1">{formatCurrency(item.needs, currency)}</p>
                    </div>
                    <div className="bg-violet-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-violet-500 font-medium">🎯 Wants</p>
                      <p className="text-xs text-violet-400 mt-0.5">{item.wantsPct}%</p>
                      <p className="font-bold text-sm text-violet-700 mt-1">{formatCurrency(item.wants, currency)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-emerald-500 font-medium">💎 Savings</p>
                      <p className="text-xs text-emerald-400 mt-0.5">{item.savingsPct}%</p>
                      <p className="font-bold text-sm text-emerald-700 mt-1">{formatCurrency(item.savings, currency)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      ) : activeTab === "budgets" ? (
        budgetRows.length === 0 ? (
          <EmptyState
            icon="📊"
            title="No budgets set"
            description={`Set monthly spending limits for ${monthToLabel(selectedMonth)}.`}
            action={<Button onClick={openAdd}>+ Set Budget</Button>}
          />
        ) : (
          <div className="space-y-3">
            {budgetRows.map(({ budget, spent, cat, percentage }) => (
              <div key={budget.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat?.icon}</span>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{cat?.name}</p>
                      <p className="text-xs text-slate-400">
                        {CATEGORY_TYPE_LABELS[cat?.type ?? "want"]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {percentage >= 100 && <Badge variant="danger">Over Budget</Badge>}
                    {percentage >= 80 && percentage < 100 && <Badge variant="warning">Near Limit</Badge>}
                    <button onClick={() => openEdit({ budget, spent, cat, percentage })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 text-sm">✏️</button>
                    <button onClick={() => setDeleteId(budget.id!)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 text-sm">🗑️</button>
                  </div>
                </div>
                <ProgressBar value={percentage} label={`${formatCurrency(spent, budget.currency)} spent`} sublabel={`of ${formatCurrency(budget.limitAmount, budget.currency)}`} />
                {percentage >= 100 && (
                  <p className="text-xs text-red-500 mt-2">
                    🚨 Over budget by {formatCurrency(spent - budget.limitAmount, budget.currency)}!
                  </p>
                )}
                {percentage >= 80 && percentage < 100 && (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ {formatCurrency(budget.limitAmount - spent, budget.currency)} remaining
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* 50/30/20 tab */
        <div className="space-y-4">
          {totalIncome === 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-sm text-amber-700">
              💡 Add income for {monthToLabel(selectedMonth)} to see personalised 50/30/20 recommendations.
            </div>
          )}

          {breakdown.map((item) => {
            const diff = item.actual - item.recommended;
            const isOver = diff > 0;
            return (
              <div key={item.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{item.label} ({item.target}%)</p>
                    <p className="text-xs text-slate-400 mt-0.5">Recommended: {formatCurrency(item.recommended, currency)}</p>
                  </div>
                  <Badge variant={isOver ? "danger" : "success"}>
                    {isOver ? `+${formatCurrency(diff, currency)} over` : `${formatCurrency(Math.abs(diff), currency)} under`}
                  </Badge>
                </div>

                <ProgressBar value={item.recommended > 0 ? pct(item.actual, item.recommended) : 0} color={item.color} />

                <div className="grid grid-cols-3 gap-3 mt-3 text-center">
                  <div className="bg-slate-50 rounded-xl p-2">
                    <p className="text-xs text-slate-400">Recommended</p>
                    <p className="font-semibold text-sm text-slate-700">{formatCurrency(item.recommended, currency)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2">
                    <p className="text-xs text-slate-400">Actual</p>
                    <p className={`font-semibold text-sm ${isOver ? "text-red-600" : "text-emerald-600"}`}>{formatCurrency(item.actual, currency)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2">
                    <p className="text-xs text-slate-400">Difference</p>
                    <p className={`font-semibold text-sm ${isOver ? "text-red-600" : "text-emerald-600"}`}>
                      {isOver ? "+" : "-"}{formatCurrency(Math.abs(diff), currency)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-3 bg-slate-50 p-2.5 rounded-xl">{item.advice}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Set budget modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Set Category Budget">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Category" required error={errors.categoryId?.message}>
            <Select {...register("categoryId")} error={!!errors.categoryId}>
              <option value="">Select category</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Budget Limit" required error={errors.limitAmount?.message}>
              <Input type="number" step="0.01" placeholder="0.00" {...register("limitAmount")} error={!!errors.limitAmount} />
            </FormField>
            <FormField label="Currency">
              <Select {...register("currency")}>
                {SUPPORTED_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </Select>
            </FormField>
          </div>
          <p className="text-xs text-slate-400">Month: {monthToLabel(selectedMonth)}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">Save Budget</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) { deleteBudget(deleteId); showToast("Budget removed", "info"); } }}
        message="Remove this budget limit?"
      />
    </div>
  );
}
