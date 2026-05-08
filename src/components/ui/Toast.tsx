"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = React.createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const showToast = React.useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — fixed bottom-right on desktop, bottom-center on mobile */}
      <div className="fixed bottom-20 md:bottom-6 left-1/2 md:left-auto md:right-6 -translate-x-1/2 md:translate-x-0 z-[100] flex flex-col gap-2 w-[calc(100vw-32px)] md:w-auto max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast }: { toast: ToastItem }) {
  const icons: Record<ToastType, string> = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };
  const colors: Record<ToastType, string> = {
    success: "bg-emerald-600",
    error: "bg-red-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-2xl text-white text-sm font-medium shadow-lg pointer-events-auto",
      "animate-in slide-in-from-bottom-4 fade-in duration-300",
      colors[toast.type]
    )}>
      <span>{icons[toast.type]}</span>
      <span>{toast.message}</span>
    </div>
  );
}
