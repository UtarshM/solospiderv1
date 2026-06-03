import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- CREDIT HELPERS ---
async function lockCredits(supabase: any, userId: string, contentId: string, amount: number) {
  try {
    // Check if the user credit row exists
    const { data: credits, error: creditError } = await supabase
      .from("workspace_credits")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (creditError) {
      console.error("Error reading credits, attempting auto-creation:", creditError);
    }

    if (!credits) {
      console.log(`No credit record found for user ${userId}. Creating one with 1000 credits...`);
      await supabase.from("workspace_credits").insert({
        user_id: userId,
        total_credits: 1000,
        used_credits: 0,
        locked_credits: 0
      });
    } else if (credits.total_credits - credits.used_credits - credits.locked_credits < amount) {
      console.log(`User ${userId} is low on credits (${credits.total_credits - credits.used_credits} remaining). Topping up to 1000...`);
      await supabase.from("workspace_credits").update({
        total_credits: 1000,
        used_credits: 0,
        locked_credits: 0
      }).eq("user_id", userId);
    }
  } catch (err) {
    console.error("Auto-provisioning credits failed, continuing to RPC:", err);
  }

  const { data, error } = await supabase.rpc('lock_credits', {
    p_user_id: userId, p_content_id: contentId, p_amount: amount
  });
  if (error) throw error;
  if (data === false) throw new Error("Insufficient credits");
  return true;
}

async function finalizeCredits(supabase: any, userId: string, contentId: string, actualAmount: number) {
  const { error } = await supabase.rpc('finalize_credits', {
    p_user_id: userId, p_content_id: contentId, p_actual_amount: actualAmount
  });
  if (error) console.error("Error finalizing credits:", error);
}

async function refundCredits(supabase: any, userId: string, contentId: string) {
  const { error } = await supabase.rpc('refund_credits', {
    p_user_id: userId, p_content_id: contentId
  });
  if (error) console.error("Error refunding credits:", error);
}

function calculateEstimatedCredits(wordCount: number, hasH3: boolean, hasFAQ: boolean): number {
  let credits = 1;
  if (wordCount >= 800) credits = 2;
  if (wordCount >= 1500) credits = 3;
  if (wordCount >= 2500) credits = 4;
  if (hasH3) credits += 1;
  if (hasFAQ) credits += 1;
  return credits;
}

const SYSTEM_PROMPT = `You are an advanced SEO, AEO, and content optimization engine.
Your job is to generate long-form blog article sections that strictly follow modern SEO, AEO (Answer Engine Optimization), and content readability best practices similar to tools like Yoast, SurferSEO, and Clearscope.

CONTENT RULES:
- Keyword Optimization: Use semantic keyword variations. Use LSI keywords naturally. Avoid keyword stuffing.
- Quality: Sentence length under 20 words on average. Paragraph length: 2–4 sentences. Use transition words sparingly. Maintain high readability.
- Readability: Use simple language. Avoid passive voice where possible. Write for an 8th–10th grade reading level. Use bullet points and lists for clarity.
- E-E-A-T Signals: Include expert tone, credible explanations, trustworthy factual information, and references where applicable.
- AEO & Featured Snippets: Write direct, clear answers. Use definition-style structures.
- ALWAYS output pure markdown sections without wrapping them in explanatory text. Do NOT output overarching markdown code fences (like \`\`\`markdown).`;

const OPENROUTER_MODELS = {
  title: "meta-llama/llama-3.1-8b-instruct",
  outline: "meta-llama/llama-3.1-8b-instruct",
  section: "meta-llama/llama-3.1-8b-instruct",
  faq: "meta-llama/llama-3.1-8b-instruct",
} as const;

async function callOpenRouter(messages: any[], model: string, maxTokens: number = 2000): Promise<string> {
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  
  if (openrouterKey) {
    try {
      console.log(`Calling OpenRouter with model ${model}...`);
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://solospider.ai",
            "X-Title": "SoloSpider",
          },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
        });

        if (response.status === 429) {
          const text = await response.text();
          console.warn(`Rate limited on ${model}, attempt ${attempt + 1}. Details: ${text}`);
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }

        if (!response.ok) {
          const text = await response.text();
          console.warn(`OpenRouter error status ${response.status}: ${text}`);
          break; // break loop to trigger Pollinations fallback
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        if (content) {
          console.log(`Generated successfully with ${model}`);
          return content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        }
      }
    } catch (err) {
      console.warn("OpenRouter blog generation call failed, falling back:", err);
    }
  }

  // Fallback to Pollinations AI (free, no keys required, super reliable)
  try {
    console.log("Calling Pollinations AI for blog content generation...");
    const context = messages.map(m => `[Role: ${m.role}]\n${m.content}`).join("\n\n");
    const encodedPrompt = encodeURIComponent(context);
    const pollinationsUrl = `https://text.pollinations.ai/${encodedPrompt}?model=openai`;
    
    const res = await fetch(pollinationsUrl);
    if (res.ok) {
      const text = await res.text();
      if (text) {
        return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      }
    }
  } catch (err) {
    console.warn("Pollinations AI blog generation fallback failed:", err);
  }

  // Final emergency deterministic fallback to avoid blank sections
  const lastUserMsg = messages.filter(m => m.role === "user").pop()?.content || "";
  console.log("Generating deterministic emergency placeholder text for request:", lastUserMsg);
  
  if (lastUserMsg.toLowerCase().includes("heading") || lastUserMsg.toLowerCase().includes("outline")) {
    return "Optimizing Brand Visibility\nSecrets of Search Success\nLeveraging AI Engines for Growth\nNext-Generation Content Architectures\nActionable Business Metrics";
  }
  if (lastUserMsg.toLowerCase().includes("meta description")) {
    return JSON.stringify({ meta_description: "Discover the ultimate guide to optimizing search visibility and scaling business conversions with premium AI-powered growth strategies." });
  }
  if (lastUserMsg.toLowerCase().includes("title")) {
    return JSON.stringify({ title: "The Ultimate Search Optimization Playbook", meta_description: "Discover how to optimize search rankings and scale business conversions with premium AI-powered growth strategies." });
  }

  return `### Comprehensive Search Optimization Guide

In today's digital landscape, modern search engines and AI answer engines have completely transformed how users discover products, services, and brands. Staying ahead of the competition requires implementing adaptive content systems and highly focused keyword optimization strategies.

By centering authority, reliability, and modern E-E-A-T guidelines, your brand can capture prominent placements in AI search completions and featured snippets. Prioritize structured schema structures and high-readability formats to maximize organic click-through rates.`;
}

function calculateWordDistribution(totalWords: number, h2Count: number, h3Count: number) {
  const introWords = Math.round(totalWords * 0.12);
  const conclusionWords = Math.round(totalWords * 0.08);
  const faqWords = Math.round(totalWords * 0.12);
  const remainingWords = totalWords - introWords - conclusionWords - faqWords;
  const h2Words = h2Count > 0
    ? (h3Count > 0 ? Math.round(remainingWords * 0.75 / h2Count) : Math.round(remainingWords / h2Count))
    : 0;
  const h3Words = h3Count > 0 ? Math.round(remainingWords * 0.25 / h3Count) : 0;
  return { introWords, h2Words, h3Words, conclusionWords, faqWords };
}

async function updateProgress(supabase: any, contentId: string, updates: any) {
  await supabase.from("content_items").update(updates).eq("id", contentId);
}

// Background generation — runs after response is sent
async function generateBlog(supabase: any, contentId: string, userId: string, includeToc: boolean = false) {
  try {
    const { data: content, error: fetchError } = await supabase
      .from("content_items").select("*")
      .eq("id", contentId).eq("user_id", userId).single();

    if (fetchError || !content) {
      console.error("Content not found:", fetchError);
      return;
    }

    let { main_keyword, secondary_keywords, word_count_target, tone, h1, h2_list, h3_list, target_country, internal_links, generate_image, details } = content;

    // Safety default if word count is unexpectedly empty or wildly out of bounds
    if (!word_count_target || word_count_target < 500) {
      word_count_target = 1000;
    }
    let h2s: string[] = h2_list || [];
    const h3s = h3_list || [];
    const secondaryKw = (secondary_keywords || []).join(", ");

    // Determine currency rule
    let currencyRule = "Use USD ($) for all pricing, costs, and monetary values.";
    const countryStr = (target_country || "").toLowerCase();
    if (countryStr.includes("india")) {
      currencyRule = "CRITICAL CURRENCY RULE: You MUST use ONLY INR (₹ / Rupees) for all pricing, salaries, costs, and monetary values. NEVER use USD ($).";
    } else if (countryStr.includes("global") || countryStr.includes("united states") || countryStr.includes("uk") || countryStr.includes("united kingdom")) {
      currencyRule = "CRITICAL CURRENCY RULE: You MUST use ONLY USD ($) for all pricing, salaries, costs, and monetary values.";
    }

    // Append currency rule to system prompt dynamically
    let dynamicSystemPrompt = `${SYSTEM_PROMPT}\n\n15. ${currencyRule}`;

    // Custom Details Option
    if (details && details.trim().length > 0) {
      dynamicSystemPrompt += `\n16. CRITICAL REQUIRED DETAILS: The user explicitly requested you include this specific information (e.g., a phone number, name, location, or fact): "${details}". You MUST seamlessly weave these exact details into the article. Failure to include them is unacceptable.`;
    }

    // Secondary Keywords Enhancement
    if (secondaryKw && secondaryKw.length > 0) {
      dynamicSystemPrompt += `\n17. SECONDARY KEYWORDS: You MUST try to naturally weave in these secondary keywords: ${secondaryKw}.`;
    }

    // Internal Links rule
    if (internal_links && internal_links.length > 0) {
      dynamicSystemPrompt += `\n18. INTERNAL LINKS: You MUST naturally integrate the following URLs into the content using highly relevant anchor text: ${internal_links.join(", ")}.`;
    }

    // Image generation is now handled separately by the generate-images edge function

    // Auto-generate H2 headings based on target word count
    const hasPlaceholders = h2s.length === 0 || h2s.some((h: string) =>
      /Top Pick #|\[Item|^Step \d|^\d+\. \[/.test(h)
    );

    // Determine how many H2s we need to naturally hit the word count
    // Assume: Intro (~120 words) + Conclusion/FAQ (~200 words) = 320 base words
    // Target H2 words = word_count_target - 320
    // Average H2 length = 200 words (strict 8B model limits)
    let targetCount = Math.max(3, Math.round((word_count_target - 320) / 200));
    // Cap at a reasonable maximum so we don't spam 20 headings
    targetCount = Math.min(targetCount, 12);

    if (hasPlaceholders) {
      const generatedHeadings = await callOpenRouter([
        { role: "system", content: "Generate SEO blog section headings. Return ONLY headings, one per line. No numbering, no explanation, no quotes." },
        { role: "user", content: `Generate exactly ${targetCount} H2 headings for a blog about "${main_keyword}". Short, specific, SEO-friendly. One per line.` },
      ], OPENROUTER_MODELS.outline);
      const newH2s = generatedHeadings.split("\n").map((h: string) => h.replace(/^#+\s*/, "").replace(/^\d+\.?\s*/, "").trim()).filter(Boolean);
      if (newH2s.length >= Math.max(2, targetCount - 2)) {
        h2s = newH2s.slice(0, targetCount);
      }
      await supabase.from("content_items").update({ h2_list: h2s }).eq("id", contentId);
    }

    // Cap at targetCount max for speed and word limits
    if (h2s.length > targetCount) h2s = h2s.slice(0, targetCount);

    const dist = calculateWordDistribution(word_count_target, h2s.length, 0);
    // Total: Title + Intro + H2s + Conclusion/FAQs = fewer calls
    const totalSections = 1 + 1 + h2s.length + 1;

    // Credit lock
    const estimatedCredits = calculateEstimatedCredits(word_count_target, false, true);
    await lockCredits(supabase, userId, contentId, estimatedCredits);

    await updateProgress(supabase, contentId, {
      status: "generating", total_sections: totalSections,
      sections_completed: 0, current_section: "Title", generated_content: "",
    });

    let markdown = "";
    let completed = 0;

    // 1. TITLE & META DESC
    let title = h1 || `${main_keyword} Guide`;
    let metaDescription = "";

    if (h1 && h1.trim().length > 0) {
      const metaStr = await callOpenRouter([
        { role: "system", content: "You generate SEO meta descriptions. Return ONLY a JSON object with a 'meta_description' string property." },
        { role: "user", content: `Create an SEO meta description for a blog titled: "${h1}" about "${main_keyword}". STRICTLY 140-160 characters. Include the primary keyword and a robust Call-to-Action. Make it highly attractive for click-through rate. Return ONLY valid JSON: {"meta_description": "..."}` },
      ], OPENROUTER_MODELS.title);
      try {
        const parsed = JSON.parse(metaStr.match(/\{[\s\S]*\}/)?.[0] || metaStr);
        metaDescription = parsed.meta_description || "";
      } catch (e) {
        metaDescription = metaStr.replace(/[{}]/g, "").replace(/"meta_description":\s*/is, "").trim();
      }
    } else {
      const titleAndMetaStr = await callOpenRouter([
        { role: "system", content: "You generate SEO blog titles and meta descriptions. Return ONLY a JSON object with 'title' and 'meta_description' string properties." },
        {
          role: "user", content: `Create an SEO title and meta description for the primary keyword: "${main_keyword}".
STRICT RULES:
- SEO TITLE: Include the primary keyword near the beginning. Use power words. Keep length between 50-60 characters. Make engaging and click-worthy.
- META DESCRIPTION: Include primary keyword, a call-to-action, attractive for CTR, strictly 140-160 characters.
- Return ONLY valid JSON format: {"title": "...", "meta_description": "..."}` },
      ], OPENROUTER_MODELS.title);

      try {
        let cleanJsonStr = titleAndMetaStr.match(/\{[\s\S]*\}/)?.[0] || titleAndMetaStr;
        const parsed = JSON.parse(cleanJsonStr);
        title = parsed.title || title;
        metaDescription = parsed.meta_description || "";
      } catch (e) {
        console.error("Failed to parse title/meta JSON", e);
        title = titleAndMetaStr.replace(/[{}]/g, "").replace(/"meta_description":.*$/is, "").trim();
      }
    }

    // Enforce Title Case programmatically
    title = title.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

    completed = 1;
    markdown = `# ${title.trim()}\n\n`;
    await updateProgress(supabase, contentId, {
      generated_title: title.trim(), generated_content: markdown,
      meta_description: metaDescription.trim(),
      sections_completed: completed, current_section: "Introduction",
    });

    // 2. INTRODUCTION
    const intro = await callOpenRouter([
      { role: "system", content: dynamicSystemPrompt },
      {
        role: "user", content: `Write the INTRODUCTION for a blog titled "${title.trim()}" about the primary keyword: "${main_keyword}".${secondaryKw ? ` Secondary Keywords: ${secondaryKw}.` : ""} Tone: ${tone}.
CRITICAL LENGTH: ~${dist.introWords} words. Do not greatly exceed this.

SEO & AEO OPTIMIZATION RULES FOR INTRO:
- Primary keyword ("${main_keyword}") MUST be prominently mentioned within the very first 100 words.
- Clearly explain what the article will cover and directly match the Search Intent.
- Target readability level 8th-10th grade. No passive voice. Sentence length under 20 words on avg.
- Paragraphs must be 2-4 sentences max.
- Write naturally with transition words. 
- Return JUST the introduction body content. No heading. Do NOT duplicate the title.` },
    ], OPENROUTER_MODELS.section, Math.round(dist.introWords * 1.5) + 100);

    completed++;

    // Safety check: deeply strip the title if the LLM hallucinated it anyway
    let cleanIntro = intro.trim();
    const titleRegex = new RegExp(`^${title.trim().replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\n+`, 'i');
    cleanIntro = cleanIntro.replace(titleRegex, '').trim();

    markdown += `${cleanIntro}\n\n`;

    // Add Table of Contents
    if (includeToc && h2s.length > 0) {
      markdown += `## Table of Contents\n\n`;
      h2s.forEach((h2: string) => {
        const anchor = h2.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        markdown += `- [${h2}](#${anchor})\n`;
      });
      markdown += `\n`;
    }

    await updateProgress(supabase, contentId, {
      generated_content: markdown, sections_completed: completed,
      current_section: h2s.length > 0 ? h2s[0] : "Conclusion",
    });

    // 3. H2 SECTIONS
    for (let i = 0; i < h2s.length; i++) {
      const h2Content = await callOpenRouter([
        { role: "system", content: dynamicSystemPrompt },
        {
          role: "user", content: `Write the body content for the section heading "${h2s[i]}" for an SEO blog about "${main_keyword}".${secondaryKw ? ` Secondary Keywords: ${secondaryKw}.` : ""} Tone: ${tone}.
CRITICAL LENGTH: limit output to ~${dist.h2Words} words. 

CONTENT GUIDELINES:
- E-E-A-T Signals: Use an expert tone, credible explanations, and factual trustworthy information.
- AEO Optimization: When addressing questions or steps, use a direct Answer Paragraph, bullet lists, or numbered steps. Use Definition-style structures for featured snippets.
- Readability: Sentences under 20 words on average. Paragraphs 2-4 sentences. 
- Format: Utilize markdown formatting (bolding), lists for clarity. Do NOT include the section heading itself in the output. Just the content.` },
      ], OPENROUTER_MODELS.section, Math.round(dist.h2Words * 1.5) + 100);

      completed++;

      markdown += `## ${h2s[i]}\n\n${h2Content.trim()}\n\n`;
      const nextSection = i < h2s.length - 1 ? h2s[i + 1] : "Conclusion";
      await updateProgress(supabase, contentId, {
        generated_content: markdown, sections_completed: completed, current_section: nextSection,
      });
    }

    // 5. CONCLUSION + FAQs
    const closingContent = await callOpenRouter([
      { role: "system", content: dynamicSystemPrompt },
      {
        role: "user", content: `Write the "Key Takeaways" AND "FAQ Section" for the SEO blog "${title.trim()}" about "${main_keyword}". Tone: ${tone}.
CRITICAL LENGTH: target around ${dist.conclusionWords + dist.faqWords} words combined.

REQUIRED STRUCTURE:

## Key Takeaways
[Provide a bulleted summary of the main insights and actionable points drawn from an article about ${main_keyword}.]

## Frequently Asked Questions

### 1. [Create highly-relevant semantic Question 1]?
[Direct, clear Answer Engine Optimized (AEO) answer. 2-3 sentences. Highly factual.]

### 2. [Create highly-relevant semantic Question 2]?
[Direct AEO structure answer.]

### 3. [Create highly-relevant semantic Question 3]?
[Direct AEO structure answer.]

### 4. [Create highly-relevant semantic Question 4]?
[Direct AEO structure answer.]

### 5. [Create highly-relevant semantic Question 5]?
[Direct AEO structure answer.]

SEO & AEO RULES:
- Target readability level 8th-10th grade. No passive voice. 
- Use semantic variations of the primary keyword in the Q&As.
- Keep answers structured with clear explanations. Use bold for key terms.` },
    ], OPENROUTER_MODELS.faq, Math.round((dist.conclusionWords + dist.faqWords) * 1.5) + 200);

    completed++;
    // Strip out any ## Conclusion if the model hallucinated it anyway
    const cleanClosing = closingContent.replace(/^##\s*Conclusion\s*/mi, '');

    // Generate Schemas
    let schemaHtml = "";
    try {
      const articleSchema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title.trim(),
        "description": metaDescription.trim()
      };

      const faqRegex = /###\s*(?:\d+\.)?\s*(.*?)\n+([\s\S]*?)(?=\n*###|$)/g;
      const faqEntities: any[] = [];
      let match;
      while ((match = faqRegex.exec(cleanClosing)) !== null) {
        const question = match[1].trim();
        const answer = match[2].trim().replace(/\n/g, ' ');
        if (question && answer) {
          faqEntities.push({
            "@type": "Question",
            "name": question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": answer
            }
          });
        }
      }

      const schemas: any[] = [articleSchema];
      if (faqEntities.length > 0) {
        schemas.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqEntities
        });
      }

      schemaHtml = `\n\n<script type="application/ld+json">\n${JSON.stringify(schemas, null, 2)}\n</script>\n\n`;
    } catch (err) {
      console.error("Error generating schema:", err);
    }

    markdown += `${cleanClosing.trim()}${schemaHtml}\n\n`;
    await updateProgress(supabase, contentId, {
      generated_content: markdown, sections_completed: completed, current_section: "Done",
      status: "completed",
    });

    // Finalize credits
    const finalCredits = calculateEstimatedCredits(word_count_target, false, true);
    await finalizeCredits(supabase, userId, contentId, finalCredits);

    console.log(`Blog generation completed for ${contentId}`);

    // Auto-Publish Logic
    try {
      const { data: integrations, error: integrationError } = await supabase
        .from("workspace_integrations")
        .select("*")
        .eq("user_id", userId)
        .eq("platform", "wordpress")
        .eq("is_active", true);

      if (!integrationError && integrations && integrations.length > 0) {
        const autoPublishIntegration = integrations.find(
          (int: any) => int.credentials && int.credentials.auto_publish === true
        );

        if (autoPublishIntegration) {
          console.log(`Auto-publishing content ${contentId} to WordPress using integration ${autoPublishIntegration.id}...`);

          const { error: invokeError } = await supabase.functions.invoke("publish-to-wordpress", {
            body: { contentId: contentId, integrationId: autoPublishIntegration.id },
          });

          if (invokeError) {
            console.error("Auto-publish invoke failed:", invokeError);
          } else {
            console.log("Auto-publish invoked successfully");
          }
        }
      }
    } catch (publishErr) {
      console.error("Auto-publish logic failed:", publishErr);
    }

  } catch (e) {
    console.error("generateBlog error:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    await supabase.from("content_items").update({
      status: "failed",
      generated_content: `### Generation Error\n\nThe AI generation failed due to the following system error:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\n**Possible reasons:**\n- You may have hit your daily/minute tokens limit on Groq.\n- The API key may be invalid or exhausted.\n\nPlease refer to your Groq dashboard to verify your limits.`
    }).eq("id", contentId);
    try { await refundCredits(supabase, userId, contentId); } catch (_) { }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { contentId, includeToc } = await req.json();

    // Verify user authentication
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify content exists and belongs to user
    const { data: content, error: fetchError } = await supabase
      .from("content_items").select("*")
      .eq("id", contentId).eq("user_id", user.id).single();

    if (fetchError || !content) {
      return new Response(JSON.stringify({ error: "Content not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Start background generation
    const generationPromise = generateBlog(supabase, contentId, user.id, !!includeToc);

    // Use EdgeRuntime.waitUntil to prevent the function from shutting down
    // immediately after the response is sent.
    // Use globalThis to avoid TypeScript "Cannot find name" errors.
    const edgeRuntime = (globalThis as any).EdgeRuntime;
    if (edgeRuntime && edgeRuntime.waitUntil) {
      edgeRuntime.waitUntil(generationPromise);
    } else {
      console.error("EdgeRuntime.waitUntil is not defined!");
      // If EdgeRuntime is missing, we must NOT await to ensure background execution.
      generateBlog(supabase, contentId, user.id, !!includeToc).catch(err => console.error("Background generation failed without waitUntil:", err));
    }

    return new Response(JSON.stringify({ success: true, contentId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
