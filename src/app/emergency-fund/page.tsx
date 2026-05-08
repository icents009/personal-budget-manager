"use client";
/**
 * Emergency Fund page — dedicated view for the emergency fund savings goal.
 */
import { useState } from "react";
import { useSavingsGoals, useSavingsContributions, useTransactions, useSettings } from "@/hooks/useDb";
import { formatCurrency, pct, getCurrentMonth, isInMonth } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import Link from "next/link";

const contribSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().min(1),
  date: z.string().min(1),
  notes: z.string().optional(),
});
type ContribForm = z.infer<typeof contribSchema>;

export default function EmergencyFundPage() {
  const { goals, addGoal } = useSavingsGoals();
  const { transactions } = useTransactions();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showContribModal, setShowContribModal] = useState(false);

  const currency = settings?.defaultCurrency ?? "NGN";

  // Find the emergency fund goal
  const efGoal = goals.find((g) => g.isEmergencyFund);
  const { addContribution } = useSavingsContributions(efGoal?.id);

  // Average monthly expenses (last 3 months)
  const avgMonthlyExpenses = (() => {
    let total = 0;
    for (let i = 1; i <= 3; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      total += transactions.filter((t) => t.type === "expense" && isInMonth(t.date, month))
        .reduce((s, t) => s + t.amount, 0);
    }
    return total / 3;
  })();

  const suggestedMin = avgMonthlyExpenses * 3;
  const suggestedMax = avgMonthlyExpenses * 6;

  const current = efGoal?.currentAmount ?? 0;
  const target = efGoal?.targetAmount ?? suggestedMin;
  const progress = pct(current, target);
  const monthsCovered = avgMonthlyExpenses > 0 ? current / avgMonthlyExpenses : 0;

  const contribForm = useForm<ContribForm>({
    resolver: zodResolver(contribSchema),
    defaultValues: { currency, date: format(new Date(), "yyyy-MM-dd") },
  });

  // Quick-create the emergency fund goal
  async function createEfGoal() {
    await addGoal({
      name: "Emergency Fund",
      targetAmount: suggestedMin || 300000,
      currentAmount: 0,
      currency,
      isEmergencyFund: true,
      isCompleted: false,
    });
    showToast("Emergency Fund created! 🛡️");
    setShowSetupModal(false);
  }

  async function onContrib(values: ContribForm) {
    if (!efGoal?.id) return;
    await addContribution({ ...values, goalId: efGoal.id, isLocked: false });
    showToast("Added to emergency fund! 🛡️");
    setShowContribModal(false);
  }

  if (!efGoal) {
    return (
      <div className="space-y-4">
        <h1 className="hidden md:block text-xl font-bold text-slate-800">Emergency Fund</h1>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center space-y-4">
          <div className="text-5xl">🛡️</div>
          <h2 className="text-lg font-semibold text-slate-800">Set Up Your Emergency Fund</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            An emergency fund covers unexpected expenses like job loss or medical bills.
            Financial experts recommend saving 3–6 months of expenses.
          </p>
          {avgMonthlyExpenses > 0 && (
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
              <p>Based on your spending, your target should be:</p>
              <p className="font-bold text-lg mt-1">
                {formatCurrency(suggestedMin, currency)} – {formatCurrency(suggestedMax, currency)}
              </p>
              <p className="text-xs mt-1">({formatCurrency(avgMonthlyExpenses, currency)}/month × 3–6 months)</p>
            </div>
          )}
          <Button onClick={() => setShowSetupModal(true)}>Create Emergency Fund</Button>
          <p className="text-xs text-slate-400">
            Or <Link href="/savings" className="text-indigo-600 hover:underline">go to Savings Goals</Link> and create it manually.
          </p>
        </div>

        <Modal open={showSetupModal} onClose={() => setShowSetupModal(false)} title="Create Emergency Fund">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              We&apos;ll create an emergency fund goal. You can edit the target amount anytime in Savings Goals.
            </p>
            {avgMonthlyExpenses > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
                Suggested target: <strong>{formatCurrency(suggestedMin, currency)}</strong> (3 months of expenses)
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSetupModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={createEfGoal} className="flex-1">Create Fund</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-xl font-bold text-slate-800">Emergency Fund</h1>
        <Button onClick={() => setShowContribModal(true)} className="ml-auto">+ Add Money</Button>
      </div>

      {/* Main fund card */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
        <p className="text-sm opacity-80 mb-1">Current Balance</p>
        <p className="text-3xl font-bold">{formatCurrency(current, efGoal.currency)}</p>
        <p className="text-sm opacity-70 mt-1">Goal: {formatCurrency(target, efGoal.currency)}</p>

        <div className="mt-4">
          <div className="flex justify-between text-xs opacity-80 mb-1.5">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-xs text-slate-400">Months Covered</p>
          <p className={`text-2xl font-bold mt-1 ${monthsCovered >= 3 ? "text-emerald-600" : "text-amber-600"}`}>
            {monthsCovered.toFixed(1)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Target: 3–6 months</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-xs text-slate-400">Avg Monthly Expenses</p>
          <p className="text-lg font-bold text-slate-700 mt-1">{formatCurrency(avgMonthlyExpenses, currency)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center col-span-2 md:col-span-1">
          <p className="text-xs text-slate-400">Still Needed</p>
          <p className="text-lg font-bold text-rose-600 mt-1">
            {formatCurrency(Math.max(0, target - current), efGoal.currency)}
          </p>
        </div>
      </div>

      {/* Suggested targets */}
      {avgMonthlyExpenses > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Suggested Targets</h3>
          <div className="space-y-2">
            {[
              { label: "Minimum (3 months)", amount: suggestedMin },
              { label: "Recommended (6 months)", amount: suggestedMax },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className="font-semibold text-slate-800 text-sm">{formatCurrency(item.amount, currency)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Based on your average monthly expenses of {formatCurrency(avgMonthlyExpenses, currency)}.
          </p>
        </div>
      )}

      {/* Status message */}
      <div className={`p-4 rounded-2xl text-sm ${monthsCovered >= 6 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : monthsCovered >= 3 ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
        {monthsCovered >= 6
          ? "🎉 Excellent! Your emergency fund is fully funded at 6+ months. You're financially protected."
          : monthsCovered >= 3
          ? "✅ Good job! Your fund covers 3+ months. Consider saving more to reach the 6-month target."
          : `⚠️ Your fund covers ${monthsCovered.toFixed(1)} months. Keep adding to reach the 3-month minimum of ${formatCurrency(suggestedMin, currency)}.`
        }
      </div>

      {/* Contribution modal */}
      <Modal open={showContribModal} onClose={() => setShowContribModal(false)} title="Add to Emergency Fund">
        <form onSubmit={contribForm.handleSubmit(onContrib)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount" required error={contribForm.formState.errors.amount?.message}>
              <Input type="number" step="0.01" placeholder="0.00" {...contribForm.register("amount")} error={!!contribForm.formState.errors.amount} />
            </FormField>
            <FormField label="Currency">
              <Select {...contribForm.register("currency")}>
                {SUPPORTED_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Date" required><Input type="date" {...contribForm.register("date")} /></FormField>
          <FormField label="Notes"><Textarea placeholder="Optional..." {...contribForm.register("notes")} /></FormField>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowContribModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={contribForm.formState.isSubmitting} className="flex-1">Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
