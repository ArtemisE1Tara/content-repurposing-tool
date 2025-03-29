"use client";

import { useEffect, useState } from 'react';
import { HistoryItem } from './history-item';
import { Loader2, Clock, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { getUserGenerationHistory } from '@/lib/memberships';
import { cn } from '@/lib/utils';

export function HistoryList({ collapsed, refreshTrigger = 0 }: { collapsed: boolean, refreshTrigger?: number }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const fetchHistory = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const data = await getUserGenerationHistory(15);
      setHistory(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch history:', err);
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch initially
  useEffect(() => {
    fetchHistory();
  }, []);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchHistory(true);
    }
  }, [refreshTrigger]);

  const hasHistory = history.length > 0;

  if (collapsed) {
    if (!hasHistory) return null;
    
    return (
      <div className="mb-3">
        <div className="px-3 py-2 mb-1 border-t">
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        {history.slice(0, 5).map(item => (
          <HistoryItem
            key={item.id}
            id={item.id}
            platform={item.platform}
            title={item.title || `${item.platform} generation`}
            snippet={item.content_snippet || ''}
            created_at={item.created_at}
            collapsed={true}
          />
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-3 py-2 flex items-center text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin mr-2" />
        Loading history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-2 text-xs text-destructive">
        {error}
      </div>
    );
  }

  if (!hasHistory) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        No generation history yet.
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <Button
          variant="ghost"
          size="sm"
          className="px-3 text-left justify-start flex-grow"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span className="text-sm">Recent Generations</span>
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 ml-1" />
          ) : (
            <ChevronRight className="h-4 w-4 ml-1" />
          )}
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7" 
          onClick={() => fetchHistory(true)}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {expanded && (
        <ScrollArea className={cn("pr-4", history.length > 5 ? "max-h-60" : "")}>
          {history.map(item => (
            <HistoryItem
              key={item.id}
              id={item.id}
              platform={item.platform}
              title={item.title || `${item.platform} generation`}
              snippet={item.content_snippet || ''}
              created_at={item.created_at}
              collapsed={false}
            />
          ))}
        </ScrollArea>
      )}
    </div>
  );
}
