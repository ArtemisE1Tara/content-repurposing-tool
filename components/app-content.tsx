'use client'

import Main from "@/components/content-repurposing-tool";
import { Sidebar } from "@/components/sidebar";
import { useState } from "react";

interface AppContentProps {
  userId: string;
}

export function AppContent({ userId }: AppContentProps) {
  // Create a state for history refresh trigger
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  // Function to refresh history that can be passed to Main component
  const refreshHistory = () => {
    setHistoryRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Pass the refreshHistory function to Main if needed */}
          <Main onContentGenerated={refreshHistory} />
        </div>
      </main>
    </div>
  );
}
