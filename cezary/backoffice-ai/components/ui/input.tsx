import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type LabelHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-sm",
      "placeholder:text-muted-foreground/70",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-ring/60",
      "disabled:cursor-not-allowed disabled:opacity-50 transition-[border,box-shadow]",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[88px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm",
      "placeholder:text-muted-foreground/70 resize-y",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-ring/60",
      "disabled:cursor-not-allowed disabled:opacity-50 transition-[border,box-shadow]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-xs font-medium text-foreground/80 tracking-wide uppercase",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-sm",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-ring/60",
      "disabled:cursor-not-allowed disabled:opacity-50 transition-[border,box-shadow]",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
