import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { useState } from "react"

interface GlassEffectProps {
  children: React.ReactNode
  className?: string
  intensity?: "low" | "medium" | "high"
  interactive?: boolean
  depth?: "flat" | "raised" | "floating"
}

export function GlassEffect({
  children,
  className,
  intensity = "medium",
  interactive = true,
  depth = "raised"
}: GlassEffectProps) {
  const { theme } = useTheme()
  const [isHovering, setIsHovering] = useState(false)
  
  // Only apply glass effects when glass theme is selected
  if (theme !== "glass") {
    return <div className={className}>{children}</div>
  }
  
  // Blur intensity based on the provided level
  const blurIntensity = {
    low: "backdrop-blur-sm",
    medium: "backdrop-blur-md",
    high: "backdrop-blur-lg"
  }[intensity]
  
  // 3D depth styles
  const depthStyles = {
    flat: {
      transform: "translateY(0) perspective(1000px) rotateX(0deg)",
      shadow: "shadow-sm"
    },
    raised: {
      transform: "translateY(-2px) perspective(1000px) rotateX(1deg)",
      shadow: "shadow-md"
    },
    floating: {
      transform: "translateY(-4px) perspective(1000px) rotateX(1.5deg)",
      shadow: "shadow-lg"
    }
  }[depth]
  
  // Hover effects for interactive glass
  const getInteractiveStyles = () => {
    if (!interactive) return {}
    
    return isHovering ? {
      transform: "translateY(-6px) perspective(1000px) rotateX(2deg)",
      boxShadow: `
        0 20px 40px rgba(0, 0, 0, 0.12),
        0 4px 12px rgba(0, 0, 0, 0.08),
        0 0 1px rgba(255, 255, 255, 0.6) inset,
        0 12px 30px rgba(255, 255, 255, 0.3) inset
      `
    } : {}
  }
  
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/60 border border-white/25",
        blurIntensity,
        depthStyles.shadow,
        className
      )}
      style={{
        transform: depthStyles.transform,
        transition: "all 0.3s ease-out",
        ...getInteractiveStyles()
      }}
      onMouseEnter={() => interactive && setIsHovering(true)}
      onMouseLeave={() => interactive && setIsHovering(false)}
    >
      {/* Glass reflection highlights */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      
      {/* Edge highlights */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/40 pointer-events-none" />
      <div className="absolute top-0 bottom-0 left-0 w-px bg-white/40 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
