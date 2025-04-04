"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Main from "@/components/content-repurposing-tool";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  
  // Function to refresh history that can be passed to Main component
  const refreshHistory = () => {
    setHistoryRefreshTrigger(prev => prev + 1);
  };
  
  // Handle authentication check on the client side
  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    }
  }, [userId, router, isLoaded]);
  
  // If not loaded or not signed in, show loading state
  if (!isLoaded || !userId) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-5xl mx-auto">
      <Main onContentGenerated={refreshHistory} />
    </div>
  );
}
