"use client";

import { useState, useEffect, useContext, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { getUserUsageStats } from "@/lib/memberships";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { GenerationContext } from "@/components/content-repurposing-tool";

export function SidebarUsage({ isCollapsed }: { isCollapsed: boolean }) {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [formattedDate, setFormattedDate] = useState<string>("");

  // Access the improved context
  const { latestGeneration, refreshTimestamp } = useContext(GenerationContext);

  const formatCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  };

  useEffect(() => {
    setFormattedDate(formatCurrentDate());
  }, []);

  const fetchUsage = useCallback(async () => {
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
  }, []);

  // Initial fetch and hourly refresh
  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  // Refresh when context refreshTimestamp changes
  useEffect(() => {
    if (refreshTimestamp > 0) {
      fetchUsage();
    }
  }, [refreshTimestamp, fetchUsage]);

  // Update usage count immediately when a new generation is created
  useEffect(() => {
    if (latestGeneration && usage) {
      // Only increment if this is a new generation (not already counted)
      if (!latestGeneration.isTemporary || !latestGeneration.isCounted) {
        // Create a new updated usage object
        const updatedUsage = {
          ...usage,
          generationsThisDay: usage.generationsThisDay + 1,
          remainingGenerationsToday: Math.max(0, usage.remainingGenerationsToday - 1),
          percentUsed: Math.min(100, Math.round(((usage.generationsThisDay + 1) / usage.dailyLimit) * 100)),
          isOverLimit: usage.generationsThisDay + 1 >= usage.dailyLimit
        };

        // Update state with new count
        setUsage(updatedUsage);

        // Fetch actual data after a short delay to ensure DB is updated
        const timer = setTimeout(() => {
          fetchUsage();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [latestGeneration, usage, fetchUsage]);

  if (loading || error || !usage) {
    return null;
  }

  const getFriendlyTierName = () => {
    const tier = usage.subscription.tier;
    const name = tier.name;

    if (typeof name === "string" && (name.includes("-") || name.length > 20)) {
      if (tier.price_monthly === 0) return "Free";
      if (tier.price_monthly <= 10) return "Basic";
      if (tier.price_monthly <= 20) return "Pro";
      return "Premium";
    }

    return typeof name === "string"
      ? name.charAt(0).toUpperCase() + name.slice(1)
      : "Free";
  };

  if (isCollapsed) {
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
                  {usage.generationsThisDay}/{usage.dailyLimit} • {formattedDate}
                </span>
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            <div className="text-xs">
              {usage.generationsThisDay}/{usage.dailyLimit} generations used today
              <p className="text-muted-foreground text-[10px] mt-1">
                {getFriendlyTierName()} Plan
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="px-3 py-2 border-t">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">
          {getFriendlyTierName()} Plan
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronUp
            className={cn("h-3 w-3 transition-transform", !expanded && "rotate-180")}
          />
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
        <span className="text-xs font-medium w-16 text-right">
          {usage.generationsThisDay}/{usage.dailyLimit}
        </span>
      </div>
      {expanded && (
        <div className="mt-2 space-y-1 text-xs">
          <p className="flex justify-between">
            <span className="text-muted-foreground">Used today:</span>
            <span>{usage.generationsThisDay} generation</span>
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