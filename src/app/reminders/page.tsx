"use client";
/**
 * Reminders page — create and manage financial reminders within the app.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useReminders, useCategories, useSettings } from "@/hooks/useDb";
import { Reminder } from "@/lib/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea, Select } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { format, isPast, isToday, addDays } from "date-fns";
import { parseISO } from "date-fns";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  dueDate: z.string().min(1, "Due date is required"),
  amount: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  categoryId: z.coerce.number().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function RemindersPage() {
  const { reminders, addReminder, updateReminder, deleteReminder } = useReminders();
  const { categories } = useCategories();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Reminder | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDone, setShowDone] = useState(false);

  const currency = settings?.defaultCurrency ?? "NGN";

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency, dueDate: format(addDays(new Date(), 1), "yyyy-MM-dd") },
  });

  const pending = reminders.filter((r) => !r.isDone);
  const done = reminders.filter((r) => r.isDone);

  // Classify pending reminders
  const overdue = pending.filter((r) => isPast(parseISO(r.dueDate)) && !isToday(parseISO(r.dueDate)));
  const dueToday = pending.filter((r) => isToday(parseISO(r.dueDate)));
  const upcoming = pending.filter((r) => !isPast(parseISO(r.dueDate)) && !isToday(parseISO(r.dueDate)));

  function openAdd() {
    setEditItem(null);
    reset({ currency, dueDate: format(addDays(new Date(), 1), "yyyy-MM-dd") });
    setShowModal(true);
  }

  function openEdit(r: Reminder) {
    setEditItem(r);
    reset({
      title: r.title, dueDate: r.dueDate,
      amount: r.amount, currency: r.currency ?? currency,
      categoryId: r.categoryId, notes: r.notes ?? "",
    });
    setShowModal(true);
  }

  async function onSubmit(values: FormValues) {
    const payload = { ...values, isDone: false };
    if (editItem?.id) {
      await updateReminder(editItem.id, payload);
      showToast("Reminder updated!");
    } else {
      await addReminder(payload);
      showToast("Reminder set! 🔔");
    }
    setShowModal(false);
  }

  async function toggleDone(r: Reminder) {
    await updateReminder(r.id!, { isDone: !r.isDone });
    showToast(r.isDone ? "Reminder reopened" : "Marked as done! ✅");
  }

  function ReminderItem({ r, showBadge }: { r: Reminder; showBadge?: "overdue" | "today" }) {
    const cat = categories.find((c) => c.id === r.categoryId);
    return (
      <div className={`bg-white rounded-2xl border shadow-sm p-3 flex items-start gap-3 ${showBadge === "overdue" ? "border-red-100" : showBadge === "today" ? "border-amber-100" : "border-slate-100"}`}>
        {/* Checkbox */}
        <button onClick={() => toggleDone(r)} className={`w-5 h-5 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${r.isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-indigo-400"}`}>
          {r.isDone && <span className="text-xs">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={`text-sm font-medium ${r.isDone ? "line-through text-slate-400" : "text-slate-800"}`}>{r.title}</p>
            {showBadge === "overdue" && <Badge variant="danger">Overdue</Badge>}
            {showBadge === "today" && <Badge variant="warning">Today</Badge>}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            📅 {formatDate(r.dueDate)}
            {r.amount && ` · ${formatCurrency(r.amount, r.currency ?? currency)}`}
            {cat && ` · ${cat.icon} ${cat.name}`}
          </p>
          {r.notes && <p className="text-xs text-slate-400 italic mt-0.5">{r.notes}</p>}
        </div>

        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => openEdit(r)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 text-xs">✏️</button>
          <button onClick={() => setDeleteId(r.id!)} className="p-1 rounded-lg hover:bg-red-50 text-red-400 text-xs">🗑️</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-xl font-bold text-slate-800">Reminders</h1>
        <Button onClick={openAdd} className="ml-auto">+ Add Reminder</Button>
      </div>

      {pending.length === 0 && done.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No reminders"
          description="Create reminders for bill payments, loan due dates, and financial goals."
          action={<Button onClick={openAdd}>+ Add Reminder</Button>}
        />
      ) : (
        <div className="space-y-4">
          {/* Overdue */}
          {overdue.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-red-600">⚠️ Overdue ({overdue.length})</h3>
              {overdue.map((r) => <ReminderItem key={r.id} r={r} showBadge="overdue" />)}
            </div>
          )}

          {/* Due today */}
          {dueToday.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-600">📌 Due Today ({dueToday.length})</h3>
              {dueToday.map((r) => <ReminderItem key={r.id} r={r} showBadge="today" />)}
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-600">📅 Upcoming ({upcoming.length})</h3>
              {upcoming.map((r) => <ReminderItem key={r.id} r={r} />)}
            </div>
          )}

          {/* Done */}
          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone(!showDone)} className="text-sm text-indigo-600 hover:underline">
                {showDone ? "Hide" : "Show"} {done.length} completed reminder(s)
              </button>
              {showDone && (
                <div className="mt-2 space-y-2">
                  {done.map((r) => <ReminderItem key={r.id} r={r} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Form modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Reminder" : "New Reminder"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Title" required error={errors.title?.message}>
            <Input placeholder="e.g. Pay electricity bill" {...register("title")} error={!!errors.title} />
          </FormField>
          <FormField label="Due Date" required error={errors.dueDate?.message}>
            <Input type="date" {...register("dueDate")} error={!!errors.dueDate} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount (optional)">
              <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
            </FormField>
            <FormField label="Currency">
              <Select {...register("currency")}>
                {SUPPORTED_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Category (optional)">
            <Select {...register("categoryId")}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Notes">
            <Textarea placeholder="Optional notes..." {...register("notes")} />
          </FormField>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">{editItem ? "Save" : "Set Reminder"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) { deleteReminder(deleteId); showToast("Reminder deleted", "info"); } }}
        message="Delete this reminder?"
      />
    </div>
  );
}
