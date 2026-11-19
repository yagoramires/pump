import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-on-accent hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "border border-border bg-panel hover:bg-hover hover:text-strong",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-hover hover:text-strong",
        ghost:
          "font-medium hover:bg-hover",
        // nav: item da barra de abas; ativo = cor + barrinha no topo, hover neutro e mais leve que o ativo
        nav: "relative text-micro font-medium text-faint after:absolute after:inset-x-6 after:top-0 after:h-0.5 after:rounded-full after:bg-accent after:opacity-0 hover:bg-hover/50 hover:text-text aria-[current=page]:text-accent aria-[current=page]:after:opacity-100 aria-[current=page]:hover:bg-transparent",
        link: "h-auto rounded-sm px-0 py-1 font-medium text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-11 gap-1.5 rounded-xl px-3 text-meta has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-6 has-[>svg]:px-4",
        tab: "h-auto min-h-11 flex-1 flex-col gap-1 rounded-none px-2 py-2",
        icon: "size-11",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
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
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
