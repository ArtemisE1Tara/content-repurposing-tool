import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Copy, X } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Badge } from '@/components/ui/badge';

interface GenerationModalProps {
  generation: any;
  open: boolean;
  onClose: () => void;
}

export function GenerationModal({ generation, open, onClose }: GenerationModalProps) {
  const [copied, setCopied] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(true);
  
  if (!generation) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generation.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'instagram': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
      case 'linkedin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'email': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="pr-10">{generation.title || 'Generated Content'}</DialogTitle>
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge className={getPlatformColor(generation.platform)}>
              {generation.platform}
            </Badge>
            <span>• {formatDate(generation.created_at)}</span>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto py-4">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant={showMarkdown ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMarkdown(!showMarkdown)}
              >
                {showMarkdown ? "Plaintext" : "Formatted"}
              </Button>
            </div>
            
            <div className="prose dark:prose-invert max-w-none">
              {showMarkdown ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  rehypePlugins={[rehypeRaw]}
                  className="whitespace-pre-wrap"
                >
                  {generation.content}
                </ReactMarkdown>
              ) : (
                <pre className="whitespace-pre-wrap text-sm overflow-auto p-4 bg-muted rounded-md">
                  {generation.content}
                </pre>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={copyToClipboard}>
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
