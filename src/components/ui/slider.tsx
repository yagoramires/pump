"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Slider as SliderPrimitive } from "radix-ui"

// aria-* vão pro Thumb: é ele que tem role="slider"
function Slider({
  className,
  "aria-label": ariaLabel,
  "aria-valuetext": ariaValueText,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex w-full touch-none items-center py-2 select-none data-[disabled]:opacity-50", className)}
      {...props}
    >
      <SliderPrimitive.Track data-slot="slider-track" className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-c2" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        aria-label={ariaLabel}
        aria-valuetext={ariaValueText}
        className="block size-5 shrink-0 rounded-full border-2 border-c2 bg-background shadow-xs outline-none transition-shadow focus-visible:ring-[3px] focus-visible:ring-c2/50 disabled:pointer-events-none"
      />
    </SliderPrimitive.Root>
  )
}

export { Slider }
