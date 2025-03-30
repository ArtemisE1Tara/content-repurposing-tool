import { useEffect } from 'react';
import useSWR from 'swr';
import { SubscriptionStatusData } from '@/types/subscription';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSubscription() {
  const { data, error, isLoading, mutate } = useSWR<SubscriptionStatusData>(
    '/api/stripe/subscription',
    fetcher
  );

  // Refresh subscription data every 60 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      mutate();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [mutate]);

  return {
    subscription: data,
    isLoading,
    isError: error,
    mutate,
  };
}
