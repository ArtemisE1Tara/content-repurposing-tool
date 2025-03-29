"use client"

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, XCircle, Database } from "lucide-react";
import { getUserUsageStats } from "@/lib/memberships";
import Link from "next/link";

export function UsageDisplay() {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const stats = await getUserUsageStats();
      setUsage(stats);
    } catch (err: any) {
      setError(err.message || "Failed to load usage statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading usage statistics...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    // Check if the error is related to database setup
    const isDatabaseSetupError = error.includes("subscription") || 
                              error.includes("tier") || 
                              error.includes("table") ||
                              error.includes("not found");
    
    if (isDatabaseSetupError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Database Setup Required</CardTitle>
            <CardDescription>
              Your database needs to be initialized
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <Database className="h-4 w-4" />
              <AlertDescription>
                The database tables need to be created. This happens when you first run the application.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Link href="/settings/database" className="w-full">
              <Button className="w-full">
                <Database className="mr-2 h-4 w-4" />
                Set Up Database
              </Button>
            </Link>
          </CardFooter>
        </Card>
      );
    }
    
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!usage) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Usage</CardTitle>
        <CardDescription>
          {usage.subscription.tier.name} Plan - {usage.generationsThisMonth} of{" "}
          {usage.limit} generations used this month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress
          value={usage.percentUsed}
          className={`h-2 ${usage.isOverLimit ? "[&>div]:bg-destructive" : ""}`}
        />
        
        <p className="text-sm mt-2 text-muted-foreground">
          {usage.isOverLimit 
            ? "You've reached your monthly generation limit" 
            : `${usage.remainingGenerations} generations remaining this month`}
        </p>
        
        {usage.isOverLimit && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              You've reached your monthly generation limit. Upgrade your plan to continue generating content.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/settings/membership" className="w-full">
          <Button variant="outline" className="w-full">
            {usage.isOverLimit ? "Upgrade Plan" : "Manage Subscription"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
