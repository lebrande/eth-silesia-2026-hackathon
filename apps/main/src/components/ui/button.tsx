import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/60 shadow-sm",
  secondary:
    "bg-muted text-foreground hover:bg-muted/70 border border-border",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-muted/60",
  ghost: "bg-transparent text-foreground hover:bg-muted/70",
  danger:
    "bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger/50 shadow-sm",
  link: "bg-transparent text-primary underline-offset-4 hover:underline px-0",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-base gap-2",
  icon: "h-9 w-9 p-0",
};

function computeClassName(variant: Variant, size: Size, extra?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-md font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap",
    variantClasses[variant],
    sizeClasses[size],
    extra,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const merged = computeClassName(variant, size, className);

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{
        className?: string;
        ref?: Ref<unknown>;
      }>;
      return cloneElement(child, {
        ...props,
        className: cn(merged, child.props.className),
        ref,
      } as Record<string, unknown>);
    }

    return (
      <button ref={ref} type={type} className={merged} {...props}>
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
