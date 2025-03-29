'use client'
import { ModeToggle } from "./mode-toggle";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Sparkles, Home, Settings, Menu, CreditCard, Database } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { HistoryList } from "./history-list";
import { Separator } from "./ui/separator";

// Add a proper interface for the component props
interface SidebarProps {
  historyRefreshTrigger?: number;
}

export function Sidebar({ historyRefreshTrigger = 0 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn(
      "h-screen flex flex-col border-r bg-card transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-bold text-lg text-primary">Contentful.AI</h1>
          </Link>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-auto" 
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="px-3 py-2">
        <div className="space-y-1">
          <Link href="/">
            <Button 
              variant="ghost" 
              className={cn("w-full justify-start", 
                collapsed ? "px-2" : "px-4"
              )}
            >
              <Home className="h-5 w-5 mr-2" />
              {!collapsed && <span>Home</span>}
            </Button>
          </Link>
          <Link href="/settings/membership">
            <Button 
              variant="ghost" 
              className={cn("w-full justify-start", 
                collapsed ? "px-2" : "px-4"
              )}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {!collapsed && <span>Membership</span>}
            </Button>
          </Link>
          <Link href="/settings/database">
            <Button 
              variant="ghost" 
              className={cn("w-full justify-start", 
                collapsed ? "px-2" : "px-4"
              )}
            >
              <Database className="h-5 w-5 mr-2" />
              {!collapsed && <span>Database</span>}
            </Button>
          </Link>
        </div>
      </div>
      
      <Separator className="my-4" />
      <div className="flex-1 overflow-hidden">
        <HistoryList 
          collapsed={collapsed} 
          refreshTrigger={historyRefreshTrigger} 
        />
      </div>
      
      <div className="mt-auto p-4">
        <div className={cn(
          "flex items-center gap-3 mb-4", 
          collapsed ? "flex-col" : ""
        )}>
          <UserButton 
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                userButtonAvatarBox: "w-8 h-8"
              }
            }} 
          />
          {!collapsed && <span className="text-sm text-muted-foreground">Account</span>}
        </div>
        <ModeToggle />
      </div>
    </div>
  );
}
