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
}

export function HistoryItem({ id, platform, title, snippet, created_at, collapsed }: HistoryItemProps) {
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
        return { color: 'text-blue-500', icon: '𝕏' };
      case 'instagram':
        return { color: 'text-pink-500', icon: '📷' };
      case 'linkedin':
        return { color: 'text-blue-700', icon: '💼' };
      case 'email':
        return { color: 'text-green-500', icon: '✉️' };
      default:
        return { color: 'text-gray-500', icon: '📄' };
    }
  };
  
  const { color, icon } = getPlatformDetails(platform);

  if (collapsed) {
    return (
      <div className="px-3 py-2 mb-1 rounded hover:bg-accent cursor-pointer" title={title}>
        <span className={cn("font-mono", color)}>{icon}</span>
      </div>
    );
  }

  return (
    <>
      <div 
        className={cn(
          "px-3 py-2 mb-1 rounded hover:bg-accent cursor-pointer transition-colors",
          loading && "opacity-60"
        )}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className={cn("mr-2 font-mono", color)}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : icon}
            </span>
            <div className="truncate">
              <p className="text-xs font-medium truncate">{title}</p>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 hover:bg-accent" 
            onClick={copyToClipboard}
            disabled={loading}
          >
            <Copy className="h-3 w-3" />
            <span className="sr-only">Copy</span>
          </Button>
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
