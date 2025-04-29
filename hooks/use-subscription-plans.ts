import useSWR from 'swr';
import { SubscriptionPlan } from '@/types/subscription';
import { SUBSCRIPTION_PLANS } from '@/config/subscription';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSubscriptionPlans() {
  const { data, error, isLoading } = useSWR<SubscriptionPlan[]>(
    '/api/stripe/plans',
    fetcher,
    {
      fallbackData: SUBSCRIPTION_PLANS, // Use default plans while loading
      revalidateOnFocus: false,
    }
  );

  return {
    plans: data || SUBSCRIPTION_PLANS,
    isLoading,
    isError: error,
  };
}
