import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionStatusData } from '@/types/subscription';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ManageSubscriptionProps {
  subscription: SubscriptionStatusData;
  onSubscriptionUpdated: () => void;
}

export function ManageSubscription({ 
  subscription, 
  onSubscriptionUpdated 
}: ManageSubscriptionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { isActive, tier, currentPeriodEnd, cancelAtPeriodEnd } = subscription;
  
  const handleSubscriptionAction = async (action: 'cancel' | 'reactivate') => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }
      
      // Refresh subscription data
      onSubscriptionUpdated();
    } catch (error) {
      console.error('Error updating subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>You currently don't have an active subscription.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <br></br>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Status</h4>
            <p className="text-sm text-muted-foreground">
              {isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
          
          {currentPeriodEnd && (
            <div>
              <h4 className="font-medium">
                {cancelAtPeriodEnd ? 'Cancels On' : 'Renews On'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {formatDate(new Date(currentPeriodEnd * 1000))}
              </p>
            </div>
          )}
          
          {cancelAtPeriodEnd && (
            <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-950">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Subscription Cancellation
                  </h3>
                  <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    <p>
                      Your subscription has been canceled and will end on the date shown above.
                      You can reactivate your subscription at any time before this date.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {cancelAtPeriodEnd ? (
          <Button
            onClick={() => handleSubscriptionAction('reactivate')}
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Reactivate Subscription'
            )}
          </Button>
        ) : (
          <Button
            onClick={() => handleSubscriptionAction('cancel')}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Cancel Subscription'
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
