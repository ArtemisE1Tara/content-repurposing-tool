import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getGenerationById } from '@/lib/memberships';
import { GenerationModal } from './generation-modal';

type HistoryItemProps = {
  id: string;
  platform: string;
  title: string;
  snippet: string;
  created_at: string;
  collapsed: boolean;
  isTemporary?: boolean;
}

export function HistoryItem({ id, platform, title, snippet, created_at, collapsed, isTemporary }: HistoryItemProps) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [generation, setGeneration] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const timeAgo = formatDistanceToNow(new Date(created_at), { addSuffix: true });
  
  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleClick = async () => {
    if (collapsed) return;
    
    try {
      setLoading(true);
      const data = await getGenerationById(id);
      setGeneration(data);
      setShowModal(true);
    } catch (err) {
      console.error('Failed to load generation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get platform icon and color
  const getPlatformDetails = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter':
        return { color: 'text-blue-500', icon: '𝕏', bgColor: 'bg-blue-50 dark:bg-blue-950' };
      case 'instagram':
        return { color: 'text-pink-500', icon: '📷', bgColor: 'bg-pink-50 dark:bg-pink-950' };
      case 'linkedin':
        return { color: 'text-blue-700', icon: '💼', bgColor: 'bg-blue-50 dark:bg-blue-950' };
      case 'email':
        return { color: 'text-green-500', icon: '✉️', bgColor: 'bg-green-50 dark:bg-green-950' };
      default:
        return { color: 'text-slate-500', icon: '📄', bgColor: 'bg-slate-50 dark:bg-slate-900' };
    }
  };
  
  const { color, icon, bgColor } = getPlatformDetails(platform);

  // For collapsed mode, show just the icon with tooltip
  if (collapsed) {
    return (
      <div 
        className="w-full h-8 mb-1 flex items-center justify-center rounded-md hover:bg-accent transition-colors cursor-pointer" 
        title={`${platform}: ${title}`}
        onClick={handleClick}
      >
        <div className={cn("flex items-center justify-center w-6 h-6 rounded-full", bgColor)}>
          <span className={cn("text-sm", color)}>{icon}</span>
        </div>
      </div>
    );
  }

  // For expanded mode, show full item with metadata
  return (
    <>
      <div 
        className={cn(
          "px-2 py-2 mb-1 rounded-md border border-transparent hover:bg-accent/40 hover:border-border cursor-pointer transition-all",
          loading && "opacity-60",
          isTemporary && "border-dashed border-primary/30 animate-pulse"
        )}
        onClick={handleClick}
      >
        <div className="flex items-start space-x-2">
          <div className={cn("flex-shrink-0 flex items-center justify-center w-6 h-6 mt-0.5 rounded-full", bgColor)}>
            {loading ? 
              <Loader2 className="h-3 w-3 animate-spin" /> : 
              <span className={cn("text-sm", color)}>{icon}</span>
            }
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium line-clamp-1">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{snippet}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo}</p>
          </div>
          
         
        </div>
      </div>
      
      {generation && (
        <GenerationModal 
          generation={generation} 
          open={showModal} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
}
