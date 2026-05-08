"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "Transactions",
  "/budgets": "Budgets",
  "/savings": "Savings Goals",
  "/emergency-fund": "Emergency Fund",
  "/debts": "Debts",
  "/recurring": "Recurring Expenses",
  "/reminders": "Reminders",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();
  // Handle dynamic routes like /transactions/new
  const base = "/" + pathname.split("/")[1];
  const title = titles[pathname] ?? titles[base] ?? "Budget Manager";

  return (
    // Mobile-only top header — hidden on desktop (sidebar handles navigation)
    <header className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-slate-800 text-base">{title}</h1>
        <Link href="/settings" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <span className="text-lg">⚙️</span>
        </Link>
      </div>
    </header>
  );
}
