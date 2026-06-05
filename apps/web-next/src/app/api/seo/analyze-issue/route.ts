import { NextResponse } from "next/server";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeIssueRequest {
  url: string;
  issueId: string;
  currentTitle?: string | null;
  currentMetaDesc?: string | null;
  currentH1?: string | null;
  wordCount?: number | null;
  schemaTypes?: string[];
}

function cleanJsonResponse(rawText: string) {
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n/, "");
    cleaned = cleaned.replace(/\n```$/, "");
  }
  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
}

// High-fidelity programmatic SEO recommendation fallback generator
function generateLocalSeoRecommendation(url: string, issueId: string, currentTitle?: string | null, currentMetaDesc?: string | null, currentH1?: string | null, wordCount?: number | null) {
  let domain = "your website";
  let path = "/";
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname;
    path = urlObj.pathname;
  } catch (e) { /* ignore */ }

  // Extract clean segment names for H1/Titles
  const segments = path.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "";
  const pageTopic = lastSegment
    ? lastSegment.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "Home";

  const siteName = domain.replace("www.", "").split(".")[0].toUpperCase();

  switch (issueId) {
    case "missing-h1s": {
      const suggestedH1 = currentTitle 
        ? currentTitle.split(/[-|]/)[0].trim() 
        : `${pageTopic} - Overview`;
      return {
        recommendation: `Add a single <h1> heading tag at the top of your page content: \n\n# <h1>${suggestedH1}</h1>`,
        explanation: "Every page must have exactly one <h1> tag serving as the main title of the page's body content. This tells search crawlers what the page is about immediately, which is crucial for keyword weighting."
      };
    }

    case "missing-descriptions": {
      const pageTitle = currentTitle || `${pageTopic} | ${siteName}`;
      const suggestedDesc = `Explore ${pageTopic} on ${domain}. Discover high-quality insights, solutions, and standard updates regarding ${pageTopic.toLowerCase()} today.`;
      return {
        recommendation: `Add the following meta tag inside the <head> section of your HTML:\n\n<meta name="description" content="${suggestedDesc}">`,
        explanation: "Meta descriptions determine the text snippet shown under your page title in search engine results. Densely packing natural keywords in 120-160 characters maximizes click-through rates."
      };
    }

    case "missing-schema": {
      let schemaType = "WebPage";
      let additionalFields = "";
      
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes("blog") || lowerUrl.includes("post") || lowerUrl.includes("article")) {
        schemaType = "Article";
        additionalFields = `,\n  "headline": "${currentTitle || pageTopic}",\n  "datePublished": "${new Date().toISOString().split('T')[0]}",\n  "author": {\n    "@type": "Organization",\n    "name": "${siteName}"\n  }`;
      } else if (lowerUrl.includes("faq")) {
        schemaType = "FAQPage";
        additionalFields = `,\n  "mainEntity": [{\n    "@type": "Question",\n    "name": "What is ${pageTopic}?",\n    "acceptedAnswer": {\n      "@type": "Answer",\n      "text": "Find detailed information about ${pageTopic.toLowerCase()} on our page."\n    }\n  }]`;
      } else if (lowerUrl.includes("contact") || lowerUrl.includes("about")) {
        schemaType = "AboutPage";
      }

      const code = `{\n  "@context": "https://schema.org",\n  "@type": "${schemaType}",\n  "name": "${currentTitle || pageTopic}",\n  "url": "${url}"${additionalFields}\n}`;

      return {
        recommendation: schemaType,
        codeSnippet: code,
        explanation: `Structured schema (JSON-LD) translates raw page content into rich search snippets and citation snippets for AI engines (like ChatGPT or Perplexity), boosting visibility and authority.`
      };
    }

    case "thin-content": {
      const topic = currentTitle ? currentTitle.split(/[-|]/)[0].trim() : pageTopic;
      const markdown = `## Proposed Content Expansion Outline for: ${topic}

### 1. Introduction & Overview
- Define ${topic} in clear, simple terms.
- Highlight the target reader persona and main pain points.

### 2. Core Features & Benefits
- Feature 1: Key advantage and real-world utility.
- Feature 2: Step-by-step setup or usage details.

### 3. Actionable Guidelines & Best Practices
- Checklist for successful implementation.
- How to get started on ${domain} today.

### 4. Frequently Asked Questions (FAQ)
- Answer the top 3 questions users search for in this category.`;

      return {
        recommendation: markdown,
        explanation: `Search engines penalize pages with thin content (< 200 words) as they lack sufficient crawlable context and index value. Expanding this page to 500+ words of rich, structured content will help it rank.`
      };
    }

    case "duplicate-titles": {
      return {
        recommendation: `1. "${currentTitle || pageTopic} - Expert Guide for 2026"\n2. "What is ${pageTopic}? Key Benefits and Features"\n3. "Comparing ${pageTopic} Solutions - ${siteName}"`,
        explanation: "Duplicate page titles confuse search indexing bots, forcing your own pages to compete against each other in the search results (keyword cannibalization). Differentiate these titles."
      };
    }

    case "missing-titles": {
      const suggestedTitle = `${currentH1 || pageTopic} | ${siteName}`;
      return {
        recommendation: `<title>${suggestedTitle}</title>`,
        explanation: "The title tag is the single most important on-page SEO metadata element. It acts as the clickable headline in search results and browser tabs."
      };
    }

    case "broken-links": {
      return {
        recommendation: "Redirect this URL to a relevant working page, or restore the missing content.",
        explanation: "Pages returning error codes (like 404 Not Found) degrade overall domain authority, stop indexing bots in their tracks, and lead to lost visitor trust. Set up a 301 Redirect."
      };
    }

    default:
      return {
        recommendation: `Optimize page elements on ${url} to fix issues in category: ${issueId}.`,
        explanation: "Standard SEO best practices indicate optimizing headings, metadata, and structured data is key to rank visibility."
      };
  }
}

export async function POST(req: Request) {
  try {
    const body: AnalyzeIssueRequest = await req.json();
    const { url, issueId, currentTitle, currentMetaDesc, currentH1, wordCount, schemaTypes } = body;

    if (!url || !issueId) {
      return NextResponse.json({ error: "url and issueId are required" }, { status: 400 });
    }

    // Build the issue-specific prompt
    let issuePrompt = "";
    switch (issueId) {
      case "missing-h1s":
        issuePrompt = `The page is missing an <h1> tag.
Page URL: "${url}"
Current Title: "${currentTitle || "N/A"}"
Current Meta Description: "${currentMetaDesc || "N/A"}"

Suggest a single highly-optimized <h1> tag that accurately describes this page and aligns with the URL context. Explain why this <h1> is a good fit.`;
        break;

      case "missing-descriptions":
        issuePrompt = `The page is missing an SEO meta description.
Page URL: "${url}"
Current Title: "${currentTitle || "N/A"}"
Current <h1>: "${currentH1 || "N/A"}"

Suggest a professional meta description between 120 and 160 characters. It must include natural keywords and be action-oriented. Provide a short explanation of its SEO value.`;
        break;

      case "missing-schema":
        issuePrompt = `The page lacks structured JSON-LD schema markup.
Page URL: "${url}"
Current Title: "${currentTitle || "N/A"}"
Current Description: "${currentMetaDesc || "N/A"}"

Generate a valid, fully populated JSON-LD schema markup block (e.g. WebPage, Article, FAQPage, or Organization) that fits this page. Provide the schema type in the 'recommendation' field, the complete JSON-LD markup string in 'codeSnippet', and a brief explanation of the schema's benefits in 'explanation'.`;
        break;

      case "thin-content":
        issuePrompt = `The page has thin content (${wordCount || 0} words), which is under the recommended 200-word limit.
Page URL: "${url}"
Current Title: "${currentTitle || "N/A"}"
Current <h1>: "${currentH1 || "N/A"}"

Suggest a detailed content expansion outline in markdown format in the 'recommendation' field (listing suggested H2/H3 headings and bullet points of what to cover under each heading to expand the page to 500+ words). Explain why thin content penalizes search rankings.`;
        break;

      case "duplicate-titles":
        issuePrompt = `The page has a duplicate title ("${currentTitle || ""}") that competes with other pages on the site.
Page URL: "${url}"

Suggest 3 unique, differentiated alternative titles for this page to separate its ranking intent. Provide a brief explanation of how the content should be differentiated.`;
        break;

      case "missing-titles":
        issuePrompt = `The page is missing a title tag.
Page URL: "${url}"
Current <h1>: "${currentH1 || "N/A"}"

Suggest an optimized SEO title between 50-60 characters. Provide a short explanation of why it fits the page.`;
        break;

      case "broken-links":
        issuePrompt = `The page returned a broken or failed status code.
Page URL: "${url}"
Current Status: "${currentTitle || "Broken (Non-200)"}"

Provide a clear recommended action (e.g., set up a 301 redirect, restore the resource, or fix internal links) and a brief explanation of why resolving this is critical for SEO.`;
        break;

      default:
        issuePrompt = `Provide a general SEO recommendation for resolving issue: "${issueId}" on URL: "${url}".`;
        break;
    }

    const systemPrompt = `You are SoloSpider SEO AI, an elite Search Engine Optimization agent.
Analyze the user's issue and metadata and return a JSON object containing the exact recommendation, optional code snippet, and explanation.

STRICT RESPONSE FORMAT:
You must output a single valid JSON object. Do not include any markdown formatting wrappers (like \`\`\`json) or extra text.
JSON Schema:
{
  "recommendation": "Main suggested text or markdown outline",
  "codeSnippet": "Optional JSON-LD schema or redirect code block",
  "explanation": "Short contextual explanation of the SEO value"
}`;

    const prompt = `${systemPrompt}\n\nUser Request:\n${issuePrompt}`;

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    let rawContent = "";

    // 1. Try OpenRouter if key is available
    if (openrouterKey) {
      try {
        console.log("Calling OpenRouter for SEO AI suggestion...");
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://solospider.ai",
            "X-Title": "SoloSpider",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 800,
            temperature: 0.3,
            response_format: { type: "json_object" }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          rawContent = data.choices?.[0]?.message?.content || "";
        } else {
          console.warn("OpenRouter API route call failed, status:", response.status);
        }
      } catch (err) {
        console.warn("OpenRouter API route call encountered error:", err);
      }
    }

    // 2. Fallback to Pollinations AI text endpoint
    if (!rawContent) {
      try {
        console.log("Calling Pollinations AI for SEO AI suggestion fallback...");
        const encodedPrompt = encodeURIComponent(`${prompt}\nSTRICT RULE: Return ONLY raw JSON. No markdown code block wraps.`);
        const pollinationsUrl = `https://text.pollinations.ai/${encodedPrompt}?model=openai`;

        const res = await fetch(pollinationsUrl);
        if (res.ok) {
          rawContent = await res.text();
        }
      } catch (err) {
        console.warn("Pollinations AI API route fallback failed:", err);
      }
    }

    // 3. Process and return clean JSON
    if (rawContent) {
      try {
        const parsed = cleanJsonResponse(rawContent);
        return NextResponse.json(parsed, { headers: corsHeaders });
      } catch (parseErr) {
        console.error("Failed to parse LLM response as JSON. Raw was:", rawContent);
        // Serve a semi-fallback parsed from text or return a standard text recommendation
        return NextResponse.json({
          recommendation: rawContent.slice(0, 500),
          explanation: "Unable to parse structured JSON response from AI. Please try again.",
        }, { headers: corsHeaders });
      }
    }

    // 4. Default high-fidelity local programmatic recommendation generator
    console.log("Both AI engines offline/unavailable. Serving local high-fidelity fallback suggestion.");
    const fallbackRecommendation = generateLocalSeoRecommendation(url, issueId, currentTitle, currentMetaDesc, currentH1, wordCount);
    return NextResponse.json(fallbackRecommendation, { headers: corsHeaders });

  } catch (error: any) {
    console.error("API seo/analyze-issue error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message || String(error)
    }, { status: 500, headers: corsHeaders });
  }
}
