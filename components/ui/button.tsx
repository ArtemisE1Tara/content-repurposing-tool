import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        className: "midnight-purple:hover:bg-primary/80 dark-topaz:hover:bg-primary/80 glass:backdrop-blur-md glass:bg-primary/85 glass:hover:bg-primary/70 glass:transform glass:translate-y-[-1px] glass:transition-all glass:duration-300 glass:hover:translate-y-[-3px] glass:hover:shadow-lg glass:perspective-1000 glass:hover:rotate-x-1",
      },
      {
        variant: "outline", 
        className: "midnight-purple:hover:bg-accent midnight-purple:hover:text-accent-foreground dark-topaz:hover:bg-accent dark-topaz:hover:text-accent-foreground glass:backdrop-blur-md glass:border-white/25 glass:hover:bg-white/40 glass:transform glass:translate-y-[-1px] glass:hover:translate-y-[-3px] glass:shadow-sm glass:hover:shadow-md",
      },
      {
        variant: "secondary",
        className: "glass:backdrop-blur-md glass:bg-white/50 glass:hover:bg-white/60 glass:border-white/25 glass:transform glass:translate-y-[-1px] glass:hover:translate-y-[-3px]"
      },
      {
        variant: "ghost",
        className: "glass:hover:bg-white/30 glass:hover:backdrop-blur-lg glass:hover:shadow-sm"
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
