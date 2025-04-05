import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { useState } from "react"

interface GlassEffectProps {
  children: React.ReactNode
  className?: string
  intensity?: "low" | "medium" | "high"
  interactive?: boolean
  tilt?: boolean
}

export function GlassEffect({
  children,
  className,
  intensity = "medium",
  interactive = true,
  tilt = false,
}: GlassEffectProps) {
  const { theme } = useTheme()
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({})
  
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
  
  // 3D depths based on intensity level
  const depthTransform = {
    low: "translateZ(10px)",
    medium: "translateZ(20px)",
    high: "translateZ(30px)"
  }[intensity]
  
  // Shadow intensity based on the provided level
  const shadowIntensity = {
    low: "rgba(50, 50, 93, 0.15) 0px 8px 20px -5px, rgba(0, 0, 0, 0.1) 0px 5px 10px -8px",
    medium: "rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.2) 0px 8px 16px -8px",
    high: "rgba(50, 50, 93, 0.35) 0px 18px 35px -5px, rgba(0, 0, 0, 0.3) 0px 10px 20px -8px"
  }[intensity]
  
  // Handle mouse move for tilt effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Calculate tilt angle (adjust the 10 value to increase/decrease tilt)
    const tiltX = (y - 0.5) * 10;
    const tiltY = (x - 0.5) * -10;
    
    setTiltStyle({
      transform: `${depthTransform} rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
      transition: "transform 0.1s ease"
    });
  };
  
  // Reset tilt on mouse leave
  const handleMouseLeave = () => {
    if (!tilt) return;
    setTiltStyle({
      transform: depthTransform,
      transition: "transform 0.5s ease"
    });
  };
  
  const interactiveProps = tilt ? {
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave
  } : {};
  
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg",
        blurIntensity,
        "transform-gpu perspective-[1000px]",
        interactive && "hover:shadow-xl transition-all duration-300",
        className
      )}
      style={{
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.05))",
        boxShadow: shadowIntensity,
        border: "1px solid rgba(255, 255, 255, 0.3)",
        ...tiltStyle,
        transform: tiltStyle.transform || depthTransform,
        transformStyle: "preserve-3d"
      }}
      {...(interactive ? interactiveProps : {})}
    >
      {/* Glossy highlight effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-1/3 rounded-t-lg pointer-events-none" />
      
      {/* Content container with proper z positioning */}
      <div className="relative z-1 h-full">
        {children}
      </div>
    </div>
  )
}
