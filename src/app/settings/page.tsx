"use client";
/**
 * Settings page — default currency, exchange rates, backup/restore, and data management.
 */
import { useState, useRef } from "react";
import { useExchangeRates, useSettings, useCategories } from "@/hooks/useDb";
import { exportAllData, importAllData, clearAllData } from "@/lib/db";
import { SUPPORTED_CURRENCIES, CATEGORY_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Category } from "@/lib/types";
import { db } from "@/lib/db";

const categorySchema = z.object({
  name: z.string().min(1, "Name required"),
  type: z.enum(["need", "want", "saving_debt"]),
  icon: z.string().optional(),
  color: z.string().optional(),
});
type CategoryForm = z.infer<typeof categorySchema>;

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { rates, updateRate } = useExchangeRates();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"general" | "currencies" | "categories" | "backup">("general");
  const [clearConfirm, setClearConfirm] = useState(false);
  const [importConfirm, setImportConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<unknown>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // PIN state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinStep, setPinStep] = useState<"enter" | "confirm">("enter");
  const [pinInput, setPinInput] = useState("");
  const [pinFirst, setPinFirst] = useState("");
  const [pinError, setPinError] = useState("");
  const [removePinConfirm, setRemovePinConfirm] = useState(false);

  function openSetPin() {
    setPinStep("enter");
    setPinInput("");
    setPinFirst("");
    setPinError("");
    setShowPinModal(true);
  }

  function handlePinKey(key: string) {
    if (pinInput.length < 4) {
      const next = pinInput + key;
      setPinInput(next);
      setPinError("");
      if (next.length === 4) {
        if (pinStep === "enter") {
          setPinFirst(next);
          setPinStep("confirm");
          setPinInput("");
        } else {
          if (next === pinFirst) {
            updateSettings({ pin: next }).then(() => {
              showToast("PIN set successfully! 🔐");
              setShowPinModal(false);
            });
          } else {
            setPinError("PINs don't match. Try again.");
            setPinStep("enter");
            setPinInput("");
            setPinFirst("");
          }
        }
      }
    }
  }

  function handlePinDelete() {
    setPinInput((p) => p.slice(0, -1));
    setPinError("");
  }

  async function handleRemovePin() {
    await updateSettings({ pin: undefined });
    sessionStorage.removeItem("budget_pin_unlocked");
    showToast("PIN removed", "info");
    setRemovePinConfirm(false);
  }

  const catForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { type: "want", icon: "📦", color: "#6b7280" },
  });

  async function handleExportBackup() {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup exported! 💾");
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.version || !data.transactions) {
          showToast("Invalid backup file", "error");
          return;
        }
        setPendingImport(data);
        setImportConfirm(true);
      } catch {
        showToast("Failed to parse backup file", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function confirmImport() {
    if (!pendingImport) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await importAllData(pendingImport as Parameters<typeof importAllData>[0]);
      showToast("Backup restored! 🎉");
    } catch {
      showToast("Restore failed", "error");
    }
    setPendingImport(null);
  }

  async function onCatSubmit(values: CategoryForm) {
    if (editCat?.id) {
      await updateCategory(editCat.id, values);
      showToast("Category updated!");
    } else {
      await addCategory({ ...values, isDefault: false });
      showToast("Category added!");
    }
    setShowCatModal(false);
  }

  const tabs = [
    { id: "general", label: "⚙️ General" },
    { id: "currencies", label: "💱 Currencies" },
    { id: "categories", label: "🏷️ Categories" },
    { id: "backup", label: "💾 Backup" },
  ] as const;

  return (
    <div className="space-y-4">
      <h1 className="hidden md:block text-xl font-bold text-slate-800">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 whitespace-nowrap px-3 py-2 rounded-xl text-xs font-medium transition ${activeTab === tab.id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General tab */}
      {activeTab === "general" && settings && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
            <h3 className="font-semibold text-slate-800 text-sm">Default Currency</h3>
            <Select
              value={settings.defaultCurrency}
              onChange={(e) => updateSettings({ defaultCurrency: e.target.value }).then(() => showToast("Currency updated!"))}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>
              ))}
            </Select>
          </div>

          {/* PIN Lock */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">🔐 App PIN Lock</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {settings.pin ? "PIN is enabled — app locks on every new session." : "No PIN set — anyone can open this app."}
                </p>
              </div>
              {settings.pin ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={openSetPin}>Change PIN</Button>
                  <Button size="sm" variant="outline" onClick={() => setRemovePinConfirm(true)} className="text-red-500 border-red-200 hover:bg-red-50">Remove</Button>
                </div>
              ) : (
                <Button size="sm" onClick={openSetPin}>Set PIN</Button>
              )}
            </div>
            {settings.pin && (
              <p className="text-xs bg-indigo-50 text-indigo-700 rounded-xl px-3 py-2">
                ✅ PIN is active. You&apos;ll be asked to enter it each time you open the app in a new browser session.
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
            <h3 className="font-semibold text-slate-800 text-sm">50/30/20 Budget Targets</h3>
            <p className="text-xs text-slate-400">These percentages should add up to 100%.</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "needsPercentage", label: "Needs %", value: settings.needsPercentage },
                { key: "wantsPercentage", label: "Wants %", value: settings.wantsPercentage },
                { key: "savingsPercentage", label: "Savings %", value: settings.savingsPercentage },
              ].map((item) => (
                <FormField key={item.key} label={item.label}>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={item.value}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 0 && val <= 100) {
                        updateSettings({ [item.key]: val }).then(() => showToast("Updated!"));
                      }
                    }}
                  />
                </FormField>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Currencies tab */}
      {activeTab === "currencies" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-xs text-amber-700">
            ⚠️ This app is offline-only. Exchange rates are manually set and not live market rates.
            Use these for approximate conversions in reports only.
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {rates.map((rate) => (
              <div key={rate.id} className="flex items-center gap-3 p-3">
                <span className="text-sm font-medium text-slate-700 w-24">
                  {rate.fromCurrency} → {rate.toCurrency}
                </span>
                <Input
                  type="number"
                  step="0.000001"
                  defaultValue={rate.rate}
                  className="flex-1"
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (val > 0 && rate.id) {
                      updateRate(rate.id, val).then(() => showToast("Rate updated!"));
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories tab */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => {
              setEditCat(null);
              catForm.reset({ type: "want", icon: "📦", color: "#6b7280" });
              setShowCatModal(true);
            }}>+ Add Category</Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 p-3">
                <span className="text-xl">{cat.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{cat.name}</p>
                  <p className="text-xs text-slate-400">{CATEGORY_TYPE_LABELS[cat.type]}</p>
                </div>
                {cat.isDefault ? (
                  <Badge variant="default">Default</Badge>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => {
                      setEditCat(cat);
                      catForm.reset({ name: cat.name, type: cat.type, icon: cat.icon ?? "📦", color: cat.color ?? "#6b7280" });
                      setShowCatModal(true);
                    }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 text-sm">✏️</button>
                    <button onClick={() => setDeleteCatId(cat.id!)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 text-sm">🗑️</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Modal open={showCatModal} onClose={() => setShowCatModal(false)} title={editCat ? "Edit Category" : "Add Category"}>
            <form onSubmit={catForm.handleSubmit(onCatSubmit)} className="space-y-4">
              <FormField label="Name" required error={catForm.formState.errors.name?.message}>
                <Input placeholder="e.g. Gym, Pets" {...catForm.register("name")} error={!!catForm.formState.errors.name} />
              </FormField>
              <FormField label="Type" required>
                <Select {...catForm.register("type")}>
                  {Object.entries(CATEGORY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Icon (emoji)">
                  <Input placeholder="📦" {...catForm.register("icon")} />
                </FormField>
                <FormField label="Color (hex)">
                  <Input type="color" {...catForm.register("color")} />
                </FormField>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCatModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" loading={catForm.formState.isSubmitting} className="flex-1">{editCat ? "Save" : "Add"}</Button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={deleteCatId !== null}
            onClose={() => setDeleteCatId(null)}
            onConfirm={async () => {
              if (deleteCatId) {
                try {
                  await deleteCategory(deleteCatId);
                  showToast("Category deleted", "info");
                } catch (e: unknown) {
                  showToast((e as Error).message ?? "Cannot delete", "error");
                }
              }
            }}
            message="Delete this category? It cannot be deleted if transactions are assigned to it."
          />
        </div>
      )}

      {/* Backup tab */}
      {activeTab === "backup" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">Export Backup</h3>
            <p className="text-xs text-slate-500">
              Download all your data as a JSON file. Store it safely to restore later.
            </p>
            <Button onClick={handleExportBackup} className="w-full">💾 Download Backup</Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">Import Backup</h3>
            <p className="text-xs text-slate-500">
              Restore from a previously exported JSON backup. <strong>This will replace all current data.</strong>
            </p>
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full">
              📂 Choose Backup File
            </Button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          </div>

          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-red-600 text-sm">Danger Zone</h3>
            <p className="text-xs text-slate-500">
              Permanently delete all your data and reset to default categories. This cannot be undone.
            </p>
            <Button variant="danger" onClick={() => setClearConfirm(true)} className="w-full">
              🗑️ Clear All Data
            </Button>
          </div>
        </div>
      )}

      {/* PIN Setup Modal */}
      <Modal open={showPinModal} onClose={() => setShowPinModal(false)} title={pinStep === "enter" ? "Set New PIN" : "Confirm PIN"}>
        <div className="flex flex-col items-center space-y-4 py-2">
          <p className="text-sm text-slate-500">
            {pinStep === "enter" ? "Enter a 4-digit PIN" : "Re-enter your PIN to confirm"}
          </p>

          {/* PIN dots */}
          <div className="flex gap-4 my-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all ${i < pinInput.length ? "bg-indigo-600 border-indigo-600 scale-110" : "bg-transparent border-slate-300"}`} />
            ))}
          </div>

          {pinError && <p className="text-red-500 text-sm">{pinError}</p>}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {[1,2,3,4,5,6,7,8,9].map((n) => (
              <button key={n} onClick={() => handlePinKey(String(n))}
                className="h-14 rounded-2xl bg-slate-100 hover:bg-indigo-100 active:bg-indigo-200 text-slate-800 text-xl font-semibold transition-all active:scale-95">
                {n}
              </button>
            ))}
            <div />
            <button onClick={() => handlePinKey("0")}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-indigo-100 active:bg-indigo-200 text-slate-800 text-xl font-semibold transition-all active:scale-95">
              0
            </button>
            <button onClick={handlePinDelete}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-red-100 active:bg-red-200 text-slate-800 text-xl font-semibold transition-all active:scale-95">
              ⌫
            </button>
          </div>

          <Button variant="outline" onClick={() => setShowPinModal(false)} className="w-full">Cancel</Button>
        </div>
      </Modal>

      {/* Remove PIN confirm */}
      <ConfirmDialog
        open={removePinConfirm}
        onClose={() => setRemovePinConfirm(false)}
        onConfirm={handleRemovePin}
        title="Remove PIN?"
        message="Anyone with access to this device will be able to open the app without a PIN."
        confirmLabel="Yes, Remove PIN"
        confirmVariant="danger"
      />

      {/* Confirm import */}
      <ConfirmDialog
        open={importConfirm}
        onClose={() => { setImportConfirm(false); setPendingImport(null); }}
        onConfirm={confirmImport}
        title="Replace all data?"
        message="This will delete all current data and replace it with the backup. Are you sure?"
        confirmLabel="Yes, Restore"
        confirmVariant="danger"
      />

      {/* Confirm clear */}
      <ConfirmDialog
        open={clearConfirm}
        onClose={() => setClearConfirm(false)}
        onConfirm={async () => {
          await clearAllData();
          showToast("All data cleared and reset", "info");
        }}
        title="Clear all data?"
        message="This will permanently delete all your transactions, budgets, goals, and debts. Default categories will be restored."
        confirmLabel="Yes, Clear Everything"
        confirmVariant="danger"
      />
    </div>
  );
}
