import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoaderCircle } from 'lucide-react';
import { SubscriptionTier } from '@/types/subscription';

interface CheckoutButtonProps {
  tier: SubscriptionTier;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  className?: string;
  disabled?: boolean;
}

export function CheckoutButton({
  tier,
  label = 'Subscribe',
  variant = 'default',
  className,
  disabled = false,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      
      // Create checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
        }),
      });

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={isLoading || disabled}
      variant={variant}
      className={className}
    >
      {isLoading ? (
        <>
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        label
      )}
    </Button>
  );
}
