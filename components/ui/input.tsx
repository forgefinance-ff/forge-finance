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
          "border-[#2B3650]",
          "bg-[#111827]",
          "px-4",
          "text-sm",
          "text-white",
          "placeholder:text-[#94A3B8]",
          "transition-all",
          "duration-300",
          "outline-none",

          "hover:border-[#3B82F6]/40",

          "focus:border-[#3B82F6]",
          "focus:ring-4",
          "focus:ring-[#3B82F6]/15",

          "disabled:opacity-50",
          "disabled:cursor-not-allowed",

          "aria-invalid:border-red-500",
          "aria-invalid:ring-red-500/20",

          "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#111827]",
          "[&:-webkit-autofill]:[-webkit-text-fill-color:white]",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
}

export { Input }