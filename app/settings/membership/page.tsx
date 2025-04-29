'use client'
import { Separator } from "@/components/ui/separator";
import { SubscriptionPlans } from "@/components/subscription/subscription-plans";
import { ManageSubscription } from "@/components/subscription/manage-subscription";
import { useSubscription } from "@/hooks/use-subscription";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MembershipPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  
  const { subscription, isLoading: subscriptionLoading, mutate } = useSubscription();
  const { plans, isLoading: plansLoading } = useSubscriptionPlans();
  
  useEffect(() => {
    // Check URL parameters for checkout status
    const success = searchParams?.get('success');
    const canceled = searchParams?.get('canceled');
    
    if (success === 'true') {
      setShowSuccess(true);
      // Auto-hide success message after 5 seconds
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
    
    if (canceled === 'true') {
      setShowCanceled(true);
      // Auto-hide canceled message after 5 seconds
      const timer = setTimeout(() => setShowCanceled(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-4 gap-1"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Membership</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>
      
      {showSuccess && (
        <Alert className="mb-6 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>
            Your subscription has been processed successfully.
          </AlertDescription>
        </Alert>
      )}
      
      {showCanceled && (
        <Alert className="mb-6 bg-amber-50 dark:bg-amber-950">
          <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>Checkout canceled</AlertTitle>
          <AlertDescription>
            Your subscription checkout was canceled. You can try again whenever you're ready.
          </AlertDescription>
        </Alert>
      )}
      
      {subscriptionLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <>
          {subscription?.isActive && (
            <div className="mb-8">
              <h2 className="mb-4 text-2xl font-semibold">Your Subscription</h2>
              <ManageSubscription 
                subscription={subscription} 
                onSubscriptionUpdated={mutate} 
              />
              <Separator className="my-8" />
            </div>
          )}
          
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Available Plans</h2>
            <SubscriptionPlans 
              plans={plans} 
              currentPlan={subscription?.tier}
              isLoading={plansLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
