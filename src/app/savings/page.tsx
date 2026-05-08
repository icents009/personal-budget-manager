"use client";
/**
 * Savings Goals page — create goals, track progress, add contributions.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSavingsGoals, useSavingsContributions, useSettings } from "@/hooks/useDb";
import { SavingsGoal } from "@/lib/types";
import { formatCurrency, pct, monthlyContributionNeeded, formatDate } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea, Select } from "@/components/ui/FormField";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { format } from "date-fns";

const goalSchema = z.object({
  name: z.string().min(1, "Goal name is required"),
  targetAmount: z.coerce.number().positive("Target must be > 0"),
  currentAmount: z.coerce.number().min(0),
  currency: z.string().min(1),
  targetDate: z.string().optional(),
  notes: z.string().optional(),
  isEmergencyFund: z.boolean().optional(),
});
type GoalForm = z.infer<typeof goalSchema>;

const contribSchema = z.object({
  amount: z.coerce.number().positive("Amount must be > 0"),
  currency: z.string().min(1),
  date: z.string().min(1),
  notes: z.string().optional(),
});
type ContribForm = z.infer<typeof contribSchema>;

export default function SavingsPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useSavingsGoals();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<number | null>(null);
  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null);
  const [historyGoal, setHistoryGoal] = useState<SavingsGoal | null>(null);

  const currency = settings?.defaultCurrency ?? "NGN";

  const goalForm = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: { currency, currentAmount: 0, isEmergencyFund: false },
  });

  const regularGoals = goals.filter((g) => !g.isEmergencyFund);

  function openAddGoal() {
    setEditGoal(null);
    goalForm.reset({ currency, currentAmount: 0, isEmergencyFund: false });
    setShowGoalModal(true);
  }

  function openEditGoal(g: SavingsGoal) {
    setEditGoal(g);
    goalForm.reset({
      name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount,
      currency: g.currency, targetDate: g.targetDate ?? "", notes: g.notes ?? "",
      isEmergencyFund: g.isEmergencyFund,
    });
    setShowGoalModal(true);
  }

  async function onGoalSubmit(values: GoalForm) {
    const payload = { ...values, isCompleted: false, isEmergencyFund: values.isEmergencyFund ?? false };
    if (editGoal?.id) {
      await updateGoal(editGoal.id, payload);
      showToast("Goal updated!");
    } else {
      await addGoal(payload);
      showToast("Goal created! 🎯");
    }
    setShowGoalModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-xl font-bold text-slate-800">Savings Goals</h1>
        <Button onClick={openAddGoal} className="ml-auto">+ New Goal</Button>
      </div>

      {regularGoals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No savings goals yet"
          description="Create a goal to save for something meaningful."
          action={<Button onClick={openAddGoal}>+ New Goal</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {regularGoals.map((goal) => {
            const progress = pct(goal.currentAmount, goal.targetAmount);
            const monthly = goal.targetDate
              ? monthlyContributionNeeded(goal.targetAmount, goal.currentAmount, goal.targetDate)
              : null;
            return (
              <div key={goal.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{goal.name}</h3>
                    {goal.targetDate && (
                      <p className="text-xs text-slate-400 mt-0.5">Target: {formatDate(goal.targetDate)}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {goal.isCompleted && <Badge variant="success">✅ Done</Badge>}
                    <button onClick={() => openEditGoal(goal)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 text-sm">✏️</button>
                    <button onClick={() => setDeleteGoalId(goal.id!)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 text-sm">🗑️</button>
                  </div>
                </div>

                <ProgressBar
                  value={progress}
                  label={`${formatCurrency(goal.currentAmount, goal.currency)} saved`}
                  sublabel={`of ${formatCurrency(goal.targetAmount, goal.currency)}`}
                  color={progress >= 100 ? "bg-emerald-500" : "bg-indigo-500"}
                />

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-slate-50 rounded-xl p-2 text-center">
                    <p className="text-xs text-slate-400">Remaining</p>
                    <p className="font-semibold text-sm text-slate-700">
                      {formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount), goal.currency)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2 text-center">
                    <p className="text-xs text-slate-400">Monthly needed</p>
                    <p className="font-semibold text-sm text-indigo-600">
                      {monthly !== null ? formatCurrency(monthly, goal.currency) : "—"}
                    </p>
                  </div>
                </div>

                {goal.notes && <p className="text-xs text-slate-400 mt-2 italic">{goal.notes}</p>}

                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => setContribGoal(goal)} className="flex-1">+ Contribute</Button>
                  <Button size="sm" variant="outline" onClick={() => setHistoryGoal(goal)} className="flex-1">History</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal form modal */}
      <Modal open={showGoalModal} onClose={() => setShowGoalModal(false)} title={editGoal ? "Edit Goal" : "New Savings Goal"}>
        <form onSubmit={goalForm.handleSubmit(onGoalSubmit)} className="space-y-4">
          <FormField label="Goal Name" required error={goalForm.formState.errors.name?.message}>
            <Input placeholder="e.g. Vacation Fund, New Laptop" {...goalForm.register("name")} error={!!goalForm.formState.errors.name} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Target Amount" required error={goalForm.formState.errors.targetAmount?.message}>
              <Input type="number" step="0.01" placeholder="0.00" {...goalForm.register("targetAmount")} error={!!goalForm.formState.errors.targetAmount} />
            </FormField>
            <FormField label="Currency">
              <Select {...goalForm.register("currency")}>
                {SUPPORTED_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Already Saved">
            <Input type="number" step="0.01" placeholder="0.00" {...goalForm.register("currentAmount")} />
          </FormField>
          <FormField label="Target Date" hint="Used to calculate required monthly savings">
            <Input type="date" {...goalForm.register("targetDate")} />
          </FormField>
          <FormField label="Notes">
            <Textarea placeholder="What are you saving for?" {...goalForm.register("notes")} />
          </FormField>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...goalForm.register("isEmergencyFund")} className="w-4 h-4 rounded accent-indigo-600" />
            <span className="text-sm text-slate-600">This is my Emergency Fund</span>
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowGoalModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={goalForm.formState.isSubmitting} className="flex-1">
              {editGoal ? "Save Changes" : "Create Goal"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Contribution modal */}
      {contribGoal && (
        <ContributionModal
          goal={contribGoal}
          defaultCurrency={currency}
          onClose={() => setContribGoal(null)}
          onSuccess={() => { showToast("Contribution added! 💰"); setContribGoal(null); }}
        />
      )}

      {/* History modal */}
      {historyGoal && (
        <ContributionHistory
          goal={historyGoal}
          onClose={() => setHistoryGoal(null)}
          showToast={showToast}
        />
      )}

      <ConfirmDialog
        open={deleteGoalId !== null}
        onClose={() => setDeleteGoalId(null)}
        onConfirm={() => { if (deleteGoalId) { deleteGoal(deleteGoalId); showToast("Goal deleted", "info"); } }}
        message="Delete this savings goal and all its contributions? This cannot be undone."
      />
    </div>
  );
}

function ContributionModal({ goal, defaultCurrency, onClose, onSuccess }: {
  goal: SavingsGoal; defaultCurrency: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const { addContribution } = useSavingsContributions(goal.id);
  const form = useForm<ContribForm>({
    resolver: zodResolver(contribSchema),
    defaultValues: { currency: defaultCurrency, date: format(new Date(), "yyyy-MM-dd") },
  });

  async function onSubmit(values: ContribForm) {
    await addContribution({ ...values, goalId: goal.id!, isLocked: false });
    onSuccess();
  }

  return (
    <Modal open={true} onClose={onClose} title={`Add to "${goal.name}"`}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount" required error={form.formState.errors.amount?.message}>
            <Input type="number" step="0.01" placeholder="0.00" {...form.register("amount")} error={!!form.formState.errors.amount} />
          </FormField>
          <FormField label="Currency">
            <Select {...form.register("currency")}>
              {SUPPORTED_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Date" required><Input type="date" {...form.register("date")} /></FormField>
        <FormField label="Notes"><Textarea placeholder="Optional..." {...form.register("notes")} /></FormField>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={form.formState.isSubmitting} className="flex-1">Add Contribution</Button>
        </div>
      </form>
    </Modal>
  );
}

function ContributionHistory({ goal, onClose, showToast }: {
  goal: SavingsGoal; onClose: () => void;
  showToast: (m: string, t?: "success" | "error" | "info" | "warning") => void;
}) {
  const { contributions, deleteContribution } = useSavingsContributions(goal.id);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  return (
    <Modal open={true} onClose={onClose} title={`${goal.name} — History`}>
      {contributions.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No contributions yet.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {[...contributions].reverse().map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-emerald-600">+{formatCurrency(c.amount, c.currency)}</p>
                <p className="text-xs text-slate-400">{formatDate(c.date)}{c.notes ? ` · ${c.notes}` : ""}</p>
              </div>
              <div className="flex items-center gap-1">
                {c.isLocked && <Badge variant="warning">🔒</Badge>}
                {!c.isLocked && (
                  <button onClick={() => setConfirmDeleteId(c.id!)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 text-sm">🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" onClick={onClose} className="w-full mt-4">Close</Button>
      <ConfirmDialog
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          const c = contributions.find((x) => x.id === confirmDeleteId);
          if (c) { await deleteContribution(c.id!, c.goalId, c.amount); showToast("Contribution removed", "info"); }
        }}
        message="Delete this contribution? The saved amount will be reduced."
      />
    </Modal>
  );
}
