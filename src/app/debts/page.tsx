"use client";
/**
 * Debts page — track debts, add payments, view repayment progress.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDebts, useDebtPayments, useSettings } from "@/hooks/useDb";
import { Debt } from "@/lib/types";
import { formatCurrency, pct, formatDate } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea, Select } from "@/components/ui/FormField";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { format } from "date-fns";

const debtSchema = z.object({
  name: z.string().min(1, "Debt name is required"),
  totalAmount: z.coerce.number().positive("Total must be > 0"),
  amountPaid: z.coerce.number().min(0),
  currency: z.string().min(1),
  interestRate: z.coerce.number().min(0).optional(),
  minimumPayment: z.coerce.number().min(0).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});
type DebtForm = z.infer<typeof debtSchema>;

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be > 0"),
  currency: z.string().min(1),
  date: z.string().min(1),
  notes: z.string().optional(),
});
type PaymentForm = z.infer<typeof paymentSchema>;

export default function DebtsPage() {
  const { debts, addDebt, updateDebt, deleteDebt } = useDebts();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [deleteDebtId, setDeleteDebtId] = useState<number | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const currency = settings?.defaultCurrency ?? "NGN";

  const debtForm = useForm<DebtForm>({
    resolver: zodResolver(debtSchema),
    defaultValues: { currency, amountPaid: 0 },
  });

  const activeDebts = debts.filter((d) => !d.isCompleted);
  const completedDebts = debts.filter((d) => d.isCompleted);
  const totalOwed = activeDebts.reduce((s, d) => s + (d.totalAmount - d.amountPaid), 0);

  function openAddDebt() {
    setEditDebt(null);
    debtForm.reset({ currency, amountPaid: 0 });
    setShowDebtModal(true);
  }

  function openEditDebt(d: Debt) {
    setEditDebt(d);
    debtForm.reset({
      name: d.name, totalAmount: d.totalAmount, amountPaid: d.amountPaid,
      currency: d.currency, interestRate: d.interestRate ?? undefined,
      minimumPayment: d.minimumPayment ?? undefined, dueDate: d.dueDate ?? "",
      notes: d.notes ?? "",
    });
    setShowDebtModal(true);
  }

  async function onDebtSubmit(values: DebtForm) {
    const payload = { ...values, isCompleted: (values.amountPaid ?? 0) >= values.totalAmount };
    if (editDebt?.id) {
      await updateDebt(editDebt.id, payload);
      showToast("Debt updated!");
    } else {
      await addDebt(payload);
      showToast("Debt added!");
    }
    setShowDebtModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-xl font-bold text-slate-800">Debts</h1>
        <Button onClick={openAddDebt} className="ml-auto">+ Add Debt</Button>
      </div>

      {/* Summary */}
      {activeDebts.length > 0 && (
        <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl p-4 text-white">
          <p className="text-sm opacity-80">Total Remaining Debt</p>
          <p className="text-2xl font-bold mt-0.5">{formatCurrency(totalOwed, currency)}</p>
          <p className="text-xs opacity-70 mt-1">{activeDebts.length} active debt(s)</p>
        </div>
      )}

      {activeDebts.length === 0 ? (
        <EmptyState
          icon="💳"
          title="No active debts"
          description="You're debt free! Or add a debt to start tracking repayment progress."
          action={<Button onClick={openAddDebt}>+ Add Debt</Button>}
        />
      ) : (
        <div className="space-y-3">
          {activeDebts.map((debt) => {
            const remaining = debt.totalAmount - debt.amountPaid;
            const progress = pct(debt.amountPaid, debt.totalAmount);
            return (
              <div key={debt.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{debt.name}</h3>
                    <div className="flex gap-2 mt-0.5">
                      {debt.interestRate && (
                        <Badge variant="warning">{debt.interestRate}% interest</Badge>
                      )}
                      {debt.dueDate && (
                        <Badge variant="info">Due {formatDate(debt.dueDate, "MMM d")}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditDebt(debt)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 text-sm">✏️</button>
                    <button onClick={() => setDeleteDebtId(debt.id!)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 text-sm">🗑️</button>
                  </div>
                </div>

                <ProgressBar
                  value={progress}
                  label={`${formatCurrency(debt.amountPaid, debt.currency)} paid`}
                  sublabel={`of ${formatCurrency(debt.totalAmount, debt.currency)}`}
                  color="bg-indigo-500"
                />

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-slate-50 rounded-xl p-2 text-center">
                    <p className="text-xs text-slate-400">Remaining</p>
                    <p className="font-semibold text-sm text-rose-600">{formatCurrency(remaining, debt.currency)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2 text-center">
                    <p className="text-xs text-slate-400">Min Payment</p>
                    <p className="font-semibold text-sm text-slate-700">
                      {debt.minimumPayment ? formatCurrency(debt.minimumPayment, debt.currency) : "—"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2 text-center">
                    <p className="text-xs text-slate-400">Months left</p>
                    <p className="font-semibold text-sm text-slate-700">
                      {debt.minimumPayment && debt.minimumPayment > 0
                        ? Math.ceil(remaining / debt.minimumPayment)
                        : "—"}
                    </p>
                  </div>
                </div>

                {debt.notes && <p className="text-xs text-slate-400 mt-2 italic">{debt.notes}</p>}

                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => setPaymentDebt(debt)} className="flex-1">+ Record Payment</Button>
                  <Button size="sm" variant="outline" onClick={() => setHistoryDebt(debt)} className="flex-1">History</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed debts toggle */}
      {completedDebts.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-sm text-indigo-600 hover:underline"
          >
            {showCompleted ? "Hide" : "Show"} {completedDebts.length} paid off debt(s)
          </button>
          {showCompleted && (
            <div className="mt-2 space-y-2">
              {completedDebts.map((debt) => (
                <div key={debt.id} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center justify-between opacity-60">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{debt.name}</p>
                    <p className="text-xs text-slate-400">{formatCurrency(debt.totalAmount, debt.currency)} — Paid off</p>
                  </div>
                  <Badge variant="success">✅ Done</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Debt form modal */}
      <Modal open={showDebtModal} onClose={() => setShowDebtModal(false)} title={editDebt ? "Edit Debt" : "Add Debt"}>
        <form onSubmit={debtForm.handleSubmit(onDebtSubmit)} className="space-y-4">
          <FormField label="Debt Name" required error={debtForm.formState.errors.name?.message}>
            <Input placeholder="e.g. Car Loan, Credit Card" {...debtForm.register("name")} error={!!debtForm.formState.errors.name} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Total Amount" required error={debtForm.formState.errors.totalAmount?.message}>
              <Input type="number" step="0.01" placeholder="0.00" {...debtForm.register("totalAmount")} error={!!debtForm.formState.errors.totalAmount} />
            </FormField>
            <FormField label="Already Paid">
              <Input type="number" step="0.01" placeholder="0.00" {...debtForm.register("amountPaid")} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Currency">
              <Select {...debtForm.register("currency")}>
                {SUPPORTED_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </Select>
            </FormField>
            <FormField label="Interest Rate %" hint="Annual percentage">
              <Input type="number" step="0.01" placeholder="e.g. 15" {...debtForm.register("interestRate")} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Min Monthly Payment">
              <Input type="number" step="0.01" placeholder="0.00" {...debtForm.register("minimumPayment")} />
            </FormField>
            <FormField label="Due Date">
              <Input type="date" {...debtForm.register("dueDate")} />
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea placeholder="Optional..." {...debtForm.register("notes")} />
          </FormField>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowDebtModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={debtForm.formState.isSubmitting} className="flex-1">
              {editDebt ? "Save Changes" : "Add Debt"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment modal */}
      {paymentDebt && (
        <PaymentModal
          debt={paymentDebt}
          defaultCurrency={currency}
          onClose={() => setPaymentDebt(null)}
          onSuccess={() => { showToast("Payment recorded! 💳"); setPaymentDebt(null); }}
        />
      )}

      {/* Payment history modal */}
      {historyDebt && (
        <PaymentHistory debt={historyDebt} onClose={() => setHistoryDebt(null)} />
      )}

      <ConfirmDialog
        open={deleteDebtId !== null}
        onClose={() => setDeleteDebtId(null)}
        onConfirm={() => { if (deleteDebtId) { deleteDebt(deleteDebtId); showToast("Debt deleted", "info"); } }}
        message="Delete this debt and all payment history?"
      />
    </div>
  );
}

function PaymentModal({ debt, defaultCurrency, onClose, onSuccess }: {
  debt: Debt; defaultCurrency: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const { addPayment } = useDebtPayments(debt.id);
  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { currency: defaultCurrency, date: format(new Date(), "yyyy-MM-dd"), amount: debt.minimumPayment },
  });

  async function onSubmit(values: PaymentForm) {
    await addPayment({ ...values, debtId: debt.id! });
    onSuccess();
  }

  const remaining = debt.totalAmount - debt.amountPaid;

  return (
    <Modal open={true} onClose={onClose} title={`Payment for "${debt.name}"`}>
      <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm text-slate-600">
        Remaining: <strong className="text-rose-600">{formatCurrency(remaining, debt.currency)}</strong>
        {debt.minimumPayment && <> · Min: <strong>{formatCurrency(debt.minimumPayment, debt.currency)}</strong></>}
      </div>
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
          <Button type="submit" loading={form.formState.isSubmitting} className="flex-1">Record Payment</Button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentHistory({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const { payments } = useDebtPayments(debt.id);
  return (
    <Modal open={true} onClose={onClose} title={`${debt.name} — Payment History`}>
      {payments.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No payments recorded yet.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {[...payments].reverse().map((p) => (
            <div key={p.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-indigo-600">-{formatCurrency(p.amount, p.currency)}</p>
                <p className="text-xs text-slate-400">{formatDate(p.date)}{p.notes ? ` · ${p.notes}` : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" onClick={onClose} className="w-full mt-4">Close</Button>
    </Modal>
  );
}
