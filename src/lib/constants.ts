/**
 * Default categories, currencies, and other constants used throughout the app.
 */

import { Category, Currency } from "./types";

// Default expense/income categories with 50/30/20 classification
export const DEFAULT_CATEGORIES: Omit<Category, "id" | "createdAt">[] = [
  { name: "Food", type: "need", icon: "🍔", color: "#ef4444", isDefault: true },
  { name: "Transport", type: "need", icon: "🚗", color: "#f97316", isDefault: true },
  { name: "Rent", type: "need", icon: "🏠", color: "#eab308", isDefault: true },
  { name: "Utilities", type: "need", icon: "💡", color: "#84cc16", isDefault: true },
  { name: "Airtime/Data", type: "need", icon: "📱", color: "#06b6d4", isDefault: true },
  { name: "Health", type: "need", icon: "🏥", color: "#3b82f6", isDefault: true },
  { name: "Education", type: "need", icon: "📚", color: "#6366f1", isDefault: true },
  { name: "Entertainment", type: "want", icon: "🎬", color: "#8b5cf6", isDefault: true },
  { name: "Shopping", type: "want", icon: "🛍️", color: "#ec4899", isDefault: true },
  { name: "Savings", type: "saving_debt", icon: "💰", color: "#10b981", isDefault: true },
  { name: "Debt Payment", type: "saving_debt", icon: "💳", color: "#14b8a6", isDefault: true },
  { name: "Emergency", type: "saving_debt", icon: "🆘", color: "#f59e0b", isDefault: true },
  { name: "Other", type: "want", icon: "📦", color: "#6b7280", isDefault: true },
  // Income categories (type is want but used for income)
  { name: "Salary", type: "want", icon: "💼", color: "#22c55e", isDefault: true },
  { name: "Freelance", type: "want", icon: "🖥️", color: "#0ea5e9", isDefault: true },
  { name: "Business", type: "want", icon: "🏢", color: "#a855f7", isDefault: true },
  { name: "Investment", type: "saving_debt", icon: "📈", color: "#f43f5e", isDefault: true },
  { name: "Gift", type: "want", icon: "🎁", color: "#fb923c", isDefault: true },
];

// Supported currencies
export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
];

// Default exchange rates relative to USD (manually configured)
export const DEFAULT_EXCHANGE_RATES: { from: string; to: string; rate: number }[] = [
  { from: "USD", to: "NGN", rate: 1600 },
  { from: "USD", to: "GBP", rate: 0.79 },
  { from: "USD", to: "EUR", rate: 0.92 },
  { from: "USD", to: "CAD", rate: 1.36 },
  { from: "USD", to: "GHS", rate: 15.5 },
  { from: "USD", to: "KES", rate: 130 },
  { from: "USD", to: "ZAR", rate: 18.5 },
  // Also add reverse rates
  { from: "NGN", to: "USD", rate: 1 / 1600 },
  { from: "GBP", to: "USD", rate: 1 / 0.79 },
  { from: "EUR", to: "USD", rate: 1 / 0.92 },
  { from: "CAD", to: "USD", rate: 1 / 1.36 },
];

export const PAYMENT_METHODS = [
  "Cash",
  "Debit Card",
  "Credit Card",
  "Bank Transfer",
  "Mobile Money",
  "Other",
];

export const CATEGORY_TYPE_LABELS: Record<string, string> = {
  need: "Need (50%)",
  want: "Want (30%)",
  saving_debt: "Saving/Debt (20%)",
};

export const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

// Colors for charts
export const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#10b981", "#06b6d4", "#3b82f6",
  "#a855f7", "#f43f5e", "#fb923c", "#84cc16",
];
