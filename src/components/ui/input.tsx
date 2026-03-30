import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bg-surface-container-high border-transparent text-on-surface placeholder:text-muted-foreground",
        "flex h-11 w-full min-w-0 rounded-md border px-3 py-1 text-base transition-all outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-primary/20 focus-visible:bg-surface-bright focus-visible:shadow-ambient",
        "aria-invalid:border-destructive/40 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
