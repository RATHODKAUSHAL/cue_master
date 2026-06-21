import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DropdownMenu({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative", className)} {...props} />;
}

export function DropdownMenuTrigger({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "absolute right-0 top-11 z-20 hidden min-w-36 rounded-md border border-zinc-200 bg-white p-1 shadow-lg group-hover:block",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuItem({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-sm px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100", className)}
      {...props}
    />
  );
}
