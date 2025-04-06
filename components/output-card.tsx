"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Check, AlertCircle } from "lucide-react"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface OutputCardProps {
  title: string
  content: string
  maxLength?: number
}

export default function OutputCard({ title, content, maxLength = 0 }: OutputCardProps) {
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  
  const characterCount = editedContent.length
  const isOverLimit = maxLength > 0 && characterCount > maxLength
  const displayContent = isEditing ? editedContent : content

  // Show truncated content if over limit and not editing
  const formattedContent = !isEditing && maxLength > 0 && content.length > maxLength
    ? content.substring(0, maxLength)
    : displayContent

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(isEditing ? editedContent : content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Save edited content and exit edit mode
      setIsEditing(false)
    } else {
      // Enter edit mode
      setIsEditing(true)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {maxLength > 0 && (
              <Badge 
                variant={isOverLimit ? "destructive" : "secondary"} 
                className="text-xs"
              >
                {characterCount}/{maxLength}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditToggle}
              className="h-8 px-2 text-xs"
            >
              {isEditing ? "Save" : "Edit"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[150px] font-mono text-sm"
              maxLength={maxLength > 0 ? maxLength : undefined}
            />
            {isOverLimit && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Content exceeds the {maxLength} character limit by {characterCount - maxLength} characters.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{formattedContent}</ReactMarkdown>
            {maxLength > 0 && content.length > maxLength && (
              <div className="text-muted-foreground text-xs italic mt-2">
                Note: Content has been truncated to {maxLength} characters. Edit to see full content.
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <div className="text-xs text-muted-foreground">
          {characterCount} characters
        </div>
        <Button variant="outline" size="sm" onClick={copyToClipboard}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

