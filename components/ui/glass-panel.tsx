import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevation?: "low" | "medium" | "high";
  interactive?: boolean;
  tilt?: boolean;
}

export function GlassPanel({
  children,
  className,
  elevation = "medium",
  interactive = true,
  tilt = false,
  ...props
}: GlassPanelProps) {
  const { theme } = useTheme();
  const [tiltStyle, setTiltStyle] = React.useState({});
  const isGlass = theme === "glass";
  
  const elevationMap = {
    low: {
      z: "10px",
      shadow: "rgba(50, 50, 93, 0.15) 0px 8px 20px -5px, rgba(0, 0, 0, 0.1) 0px 5px 10px -8px"
    },
    medium: {
      z: "20px",
      shadow: "rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.2) 0px 8px 16px -8px"
    },
    high: {
      z: "30px",
      shadow: "rgba(50, 50, 93, 0.35) 0px 18px 35px -5px, rgba(0, 0, 0, 0.3) 0px 10px 20px -8px"
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt || !isGlass) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Calculate tilt angle (8deg maximum)
    const tiltX = (y - 0.5) * 8;
    const tiltY = (x - 0.5) * -8;
    
    setTiltStyle({
      transform: `translateZ(${elevationMap[elevation].z}) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
      transition: "transform 0.1s ease"
    });
  };
  
  const handleMouseLeave = () => {
    if (!tilt || !isGlass) return;
    
    setTiltStyle({
      transform: `translateZ(${elevationMap[elevation].z})`,
      transition: "transform 0.5s ease"
    });
  };
  
  // If not using glass theme, return regular div
  if (!isGlass) {
    return <div className={className} {...props}>{children}</div>;
  }
  
  return (
    <div
      className={cn(
        "relative rounded-lg backdrop-blur-md transform-gpu",
        interactive && "hover:shadow-xl transition-all duration-300",
        className
      )}
      style={{
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.05))",
        boxShadow: elevationMap[elevation].shadow,
        border: "1px solid rgba(255, 255, 255, 0.3)",
        transformStyle: "preserve-3d",
        transform: `translateZ(${elevationMap[elevation].z})`,
        ...tiltStyle
      }}
      onMouseMove={tilt ? handleMouseMove : undefined}
      onMouseLeave={tilt ? handleMouseLeave : undefined}
      {...props}
    >
      {/* Glossy highlight effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-1/3 rounded-t-lg pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-1">{children}</div>
    </div>
  );
}
