"use client"

import { useState, useEffect, createContext, useCallback } from "react"
import React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2, AlertCircle, Twitter, Instagram, Linkedin, Mail, Sparkles, 
  Settings, LinkIcon, SmilePlus, UserPlus, Cpu, BrainCircuit 
} from "lucide-react"
import { generateContent, fetchArticleContent } from "@/lib/generate-content"
import { countWords } from "@/lib/utils"
import OutputCard from "@/components/output-card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { UsageDisplay } from "@/components/usage-display"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Define tone options
const toneOptions = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "humorous", label: "Humorous" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "informative", label: "Informative" },
]

// Model provider options
const modelProviderOptions = [
  { value: "openai", label: "OpenAI GPT-4o", description: "Best for consistency and specific instructions" },
  { value: "anthropic", label: "Anthropic Claude Haiku", description: "Fast, efficient content generation" },
]

// Get character limit from environment variable with fallback to 6000
const HARD_CHARACTER_LIMIT = parseInt(process.env.NEXT_PUBLIC_MAX_CHARACTER_LIMIT || '6000', 10);

// Default character limits from environment variables
const DEFAULT_LIMITS = {
  twitter: parseInt(process.env.NEXT_PUBLIC_DEFAULT_LIMIT_TWITTER || '500', 10),
  instagram: parseInt(process.env.NEXT_PUBLIC_DEFAULT_LIMIT_INSTAGRAM || '2200', 10),
  linkedin: parseInt(process.env.NEXT_PUBLIC_DEFAULT_LIMIT_LINKEDIN || '3000', 10),
  email: parseInt(process.env.NEXT_PUBLIC_DEFAULT_LIMIT_EMAIL || '300', 10),
}

// Define the GenerationContext with a more reliable update mechanism
export const GenerationContext = createContext<{
  latestGeneration: any | null;
  setLatestGeneratedItem: (item: any) => void;
  refreshTimestamp: number;
  triggerRefresh: () => void;
}>({
  latestGeneration: null,
  setLatestGeneratedItem: () => {},
  refreshTimestamp: 0,
  triggerRefresh: () => {},
});

// Custom hook for history refresh - properly implemented before the component
export const useHistoryRefresh = () => {
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  return { historyRefreshTrigger, setHistoryRefreshTrigger };
};

// Define the MainProps interface
interface MainProps {
  onContentGenerated?: () => void;
}

export default function Main({ onContentGenerated }: MainProps) {
  // Add authentication check using Clerk
  const { isLoaded, isSignedIn, user } = useUser();
  
  // All state declarations
  const [content, setContent] = useState("")
  const [articleUrl, setArticleUrl] = useState("")
  const [outputs, setOutputs] = useState<{
    twitter: string
    instagram: string
    linkedin: string
    email: string
  }>({
    twitter: "",
    instagram: "",
    linkedin: "",
    email: "",
  })
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    twitter: false,
    instagram: false,
    linkedin: false,
    email: false,
  })
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingArticle, setIsFetchingArticle] = useState(false);
  const [activeTab, setActiveTab] = useState("twitter")
  const [selectedTone, setSelectedTone] = useState("professional")
  const [customInstructions, setCustomInstructions] = useState("")
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [useEmojis, setUseEmojis] = useState(false)
  const [limits, setLimits] = useState({ ...DEFAULT_LIMITS })
  const [latestGeneratedItem, setLatestGeneratedItem] = useState<any | null>(null)
  const [refreshTimestamp, setRefreshTimestamp] = useState(0)
  const [selectedModelProvider, setSelectedModelProvider] = useState<"openai" | "anthropic">("openai")
  
  const characterCount = content.length
  const isOverLimit = characterCount > HARD_CHARACTER_LIMIT

  // Function to trigger refresh in context
  const triggerRefresh = useCallback(() => {
    setRefreshTimestamp(Date.now())
  }, [])

  // Check if at least one platform is selected
  const hasSelectedPlatform = Object.values(selectedPlatforms).some((value) => value)
  
  // Display error message if there is one
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000); // Clear error after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Expose the latest generation for history list to use
  useEffect(() => {
    if (latestGeneratedItem) {
      // Reset after a short delay to avoid duplicate insertions
      const timer = setTimeout(() => {
        setLatestGeneratedItem(null)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [latestGeneratedItem])

  // Get the first selected platform for default tab
  const getFirstSelectedPlatform = () => {
    const platforms = ["twitter", "instagram", "linkedin", "email"]
    return platforms.find((platform) => selectedPlatforms[platform as keyof typeof selectedPlatforms]) || "twitter"
  }

  // Handle limit change
  const handleLimitChange = (platform: keyof typeof limits, value: string) => {
    const numValue = Number.parseInt(value)
    if (!isNaN(numValue) && numValue > 0) {
      setLimits((prev) => ({
        ...prev,
        [platform]: numValue,
      }))
    }
  }

  // Reset limits to defaults
  const resetLimits = () => {
    setLimits({ ...DEFAULT_LIMITS })
  }

  // Handle platform selection
  const handlePlatformChange = (platform: keyof typeof selectedPlatforms) => {
    setSelectedPlatforms((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }))
  }

  // Fetch article content with auth check
  async function handleFetchArticle() {
    if (!isSignedIn) {
      setError("Please sign in to fetch article content")
      return
    }
    
    if (!articleUrl.trim()) {
      setError("Please enter a valid URL")
      return
    }

    setError(null)
    setIsFetchingArticle(true)

    try {
      const articleContent = await fetchArticleContent(articleUrl)
      setContent(articleContent)
    } catch (err) {
      console.error("Article fetch error:", err)
      setError("Failed to fetch article content. Please check the URL and try again.")
    } finally {
      setIsFetchingArticle(false)
    }
  }

  // Generate content with auth check
  async function handleGenerate() {
    if (!isSignedIn) {
      setError("Please sign in to generate content")
      return
    }
    
    if (!content.trim()) {
      setError("Please enter some content to repurpose")
      return
    }

    if (isOverLimit) {
      setError(`Content exceeds the ${HARD_CHARACTER_LIMIT} character limit`)
      return
    }

    if (!hasSelectedPlatform) {
      setError("Please select at least one platform")
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      const generatedContent = await generateContent(
        content,
        selectedPlatforms,
        selectedTone,
        customInstructions,
        limits,
        useEmojis,
        selectedModelProvider
      )
      setOutputs((prevOutputs) => ({
        ...prevOutputs,
        ...generatedContent,
      }))

      // Set active tab to the first selected platform
      setActiveTab(getFirstSelectedPlatform())

      // Get the latest generation data and add it to the history immediately
      const platformsGenerated = Object.keys(generatedContent)

      if (platformsGenerated.length > 0) {
        // Create a placeholder item for immediate display
        const firstPlatform = platformsGenerated[0]
        const content = generatedContent[firstPlatform]
        const lines = content.trim().split("\n")
        const title = lines[0].slice(0, 50) + (lines[0].length > 50 ? "..." : "")
        const snippet = content.slice(0, 100) + (content.length > 100 ? "..." : "")

        // Create a temporary generation object for immediate display
        const tempGeneration = {
          id: `temp-${Date.now()}`,
          platform: firstPlatform,
          character_count: content.length,
          title,
          content_snippet: snippet,
          content,
          created_at: new Date().toISOString(),
          isTemporary: true, // Mark as temporary for special handling
          model: selectedModelProvider, // Add the model used for generation
        }

        setLatestGeneratedItem(tempGeneration)
      }

      // Call the onContentGenerated callback to trigger history refresh
      if (onContentGenerated) {
        onContentGenerated()
      }

      // Trigger refresh for all components using the context
      triggerRefresh()
    } catch (err) {
      console.error("Generation error:", err)
      setError("Failed to generate content. Please check your API key and try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Get generated platforms
  const generatedPlatforms = Object.entries(outputs)
    .filter(([platform, content]) => content && selectedPlatforms[platform as keyof typeof selectedPlatforms])
    .map(([platform]) => platform)

  // Show authentication message if user is not signed in
  if (isLoaded && !isSignedIn) {
    return (
      <div className="space-y-6 mb-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Ready, set, Go!</h1>
          <p className="text-muted-foreground mt-1">
            Condense already existing articles into platform-optimized social media captions and email snippets
          </p>
        </div>
        
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You need to create an account or sign in to use the content repurposing tool
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <UserPlus className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Sign in to Get Started</h3>
              <p className="text-muted-foreground mb-6">
                Create an account to generate platform-optimized content for your social media and emails.
              </p>
              <div className="flex gap-4">
                <Button asChild>
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/sign-up">Create Account</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If authentication is still loading, show a loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Original component render for authenticated users
  return (
    <GenerationContext.Provider
      value={{
        latestGeneration: latestGeneratedItem,
        setLatestGeneratedItem,
        refreshTimestamp,
        triggerRefresh
      }}
    >
      <div className="space-y-6 mb-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Ready, set, Go!</h1>
          <p className="text-muted-foreground mt-1">
            Condense already existing articles into platform-optimized social media captions and email snippets
          </p>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Paste an article or fetch from a URL (max {HARD_CHARACTER_LIMIT} characters)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter article URL"
                  value={articleUrl}
                  onChange={(e) => setArticleUrl(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                onClick={handleFetchArticle}
                disabled={isFetchingArticle || !articleUrl.trim()}
                className="whitespace-nowrap"
              >
                {isFetchingArticle ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Fetch
                  </>
                )}
              </Button>
            </div>

            <Textarea
              placeholder="Paste from clipboard here..."
              className="min-h-[200px] resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={HARD_CHARACTER_LIMIT}
            />
            <div className={`text-sm ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {characterCount} / {HARD_CHARACTER_LIMIT} characters
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Target Platforms</CardTitle>
              <CardDescription>Select platforms to generate captions for</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={selectedPlatforms.twitter ? "default" : "outline"}
                  className={`flex items-center justify-center gap-2 h-20 ${
                    selectedPlatforms.twitter ? "bg-primary text-primary-foreground" : ""
                  }`}
                  onClick={() => handlePlatformChange("twitter")}
                >
                  <Twitter
                    className={`h-6 w-6 ${selectedPlatforms.twitter ? "text-primary-foreground" : "text-primary"}`}
                  />
                  <span>X</span>
                </Button>

                <Button
                  variant={selectedPlatforms.instagram ? "default" : "outline"}
                  className={`flex items-center justify-center gap-2 h-20 ${
                    selectedPlatforms.instagram ? "bg-primary text-primary-foreground" : ""
                  }`}
                  onClick={() => handlePlatformChange("instagram")}
                >
                  <Instagram
                    className={`h-6 w-6 ${selectedPlatforms.instagram ? "text-primary-foreground" : "text-primary"}`}
                  />
                  <span>Instagram</span>
                </Button>

                <Button
                  variant={selectedPlatforms.linkedin ? "default" : "outline"}
                  className={`flex items-center justify-center gap-2 h-20 ${
                    selectedPlatforms.linkedin ? "bg-primary text-primary-foreground" : ""
                  }`}
                  onClick={() => handlePlatformChange("linkedin")}
                >
                  <Linkedin
                    className={`h-6 w-6 ${selectedPlatforms.linkedin ? "text-primary-foreground" : "text-primary"}`}
                  />
                  <span>LinkedIn</span>
                </Button>

                <Button
                  variant={selectedPlatforms.email ? "default" : "outline"}
                  className={`flex items-center justify-center gap-2 h-20 ${
                    selectedPlatforms.email ? "bg-primary text-primary-foreground" : ""
                  }`}
                  onClick={() => handlePlatformChange("email")}
                >
                  <Mail className={`h-6 w-6 ${selectedPlatforms.email ? "text-primary-foreground" : "text-primary"}`} />
                  <span>Email</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Style</CardTitle>
              <CardDescription>Choose how your media should sound</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedTone} onValueChange={setSelectedTone} className="space-y-3">
                {toneOptions.map((tone) => (
                  <div key={tone.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={tone.value} id={tone.value} />
                    <Label htmlFor={tone.value}>{tone.label}</Label>
                  </div>
                ))}
              </RadioGroup>

              <Separator className="my-4" />

              <div className="flex items-center space-x-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center space-x-1"
                >
                  <Settings className="h-4 w-4" />
                  <span>Options</span>
                </Button>
              </div>

              {showAdvancedOptions && (
                <div className="space-y-4 mt-4">
                  {/* Model Provider Selection */}
                  <div className="space-y-3">
                    <Label>AI Model</Label>
                    <RadioGroup value={selectedModelProvider} onValueChange={(value: "openai" | "anthropic") => setSelectedModelProvider(value)} className="space-y-3">
                      {modelProviderOptions.map((model) => (
                        <div key={model.value} className="flex items-start space-x-2">
                          <RadioGroupItem value={model.value} id={`model-${model.value}`} className="mt-1" />
                          <div>
                            <Label htmlFor={`model-${model.value}`} className="flex items-center">
                              {model.value === "openai" ? (
                                <Cpu className="h-4 w-4 mr-2 text-blue-500" />
                              ) : (
                                <BrainCircuit className="h-4 w-4 mr-2 text-purple-500" />
                              )}
                              {model.label}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant={useEmojis ? "default" : "outline"}
                      className={`flex items-center justify-center gap-2 w-full h-10 ${
                        useEmojis ? "bg-primary text-primary-foreground" : ""
                      }`}
                      onClick={() => setUseEmojis(!useEmojis)}
                    >
                      <SmilePlus
                        className={`h-5 w-5 ${useEmojis ? "text-primary-foreground" : "text-primary"}`}
                      />
                      <span>
                        {selectedTone === "professional" && "Use Professional Emojis"}
                        {selectedTone === "casual" && "Use Casual Emojis"}
                        {selectedTone === "humorous" && "Use Fun Emojis"}
                        {selectedTone === "enthusiastic" && "Use Enthusiastic Emojis"}
                        {selectedTone === "informative" && "Use Informative Emojis"}
                      </span>
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Character Limits</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="twitter-limit">Twitter</Label>
                        <Input
                          id="twitter-limit"
                          type="number"
                          min="1"
                          value={limits.twitter}
                          onChange={(e) => handleLimitChange("twitter", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="instagram-limit">Instagram</Label>
                        <Input
                          id="instagram-limit"
                          type="number"
                          min="1"
                          value={limits.instagram}
                          onChange={(e) => handleLimitChange("instagram", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkedin-limit">LinkedIn</Label>
                        <Input
                          id="linkedin-limit"
                          type="number"
                          min="1"
                          value={limits.linkedin}
                          onChange={(e) => handleLimitChange("linkedin", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-limit">Email</Label>
                        <Input
                          id="email-limit"
                          type="number"
                          min="1"
                          value={limits.email}
                          onChange={(e) => handleLimitChange("email", e.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button variant="outline" size="sm" onClick={resetLimits}>
                          Reset to Defaults
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-instructions">Custom Instructions</Label>
                    <Textarea
                      id="custom-instructions"
                      placeholder="Add specific instructions (e.g., include specific keywords, focus on certain aspects)"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      className="resize-none"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || isOverLimit || !content.trim() || !hasSelectedPlatform || !isSignedIn}
                  className="w-full py-6 text-lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating with {selectedModelProvider === "openai" ? "GPT-4o" : "Claude"}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate with {selectedModelProvider === "openai" ? "GPT-4o" : "Claude"}
                    </>
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-md p-4">
              <p className="font-medium mb-1">AI Model Information</p>
              <p className="text-sm mb-2">
                {selectedModelProvider === "openai" 
                  ? "OpenAI's GPT-4o is excellent at following specific instructions with high accuracy and consistency."
                  : "Anthropic's Claude Haiku is a fast, efficient model that balances speed and quality for quick content generation."}
              </p>
              <p className="text-xs text-muted-foreground">You can change the model in the advanced options.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {generatedPlatforms.length > 0 && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Generated Content</CardTitle>
              <CardDescription>Platform-optimized versions of your content</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 mb-4">
                  {selectedPlatforms.twitter && outputs.twitter && <TabsTrigger value="twitter">X</TabsTrigger>}
                  {selectedPlatforms.instagram && outputs.instagram && (
                    <TabsTrigger value="instagram">Instagram</TabsTrigger>
                  )}
                  {selectedPlatforms.linkedin && outputs.linkedin && <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>}
                  {selectedPlatforms.email && outputs.email && <TabsTrigger value="email">Email</TabsTrigger>}
                </TabsList>

                {selectedPlatforms.twitter && outputs.twitter && (
                  <TabsContent value="twitter">
                    <OutputCard 
                      title={`X Post (${limits.twitter} char limit)`} 
                      content={outputs.twitter} 
                      maxLength={limits.twitter} 
                    />
                  </TabsContent>
                )}

                {selectedPlatforms.instagram && outputs.instagram && (
                  <TabsContent value="instagram">
                    <OutputCard 
                      title={`Instagram Caption (${limits.instagram} char limit)`} 
                      content={outputs.instagram} 
                      maxLength={limits.instagram} 
                    />
                  </TabsContent>
                )}

                {selectedPlatforms.linkedin && outputs.linkedin && (
                  <TabsContent value="linkedin">
                    <OutputCard 
                      title={`LinkedIn Post (${limits.linkedin} char limit)`} 
                      content={outputs.linkedin} 
                      maxLength={limits.linkedin} 
                    />
                  </TabsContent>
                )}

                {selectedPlatforms.email && outputs.email && (
                  <TabsContent value="email">
                    <OutputCard 
                      title={`Email Snippet (${limits.email} char limit)`} 
                      content={outputs.email} 
                      maxLength={limits.email} 
                    />
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </GenerationContext.Provider>
  );
}