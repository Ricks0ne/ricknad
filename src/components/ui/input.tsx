
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-monad-accent/60">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-base text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-monad-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monad-primary/30 focus-visible:border-monad-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-monad-primary/30 md:text-sm",
            icon && "pl-10",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
