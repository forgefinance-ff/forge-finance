import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center",
    "whitespace-nowrap",
    "font-semibold",
    "transition-all duration-300",
    "outline-none",
    "cursor-pointer",
    "select-none",
    "rounded-xl",
    "active:scale-[0.98]",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
    "focus-visible:ring-2",
    "focus-visible:ring-brand/50",
    "focus-visible:ring-offset-2",
    "focus-visible:ring-offset-background",
    "[&_svg]:pointer-events-none",
    "[&_svg]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-to-r",
          "from-brand",
          "to-[#2563EB]",
          "text-white",
          "shadow-lg",
          "shadow-blue-900/30",
          "hover:scale-[1.02]",
          "hover:shadow-xl",
          "hover:shadow-violet-700/30",
        ].join(" "),

        secondary: [
          "bg-surface-elevated",
          "text-foreground",
          "border",
          "border-line",
          "hover:bg-tint-strong",
        ].join(" "),

        outline: [
          "border",
          "border-line-strong",
          "bg-transparent",
          "text-foreground",
          "hover:bg-tint-strong",
        ].join(" "),

        ghost: [
          "text-text-soft",
          "hover:bg-tint-strong",
          "hover:text-foreground",
        ].join(" "),

        destructive: [
          "bg-[#DC2626]",
          "text-white",
          "hover:bg-[#B91C1C]",
        ].join(" "),

        link: [
          "text-brand-soft",
          "hover:underline",
          "underline-offset-4",
          "bg-transparent",
        ].join(" "),
      },

      size: {
        xs: "h-8 px-3 text-xs",

        sm: "h-10 px-4 text-sm",

        default: "h-11 px-5 text-sm",

        lg: "h-12 px-6 text-base",

        icon: "h-11 w-11 p-0",

        "icon-xs": "h-8 w-8 p-0",

        "icon-sm": "h-10 w-10 p-0",

        "icon-lg": "h-12 w-12 p-0",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }