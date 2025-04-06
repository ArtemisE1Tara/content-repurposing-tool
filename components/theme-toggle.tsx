"use client"

import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { SunIcon, MoonIcon, MonitorIcon, Sparkles, FlameIcon } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before accessing theme
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {theme === "light" && <SunIcon className="h-5 w-5" />}
          {theme === "dark" && <MoonIcon className="h-5 w-5" />}
          {theme === "midnight-purple" && <Sparkles className="h-5 w-5 text-purple-400" />}
          {theme === "dark-topaz" && <FlameIcon className="h-5 w-5 text-amber-400" />}
          {theme === "system" && <MonitorIcon className="h-5 w-5" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <SunIcon className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <MoonIcon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("midnight-purple")}>
          <Sparkles className="mr-2 h-4 w-4 text-purple-400" />
          <span>Midnight Purple</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark-topaz")}>
          <FlameIcon className="mr-2 h-4 w-4 text-amber-400" />
          <span>Dark Topaz</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <MonitorIcon className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
