"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

// Reusable form field with label and error message

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}

export function FormField({ label, error, required, children, className, hint }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Styled input component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full px-3 py-2.5 text-sm rounded-xl border transition",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
        "placeholder:text-slate-400",
        error
          ? "border-red-300 bg-red-50"
          : "border-slate-200 bg-white hover:border-slate-300",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

// Styled textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={3}
      className={cn(
        "w-full px-3 py-2.5 text-sm rounded-xl border transition resize-none",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
        "placeholder:text-slate-400",
        error ? "border-red-300 bg-red-50" : "border-slate-200 bg-white hover:border-slate-300",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

// Styled select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full px-3 py-2.5 text-sm rounded-xl border transition appearance-none bg-white",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
        error ? "border-red-300 bg-red-50" : "border-slate-200 hover:border-slate-300",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
