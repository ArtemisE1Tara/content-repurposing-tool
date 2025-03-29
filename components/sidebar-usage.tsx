"use client"

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { getUserUsageStats } from "@/lib/memberships";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export function SidebarUsage({ isCollapsed }: { isCollapsed: boolean }) {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const stats = await getUserUsageStats();
      setUsage(stats);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching usage stats:", err);
      setError(err.message || "Failed to load usage stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    
    // Refresh stats every hour
    const interval = setInterval(fetchUsage, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || error || !usage) {
    return null; // Don't show anything while loading or on error
  }

  if (isCollapsed) {
    // Minimal view for collapsed sidebar
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/settings/membership" className="block px-2 py-2">
              <div className="flex flex-col items-center">
                <Progress 
                  value={usage.percentUsed} 
                  className={cn(
                    "h-1 w-full mb-1", 
                    usage.isOverLimit ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"
                  )} 
                />
                <span className="text-[10px] text-muted-foreground">
                  {usage.generationsThisDay}/{usage.dailyLimit}
                </span>
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            <div className="text-xs">
              {usage.generationsThisDay}/{usage.dailyLimit} generations used today
              <p className="text-muted-foreground text-[10px] mt-1">
                {usage.subscription.tier.name} plan
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Expanded view
  return (
    <div className="px-3 py-2 border-t">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">{usage.subscription.tier.name} Plan</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-5 w-5 p-0"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronUp className={cn("h-3 w-3 transition-transform", !expanded && "rotate-180")} />
          <span className="sr-only">Toggle details</span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Progress 
          value={usage.percentUsed} 
          className={cn(
            "h-2 flex-grow", 
            usage.isOverLimit ? "[&>div]:bg-destructive" : ""
          )} 
        />
        <span className="text-xs font-medium w-16 text-right">{usage.generationsThisDay}/{usage.dailyLimit}</span>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1 text-xs">
          <p className="flex justify-between">
            <span className="text-muted-foreground">Used today:</span>
            <span>{usage.generationsThisDay} generations</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Daily limit:</span>
            <span>{usage.dailyLimit} generations</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Remaining today:</span>
            <span>{usage.remainingGenerationsToday} generations</span>
          </p>
          {usage.isOverLimit && (
            <p className="flex items-center text-destructive gap-1 pt-1">
              <AlertCircle className="h-3 w-3" /> Limit reached
            </p>
          )}
          <Link href="/settings/membership" className="block mt-2">
            <Button variant="outline" size="sm" className="w-full h-7 text-xs">
              {usage.isOverLimit ? "Upgrade Plan" : "Manage"}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
