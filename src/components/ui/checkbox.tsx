import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

const checkboxVariants = cva(
  "peer relative shrink-0 border border-border-strong transition-colors outline-none hover:not-data-[state=checked]:bg-hover focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
  {
    variants: {
      // check: marcação de série/refeição, caixa de 28px com área de toque de 44px (o ::after estende o alvo)
      size: {
        default: "size-4 rounded-[4px] shadow-xs",
        check: "size-7 rounded-lg after:absolute after:-inset-2 after:content-['']",
      },
      shape: {
        square: "",
        round: "rounded-full",
      },
    },
    defaultVariants: { size: "default", shape: "square" },
  }
)

function Checkbox({
  className,
  size,
  shape,
  icon,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> &
  VariantProps<typeof checkboxVariants> & { icon?: React.ReactNode }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(checkboxVariants({ size, shape }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        {icon ?? <CheckIcon className={size === "check" ? "size-4" : "size-3.5"} strokeWidth={size === "check" ? 3 : undefined} />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox, checkboxVariants }
