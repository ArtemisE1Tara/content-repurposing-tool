"use client";

import { useEffect, useState, useContext } from 'react';
import { HistoryItem } from './history-item';
import { Loader2, Clock, ChevronDown, ChevronRight, RefreshCw, History, Trash2, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { getUserGenerationHistory, deleteAllGenerations } from '@/lib/memberships';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { GenerationContext } from './content-repurposing-tool';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function HistoryList({ collapsed, refreshTrigger = 0 }: { collapsed: boolean, refreshTrigger?: number }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  // Access the latest generation from context
  const { latestGeneration } = useContext(GenerationContext);

  const fetchHistory = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const data = await getUserGenerationHistory(20);
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

  // When we get a new generation, add it to the history immediately
  useEffect(() => {
    if (latestGeneration && !history.some(item => 
      // Check if it's a duplicate by comparing content or ID
      (latestGeneration.isTemporary && item.content === latestGeneration.content) || 
      item.id === latestGeneration.id
    )) {
      console.log("Adding new generation to history:", latestGeneration);
      
      // Add the new generation to the top of the history list
      setHistory(prev => [latestGeneration, ...prev]);
      
      // If this was a temporary item, refresh to get the real data after a delay
      if (latestGeneration.isTemporary) {
        setTimeout(() => {
          fetchHistory(true);
        }, 1500);
      }
    }
  }, [latestGeneration]);

  const handleClearAll = () => {
    setShowClearDialog(true);
  };

  const confirmClearAll = async () => {
    try {
      setIsClearing(true);
      await deleteAllGenerations();
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      setIsClearing(false);
      setShowClearDialog(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    // Update UI immediately for responsiveness
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const hasHistory = history.length > 0;

  // Handle collapsed state with minimal UI
  if (collapsed) {
    if (!hasHistory) return null;
    
    return (
      <div className="space-y-1 px-1 h-full">
        <div className="flex items-center justify-center h-6">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="space-y-1 pt-1 overflow-hidden relative h-[calc(100%-2rem)]">
          <div className="h-full">
            {history.slice(0, 7).map(item => (
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
          {history.length > 7 && (
            <div className="flex justify-center">
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                +{history.length - 7}
              </Badge>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="px-2 py-3 flex items-center text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin mr-2" />
        <span>Loading history...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-2 py-2 text-xs text-destructive">
        {error}
      </div>
    );
  }

  // No history state
  if (!hasHistory) {
    return (
      <div className="px-2 py-2 text-xs text-muted-foreground space-y-1">
        <p>No history yet.</p>
        <p className="text-[10px]">Generate snippets to see your history here.</p>
      </div>
    );
  }

  // Regular history list with items
  return (
    <div className="space-y-2 h-full flex flex-col">
      <div className="flex items-center justify-between px-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="px-2 text-left justify-start h-7 gap-1.5 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="font-medium">History</span>
          {expanded ? 
            <ChevronDown className="h-3.5 w-3.5 ml-auto" /> : 
            <ChevronRight className="h-3.5 w-3.5 ml-auto" />
          }
        </Button>
        
        <div className="flex items-center gap-0.1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => fetchHistory(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="sr-only">Refresh</span>
          </Button>

          {history.length > 0 && (
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-auto inline-flex">
              {history.length} item{history.length !== 1 ? 's' : ''}
            </Badge>
          )}
          
          {history.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={isClearing}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={handleClearAll}
                  disabled={isClearing}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Clear All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {expanded && (
        <div className="relative flex-grow overflow-hidden">
          <ScrollArea className="h-full pr-2">
            <div className="space-y-1 pb-8">
              {history.map(item => (
                <HistoryItem
                  key={item.id}
                  id={item.id}
                  platform={item.platform}
                  title={item.title || `${item.platform} generation`}
                  snippet={item.content_snippet || ''}
                  created_at={item.created_at}
                  collapsed={false}
                  isTemporary={item.isTemporary}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              ))}
            </div>
          </ScrollArea>
          {/* Fade effect at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>
      )}

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All History</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {history.length} generation{history.length !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmClearAll}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Clear All'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
