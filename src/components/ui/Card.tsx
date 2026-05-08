"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Card({ className, title, subtitle, action, children, ...props }: CardProps) {
  return (
    <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-5", className)} {...props}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-3">
          <div>
            {title && <h3 className="font-semibold text-slate-800 text-sm md:text-base">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="ml-2 flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = "indigo",
  className,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: "indigo" | "emerald" | "rose" | "amber" | "blue";
  className?: string;
}) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-100 p-4", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0", colors[color])}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate">{title}</p>
          <p className="font-bold text-slate-800 text-base md:text-lg truncate">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
