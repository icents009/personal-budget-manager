"use client";
/**
 * Transactions page — view, add, edit, and delete income and expenses.
 * Supports receipt upload (stored as base64 in IndexedDB).
 */
import { useState, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useTransactions, useCategories, useSettings } from "@/hooks/useDb";
import { Transaction } from "@/lib/types";
import { formatCurrency, isInMonth, getCurrentMonth, generateMonthOptions, formatDate } from "@/lib/utils";
import { SUPPORTED_CURRENCIES, PAYMENT_METHODS } from "@/lib/constants";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea, Select } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

// Validation schema for the transaction form
const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  currency: z.string().min(1),
  categoryId: z.coerce.number().min(1, "Please select a category"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  paymentMethod: z.string().optional(),
  isRecurring: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function TransactionsPage() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const { settings } = useSettings();
  const { showToast } = useToast();

  // UI state
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [receiptFile, setReceiptFile] = useState<{ dataUrl: string; name: string } | null>(null);
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const currency = settings?.defaultCurrency ?? "NGN";
  const monthOptions = generateMonthOptions(12);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "expense",
      currency: currency,
      date: format(new Date(), "yyyy-MM-dd"),
      isRecurring: false,
    },
  });

  const txType = watch("type");

  // Filter categories by transaction type
  const expenseCategories = categories.filter((c) =>
    !["Salary", "Freelance", "Business", "Investment", "Gift"].includes(c.name)
  );
  const incomeCategories = categories.filter((c) =>
    ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"].includes(c.name)
  );
  const relevantCategories = txType === "income" ? incomeCategories : expenseCategories;

  // Filter transactions for display
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (!isInMonth(t.date, selectedMonth)) return false;
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterCategory !== "all" && t.categoryId !== Number(filterCategory)) return false;
      return true;
    });
  }, [transactions, selectedMonth, filterType, filterCategory]);

  const totalFiltered = filtered.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

  // Open the add/edit modal
  function openAdd() {
    setEditingTx(null);
    setReceiptFile(null);
    reset({
      type: "expense",
      currency: currency,
      date: format(new Date(), "yyyy-MM-dd"),
      isRecurring: false,
    });
    setShowModal(true);
  }

  function openEdit(tx: Transaction) {
    setEditingTx(tx);
    setReceiptFile(tx.receiptPath ? { dataUrl: tx.receiptPath, name: tx.receiptName ?? "receipt" } : null);
    reset({
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      categoryId: tx.categoryId,
      date: tx.date,
      notes: tx.notes ?? "",
      paymentMethod: tx.paymentMethod ?? "",
      isRecurring: tx.isRecurring ?? false,
    });
    setShowModal(true);
  }

  // Handle receipt file upload — convert to base64 for local storage
  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptFile({ dataUrl: reader.result as string, name: file.name });
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      notes: values.notes ?? "",
      paymentMethod: values.paymentMethod ?? "",
      isRecurring: values.isRecurring ?? false,
      receiptPath: receiptFile?.dataUrl,
      receiptName: receiptFile?.name,
    };

    if (editingTx?.id) {
      await updateTransaction(editingTx.id, payload);
      showToast("Transaction updated!");
    } else {
      await addTransaction(payload);
      showToast("Transaction added!");
    }
    setShowModal(false);
  }

  async function handleDelete(id: number) {
    await deleteTransaction(id);
    showToast("Transaction deleted", "info");
  }

  return (
    <div className="space-y-4">
      {/* Page title + add button */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-xl font-bold text-slate-800">Transactions</h1>
        <Button onClick={openAdd} className="ml-auto">+ Add Transaction</Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap gap-2">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as typeof filterType)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>

        <div className="ml-auto text-sm font-semibold text-slate-700 flex items-center">
          Net: <span className={totalFiltered >= 0 ? "text-emerald-600 ml-1" : "text-red-500 ml-1"}>
            {totalFiltered >= 0 ? "+" : ""}{formatCurrency(totalFiltered, currency)}
          </span>
        </div>
      </div>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="💸"
          title="No transactions found"
          description="Add your first transaction to start tracking your finances."
          action={<Button onClick={openAdd}>+ Add Transaction</Button>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {filtered.map((tx) => {
            const cat = categories.find((c) => c.id === tx.categoryId);
            return (
              <div key={tx.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 transition group">
                {/* Category icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: cat?.color + "20" }}>
                  {cat?.icon ?? "📦"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-slate-800 truncate">{cat?.name ?? "Unknown"}</p>
                    {tx.isRecurring && <Badge variant="info">Recurring</Badge>}
                    {tx.receiptPath && (
                      <button onClick={() => setViewReceipt(tx.receiptPath!)} className="text-xs text-indigo-500 hover:underline">📎</button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{formatDate(tx.date)} {tx.notes ? `· ${tx.notes}` : ""}</p>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-semibold text-sm ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                  </p>
                  <p className="text-xs text-slate-400">{tx.paymentMethod}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openEdit(tx)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 text-sm">✏️</button>
                  <button onClick={() => setDeleteId(tx.id!)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 text-sm">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingTx ? "Edit Transaction" : "Add Transaction"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue("type", t)}
                className={`flex-1 py-2 text-sm font-medium transition ${txType === t
                  ? t === "expense" ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"}`}
              >
                {t === "expense" ? "💸 Expense" : "💵 Income"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount" required error={errors.amount?.message}>
              <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} error={!!errors.amount} />
            </FormField>
            <FormField label="Currency" required>
              <Select {...register("currency")}>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Category" required error={errors.categoryId?.message}>
            <Select {...register("categoryId")} error={!!errors.categoryId}>
              <option value="">Select category</option>
              {relevantCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Date" required error={errors.date?.message}>
            <Input type="date" {...register("date")} error={!!errors.date} />
          </FormField>

          {txType === "expense" && (
            <FormField label="Payment Method">
              <Select {...register("paymentMethod")}>
                <option value="">Select method</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </FormField>
          )}

          <FormField label="Notes">
            <Textarea placeholder="Optional notes..." {...register("notes")} />
          </FormField>

          {/* Receipt upload */}
          {txType === "expense" && (
            <div>
              <label className="text-sm font-medium text-slate-700">Receipt (optional)</label>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => receiptInputRef.current?.click()}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
                >
                  📎 {receiptFile ? receiptFile.name : "Attach Receipt"}
                </button>
                {receiptFile && (
                  <button type="button" onClick={() => setReceiptFile(null)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                )}
              </div>
              <input ref={receiptInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReceiptUpload} />
            </div>
          )}

          {/* Recurring toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register("isRecurring")} className="w-4 h-4 rounded accent-indigo-600" />
            <span className="text-sm text-slate-600">Mark as recurring expense</span>
          </label>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">
              {editingTx ? "Save Changes" : "Add Transaction"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Receipt viewer */}
      <Modal open={!!viewReceipt} onClose={() => setViewReceipt(null)} title="Receipt">
        {viewReceipt && (
          viewReceipt.startsWith("data:image") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewReceipt} alt="Receipt" className="w-full rounded-xl" />
          ) : (
            <p className="text-sm text-slate-500">PDF receipt attached. <a href={viewReceipt} target="_blank" className="text-indigo-600 underline">Open PDF</a></p>
          )
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) handleDelete(deleteId); }}
        message="Are you sure you want to delete this transaction? This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
