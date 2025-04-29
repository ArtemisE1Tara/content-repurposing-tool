# Content Repurposing Tool - Function Documentation

This document provides a comprehensive overview of all functions in the Content Repurposing Tool, their purpose, parameters, and usage.

## Table of Contents

- [Server-Side Functions](#server-side-functions)
  - [Content Generation](#content-generation)
  - [Authentication & User Management](#authentication--user-management)
  - [Database Operations](#database-operations)
  - [API Routes](#api-routes)
- [Component Functions](#component-functions)
  - [Main UI Components](#main-ui-components)
  - [History Management](#history-management)
  - [Rendering & Display](#rendering--display)
- [Utility Functions](#utility-functions)

## Server-Side Functions

### Content Generation

#### `fetchArticleContent(url: string): Promise<string>`
**Location**: `lib/generate-content.tsx`

**Purpose**: Extracts content from a provided URL using article-extractor and cleans it for processing.

**Parameters**:
- `url`: The web URL to extract content from

**Returns**: A formatted string containing the title, summary, and main content of the article.

**Usage**:
```tsx
const articleContent = await fetchArticleContent("https://example.com/article");
```

**Process**:
1. Validates the URL format
2. Uses article-extractor to fetch and extract content
3. Cleans HTML and normalizes text
4. Creates a structured output with title, summary, and content sections

---

#### `generateContent(content, platforms, tone, customInstructions, limits?, useEmojis?): Promise<Record<string, string>>`
**Location**: `lib/generate-content.tsx`

**Purpose**: Generates platform-specific content using OpenAI API based on input content and parameters.

**Parameters**:
- `content`: The input text to repurpose
- `platforms`: Object specifying which platforms to generate for (twitter, instagram, linkedin, email)
- `tone`: The tone to use (professional, casual, humorous, enthusiastic, informative)
- `customInstructions`: Additional instructions for the AI
- `limits?`: Optional character limits for each platform
- `useEmojis?`: Whether to include emojis in generated content

**Returns**: Object with generated content for each selected platform.

**Usage**:
```tsx
const generatedContent = await generateContent(
  articleContent,
  { twitter: true, linkedin: true },
  "professional",
  "",
  { twitter: 280, linkedin: 1000 },
  false
);
```

**Process**:
1. Checks if user has reached generation limit
2. Creates platform-specific prompts based on parameters
3. Calls OpenAI API for each selected platform
4. Tracks generations in the database
5. Returns object with generated content

### Authentication & User Management

#### `getCurrentUser()`
**Location**: `lib/memberships.ts`

**Purpose**: Gets or creates a user record in Supabase based on Clerk authentication.

**Returns**: User record from the database.

**Process**:
1. Gets user ID from Clerk authentication
2. Checks if user exists in Supabase
3. If not, creates user with default subscription tier
4. Returns user record

---

#### `getUserSubscription(): Promise<UserSubscription | null>`
**Location**: `lib/memberships.ts`

**Purpose**: Retrieves user's subscription details including associated tier.

**Returns**: Subscription object with tier information or null.

**Usage**:
```tsx
const subscription = await getUserSubscription();
if (subscription) {
  console.log(`User is on ${subscription.tier.name} plan`);
}
```

---

#### `trackGeneration(platform: string, characterCount: number, content: string)`
**Location**: `lib/memberships.ts`

**Purpose**: Records a content generation in the database with full content and metadata.

**Parameters**:
- `platform`: Platform the content was generated for
- `characterCount`: Length of the generated content
- `content`: Complete generated text

**Returns**: The created database record or null if there was an error.

**Process**:
1. Gets current user
2. Extracts title and snippet from content
3. Inserts record into database with extensive error handling
4. Returns created record or null on error

---

#### `getUserUsageStats()`
**Location**: `lib/memberships.ts`

**Purpose**: Calculates user's usage statistics for the current month.

**Returns**: Object containing generation count, limits, and subscription information.

**Usage**:
```tsx
const stats = await getUserUsageStats();
console.log(`${stats.generationsThisMonth}/${stats.limit} generations used`);
```

### Database Operations

#### `ensureContentColumn()`
**Location**: `lib/memberships.ts`

**Purpose**: Ensures the 'content' column exists in the generations table.

**Returns**: Object with success status and error message if applicable.

**Usage**:
```tsx
const result = await ensureContentColumn();
if (result.success) {
  console.log("Content column is present");
}
```

---

#### `getUserGenerationHistory(limit = 10)`
**Location**: `lib/memberships.ts`

**Purpose**: Retrieves user's generation history ordered by most recent.

**Parameters**:
- `limit`: Maximum number of history items to retrieve (default: 10)

**Returns**: Array of generation records.

**Usage**:
```tsx
const history = await getUserGenerationHistory(15);
```

---

#### `getGenerationById(id: string)`
**Location**: `lib/memberships.ts`

**Purpose**: Retrieves a specific generation record by ID.

**Parameters**:
- `id`: The UUID of the generation to retrieve

**Returns**: The full generation record including content.

**Usage**:
```tsx
const generation = await getGenerationById("123e4567-e89b-12d3-a456-426614174000");
```

---

#### `getSubscriptionTiers()`
**Location**: `lib/memberships.ts`

**Purpose**: Retrieves all available subscription tiers.

**Returns**: Array of subscription tier records.

**Usage**:
```tsx
const tiers = await getSubscriptionTiers();
```

### API Routes

#### `GET /api/db-init`
**Location**: `app/api/db-init/route.ts`

**Purpose**: Initializes the database schema and inserts default subscription tiers.

**Returns**: JSON response with database status.

**Process**:
1. Checks if tables exist
2. Creates tables if needed using SQL
3. Inserts default subscription tiers
4. Returns counts of records in each table

---

#### `GET /api/test-db`
**Location**: `app/api/test-db/route.ts`

**Purpose**: Tests database connectivity and insert functionality.

**Returns**: JSON response with test results.

**Process**:
1. Verifies user authentication
2. Tests database connection
3. Retrieves current user
4. Attempts to insert a test record
5. Returns success/failure details with diagnostics

## Component Functions

### Main UI Components

#### `Main({ onContentGenerated })`
**Location**: `components/content-repurposing-tool.tsx`

**Purpose**: Main component for content generation interface.

**Parameters**:
- `onContentGenerated`: Optional callback function triggered when content is generated

**Key Functions**:
- `handleFetchArticle()`: Fetches and processes content from a URL
- `handleGenerate()`: Processes input and triggers content generation
- `handlePlatformChange()`: Toggles platform selection
- `handleLimitChange()`: Updates character limits for platforms
- `resetLimits()`: Resets limits to defaults

---

#### `UsageDisplay()`
**Location**: `components/usage-display.tsx`

**Purpose**: Displays user subscription usage with progress bar.

**Key Functions**:
- `fetchUsage()`: Retrieves user usage statistics

---

#### `OutputCard({ title, content, maxLength })`
**Location**: `components/output-card.tsx`

**Purpose**: Displays generated content with formatting options.

**Parameters**:
- `title`: Title of the content card
- `content`: Generated content to display
- `maxLength`: Optional maximum character count for display

**Key Functions**:
- `copyToClipboard()`: Copies content to clipboard

### History Management

#### `HistoryList({ collapsed, refreshTrigger })`
**Location**: `components/history-list.tsx`

**Purpose**: Displays list of generation history items.

**Parameters**:
- `collapsed`: Whether sidebar is in collapsed state
- `refreshTrigger`: Number that triggers refresh when changed

**Key Functions**:
- `fetchHistory()`: Retrieves generation history from database

---

#### `HistoryItem({ id, platform, title, snippet, created_at, collapsed })`
**Location**: `components/history-item.tsx`

**Purpose**: Displays individual history item with interactions.

**Parameters**:
- `id`: Generation ID
- `platform`: Platform the content was generated for
- `title`: Title extracted from content
- `snippet`: Short preview of content
- `created_at`: Timestamp
- `collapsed`: Whether sidebar is in collapsed state

**Key Functions**:
- `copyToClipboard()`: Copies snippet to clipboard
- `handleClick()`: Loads full generation and opens modal

---

#### `GenerationModal({ generation, open, onClose })`
**Location**: `components/generation-modal.tsx`

**Purpose**: Modal dialog for viewing full generation content.

**Parameters**:
- `generation`: The full generation record
- `open`: Whether modal is open
- `onClose`: Function to call when closing

**Key Functions**:
- `copyToClipboard()`: Copies full content to clipboard

### Rendering & Display

#### `ThemeProvider({ children })`
**Location**: `components/theme-provider.tsx`

**Purpose**: Provides theme context to application with hydration safety.

**Parameters**:
- `children`: Child components

---

#### `ModeToggle()`
**Location**: `components/mode-toggle.tsx`

**Purpose**: Button and dropdown for switching between light, dark, and system themes.

---

#### `Sidebar({ historyRefreshTrigger })`
**Location**: `components/sidebar.tsx`

**Purpose**: Application sidebar with navigation and history list.

**Parameters**:
- `historyRefreshTrigger`: Number that triggers history refresh when changed

## Utility Functions

#### `isBrowser()`
**Location**: `lib/generate-content.tsx`

**Purpose**: Checks if code is running in browser environment.

**Returns**: Boolean indicating if in browser context.

**Usage**:
```tsx
if (isBrowser()) {
  // Do browser-specific operations
}
```

---

#### `countWords(text: string): number`
**Location**: `lib/utils.ts`

**Purpose**: Counts words in a string.

**Parameters**:
- `text`: The text to count words in

**Returns**: Number of words.

**Usage**:
```tsx
const wordCount = countWords("Hello world");
// Returns 2
```

---

#### `cn(...inputs: ClassValue[]): string`
**Location**: `lib/utils.ts`

**Purpose**: Merges Tailwind CSS classes with proper precedence.

**Parameters**:
- `...inputs`: Class strings or conditional class objects

**Returns**: Merged class string.

**Usage**:
```tsx
const className = cn(
  "base-class",
  condition && "conditional-class",
  { "object-class": true }
);
```
