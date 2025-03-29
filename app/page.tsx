'use client'

import { Sidebar } from "@/components/sidebar";
import { AppContent } from "@/components/app-content";
import { useState } from "react";

export default function Home({ userId }: { userId: string }) {

  // Create a state for history refresh trigger
    const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  
    // Function to refresh history that can be passed to Main component
    const refreshHistory = () => {
      setHistoryRefreshTrigger(prev => prev + 1);
    };

  return (
    <div className="flex h-screen overflow-hidden">
    <Sidebar historyRefreshTrigger={historyRefreshTrigger} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <AppContent userId={userId} />
        </div>
      </main>
    </div>
  );
}

