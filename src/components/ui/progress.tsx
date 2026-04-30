import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value = 0,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn(
        // track: slightly darker in light mode for contrast, subtle accent tint in dark
        "relative h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-library-accent/12",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          // indicator: use theme accent (blue light / yellow dark) and add subtle inner shadow for visibility
          "h-full transition-all bg-library-accent shadow-inner",
        )}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
