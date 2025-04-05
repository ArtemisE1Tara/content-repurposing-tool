'use client'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { UserButton } from "@clerk/nextjs"
import { HistoryList } from "./history-list"
import { SidebarUsage } from "./sidebar-usage"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Database,
  Home,
  Menu,
  Sparkles
} from "lucide-react"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/theme-toggle"

interface SidebarProps {
  historyRefreshTrigger?: number
}

export function Sidebar({ historyRefreshTrigger = 0 }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setIsCollapsed(true)
      }
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Set mounted to true after component mounts (client-side only)
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev)
  }

  return (
    <>
      {/* Mobile sidebar (Sheet component) */}
      {isMobile && mounted && (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden fixed top-4 left-4 z-40">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0">
            <MobileSidebar pathname={pathname} historyRefreshTrigger={historyRefreshTrigger} />
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop sidebar */}
      {(!isMobile || !mounted) && (
        <div
          className={cn(
            "h-screen border-r bg-background transition-all duration-300 relative group flex flex-col",
            isCollapsed ? "w-[70px]" : "w-[240px]"
          )}
        >
          {/* Collapse toggle button */}
          <div 
            className="absolute -right-3 top-6 z-30 flex h-6 w-6 items-center justify-center rounded-md border bg-background hover:bg-accent cursor-pointer"
            onClick={toggleSidebar}
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </div>

          {/* Logo area - fixed at top */}
          <div className="p-3 flex-shrink-0">
            <div className="flex h-12 items-center justify-center px-2">
              <Sparkles className="h-6 w-6 text-primary" />
              {!isCollapsed && <h2 className="font-bold ml-2 text-lg text-primary">Contentful.AI</h2>}
            </div>
          </div>

          {/* Navigation area - fixed below logo */}
          <div className="px-3 flex-shrink-0">
            <TooltipProvider delayDuration={0}>
              <div className="flex flex-col gap-1">
                <NavItem
                  href="/"
                  icon={<Home className="h-4 w-4" />}
                  label="Home"
                  isActive={pathname === "/"}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  href="/settings/membership"
                  icon={<CreditCard className="h-4 w-4" />}
                  label="Membership"
                  isActive={pathname === "/settings/membership"}
                  isCollapsed={isCollapsed}
                />
              </div>
            </TooltipProvider>
          </div>

          <Separator className="my-4 flex-shrink-0" />

          {/* History list area - scrollable */}
          <div className="px-2 flex-grow overflow-hidden">
            <HistoryList 
              collapsed={isCollapsed} 
              refreshTrigger={historyRefreshTrigger} 
            />
          </div>

          {/* Add usage stats above the user section */}
          <SidebarUsage isCollapsed={isCollapsed} />

          {/* User and theme area - fixed at bottom */}
          <div className="p-4 border-t flex-shrink-0">
            <div className={cn(
              "flex items-center gap-3 px-3 py-2",
              isCollapsed ? "flex-col" : "justify-between"
            )}>
              {mounted && (
                <>
                  {isCollapsed && <ThemeToggle />}
                  <UserButton 
                    afterSignOutUrl="/sign-in"
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "w-8 h-8"
                      }
                    }} 
                  />
                  {!isCollapsed && <ThemeToggle />}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Mobile sidebar content
function MobileSidebar({ pathname, historyRefreshTrigger }: { pathname: string, historyRefreshTrigger: number }) {
  const [mounted, setMounted] = useState(false)
  
  // Set mounted to true after component mounts (client-side only)
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 flex-shrink-0">
        <div className="flex h-12 items-center px-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="font-bold ml-2 text-lg text-primary">Contentful.AI</h2>
        </div>
      </div>

      <div className="px-3 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <NavItem
            href="/"
            icon={<Home className="h-4 w-4" />}
            label="Home"
            isActive={pathname === "/"}
            isCollapsed={false}
          />
          <NavItem
            href="/settings/membership"
            icon={<CreditCard className="h-4 w-4" />}
            label="Membership"
            isActive={pathname === "/settings/membership"}
            isCollapsed={false}
          />
        </div>
      </div>

      <Separator className="my-4 flex-shrink-0" />

      <div className="px-2 flex-grow overflow-hidden">
        <HistoryList 
          collapsed={false} 
          refreshTrigger={historyRefreshTrigger} 
        />
      </div>

      {/* Add usage stats above the user section */}
      <SidebarUsage isCollapsed={false} />

      <div className="p-4 border-t flex-shrink-0">
        <div className="flex items-center justify-between">
          {mounted && (
            <UserButton 
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-8 h-8"
                }
              }} 
            />
          )}
          {mounted && <ThemeToggle />}
        </div>
      </div>
    </div>
  )
}

// Navigation item component
interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  isActive: boolean
  isCollapsed: boolean
}

function NavItem({ href, icon, label, isActive, isCollapsed }: NavItemProps) {
  const LinkContent = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isActive ? "bg-accent text-accent-foreground" : "transparent hover:bg-muted",
        isCollapsed ? "justify-center px-2" : ""
      )}
    >
      {icon}
      {!isCollapsed && <span>{label}</span>}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {LinkContent}
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return LinkContent
}
