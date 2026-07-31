import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        [
          "group/card",
          "relative",
          "flex",
          "flex-col",
          "overflow-hidden",

          "rounded-2xl",

          "border",
          "border-[#273248]",

          "bg-[#111827]/95",

          "backdrop-blur-xl",

          "shadow-lg",
          "shadow-black/25",

          "transition-all",
          "duration-300",

          "hover:-translate-y-1",
          "hover:border-[#3B82F6]/40",
          "hover:shadow-2xl",
          "hover:shadow-blue-900/15",

          "[--card-spacing:24px]",
          "data-[size=sm]:[--card-spacing:18px]",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
}

function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        [
          "flex",
          "items-start",
          "justify-between",
          "gap-4",

          "px-[var(--card-spacing)]",
          "pt-[var(--card-spacing)]",
          "pb-5",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
}

function CardTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        [
          "text-lg",
          "font-semibold",
          "tracking-tight",
          "text-white",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "mt-1 text-sm text-[#94A3B8]",
        className
      )}
      {...props}
    />
  )
}

function CardAction({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "flex items-center justify-center",
        className
      )}
      {...props}
    />
  )
}

function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "flex-1 px-[var(--card-spacing)] pb-[var(--card-spacing)]",
        className
      )}
      {...props}
    />
  )
}

function CardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        [
          "flex",
          "items-center",
          "justify-between",

          "border-t",
          "border-[#273248]",

          "bg-[#0F172A]/50",

          "px-[var(--card-spacing)]",
          "py-4",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}