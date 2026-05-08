import * as React from "react";
import { cn, progressColor } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  sublabel?: string;
  color?: string; // Tailwind class like "bg-indigo-500"
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  label,
  sublabel,
  color,
  showPercentage = true,
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const barColor = color ?? progressColor(value);

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5">
          <div>
            {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
            {sublabel && <span className="text-xs text-slate-400 ml-2">{sublabel}</span>}
          </div>
          {showPercentage && (
            <span className="text-xs font-semibold text-slate-600">{clampedValue}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={cn("h-2 rounded-full transition-all duration-500", barColor)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
