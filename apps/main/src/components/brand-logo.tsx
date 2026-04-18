import Image from "next/image";
import logoUrl from "@/branding/logo.svg";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZE_DIMS: Record<Size, { height: number; padding: string }> = {
  sm: { height: 20, padding: "px-2 py-1" },
  md: { height: 28, padding: "px-3 py-1.5" },
  lg: { height: 40, padding: "px-4 py-2" },
};

export function BrandLogo({
  className,
  size = "md",
}: {
  className?: string;
  size?: Size;
}) {
  const { height, padding } = SIZE_DIMS[size];
  const width = Math.round(height * 1.4);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-primary",
        padding,
        className,
      )}
    >
      <Image
        src={logoUrl}
        alt="TAURON"
        width={width}
        height={height}
        priority
      />
    </span>
  );
}
