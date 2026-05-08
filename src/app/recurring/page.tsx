"use client";
/**
 * Recurring Expenses page — track subscriptions, bills, and regular payments.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRecurringExpenses, useCategories, useSettings } from "@/hooks/useDb";
import { RecurringExpense } from "@/lib/types";
import { formatCurrency, formatDate, getUpcomingDates } from "@/lib/utils";
import { SUPPORTED_CURRENCIES, FREQUENCY_LABELS } from "@/lib/constants";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea, Select } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { format } from "date-fns";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().positive("Amount must be > 0"),
  currency: z.string().min(1),
  categoryId: z.coerce.number().min(1, "Select a category"),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function RecurringPage() {
  const { recurring, addRecurring, updateRecurring, deleteRecurring } = useRecurringExpenses();
  const { categories } = useCategories();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<RecurringExpense | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const currency = settings?.defaultCurrency ?? "NGN";
  const expenseCategories = categories.filter((c) =>
    !["Salary", "Freelance", "Business", "Investment", "Gift"].includes(c.name)
  );

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency, frequency: "monthly", startDate: format(new Date(), "yyyy-MM-dd") },
  });

  const activeItems = recurring.filter((r) => r.isActive);
  const inactiveItems = recurring.filter((r) => !r.isActive);

  // Calculate upcoming occurrences for active items
  const upcomingThisMonth = activeItems.flatMap((r) => {
    const dates = getUpcomingDates(r.startDate, r.frequency, 30);
    return dates.map((d) => ({ ...r, nextDate: d }));
  }).sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  function openAdd() {
    setEditItem(null);
    reset({ currency, frequency: "monthly", startDate: format(new Date(), "yyyy-MM-dd") });
    setShowModal(true);
  }

  function openEdit(r: RecurringExpense) {
    setEditItem(r);
    reset({
      name: r.name, amount: r.amount, currency: r.currency, categoryId: r.categoryId,
      frequency: r.frequency, startDate: r.startDate, endDate: r.endDate ?? "",
      notes: r.notes ?? "",
    });
    setShowModal(true);
  }

  async function onSubmit(values: FormValues) {
    const payload = { ...values, isActive: true };
    if (editItem?.id) {
      await updateRecurring(editItem.id, payload);
      showToast("Updated!");
    } else {
      await addRecurring(payload);
      showToast("Recurring expense added! 🔄");
    }
    setShowModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-xl font-bold text-slate-800">Recurring Expenses</h1>
        <Button onClick={openAdd} className="ml-auto">+ Add Recurring</Button>
      </div>

      {/* Upcoming card */}
      {upcomingThisMonth.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">📅 Upcoming (Next 30 Days)</h3>
          <div className="space-y-2">
            {upcomingThisMonth.slice(0, 8).map((r, i) => {
              const cat = categories.find((c) => c.id === r.categoryId);
              return (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat?.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.nextDate} · {FREQUENCY_LABELS[r.frequency]}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm text-rose-600">-{formatCurrency(r.amount, r.currency)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeItems.length === 0 ? (
        <EmptyState
          icon="🔄"
          title="No recurring expenses"
          description="Add subscriptions, rent, and regular bills to track them automatically."
          action={<Button onClick={openAdd}>+ Add Recurring</Button>}
        />
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm">Active ({activeItems.length})</h3>
          {activeItems.map((r) => {
            const cat = categories.find((c) => c.id === r.categoryId);
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ backgroundColor: cat?.color + "20" }}>
                      {cat?.icon ?? "🔄"}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{r.name}</p>
                      <div className="flex gap-1.5 mt-0.5 flex-wrap">
                        <Badge variant="info">{FREQUENCY_LABELS[r.frequency]}</Badge>
                        <Badge variant="default">{cat?.name}</Badge>
                        {r.endDate && <Badge variant="warning">Ends {formatDate(r.endDate, "MMM d")}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-rose-600">{formatCurrency(r.amount, r.currency)}</p>
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => openEdit(r)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 text-xs">✏️</button>
                      <button onClick={() => updateRecurring(r.id!, { isActive: false }).then(() => showToast("Paused", "info"))}
                        className="p-1 rounded-lg hover:bg-amber-50 text-amber-500 text-xs">⏸️</button>
                      <button onClick={() => setDeleteId(r.id!)} className="p-1 rounded-lg hover:bg-red-50 text-red-400 text-xs">🗑️</button>
                    </div>
                  </div>
                </div>
                {r.notes && <p className="text-xs text-slate-400 mt-2 italic">{r.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Paused items */}
      {inactiveItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-500 text-sm">Paused ({inactiveItems.length})</h3>
          {inactiveItems.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-3 opacity-60 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">{r.name} — {formatCurrency(r.amount, r.currency)}/{r.frequency}</p>
              <Button size="sm" variant="outline" onClick={() => updateRecurring(r.id!, { isActive: true }).then(() => showToast("Resumed! 🔄"))}>Resume</Button>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Recurring" : "Add Recurring Expense"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Name" required error={errors.name?.message}>
            <Input placeholder="e.g. Netflix, Rent, Internet" {...register("name")} error={!!errors.name} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount" required error={errors.amount?.message}>
              <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} error={!!errors.amount} />
            </FormField>
            <FormField label="Currency">
              <Select {...register("currency")}>
                {SUPPORTED_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Category" required error={errors.categoryId?.message}>
            <Select {...register("categoryId")} error={!!errors.categoryId}>
              <option value="">Select category</option>
              {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Frequency" required>
              <Select {...register("frequency")}>
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </FormField>
            <FormField label="Start Date" required>
              <Input type="date" {...register("startDate")} />
            </FormField>
          </div>
          <FormField label="End Date" hint="Leave empty for ongoing">
            <Input type="date" {...register("endDate")} />
          </FormField>
          <FormField label="Notes">
            <Textarea placeholder="Optional..." {...register("notes")} />
          </FormField>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">{editItem ? "Save" : "Add"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) { deleteRecurring(deleteId); showToast("Deleted", "info"); } }}
        message="Delete this recurring expense?"
      />
    </div>
  );
}
