import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserUsageStats, getSubscriptionTiers } from "@/lib/memberships";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Check } from "lucide-react";
import { UsageDisplay } from "@/components/usage-display";

export default async function MembershipPage() {
  try {
    const [stats, tiers] = await Promise.all([
      getUserUsageStats(),
      getSubscriptionTiers()
    ]);
    
    const currentTierId = stats?.subscription?.tier?.id;

    return (
      <div className="container py-10 max-w-5xl">
        <h1 className="text-3xl font-bold mb-6">Membership Settings</h1>
        
        <div className="grid gap-6 mb-8">
          <UsageDisplay />
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.id} className={`border-2 ${currentTierId === tier.id ? 'border-primary' : ''}`}>
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>
                  ${tier.price_monthly}/month
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-primary shrink-0" />
                    <span>{tier.daily_generation_limit} generations per day</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-primary shrink-0" />
                    <span>Up to {tier.platform_limit} platforms per generation</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-primary shrink-0" />
                    <span>Up to {tier.max_character_count} characters per generation</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                {currentTierId === tier.id ? (
                  <Button disabled className="w-full">Current Plan</Button>
                ) : (
                  <Button variant="outline" className="w-full">
                    {currentTierId && tiers.find(t => t.id === currentTierId)?.price_monthly < tier.price_monthly
                      ? "Upgrade"
                      : "Switch Plan"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="mt-8">
          <p className="text-sm text-muted-foreground">
            Note: Stripe integration for payments will be added soon. Currently, all users are on the free tier.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading membership page:", error);
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load membership data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}
