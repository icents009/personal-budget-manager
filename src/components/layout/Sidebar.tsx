"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: "🏠", label: "Dashboard" },
  { href: "/transactions", icon: "💸", label: "Transactions" },
  { href: "/budgets", icon: "📊", label: "Budgets" },
  { href: "/savings", icon: "🎯", label: "Savings Goals" },
  { href: "/emergency-fund", icon: "🛡️", label: "Emergency Fund" },
  { href: "/debts", icon: "💳", label: "Debts" },
  { href: "/recurring", icon: "🔄", label: "Recurring" },
  { href: "/reminders", icon: "🔔", label: "Reminders" },
  { href: "/reports", icon: "📈", label: "Reports" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    // Hidden on mobile — shown on md+ screens as a fixed left sidebar
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-slate-100 fixed left-0 top-0 z-30">
      {/* Logo / App name */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            💰
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">Budget</p>
            <p className="text-xs text-slate-400">Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer note */}
      <div className="p-4 text-xs text-slate-400 border-t border-slate-100">
        All data stored locally on this device.
      </div>
    </aside>
  );
}
