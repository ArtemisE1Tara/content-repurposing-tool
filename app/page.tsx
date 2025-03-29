'use client'

import { Sidebar } from "@/components/sidebar";
import { useState } from "react";
import Main from "@/components/content-repurposing-tool";

export default function Home() {
  // Create a state for history refresh trigger
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  
  // Function to refresh history that can be passed to Main component
  const refreshHistory = () => {
    setHistoryRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar historyRefreshTrigger={historyRefreshTrigger} />
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          <div className="max-w-6xl mx-auto">
            <Main onContentGenerated={refreshHistory}/>
          </div>
        </main>
      </div>
    </div>
  );
}

