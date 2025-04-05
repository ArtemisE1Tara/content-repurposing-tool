import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Cpu, BrainCircuit } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { useTheme } from "next-themes";

type GenerationModalProps = {
  generation: any;
  open: boolean;
  onClose: () => void;
};

export function GenerationModal({ generation, open, onClose }: GenerationModalProps) {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const timeAgo = generation?.created_at
    ? formatDistanceToNow(new Date(generation.created_at), { addSuffix: true })
    : '';

  // Format the platform display name
  const formatPlatform = (platform: string) => {
    if (platform.toLowerCase() === 'twitter') {
      return 'X';
    }
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  // Get content title - use the first line, fall back to platform description
  const getContentTitle = () => {
    if (!generation?.title) {
      return `${formatPlatform(generation?.platform || 'Content')}`;
    }
    return generation.title;
  };

  const copyContent = async () => {
    if (generation?.content) {
      await navigator.clipboard.writeText(generation.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    // Reset copied state when modal closes
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  if (!generation) return null;

  // Get model info with theme-aware styling
  const getModelInfo = () => {
    // Check if model property exists
    if (!generation.model) {
      return { 
        name: "AI Model", 
        icon: Cpu,
        badgeStyle: "bg-muted/30 border-muted"
      };
    }
    
    // Normalize the model value to handle case inconsistencies
    const modelValue = String(generation.model).toLowerCase();
    
    if (modelValue.includes("openai") || modelValue.includes("gpt")) {
      let badgeStyle = "";
      
      // Theme-specific styling for the OpenAI badge
      switch (theme) {
        case "midnight-purple":
          badgeStyle = "bg-blue-950/30 text-blue-300 border-blue-900/50";
          break;
        case "dark-topaz":
          badgeStyle = "bg-blue-950/20 text-blue-300 border-blue-900/40";
          break;
        case "dark":
          badgeStyle = "bg-blue-950/40 text-blue-300 border-blue-900/60";
          break;
        default: // light
          badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
      }
      
      return { 
        name: "GPT-4o", 
        icon: Cpu,
        badgeStyle,
        iconColor: theme?.includes("dark") || theme === "midnight-purple" || theme === "dark-topaz" 
          ? "text-blue-400" 
          : "text-blue-600"
      };
    } 
    else if (modelValue.includes("anthropic") || modelValue.includes("claude")) {
      let badgeStyle = "";
      
      // Theme-specific styling for the Claude badge
      switch (theme) {
        case "midnight-purple":
          badgeStyle = "bg-purple-950/30 text-purple-300 border-purple-900/50";
          break;
        case "dark-topaz":
          badgeStyle = "bg-purple-950/20 text-purple-300 border-purple-900/40";
          break;
        case "dark":
          badgeStyle = "bg-purple-950/40 text-purple-300 border-purple-900/60";
          break;
        default: // light
          badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
      }
      
      return { 
        name: "Claude Haiku", 
        icon: BrainCircuit,
        badgeStyle,
        iconColor: theme?.includes("dark") || theme === "midnight-purple" || theme === "dark-topaz" 
          ? "text-purple-400" 
          : "text-purple-600"
      };
    }
    
    // Generic fallback
    return { 
      name: String(generation.model),
      icon: Cpu,
      badgeStyle: "bg-muted/30 border-muted",
      iconColor: "text-foreground"
    };
  };

  const modelInfo = getModelInfo();
  const ModelIcon = modelInfo.icon;

  // Get platform badge styling based on theme
  const getPlatformBadgeStyle = () => {
    switch (theme) {
      case "midnight-purple":
      case "dark-topaz":
      case "dark":
        return "bg-accent/30 border-accent/50 text-muted-foreground";
      default:
        return "bg-muted/50";
    }
  };

  // Get content area styling based on theme
  const getContentAreaStyle = () => {
    switch (theme) {
      case "midnight-purple":
        return "bg-purple-950/10 border-purple-900/20";
      case "dark-topaz":
        return "bg-amber-950/10 border-amber-900/20";
      case "dark":
        return "bg-muted/20 border-muted/30";
      default:
        return "bg-muted/30 border-muted";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between mb-1">
            <DialogTitle className="mr-2">{getContentTitle()}</DialogTitle>
            
            <div className="flex items-center gap-0.5">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs py-1",
                  modelInfo.badgeStyle
                )}
              >
                <span className="flex items-center">
                  <ModelIcon className={cn(
                    "h-3 w-3 mr-1",
                    modelInfo.iconColor
                  )} />
                  {modelInfo.name}
                </span>
              </Badge>
            </div>
          </div>

          <DialogDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", getPlatformBadgeStyle())}>
                {formatPlatform(generation.platform)}
              </Badge>
              <span className="text-xs text-muted-foreground">Generated {timeAgo}</span>
            </div>
            <span className="text-xs font-medium">
              {generation.character_count} characters
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "flex-1 overflow-y-auto my-4 border rounded-md p-4", 
          getContentAreaStyle()
        )}>
          <ReactMarkdown
            className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line"
          >
            {generation.content}
          </ReactMarkdown>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className={cn(
              "gap-2",
              copied && "bg-green-500/20 text-green-600 dark:text-green-400 border-green-600/20"
            )}
            onClick={copyContent}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Content
              </>
            )}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
