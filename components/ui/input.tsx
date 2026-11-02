import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        [
          "w-full",
          "h-11",
          "rounded-xl",
          "border",
          "border-line-strong",
          "bg-surface-solid",
          "px-4",
          "text-sm",
          "text-foreground",
          "placeholder:text-faint",
          "transition-all",
          "duration-300",
          "outline-none",

          "hover:border-brand-bright/40",

          "focus:border-brand-bright",
          "focus:ring-4",
          "focus:ring-brand-bright/15",

          "disabled:opacity-50",
          "disabled:cursor-not-allowed",

          "aria-invalid:border-red-500",
          "aria-invalid:ring-red-500/20",

          "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_var(--surface-solid)]",
          "[&:-webkit-autofill]:[-webkit-text-fill-color:var(--text)]",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
}

export { Input }