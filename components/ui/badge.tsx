import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline";
};

export function Badge({ className, variant = "secondary", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium",
        variant === "default" && "bg-[#3195EF] text-white",
        variant === "secondary" && "bg-[#3195EF]/10 text-[#126ec1]",
        variant === "outline" && "border border-zinc-200 bg-white text-zinc-600",
        className,
      )}
      {...props}
    />
  );
}
