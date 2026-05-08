"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const mainItems = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/transactions", icon: "💸", label: "Transactions" },
  { href: "/budgets", icon: "📊", label: "Budgets" },
  { href: "/savings", icon: "🎯", label: "Savings" },
];

const moreItems = [
  { href: "/debts", icon: "💳", label: "Debts" },
  { href: "/emergency-fund", icon: "🛡️", label: "Emergency" },
  { href: "/recurring", icon: "🔁", label: "Recurring" },
  { href: "/reminders", icon: "🔔", label: "Reminders" },
  { href: "/reports", icon: "📈", label: "Reports" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreItems.some((i) => i.href === pathname);

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More menu panel */}
      {showMore && (
        <div className="fixed bottom-16 left-0 right-0 z-50 md:hidden bg-white border-t border-slate-100 rounded-t-2xl shadow-xl p-4">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
          <div className="grid grid-cols-3 gap-3">
            {moreItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
                    isActive ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {mainItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all",
                  isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <span className="text-xl">{item.icon}</span>
                <span className={cn("text-[10px] font-medium", isActive && "text-indigo-600")}>
                  {item.label}
                </span>
                {isActive && <span className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore((v) => !v)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all",
              (showMore || isMoreActive) ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <span className="text-xl">⋯</span>
            <span className={cn("text-[10px] font-medium", (showMore || isMoreActive) && "text-indigo-600")}>
              More
            </span>
            {isMoreActive && !showMore && <span className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />}
          </button>
        </div>
      </nav>
    </>
  );
}
