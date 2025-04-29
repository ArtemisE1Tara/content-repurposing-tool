"use client"

import { useState, useEffect, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, XCircle, Database, RefreshCw } from "lucide-react";
import { getUserUsageStats, getSubscriptionTiers, getCurrentUser } from "@/lib/memberships";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export function UsageDisplay() {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [subscriptionName, setSubscriptionName] = useState<string>('Free');
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserSubscription = async () => {
    try {
      // Get current user
      const user = await getCurrentUser();
      console.log('Current user:', user);
      
      // First, check subscriptions table for active subscription
      // Using more direct query structure based on the CSV data
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*, tier:tier_id(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      console.log('Subscriptions data:', subscriptionsData);
      
      if (!subscriptionsError && subscriptionsData) {
        // We have an active subscription with tier info
        if (subscriptionsData.tier && typeof subscriptionsData.tier === 'object') {
          const tier = subscriptionsData.tier;
          if (tier.name) {
            console.log(`Found tier name from subscription: ${tier.name}`);
            setSubscriptionName(tier.name.charAt(0).toUpperCase() + tier.name.slice(1));
            return;
          }
        }
        
        // If we have tier_id but not the name, look it up directly
        if (subscriptionsData.tier_id) {
          const { data: tierData } = await supabase
            .from('subscription_tiers')
            .select('name')
            .eq('id', subscriptionsData.tier_id)
            .single();
            
          if (tierData?.name) {
            console.log(`Found tier name from direct lookup: ${tierData.name}`);
            setSubscriptionName(tierData.name.charAt(0).toUpperCase() + tierData.name.slice(1));
            return;
          }
        }
      } else {
        console.log('No active subscription found or error occurred:', subscriptionsError);
      }
      
      // Fallback: Get tier from user's subscription_tier field
      console.log('Falling back to user subscription_tier field');
      const { data: userData } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();
        
      if (userData?.subscription_tier) {
        // Check if it's a UUID (tier_id) or a name
        const isUuid = typeof userData.subscription_tier === 'string' && 
                      userData.subscription_tier.includes('-');
                      
        if (isUuid) {
          // Look up tier name from UUID
          const { data: tierData } = await supabase
            .from('subscription_tiers')
            .select('name')
            .eq('id', userData.subscription_tier)
            .single();
            
          if (tierData?.name) {
            console.log(`Found tier name from user.subscription_tier UUID: ${tierData.name}`);
            setSubscriptionName(tierData.name.charAt(0).toUpperCase() + tierData.name.slice(1));
          }
        } else {
          // It's already a name
          console.log(`Using tier name directly from user.subscription_tier: ${userData.subscription_tier}`);
          setSubscriptionName(userData.subscription_tier.charAt(0).toUpperCase() + 
                             userData.subscription_tier.slice(1));
        }
      }
    } catch (err) {
      console.error('Error in fetchUserSubscription:', err);
    }
  };

  const fetchUsage = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (forceRefresh) {
        setRefreshing(true);
      }
      
      const [stats, subscriptionTiers] = await Promise.all([
        getUserUsageStats(),
        getSubscriptionTiers()
      ]);
      
      setUsage(stats);
      setTiers(subscriptionTiers);
      
      // Fetch user's subscription directly from Supabase
      await fetchUserSubscription();
      
      console.log('Loaded usage stats:', JSON.stringify(stats));
      console.log('Loaded tiers:', JSON.stringify(subscriptionTiers));
    } catch (err: any) {
      console.error('Error in UsageDisplay:', err);
      setError(err.message || "Failed to load usage statistics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
    
    // Add an interval to refresh data every 5 minutes
    const interval = setInterval(() => {
      fetchUsage(true);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchUsage]);

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

  // Keep the existing getTierName as a fallback with a minor adjustment
  const getTierName = () => {
    // If we have the subscription name from direct DB query, use that
    if (subscriptionName && subscriptionName !== 'Subscription' && subscriptionName !== 'Free') {
      return subscriptionName;
    }
    
    if (usage.subscription?.tier?.name) {
      const name = usage.subscription.tier.name;
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    
    if (usage.subscription?.tier_id && tiers.length > 0) {
      const tierMatch = tiers.find(t => t.id === usage.subscription.tier_id);
      if (tierMatch?.name) {
        return tierMatch.name.charAt(0).toUpperCase() + tierMatch.name.slice(1);
      }
    }
    
    return 'Free';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Your Usage</CardTitle>
            <CardDescription>
              {getTierName()} Plan - {usage.generationsThisDay} of{" "}
              {usage.dailyLimit} generations used today
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => fetchUsage(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Progress
          value={usage.percentUsed}
          className={`h-2 ${usage.isOverLimit ? "[&>div]:bg-destructive" : ""}`}
        />
        
        <div className="flex justify-between mt-2">
          <p className="text-sm text-muted-foreground">
            {usage.isOverLimit 
              ? "You've reached your daily generation limit" 
              : `${usage.remainingGenerationsToday} generations remaining today`}
          </p>
          <p className="text-sm font-medium">
            {usage.generationsThisDay}/{usage.dailyLimit}
          </p>
        </div>
        
        <p className="mt-4 text-xs text-muted-foreground text-right">
          Resets daily at midnight
        </p>
        
        {usage.isOverLimit && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              You've reached your daily generation limit. Upgrade your plan for higher limits or wait until tomorrow.
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
