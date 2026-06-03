# Module PRDs — AI Search Visibility Platform
### Product Codename: **Rankfire**
**Version:** 1.0.0

---

## Module Index

| # | Module | Priority | Status |
|---|---|---|---|
| M01 | Auth & Onboarding | P0 | Required for launch |
| M02 | Sitemap Crawler & Page Analyzer | P0 | Required for launch |
| M03 | AI Prompt Monitoring | P0 | Required for launch |
| M04 | Citation Analyzer | P0 | Required for launch |
| M05 | Gap Detection Engine | P0 | Required for launch |
| M06 | GSC Integration | P0 | Required for launch |
| M07 | Content Brief Generator | P0 | Required for launch |
| M08 | Article Generator & CMS Push | P1 | Post-MVP sprint |
| M09 | GA4 AI Referral Tracker | P1 | Post-MVP sprint |
| M10 | Cloudflare Bot Analytics | P1 | Post-MVP sprint |
| M11 | Competitor Benchmarking | P1 | Post-MVP sprint |
| M12 | Visibility Dashboard | P0 | Required for launch |
| M13 | Subscription & Billing | P0 | Required for launch |
| M14 | Spark AI Agent (MCP) | P2 | Enterprise feature |
| M15 | Weekly Digest & Alerts | P1 | Post-MVP sprint |

---

## M01 — Auth & Onboarding Module

### Overview
Handles user registration, login, and the 5-step onboarding wizard that collects a domain and optional integrations, then fires all initial analysis jobs.

### User Stories
- As a new user, I can sign up with email/password or Google OAuth
- As a new user, I am guided through a 5-step wizard after signup
- As a new user, I can enter my website domain and the platform starts analyzing it immediately
- As a new user, I can connect GSC, GA4, and Cloudflare (all optional, skippable)
- As a new user, I can input up to 3 competitor domains
- As a new user, I arrive at a pre-populated dashboard within 15 minutes of signup

### Screens

#### Screen 1: Login / Signup
- Email + password form
- "Continue with Google" button
- Link to Terms + Privacy
- On submit: Clerk auth → create account record → redirect to onboarding

#### Screen 2: Onboarding Wizard
```
Step 1/5 — Your Website
  [ Enter your domain ]   e.g. acme.com
  "We'll crawl your sitemap and analyze your content."
  [Continue]

Step 2/5 — Google Search Console (optional)
  [Connect Google Search Console] → OAuth popup
  [Skip for now]

Step 3/5 — Google Analytics 4 (optional)
  [Connect GA4] → OAuth popup
  [Skip for now]

Step 4/5 — Cloudflare (optional)
  [Enter Cloudflare API Token] → input
  Zone Tag (auto-detected from domain)
  [Skip for now]

Step 5/5 — Your Competitors (optional)
  [Add competitor domain] → up to 3 inputs
  [Skip for now]

Final: "We're analyzing your site..."
  → Shows progress: Crawling sitemap... Analyzing content... Generating prompts...
  → Redirects to dashboard when 80% complete
```

### Business Rules
- Domain must be valid (DNS resolves + responds to HTTP)
- Each account gets one site on Starter/Growth; unlimited on Enterprise
- Onboarding can be resumed if abandoned mid-way (saved in DB)
- If sitemap.xml not found, fall back to crawling homepage + nav links
- Trial period: 14 days free on Growth plan; credit card required to continue

### Technical Implementation
```typescript
// Onboarding state machine
type OnboardingStep = 'domain' | 'gsc' | 'ga4' | 'cloudflare' | 'competitors' | 'complete'

interface OnboardingState {
  accountId: string
  currentStep: OnboardingStep
  domain?: string
  gscConnected: boolean
  ga4Connected: boolean
  cfConnected: boolean
  competitors: string[]
  completedAt?: Date
}

// On domain submission:
async function initializeSite(accountId: string, domain: string) {
  const site = await db.sites.create({ accountId, domain, status: 'initializing' })
  
  // Fire job chain
  await sitemapQueue.add('CRAWL_SITEMAP', { siteId: site.id, domain })
  // Subsequent jobs are enqueued by each previous job on completion
  
  return site
}
```

### Acceptance Criteria
- [ ] User can sign up and reach onboarding in < 60 seconds
- [ ] Domain validation shows clear error for invalid domains
- [ ] Sitemap crawl starts within 5 seconds of domain submission
- [ ] Onboarding progress is saved; user can refresh and continue
- [ ] Dashboard shows "analyzing" state with progress percentage
- [ ] First insights appear within 15 minutes of domain submission

---

## M02 — Sitemap Crawler & Page Analyzer

### Overview
Fetches a site's sitemap.xml, discovers all URLs, crawls each page, and extracts structured content for topic analysis and subsequent AI prompt generation.

### User Stories
- As the system, I can parse sitemap.xml (including nested sitemaps) and discover all page URLs
- As the system, I can fetch each page and extract structured content
- As the system, I can identify a page's topic, intent, and keywords
- As a user, I can see all my crawled pages in a "Content" tab
- As a user, I can trigger a re-crawl of specific pages or all pages

### Crawl Pipeline
```
1. Fetch https://{domain}/sitemap.xml
   → If 404: try /sitemap_index.xml, /sitemap/sitemap.xml, robots.txt (Sitemap: directive)
   → If still not found: crawl homepage + extract nav links

2. Parse sitemap XML
   → Handle: sitemap index (multiple sitemaps), sitemap entries
   → Extract: URL, lastmod, changefreq, priority

3. Filter URLs
   → Exclude: *.jpg, *.png, *.pdf, *.css, *.js (non-HTML)
   → Exclude: ?utm_*, /feed/, /wp-admin/ (non-content URLs)
   → Limit: max 500 URLs per initial crawl (paginate beyond)

4. Crawl each URL
   → Fetch with appropriate User-Agent: "Rankfire/1.0 (+https://rankfire.io/bot)"
   → Handle: 301/302 redirects (follow up to 3 hops)
   → Handle: 403/429 (mark page as blocked, notify user)
   → Timeout: 10 seconds per page

5. Extract from HTML
   → Title tag
   → Meta description
   → H1, H2, H3 headings (as array)
   → First 1500 words of body text (cleaned, no HTML)
   → Schema markup (JSON-LD: Article, FAQPage, Product, Organization)
   → Internal links (hrefs to same domain)
   → External links (hrefs to other domains)
   → Word count
   → Page type classification (blog, product, docs, landing, homepage)

6. Store in database
   → pages table: URL, status, crawl_date
   → page_contents table: all extracted fields above
```

### Topic Extraction (LLM Step)
```
Input: All page titles + H1s + first paragraph of each page (batched, max 4000 tokens)

Prompt:
"You are analyzing a website. Based on the following page summaries, identify:
1. The company's primary topics/categories (max 10)
2. The brand's tone of voice (professional/casual/technical/etc.)
3. The target audience
4. The company's main value proposition (1 sentence)
Return JSON only."

Output stored in brand_context table:
{
  "primary_topics": ["email marketing", "marketing automation", "CRM"],
  "tone": "professional but approachable",
  "audience": "B2B marketing teams at SMBs",
  "value_proposition": "All-in-one marketing platform for growing businesses",
  "secondary_topics": ["lead generation", "analytics", "integrations"]
}
```

### Page Content Schema (TypeScript)
```typescript
interface PageContent {
  pageId: string
  siteId: string
  url: string
  title: string
  metaDescription: string | null
  h1: string | null
  headings: { level: number; text: string }[]
  bodyText: string           // First 1500 words, clean text
  wordCount: number
  pageType: 'blog' | 'product' | 'docs' | 'landing' | 'homepage' | 'other'
  schemaMarkup: Record<string, unknown>[]
  internalLinks: string[]
  externalLinks: string[]
  crawledAt: Date
  httpStatus: number
}
```

### Error Handling
| Error | Action |
|---|---|
| sitemap.xml not found | Fall back to homepage crawl + nav link discovery |
| Page returns 403 | Mark as blocked; suggest adding Rankfire bot to robots.txt allowlist |
| Page returns 404 | Mark as 404; surface in "Crawl Issues" UI |
| Page times out | Retry once after 30s; mark as failed after 2nd timeout |
| Sitemap > 500 URLs | Crawl first 500 by priority/lastmod; queue rest for background |
| Robots.txt blocks crawler | Respect robots.txt; show user which pages are blocked |

### Acceptance Criteria
- [ ] Sitemap parsed within 30 seconds of job creation
- [ ] Each page crawled and content extracted within 5 seconds
- [ ] Topic extraction runs after all pages crawled
- [ ] Topics stored and available for prompt generation
- [ ] User can view all crawled pages in dashboard with status
- [ ] Crawl errors surfaced with actionable explanations
- [ ] Re-crawl of all pages available on demand

---

## M03 — AI Prompt Monitoring

### Overview
The core module. Runs a set of industry-relevant prompts against multiple AI models on a schedule, captures the full answer and source citations, and tracks visibility metrics over time.

### User Stories
- As a user, I can see all tracked prompts and their current visibility scores
- As a user, I can see which AI models mention my brand for each prompt
- As a user, I can add custom prompts manually
- As a user, I can see trends in my visibility over the last 30/60/90 days
- As a user, I can see the full AI-generated answer for any prompt
- As a user, I can run a manual prompt update at any time
- As the system, I run all prompts on a daily schedule automatically

### Prompt Auto-Generation Algorithm
```
Inputs:
  - brand_context.primary_topics (e.g. ["email marketing", "CRM"])
  - brand_context.audience (e.g. "SMB marketing teams")
  - gsc_data.top_queries (if GSC connected)
  - competitor domains (for competitive prompts)

Generation logic:
  For each primary topic, generate 5 prompt templates:
    1. "What is the best [topic] tool for [audience]?"
    2. "How do I [common task in topic]?"
    3. "What are the top [topic] platforms in 2026?"
    4. "Compare [brand] vs alternatives for [topic]"
    5. "Is [brand] good for [use case]?"

  Additional from GSC queries:
    - Take top 20 GSC queries → rephrase as questions → add to prompt set

  Total target: 50-300 prompts per site

Example output for an email marketing tool:
  - "What is the best email marketing software for small businesses?"
  - "How do I set up automated email drip campaigns?"
  - "What are the top email marketing platforms in 2026?"
  - "Best alternatives to Mailchimp for B2B companies?"
  - "Which email marketing tool has the best automation features?"
  - "How to increase email open rates?"
  - "Best CRM with built-in email marketing?"
```

### Prompt Run Process
```typescript
async function runPrompt(promptId: string, model: AIModel): Promise<AIAnswer> {
  const prompt = await db.prompts.findById(promptId)

  // Check rate limits
  await rateLimiter.acquire(model, accountId)

  // Run against AI model
  const provider = getProvider(model) // OpenAI | Gemini | Perplexity | Claude | Grok
  const raw = await provider.runPrompt(prompt.text, {
    enableWebSearch: true,  // Must use search-enabled mode for citations
    maxTokens: 2000,
  })

  // Parse response
  const answer: AIAnswer = {
    promptId,
    model,
    answerText: raw.text,
    citations: extractCitations(raw),  // Array of { url, title, snippet }
    brandMentioned: checkBrandMention(raw.text, site.domain, site.brandName),
    brandCited: checkBrandCited(raw.citations, site.domain),
    brandPosition: getBrandPosition(raw.text, site.brandName), // 1st|2nd|3rd mention or null
    runAt: new Date(),
  }

  await db.aiAnswers.create(answer)
  await citationAnalysisQueue.add('ANALYZE_CITATIONS', { answerId: answer.id })

  return answer
}
```

### Visibility Metrics Calculated
```typescript
interface VisibilityMetrics {
  // Per prompt
  mentionRate: number          // % of runs where brand mentioned (0-100)
  citationRate: number         // % of runs where brand cited/linked
  avgPosition: number          // Average mention position (1st, 2nd, 3rd etc.)

  // Per model
  byModel: {
    chatgpt: { mentionRate: number; citationRate: number }
    gemini: { mentionRate: number; citationRate: number }
    perplexity: { mentionRate: number; citationRate: number }
    claude: { mentionRate: number; citationRate: number }
    grok: { mentionRate: number; citationRate: number }
  }

  // Overall (account level)
  overallMentionRate: number   // Avg across all prompts and models
  shareOfVoice: number         // Brand mentions / total entity mentions in category
  visibilityScore: number      // Composite 0-100 score (weighted formula)
  weekOverWeekChange: number   // % change from previous period
}
```

### Dashboard Views
```
Prompts Table:
  Columns: Prompt text | Visibility Score | Mentioned in | Citation rate | Trend | Actions
  Filter: by model, by topic, by visibility (high/medium/low/missing)
  Sort: by score, by change, by prompt text

Prompt Detail View (click any prompt):
  - Full prompt text
  - Per-model breakdown (ChatGPT: mentioned ✓, Gemini: not mentioned ✗, etc.)
  - Latest AI answer (full text with citations highlighted)
  - Citation list (URLs cited in this answer)
  - Trend chart (30-day visibility history)
  - Recommended action (if not mentioned → link to Gap/Action module)

Model Comparison View:
  - Side-by-side: ChatGPT vs Gemini vs Perplexity vs Claude vs Grok
  - For each model: overall mention rate, top cited pages, brand position distribution
```

### Acceptance Criteria
- [ ] All prompts run on 24-hour schedule automatically
- [ ] Brand mention detection is accurate (> 95% precision tested against known examples)
- [ ] Citation extraction captures all URLs from AI answer
- [ ] Results appear in dashboard within 2 minutes of job completion
- [ ] Manual "Run now" button works and results appear in < 2 minutes
- [ ] Custom prompts can be added and are included in next scheduled run
- [ ] 30/60/90-day trend data charted correctly
- [ ] Usage tracking (prompts used this month) is accurate

---

## M04 — Citation Analyzer

### Overview
For each AI answer, extracts all cited URLs, classifies them (own domain / competitor / third-party), calculates share of voice, and ranks the most-cited domains and pages in the user's category.

### Citation Extraction Logic
```typescript
function extractCitations(rawAnswer: AIRawAnswer): Citation[] {
  const citations: Citation[] = []

  // Source 1: Explicit citation objects (Perplexity, Claude)
  if (rawAnswer.citations) {
    citations.push(...rawAnswer.citations.map(c => ({
      url: c.url,
      title: c.title || null,
      snippet: c.snippet || null,
      source: 'explicit',
    })))
  }

  // Source 2: Grounding metadata (Gemini)
  if (rawAnswer.groundingMetadata?.groundingChunks) {
    citations.push(...rawAnswer.groundingMetadata.groundingChunks
      .filter(c => c.web)
      .map(c => ({ url: c.web.uri, title: c.web.title, source: 'grounding' })))
  }

  // Source 3: URLs in answer text (all models)
  const urlRegex = /https?:\/\/[^\s\)\"\']+/g
  const textUrls = rawAnswer.text.match(urlRegex) || []
  citations.push(...textUrls.map(url => ({ url, source: 'text' })))

  // Deduplicate by URL
  return deduplicateByUrl(citations)
}

function classifyCitation(url: string, ownDomain: string, competitors: string[]): CitationType {
  const domain = extractDomain(url)
  if (domain === ownDomain) return 'own'
  if (competitors.includes(domain)) return 'competitor'
  return 'third_party'
}
```

### Metrics Generated
```typescript
interface CitationMetrics {
  // Top cited domains (across all prompts for this site)
  topDomains: {
    domain: string
    citationCount: number
    type: 'own' | 'competitor' | 'third_party'
    promptsWhereCited: number
    avgPositionInAnswer: number
  }[]

  // Own pages most cited by AI
  ownPagesCited: {
    url: string
    title: string
    citationCount: number
    modelsWhereCited: AIModel[]
    promptsWhereCited: string[]
  }[]

  // Own pages NEVER cited (but should be based on topic)
  ownPagesNeverCited: {
    url: string
    title: string
    topic: string
    relevantPrompts: string[]  // Prompts where this page should be cited
    whyNotCited?: string       // LLM analysis of why it's not getting cited
  }[]

  // Share of voice vs competitors
  shareOfVoice: {
    own: number           // e.g. 15%
    competitors: {
      domain: string
      share: number       // e.g. 40%
    }[]
    other: number         // e.g. 45%
  }
}
```

### UI — Citation Map Screen
```
Citation Map:
  Top section: Share of voice donut chart (own vs competitors vs others)
  
  Left column: "Most cited domains in your category"
    → Ranked list with citation count + type badge (Own/Competitor/3rd party)
  
  Right column: "Your pages getting cited"
    → List of own URLs being cited with count + models
    → "Not yet cited" section (pages that should be cited but aren't)
  
  Bottom: "Who's beating you and why"
    → For each competitor: their most-cited pages, citation count, why AI prefers them
    → Link: "Generate content to compete with [competitor page]"
```

### Acceptance Criteria
- [ ] All citation URLs extracted from all 5 AI model response formats
- [ ] Domain classification (own/competitor/3rd party) is 100% accurate
- [ ] Share of voice calculated correctly and shown as chart
- [ ] Own pages never cited are surfaced with actionable explanation
- [ ] Competitor citation data updates with every prompt run

---

## M05 — Gap Detection Engine

### Overview
Identifies topics and prompts where competitors are being cited by AI models but the user's brand is not. Each gap becomes an actionable opportunity with a priority score.

### Gap Detection Algorithm
```typescript
interface Gap {
  gapId: string
  topic: string
  relevantPrompts: string[]        // Which tracked prompts reveal this gap
  competitorsCited: string[]       // Which competitors get cited instead
  gapScore: number                 // Priority 0-100 (higher = bigger opportunity)
  estimatedSearchVolume?: number   // From GSC data if available
  contentExists: boolean           // Does own site have content on this topic?
  contentUrl?: string              // URL of own content (if exists but not cited)
  recommendedAction: 'create' | 'improve' | 'earn_media' | 'ugc'
}

async function detectGaps(siteId: string): Promise<Gap[]> {
  // 1. Find all prompts where brand NOT mentioned but competitor IS mentioned
  const missedPrompts = await db.query(`
    SELECT p.id, p.text, p.topic,
           array_agg(DISTINCT a.model) as missing_from_models,
           array_agg(DISTINCT c.domain) FILTER (WHERE c.type = 'competitor') as competitor_domains
    FROM prompts p
    JOIN ai_answers a ON a.prompt_id = p.id
    JOIN citations c ON c.answer_id = a.id
    WHERE p.site_id = $1
      AND a.brand_mentioned = false
      AND EXISTS (
        SELECT 1 FROM citations c2
        WHERE c2.answer_id = a.id AND c2.type = 'competitor'
      )
    GROUP BY p.id, p.text, p.topic
    ORDER BY count(*) DESC
  `, [siteId])

  // 2. Cluster missed prompts by topic
  const topicClusters = clusterByTopic(missedPrompts)

  // 3. For each topic cluster, check if own content exists
  const gaps: Gap[] = []
  for (const cluster of topicClusters) {
    const hasContent = await checkContentExists(siteId, cluster.topic)
    const gapScore = calculateGapScore(cluster)

    gaps.push({
      topic: cluster.topic,
      relevantPrompts: cluster.promptIds,
      competitorsCited: cluster.competitorDomains,
      gapScore,
      contentExists: hasContent,
      recommendedAction: hasContent ? 'improve' : 'create',
    })
  }

  return gaps.sort((a, b) => b.gapScore - a.gapScore)
}

function calculateGapScore(cluster: TopicCluster): number {
  // Weights:
  // - Number of prompts in cluster: 30%
  // - Number of models where gap exists: 25%
  // - Competitor citation count: 25%
  // - GSC search volume (if available): 20%
  const promptScore = Math.min(cluster.promptCount / 10, 1) * 30
  const modelScore = (cluster.models.length / 5) * 25
  const competitorScore = Math.min(cluster.competitorCount / 3, 1) * 25
  const volumeScore = cluster.searchVolume ? Math.min(cluster.searchVolume / 10000, 1) * 20 : 10

  return Math.round(promptScore + modelScore + competitorScore + volumeScore)
}
```

### UI — Gap Analysis Screen
```
Gap Analysis:
  Header: "X opportunities found — Topics where competitors rank in AI answers but you don't"

  Gap Cards (sorted by priority score):
  ┌─────────────────────────────────────────────────────┐
  │ 🔴 HIGH PRIORITY                Score: 87/100       │
  │ Topic: "Email marketing for e-commerce"             │
  │                                                     │
  │ Competitors cited: Klaviyo, Mailchimp               │
  │ Affecting: 12 tracked prompts                       │
  │ Missing from: ChatGPT, Gemini, Perplexity           │
  │ You have content: No                                │
  │                                                     │
  │ [Create Content] [View Prompts] [View Competitors]  │
  └─────────────────────────────────────────────────────┘
  
  Filter by: priority (high/medium/low) | action type | model
```

### Acceptance Criteria
- [ ] Gaps detected within 5 minutes of each prompt run completing
- [ ] Gap score algorithm produces meaningful prioritization (tested against manual review)
- [ ] Gaps link directly to the prompts and citations that generated them
- [ ] Recommended action is accurate (create vs improve vs earn media)
- [ ] User can dismiss/snooze gaps they don't want to act on

---

## M06 — GSC Integration

### Overview
Connects to Google Search Console via OAuth, imports top organic queries per page, and uses this data to inform prompt generation and gap prioritization.

### OAuth Flow
```
User clicks "Connect Google Search Console"
  → Redirect to Google OAuth consent screen
  → Scopes: https://www.googleapis.com/auth/webmasters.readonly
  → On approval: receive authorization code
  → Exchange code for access_token + refresh_token
  → Store refresh_token encrypted in integrations table
  → Fetch available properties → let user select correct one
  → Store selected property URL
```

### Data Import
```typescript
// Imported on connection + refreshed daily
interface GSCPageData {
  pageUrl: string
  topQueries: {
    query: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }[]
}

async function importGSCData(siteId: string): Promise<void> {
  const tokens = await getIntegrationTokens(siteId, 'gsc')
  const client = createGSCClient(tokens)

  // Fetch last 90 days of data
  const rows = await client.searchanalytics.query({
    siteUrl: site.gscProperty,
    startDate: '90daysAgo',
    endDate: 'today',
    dimensions: ['page', 'query'],
    rowLimit: 5000,
  })

  // Store in gsc_data table
  // Use top queries as additional seeds for prompt generation
  await updatePromptSeeds(siteId, rows)
}
```

### Usage in Prompt Generation
- Top 20 GSC queries (by impressions) → rephrased as questions → added to prompt set
- GSC search volume → used as weight in gap scoring algorithm
- GSC top pages → mapped to citation data → identify pages with traffic but no AI citation

### Acceptance Criteria
- [ ] OAuth flow works with Google's consent screen
- [ ] Correct property is selected (show list if multiple)
- [ ] Top 20 queries per top 50 pages imported
- [ ] GSC data used in prompt generation (observable in prompt set)
- [ ] Disconnect flow clears tokens from database

---

## M07 — Content Brief Generator

### Overview
For each detected content gap, generates a detailed content brief that tells the user exactly what article to write to get cited by AI models.

### Brief Generation Pipeline
```typescript
async function generateBrief(gapId: string): Promise<ContentBrief> {
  const gap = await db.gaps.findById(gapId)
  const brandContext = await db.brandContext.findBySite(gap.siteId)

  // Step 1: Research top-cited content in this topic
  const topCited = await researchTopCitedContent(gap.topic)
  // Uses Perplexity or web search to find what gets cited

  // Step 2: Analyze top-cited content structure
  const analysis = await analyzeTopContent(topCited)
  // LLM: "What makes these articles get cited? Key claims, structures, data points?"

  // Step 3: Generate brief
  const briefPrompt = `
    You are an expert content strategist for a company with these characteristics:
    ${JSON.stringify(brandContext)}

    Topic: "${gap.topic}"
    Target prompts (what AI users are asking):
    ${gap.relevantPrompts.join('\n')}

    Top cited competitors on this topic:
    ${topCited.map(c => `- ${c.domain}: "${c.title}" — ${c.summary}`).join('\n')}

    Generate a detailed content brief that will help this brand get cited by AI models.
    Include:
    1. Recommended title (AI-citation optimized)
    2. Target audience
    3. Key argument/unique angle
    4. Exact H2/H3 outline
    5. Must-include data points, statistics, or studies to cite
    6. Must-include claims competitors are making (to match or counter)
    7. Schema markup recommendations (FAQPage, HowTo, Article)
    8. Internal links to suggest
    9. Estimated word count
    10. AEO optimization tips specific to this topic

    Return as structured JSON.
  `

  const brief = await llm.generate(briefPrompt)
  await db.contentBriefs.create({ gapId, ...brief })

  return brief
}
```

### Brief Output Format
```typescript
interface ContentBrief {
  briefId: string
  gapId: string
  topic: string
  recommendedTitle: string
  targetAudience: string
  uniqueAngle: string
  outline: {
    h2: string
    h3s: string[]
    keyPoints: string[]
  }[]
  mustIncludeData: string[]       // Specific stats/studies to cite
  mustIncludeClaims: string[]     // Claims to make or counter
  schemaRecommendations: string[] // FAQPage, HowTo, etc.
  internalLinksToAdd: string[]    // Own site URLs to link to
  estimatedWordCount: number
  aeoTips: string[]               // "Include an FAQ section", "Use numbered lists", etc.
  estimatedImpact: 'high' | 'medium' | 'low'
  createdAt: Date
}
```

### UI — Brief Card
```
Content Brief: "Email Marketing for E-commerce Brands"
Priority: High | Estimated Impact: High

📋 Recommended Title:
   "Email Marketing for E-commerce: The Complete 2026 Guide"

🎯 Unique Angle:
   Position around revenue attribution — most guides talk about open rates,
   but AI models cite guides that quantify revenue impact.

📝 Outline:
   H2: What Makes E-commerce Email Marketing Different
     H3: Average order value vs click-through rate
     H3: Segmentation strategies unique to DTC
   H2: The 7 Email Flows Every E-commerce Brand Needs
     ...

📊 Must-Include Data:
   • "Email drives 40% of e-commerce revenue for top DTC brands (Klaviyo, 2025)"
   • "Welcome series generates 51% of email-driven revenue"

🔧 Schema Markup:
   • Add FAQPage schema with 5 Q&A pairs
   • HowTo schema for the "setup" sections

💡 AEO Tips:
   • Include a comparison table (AI models love structured data)
   • Answer "What is the best email marketing software for e-commerce?" directly

[Generate Article from Brief →]  [Download as PDF]
```

### Acceptance Criteria
- [ ] Brief generated within 60 seconds of request
- [ ] Brief includes all 10 required fields
- [ ] Brief is brand-aware (matches tone and audience in brand_context)
- [ ] Outline is specific enough to write from (not generic)
- [ ] AEO tips are specific to the topic (not copy-paste generic advice)
- [ ] Brief can be downloaded as PDF or Markdown

---

## M08 — Article Generator & CMS Push

### Overview
Takes an approved content brief and generates a full, publish-ready article optimized for AI citation, then publishes it as a draft to the user's Webflow or Framer CMS.

### Article Generation Pipeline (Multi-Step)
```typescript
async function generateArticle(briefId: string): Promise<ContentPiece> {
  const brief = await db.contentBriefs.findById(briefId)
  const brandContext = await db.brandContext.findBySite(brief.siteId)

  // Step 1: Research (Web search for cited stats and data)
  const research = await webSearch(brief.mustIncludeData.join('; '))

  // Step 2: Generate article section by section
  const sections: string[] = []
  for (const heading of brief.outline) {
    const sectionPrompt = buildSectionPrompt(heading, research, brandContext)
    const section = await llm.generate(sectionPrompt)
    sections.push(section)
  }

  // Step 3: Assemble + SEO pass
  const draft = assembleDraft(brief, sections)
  const seoOptimized = await seoPass(draft, brief)

  // Step 4: AEO optimization pass
  const aeoOptimized = await aeoPass(seoOptimized, brief)
  // - Add FAQ section with direct question-answer pairs
  // - Ensure key claims are in dedicated callout blocks
  // - Add schema markup recommendations as HTML comments

  // Step 5: Store
  const piece = await db.contentPieces.create({
    briefId,
    siteId: brief.siteId,
    title: brief.recommendedTitle,
    htmlContent: aeoOptimized,
    wordCount: countWords(aeoOptimized),
    status: 'draft',
  })

  return piece
}
```

### CMS Integration — Webflow
```typescript
async function publishToWebflow(pieceId: string, collectionId: string): Promise<string> {
  const piece = await db.contentPieces.findById(pieceId)
  const tokens = await getIntegrationTokens(piece.siteId, 'webflow')

  const response = await fetch(
    `https://api.webflow.com/v2/collections/${collectionId}/items`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fieldData: {
          name: piece.title,
          slug: slugify(piece.title),
          'post-body': piece.htmlContent,
          'meta-title': piece.seoTitle,
          'meta-description': piece.seoDescription,
          _draft: true,  // Always create as draft for human review
        }
      })
    }
  )

  const data = await response.json()
  const webflowItemId = data.id
  const webflowEditorUrl = `https://webflow.com/design/${site.webflowSiteId}#page=${webflowItemId}`

  await db.contentPieces.update(pieceId, {
    publishedToCMS: true,
    cmsItemId: webflowItemId,
    cmsEditorUrl: webflowEditorUrl,
    status: 'published_draft',
  })

  return webflowEditorUrl
}
```

### Acceptance Criteria
- [ ] Article generation completes within 3 minutes
- [ ] Generated article matches brand tone (tested by user feedback)
- [ ] Article includes all must-include data points from brief
- [ ] FAQ schema markup is included in HTML
- [ ] Webflow/Framer publish creates a draft (not live) item
- [ ] Editor URL returned so user can review in CMS before publishing
- [ ] Article stored in Rankfire for future reference

---

## M09 — GA4 AI Referral Tracker

### Overview
Connects to Google Analytics 4 and surfaces sessions that originated from AI platforms (chatgpt.com, perplexity.ai, claude.ai, etc.) including landing pages, engagement, and conversion data.

### AI Referral Sources Tracked
```typescript
const AI_REFERRAL_SOURCES = [
  'chatgpt.com',
  'chat.openai.com',
  'perplexity.ai',
  'claude.ai',
  'gemini.google.com',
  'bard.google.com',
  'you.com',
  'phind.com',
  'copilot.microsoft.com',
  'bing.com',  // AI-mode traffic
]
```

### Data Fetched
```typescript
interface AIReferralData {
  source: string           // chatgpt.com
  sessions: number
  engagedSessions: number
  engagementRate: number   // %
  keyEvents: number        // Conversions
  conversionRate: number   // %
  landingPages: {
    page: string
    sessions: number
    engagementRate: number
  }[]
  trend: {
    date: string
    sessions: number
  }[]
}
```

### Dashboard View
```
AI Referrals:
  Total AI referral sessions this month: 1,247 (+34% vs last month)
  Conversion rate from AI: 2.1% (vs 0.7% from paid search)

  By Source:
  ChatGPT.com      ████████ 847 sessions  1.8% CVR
  Perplexity.ai    ████     312 sessions  3.2% CVR
  Claude.ai        ██       88 sessions   2.4% CVR

  Top Landing Pages from AI:
  /blog/email-marketing-guide    → 312 sessions, 2.8% CVR
  /features/automation           → 198 sessions, 1.4% CVR
  /pricing                       → 156 sessions, 4.2% CVR (high intent!)
```

---

## M10 — Cloudflare Bot Analytics

### Overview
Connects to Cloudflare's GraphQL Analytics API to track AI bot activity on the user's domain — distinguishing training crawlers, search crawlers, and live user-fetchers.

### Bot Classification
```typescript
const BOT_CLASSIFICATION = {
  training_crawlers: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot'],
  search_crawlers:   ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'Googlebot'],
  user_fetchers:     ['ChatGPT-User', 'Claude-User', 'Perplexity-User'],
}

// User-fetchers are the strongest signal: a real human asked the AI to inspect this page
```

### Dashboard View
```
AI Bot Activity (last 30 days):
  
  Search Crawlers (indexing for citations):
  OAI-SearchBot      ████████ 2,847 requests across 312 unique pages
  PerplexityBot      ████     1,104 requests across 198 unique pages
  Claude-SearchBot   ██        438 requests across 87 unique pages

  Live User Fetchers (strongest signal — real users asking AI about your content):
  ChatGPT-User       ████     847 requests  ← "Users are asking ChatGPT to read your pages"
  Claude-User        ██       234 requests

  Training Crawlers (lower signal):
  GPTBot             ████████████ 5,102 requests

  Top Pages Touched by AI Search Crawlers:
  /blog/email-marketing-guide    → 1,247 crawler hits (mostly OAI-SearchBot)
  /features/automation           → 892 crawler hits
  /pricing                       → 234 crawler hits (interesting!)

  💡 Insight: /blog/email-marketing-guide is being heavily indexed by AI search
     crawlers but isn't being cited in tracked prompts. Consider updating it.
```

---

## M12 — Visibility Dashboard

### Overview
The main dashboard surface that aggregates all visibility metrics into clear KPI cards, trend charts, and the primary navigation hub.

### KPI Cards (Overview)
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ AI Visibility   │ Citation Rate   │ Share of Voice  │ AI Referrals    │
│ Score           │                 │                 │ This Month      │
│                 │                 │                 │                 │
│    72/100       │    34%          │    18%          │    1,247        │
│    ↑ +5 pts     │    ↑ +4%        │    ↑ +2%        │    ↑ +34%       │
│    vs last week │    vs last week │    vs last week │    vs last mo   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Main Chart
- Visibility Score trend (line chart) — 30/60/90 day options
- Overlaid: competitors' visibility scores (if competitor tracking enabled)

### Quick Actions Panel
```
Recommended Actions (3 most impactful):
  1. 🔴 HIGH: Create content for "Email marketing for e-commerce" 
             (competitors cited 47 times, you: 0) → [Create Brief]
  2. 🟡 MED: Improve /blog/crm-guide — cited but in position 4+ 
             → [Improve Content]
  3. 🟢 NEW: 12 new prompts added to your monitoring this week
             → [Review Prompts]
```

---

## M13 — Subscription & Billing

### Plans & Usage Limits
```typescript
const PLANS = {
  starter: {
    stripeId: 'price_starter_monthly',
    price: 99,
    limits: {
      promptsPerMonth: 50,
      articlesPerMonth: 0,
      aiModels: ['chatgpt', 'gemini'],
      competitors: 1,
      sites: 1,
      seats: 1,
    }
  },
  growth: {
    stripeId: 'price_growth_monthly',
    price: 299,
    limits: {
      promptsPerMonth: 150,
      articlesPerMonth: 4,
      aiModels: ['chatgpt', 'gemini', 'perplexity'],
      competitors: 2,
      sites: 1,
      seats: 3,
    }
  },
  pro: {
    stripeId: 'price_pro_monthly',
    price: 599,
    limits: {
      promptsPerMonth: 300,
      articlesPerMonth: 8,
      aiModels: ['chatgpt', 'gemini', 'perplexity', 'claude', 'grok'],
      competitors: 3,
      sites: 3,
      seats: 5,
    }
  }
}
```

### Usage Tracking
```typescript
// Track usage atomically (Redis first, sync to PostgreSQL every hour)
async function trackUsage(accountId: string, type: UsageType, amount: number = 1) {
  const key = `usage:${accountId}:${type}:${getCurrentPeriod()}`
  await redis.incrby(key, amount)
  await redis.expireat(key, getEndOfCurrentPeriod())
}

async function checkLimit(accountId: string, type: UsageType): Promise<boolean> {
  const used = await redis.get(`usage:${accountId}:${type}:${getCurrentPeriod()}`)
  const plan = await getAccountPlan(accountId)
  const limit = PLANS[plan].limits[type]
  return parseInt(used || '0') < limit
}
```

---

## M14 — Spark AI Agent (MCP Server)

### Overview
An MCP (Model Context Protocol) server that allows Claude, ChatGPT, and other AI assistants to access the user's Rankfire data directly — enabling natural language queries like "What's my AI visibility score this week?" or "Generate a brief for my biggest gap."

### MCP Tools Exposed
```typescript
const MCP_TOOLS = [
  {
    name: 'get_visibility_summary',
    description: 'Get the current AI visibility score, mention rate, and citation rate',
    inputSchema: { properties: { dateRange: { type: 'string' } } }
  },
  {
    name: 'list_top_gaps',
    description: 'List the top content gaps where competitors are cited but the brand is not',
    inputSchema: { properties: { limit: { type: 'number' } } }
  },
  {
    name: 'get_prompt_results',
    description: 'Get results for tracked prompts, filtered by model or topic',
    inputSchema: { properties: { model: { type: 'string' }, topic: { type: 'string' } } }
  },
  {
    name: 'generate_content_brief',
    description: 'Generate a content brief for a specific gap or topic',
    inputSchema: { properties: { gapId: { type: 'string' }, topic: { type: 'string' } } }
  },
  {
    name: 'get_ai_referral_traffic',
    description: 'Get AI referral traffic data from GA4',
    inputSchema: { properties: { source: { type: 'string' } } }
  },
]
```

---

*End of Module PRDs v1.0*
