import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckIcon, Loader2 } from 'lucide-react';
import { CheckoutButton } from './checkout-button';
import { SubscriptionPlan } from '@/types/subscription';
import { formatAmountForDisplay } from '@/lib/stripe-helpers';
import { cn } from '@/lib/utils';

interface SubscriptionPlansProps {
  plans: SubscriptionPlan[];
  currentPlan?: string;
  isLoading?: boolean;
}

export function SubscriptionPlans({ plans, currentPlan, isLoading }: SubscriptionPlansProps) {
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const isCurrentPlan = currentPlan === plan.tier;
        
        return (
          <Card 
            key={plan.id} 
            className={cn(
              "flex flex-col",
              plan.isPopular && "border-primary shadow-md"
            )}
          >
            {plan.isPopular && (
              <div className="rounded-t-lg bg-primary py-1 text-center text-sm font-medium text-primary-foreground">
                Most Popular
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">
                  {plan.price ? formatAmountForDisplay(plan.price, plan.currency) : 'Loading...'}
                </span>
                <span className="text-muted-foreground"> /{plan.interval}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {isCurrentPlan ? (
                <p className="w-full rounded-md bg-muted py-2 text-center">
                  Your current plan
                </p>
              ) : (
                <CheckoutButton 
                  tier={plan.tier} 
                  label={`Subscribe to ${plan.name}`} 
                  className="w-full"
                  disabled={!plan.priceId} // Disable button if price isn't loaded
                />
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
