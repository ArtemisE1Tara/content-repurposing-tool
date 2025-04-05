import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Copy, Loader2, MoreVertical, Trash2, Cpu, BrainCircuit } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getGenerationById, deleteGenerationById } from '@/lib/memberships';
import { GenerationModal } from './generation-modal';
import { useTheme } from "next-themes";
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

type HistoryItemProps = {
  id: string;
  platform: string;
  title: string;
  snippet: string;
  created_at: string;
  collapsed: boolean;
  isTemporary?: boolean;
  model?: string; // Add model property
  onDelete?: () => void;
}

// Function to sanitize markdown from title text
const sanitizeMarkdown = (text: string): string => {
  if (!text) return '';
  
  // Replace common markdown symbols with their escaped versions
  return text
    .replace(/\*/g, '') // Remove asterisks
    .replace(/\_/g, '') // Remove underscores
    .replace(/\`/g, '') // Remove backticks
    .replace(/\#/g, '') // Remove hash symbols
    .replace(/\~\~/g, '') // Remove strikethrough
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Replace links with just the text
    .replace(/\!\[(.*?)\]\(.*?\)/g, '$1') // Replace images with just the alt text
    .trim();
};

export function HistoryItem({ 
  id, platform, title, snippet, created_at, collapsed, isTemporary, model, onDelete 
}: HistoryItemProps) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [generation, setGeneration] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { theme } = useTheme();
  
  const timeAgo = formatDistanceToNow(new Date(created_at), { addSuffix: true });
  
  // Apply markdown sanitization to title and snippet
  const displayTitle = sanitizeMarkdown(title);
  const displaySnippet = collapsed ? sanitizeMarkdown(snippet) : snippet;
  
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteGenerationById(id);
      if (onDelete) onDelete();
    } catch (err) {
      console.error('Failed to delete generation:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Get platform icon and color - updated to be theme-aware
  const getPlatformDetails = (platform: string) => {
    const platformKey = platform.toLowerCase();
    
    // Base styles for different themes
    let baseStyles: Record<string, Record<string, { color: string; bgColor: string }>> = {
      light: {
        twitter: { color: 'text-blue-500', bgColor: 'bg-blue-50' },
        instagram: { color: 'text-pink-500', bgColor: 'bg-pink-50' },
        linkedin: { color: 'text-blue-700', bgColor: 'bg-blue-50' },
        email: { color: 'text-green-500', bgColor: 'bg-green-50' },
        default: { color: 'text-slate-500', bgColor: 'bg-slate-50' }
      },
      dark: {
        twitter: { color: 'text-blue-400', bgColor: 'bg-blue-950/40' },
        instagram: { color: 'text-pink-400', bgColor: 'bg-pink-950/40' },
        linkedin: { color: 'text-blue-400', bgColor: 'bg-blue-950/40' },
        email: { color: 'text-green-400', bgColor: 'bg-green-950/40' },
        default: { color: 'text-slate-400', bgColor: 'bg-slate-800' }
      },
      'midnight-purple': {
        twitter: { color: 'text-blue-300', bgColor: 'bg-blue-950/30' },
        instagram: { color: 'text-pink-300', bgColor: 'bg-pink-950/30' },
        linkedin: { color: 'text-indigo-300', bgColor: 'bg-indigo-950/30' },
        email: { color: 'text-purple-300', bgColor: 'bg-purple-950/30' },
        default: { color: 'text-purple-300', bgColor: 'bg-purple-950/20' }
      },
      'dark-topaz': {
        twitter: { color: 'text-amber-300', bgColor: 'bg-blue-950/20' },
        instagram: { color: 'text-amber-300', bgColor: 'bg-pink-950/20' },
        linkedin: { color: 'text-amber-300', bgColor: 'bg-indigo-950/20' },
        email: { color: 'text-amber-300', bgColor: 'bg-green-950/20' },
        default: { color: 'text-amber-300', bgColor: 'bg-amber-950/20' }
      }
    };
    
    // Choose theme styles (fallback to light theme)
    const themeStyles = baseStyles[theme as keyof typeof baseStyles] || baseStyles.light;
    
    // Get the platform-specific styles (fallback to default)
    const styles = themeStyles[platformKey] || themeStyles.default;
    
    // Get the platform icon
    let icon = '📄'; // Default icon
    if (platformKey === 'twitter') icon = '𝕏';
    else if (platformKey === 'instagram') icon = '📷';
    else if (platformKey === 'linkedin') icon = '💼';
    else if (platformKey === 'email') icon = '✉️';
    
    return { 
      color: styles.color, 
      bgColor: styles.bgColor, 
      icon 
    };
  };
  
  const { color, icon, bgColor } = getPlatformDetails(platform);

  // Get model icon with theme-aware colors
  const getModelIcon = () => {
    if (!model) return null;
    
    // Get theme-specific colors
    const getIconColor = () => {
      if (model === "openai") {
        // OpenAI blue colors
        switch (theme) {
          case "midnight-purple": return "text-blue-300";
          case "dark-topaz": return "text-blue-300";
          case "dark": return "text-blue-400";
          default: return "text-blue-500";
        }
      } else if (model === "anthropic") {
        // Claude purple colors
        switch (theme) {
          case "midnight-purple": return "text-purple-300";
          case "dark-topaz": return "text-purple-300";
          case "dark": return "text-purple-400";
          default: return "text-purple-500";
        }
      }
      
      return "text-muted-foreground";
    };
    
    return model === "openai" ? (
      <Cpu className={`h-3 w-3 ${getIconColor()}`} />
    ) : model === "anthropic" ? (
      <BrainCircuit className={`h-3 w-3 ${getIconColor()}`} />
    ) : null;
  };

  // For collapsed mode, show just the icon with tooltip
  if (collapsed) {
    return (
      <div 
        className="w-full h-8 mb-1 flex items-center justify-center rounded-md hover:bg-accent transition-colors cursor-pointer" 
        title={`${platform}: ${displayTitle}`}
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
          "px-2 py-2 mb-1 rounded-md border border-transparent hover:bg-accent/40 hover:border-border cursor-pointer transition-all group",
          loading && "opacity-60",
          isTemporary && "border-dashed border-primary/30 animate-pulse"
        )}
        onClick={handleClick}
      >
        <div className="flex items-start">
          <div className={cn("flex-shrink-0 flex items-center justify-center w-6 h-6 mt-0.5 rounded-full", bgColor)}>
            {loading ? 
              <Loader2 className="h-3 w-3 animate-spin" /> : 
              <span className={cn("text-sm", color)}>{icon}</span>
            }
          </div>
          
          <div className="flex-1 min-w-0 px-2">
            <p className="text-xs font-medium line-clamp-1">{displayTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{displaySnippet}</p>
            <div className="flex items-center mt-1 gap-1">
              <p className="text-[10px] text-muted-foreground/60">{timeAgo}</p>
              {getModelIcon() && (
                <span className="ml-1" title={model === "openai" ? "Generated with GPT-4o" : "Generated with Claude"}>
                  {getModelIcon()}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={copyToClipboard}
              title="Copy to clipboard"
            >
              <Copy className="h-3 w-3" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isTemporary}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(e as React.MouseEvent);
                  }}
                  disabled={isDeleting || isTemporary}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Generation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this generation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
