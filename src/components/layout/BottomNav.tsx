"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/transactions", icon: "💸", label: "Transactions" },
  { href: "/budgets", icon: "📊", label: "Budgets" },
  { href: "/savings", icon: "🎯", label: "Savings" },
  { href: "/reports", icon: "📈", label: "Reports" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    // Only visible on mobile — hidden on md+ screens
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
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
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
