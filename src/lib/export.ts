/**
 * Export utilities for Excel (.xlsx) and PDF.
 * Uses the 'xlsx' package for spreadsheets and 'jspdf' for PDFs.
 * All runs in the browser — no server needed.
 */

import * as XLSX from "xlsx";
import { Transaction, SavingsGoal, Debt, Category } from "./types";
import { formatCurrency, formatDate } from "./utils";

// ─── Excel Exports ────────────────────────────────────────────────────────────

/** Convert an array of objects to an Excel file and trigger download */
function downloadExcel(data: Record<string, unknown>[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, filename);
}

/** Export expense transactions to Excel */
export function exportExpensesToExcel(
  transactions: Transaction[],
  categories: Category[]
) {
  const rows = transactions.map((t) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    return {
      Date: formatDate(t.date),
      Category: cat?.name ?? "Unknown",
      Amount: t.amount,
      Currency: t.currency,
      "Payment Method": t.paymentMethod ?? "",
      Notes: t.notes ?? "",
      "Has Receipt": t.receiptPath ? "Yes" : "No",
      "Recurring": t.isRecurring ? "Yes" : "No",
    };
  });
  downloadExcel(rows, "expenses.xlsx");
}

/** Export income transactions to Excel */
export function exportIncomeToExcel(
  transactions: Transaction[],
  categories: Category[]
) {
  const rows = transactions.map((t) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    return {
      Date: formatDate(t.date),
      Source: cat?.name ?? "Unknown",
      Amount: t.amount,
      Currency: t.currency,
      Notes: t.notes ?? "",
    };
  });
  downloadExcel(rows, "income.xlsx");
}

/** Export savings goals to Excel */
export function exportSavingsToExcel(goals: SavingsGoal[]) {
  const rows = goals.map((g) => ({
    Name: g.name,
    "Target Amount": g.targetAmount,
    "Current Amount": g.currentAmount,
    Currency: g.currency,
    "Target Date": g.targetDate ? formatDate(g.targetDate) : "",
    "Progress %": Math.round((g.currentAmount / g.targetAmount) * 100),
    "Emergency Fund": g.isEmergencyFund ? "Yes" : "No",
    "Completed": g.isCompleted ? "Yes" : "No",
  }));
  downloadExcel(rows, "savings-goals.xlsx");
}

/** Export debts to Excel */
export function exportDebtsToExcel(debts: Debt[]) {
  const rows = debts.map((d) => ({
    Name: d.name,
    "Total Amount": d.totalAmount,
    "Amount Paid": d.amountPaid,
    "Remaining": d.totalAmount - d.amountPaid,
    Currency: d.currency,
    "Interest Rate %": d.interestRate ?? "",
    "Min Monthly Payment": d.minimumPayment ?? "",
    "Due Date": d.dueDate ? formatDate(d.dueDate) : "",
    "Completed": d.isCompleted ? "Yes" : "No",
  }));
  downloadExcel(rows, "debts.xlsx");
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

interface MonthlyReportData {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  currency: string;
  topCategories: { name: string; amount: number }[];
  transactions: Transaction[];
  categories: Category[];
}

/** Export a monthly summary report as PDF using jsPDF */
export async function exportMonthlyReportPDF(data: MonthlyReportData) {
  // Dynamic import so jspdf only loads when needed
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  const { month, totalIncome, totalExpenses, balance, currency, topCategories, transactions, categories } = data;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(79, 70, 229); // indigo
  doc.text("Personal Budget Report", 20, 20);

  // Month
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Month: ${month}`, 20, 32);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40);

  // Summary section
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Summary", 20, 55);

  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text(`Total Income:    ${formatCurrency(totalIncome, currency)}`, 25, 65);
  doc.text(`Total Expenses:  ${formatCurrency(totalExpenses, currency)}`, 25, 73);
  doc.text(`Net Balance:     ${formatCurrency(balance, currency)}`, 25, 81);
  doc.text(`Savings Rate:    ${totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0}%`, 25, 89);

  // Top categories
  if (topCategories.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Top Spending Categories", 20, 105);

    topCategories.forEach((cat, i) => {
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(`${i + 1}. ${cat.name}: ${formatCurrency(cat.amount, currency)}`, 25, 115 + i * 9);
    });
  }

  // Transaction list (top 20)
  const yStart = 115 + Math.min(topCategories.length, 5) * 9 + 15;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Recent Transactions", 20, yStart);

  const slice = transactions.slice(0, 20);
  slice.forEach((t, i) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    const y = yStart + 10 + i * 8;
    if (y > 270) return; // Don't overflow page
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `${formatDate(t.date, "MMM d")}  ${cat?.name ?? ""}  ${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount, t.currency)}`,
      25, y
    );
  });

  doc.save(`budget-report-${month}.pdf`);
}
