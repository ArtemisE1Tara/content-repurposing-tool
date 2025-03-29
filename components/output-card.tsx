"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { useState } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface OutputCardProps {
  title: string
  content: string
  maxLength?: number
}

export default function OutputCard({ title, content, maxLength }: OutputCardProps) {
  const [copied, setCopied] = useState(false)
  const [showMarkdown, setShowMarkdown] = useState(true)

  // Copy content to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Calculate character count and display (with warning if over limit)
  const charCount = content.length
  const isOverLimit = maxLength ? charCount > maxLength : false

  return (
    <Card className="border-2 h-full flex flex-col">
      <CardContent className="pt-6 flex-grow">
        <div className="prose dark:prose-invert max-w-none overflow-auto pb-4">
          {showMarkdown ? (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]} 
              rehypePlugins={[rehypeRaw]}
              className="whitespace-pre-wrap"
            >
              {content}
            </ReactMarkdown>
          ) : (
            <pre className="whitespace-pre-wrap text-sm overflow-auto">{content}</pre>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Label className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
            {charCount} {maxLength ? `/ ${maxLength}` : ""} characters
            {isOverLimit && " (exceeds limit)"}
          </Label>
          
          <Button
            variant={showMarkdown ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMarkdown(!showMarkdown)}
            className="h-8"
          >
            {showMarkdown ? "Plaintext" : "Formatted"}
          </Button>
        </div>
        
        <Button size="sm" variant="outline" onClick={copyToClipboard}>
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

