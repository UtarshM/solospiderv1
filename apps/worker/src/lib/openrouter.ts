import { env } from "../config.js";

const BASE_URL = "https://openrouter.ai/api/v1";

export const MODEL_MAP: Record<string, string> = {
  chatgpt:    "openai/gpt-4o-mini",
  gemini:     "google/gemini-2.0-flash-001",
  claude:     "anthropic/claude-3-haiku",
  perplexity: "perplexity/sonar",
  grok:       "x-ai/grok-3-mini-beta",
  deepseek:   "deepseek/deepseek-chat",
};

export async function queryModel(
  modelKey: string,
  prompt: string,
  systemPrompt?: string
): Promise<{ text: string; latencyMs: number }> {
  const modelId = MODEL_MAP[modelKey];
  if (!modelId) throw new Error(`Unknown model key: ${modelKey}`);

  const start = Date.now();
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://solospider.ai",
      "X-Title": "SoloSpider Worker",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt ?? "You are a helpful assistant. Answer the question comprehensively. Mention specific products, tools, companies, and brand names where relevant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });

  const latencyMs = Date.now() - start;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${modelId} → ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const text = data?.choices?.[0]?.message?.content ?? "";
  return { text, latencyMs };
}
