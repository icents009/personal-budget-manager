/**
 * Utility/helper functions used across the app.
 */

import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SUPPORTED_CURRENCIES } from "./constants";
import { RecurringFrequency } from "./types";

// shadcn/ui utility: combines Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency Helpers ─────────────────────────────────────────────────────────

/** Get the currency symbol for a given currency code */
export function getCurrencySymbol(code: string): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return currency?.symbol ?? code;
}

/** Format a number as currency string, e.g. "₦1,500.00" */
export function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${symbol}${formatted}`;
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

/** Get the current month in "YYYY-MM" format */
export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

/** Convert "YYYY-MM" to a human-readable label like "January 2024" */
export function monthToLabel(month: string): string {
  return format(parseISO(`${month}-01`), "MMMM yyyy");
}

/** Get the start and end of a month from "YYYY-MM" string */
export function getMonthRange(month: string): { start: Date; end: Date } {
  const date = parseISO(`${month}-01`);
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

/** Check if a date string falls within a given month ("YYYY-MM") */
export function isInMonth(dateStr: string, month: string): boolean {
  const date = parseISO(dateStr);
  const { start, end } = getMonthRange(month);
  return isWithinInterval(date, { start, end });
}

/** Format ISO date string to readable format */
export function formatDate(dateStr: string, fmt = "MMM d, yyyy"): string {
  return format(parseISO(dateStr), fmt);
}

/** Get the next due date for a recurring expense */
export function getNextDueDate(lastDate: string, frequency: RecurringFrequency): string {
  const date = parseISO(lastDate);
  let next: Date;
  switch (frequency) {
    case "daily":   next = addDays(date, 1);    break;
    case "weekly":  next = addWeeks(date, 1);   break;
    case "monthly": next = addMonths(date, 1);  break;
    case "yearly":  next = addYears(date, 1);   break;
    default:        next = addMonths(date, 1);
  }
  return format(next, "yyyy-MM-dd");
}

/** Get array of upcoming due dates for a recurring expense within the next N days */
export function getUpcomingDates(startDate: string, frequency: RecurringFrequency, days = 30): string[] {
  const dates: string[] = [];
  const today = new Date();
  const end = addDays(today, days);
  let current = parseISO(startDate);

  // Move current forward until it's >= today
  while (current < today) {
    current = parseISO(getNextDueDate(format(current, "yyyy-MM-dd"), frequency));
  }

  while (current <= end) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = parseISO(getNextDueDate(format(current, "yyyy-MM-dd"), frequency));
  }

  return dates;
}

// ─── Number Helpers ───────────────────────────────────────────────────────────

/** Calculate percentage, returns 0 if total is 0 */
export function pct(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Calculate monthly saving needed to reach a goal */
export function monthlyContributionNeeded(
  target: number,
  current: number,
  targetDate: string
): number {
  const remaining = target - current;
  if (remaining <= 0) return 0;

  const today = new Date();
  const end = parseISO(targetDate);
  const months = Math.max(1,
    (end.getFullYear() - today.getFullYear()) * 12 +
    (end.getMonth() - today.getMonth())
  );

  return remaining / months;
}

// ─── Generate Month Options ───────────────────────────────────────────────────

/** Generate an array of month options for the last N months + next 1 month */
export function generateMonthOptions(count = 12) {
  const options = [];
  const today = new Date();
  for (let i = count; i >= -1; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = format(d, "yyyy-MM");
    const label = format(d, "MMMM yyyy");
    options.push({ value, label });
  }
  return options;
}

// ─── Progress Color ───────────────────────────────────────────────────────────

/** Returns a Tailwind color class based on percentage (for budget progress bars) */
export function progressColor(percentage: number): string {
  if (percentage >= 100) return "bg-red-500";
  if (percentage >= 80) return "bg-yellow-500";
  return "bg-emerald-500";
}

/** Returns a text color class based on percentage */
export function progressTextColor(percentage: number): string {
  if (percentage >= 100) return "text-red-600";
  if (percentage >= 80) return "text-yellow-600";
  return "text-emerald-600";
}
