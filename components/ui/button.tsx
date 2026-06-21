import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "icon";
};

const variants = {
  default: "bg-[#3195EF] text-white shadow-sm hover:opacity-90",
  outline: "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
  ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
  secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
};

const sizes = {
  sm: "h-9 px-3 text-xs",
  default: "h-10 px-4 text-sm",
  icon: "size-10 p-0",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3195EF] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
