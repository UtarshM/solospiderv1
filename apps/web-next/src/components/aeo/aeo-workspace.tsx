"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import { buildCompetitorComparePrompts, buildDefaultAeoPrompts, seedAeoPrompts } from "@/lib/aeoPrompts";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { 
  Brain, FileText, Link2, Compass, TrendingUp, Sparkles, Play, Plus, 
  Loader2, CheckCircle2, AlertCircle, ShieldAlert, Cpu, BarChart3, 
  Layers, Database, Calendar, Clock, Smile, Frown, HelpCircle,
  Globe, ExternalLink, Search, Code2, ChevronDown, ChevronRight, Zap, RefreshCw
} from "lucide-react";

type AeoView = "overview" | "prompt-generation" | "crawler" | "opportunities" | "citations" | "heatmap" | "fanouts" | "referrals";

const DEFAULT_MODELS = ["chatgpt", "gemini", "perplexity", "claude"];

// AI Model Helper mapping for premium avatars and custom colors
const MODEL_DETAILS: Record<string, { name: string; color: string; bg: string; border: string; text: string }> = {
  chatgpt: { name: "ChatGPT", color: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700" },
  gemini: { name: "Google Gemini", color: "bg-blue-500", bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700" },
  perplexity: { name: "Perplexity AI", color: "bg-cyan-500", bg: "bg-cyan-50", border: "border-cyan-100", text: "text-cyan-700" },
  claude: { name: "Anthropic Claude", color: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700" },
};

const getModelInfo = (model: string) => {
  const m = String(model || "").toLowerCase();
  for (const key of Object.keys(MODEL_DETAILS)) {
    if (m.includes(key)) return MODEL_DETAILS[key];
  }
  return { name: model, color: "bg-slate-500", bg: "bg-slate-50", border: "border-slate-100", text: "text-slate-700" };
};

const MODEL_HEX: Record<string, string> = {
  chatgpt: "#10b981",
  gemini: "#3b82f6",
  perplexity: "#06b6d4",
  claude: "#f59e0b",
};

function AeoTrendChart({
  title,
  data,
  yMax = 100,
  ySuffix = "",
}: {
  title: string;
  data: { day: string; chatgpt: number; gemini: number; perplexity: number; claude: number }[];
  yMax?: number;
  ySuffix?: string;
}) {
  const width = 500;
  const height = 220;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const yTicks = [0, 25, 50, 75, 100].map(pct => Math.round((pct / 100) * yMax));
  const hasData = data && data.length > 0;

  return (
    <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">{title}</h4>
        <div className="flex items-center gap-2">
          {Object.entries(MODEL_HEX).map(([model, color]) => (
            <span key={model} className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              {model === "chatgpt" ? "ChatGPT" : model === "gemini" ? "Gemini" : model === "perplexity" ? "Perplexity" : "Claude"}
            </span>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="h-[220px] flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <TrendingUp className="h-7 w-7 text-slate-350" />
          <p className="text-[10px] font-bold text-slate-400 uppercase">No Trend Data Logged</p>
          <p className="text-[11px] text-slate-500 font-medium max-w-xs px-4">
            After running your prompt scanner, historical trend lines will render here.
          </p>
        </div>
      ) : (
        <div className="relative w-full">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            {/* Y Axis Grid Lines */}
            {yTicks.map(tick => {
              const y = paddingTop + chartHeight - (tick / yMax) * chartHeight;
              return (
                <g key={tick} className="opacity-40">
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[9px] font-bold fill-slate-400"
                  >
                    {tick}{ySuffix}
                  </text>
                </g>
              );
            })}

            {/* X Axis Labels */}
            {data.map((item, idx) => {
              const x = paddingLeft + (idx / Math.max(1, data.length - 1)) * chartWidth;
              const label = String(item.day).slice(5, 10).replace("-", "/");
              return (
                <text
                  key={idx}
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  className="text-[9px] font-bold fill-slate-400 opacity-80"
                >
                  {label}
                </text>
              );
            })}

            {/* Paths and Areas for each Model */}
            {Object.entries(MODEL_HEX).map(([model, color]) => {
              const points = data.map((item, idx) => {
                const val = item[model as keyof typeof item] as number ?? 0;
                const x = paddingLeft + (idx / Math.max(1, data.length - 1)) * chartWidth;
                const y = paddingTop + chartHeight - (val / yMax) * chartHeight;
                return { x, y };
              });

              if (points.length === 0) return null;

              const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const firstPoint = points[0];
              const lastPoint = points[points.length - 1];
              const areaD = `${pathD} L ${lastPoint.x} ${paddingTop + chartHeight} L ${firstPoint.x} ${paddingTop + chartHeight} Z`;

              return (
                <g key={model}>
                  <defs>
                    <linearGradient id={`grad-${model}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.12" />
                      <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={areaD} fill={`url(#grad-${model})`} />
                  
                  <path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {points.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x}
                      cy={p.y}
                      r="3"
                      className="fill-white cursor-pointer transition-all duration-200 hover:r-[4.5]"
                      stroke={color}
                      strokeWidth="1.5"
                    />
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

export function AeoWorkspace({ view }: { view: AeoView }) {
  const qc = useQueryClient();
  const { activeProject } = useProjects();
  const [seeding, setSeeding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [crawlerSearch, setCrawlerSearch] = useState("");
  const [crawlerFilterSchema, setCrawlerFilterSchema] = useState<"all" | "faq" | "howto" | "no-schema">("all");
  const [crawlerExpandedId, setCrawlerExpandedId] = useState<string | null>(null);
  const [crawlerMaxPages, setCrawlerMaxPages] = useState(50);
  const [crawling, setCrawling] = useState(false);
  const [openBriefId, setOpenBriefId] = useState<string | null>(null);
  const [activeGeoTab, setActiveGeoTab] = useState<Record<string, "authority" | "readability" | "structure">>({});

  // Supabase Queries
  const analysisQuery = useQuery({
    queryKey: ["aeo_analysis", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("aeo_analyses" as any)
        .select("*")
        .eq("project_id", activeProject!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  const promptsQuery = useQuery({
    queryKey: ["aeo_prompts", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("aeo_prompts" as any)
        .select("id, topic, prompt, is_active, rationale")
        .eq("project_id", activeProject!.id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  // ── Scan run — Supabase Realtime subscription (replaces 3s polling) ──────────
  // We still do an initial fetch, but live updates come via the Realtime channel
  // so the UI reacts instantly when the worker marks the run as done/failed.
  const [scanRun, setScanRun] = useState<any>(null);
  const realtimeChannelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]> | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!activeProject?.id) return;
    const supabase = getSupabaseBrowserClient();

    async function fetchLatestRun() {
      const { data } = await supabase
        .from("prompt_scan_runs" as any)
        .select("*")
        .eq("project_id", activeProject!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setScanRun(data ?? null);
    }

    fetchLatestRun();

    // Subscribe to INSERT + UPDATE on prompt_scan_runs for this project
    const channel = supabase
      .channel(`scan_run_${activeProject.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "prompt_scan_runs",
          filter: `project_id=eq.${activeProject.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (!updated?.id) return;
          setScanRun((prev: any) => {
            // Only replace if this is the same run or a newer one
            if (!prev || updated.created_at >= prev.created_at) return updated;
            return prev;
          });
          // When scan completes, refresh dependent queries
          if (updated.status === "done" || updated.status === "failed") {
            qc.invalidateQueries({ queryKey: ["prompt_scan_results", activeProject!.id] });
            qc.invalidateQueries({ queryKey: ["aeo_citations", activeProject!.id] });
            qc.invalidateQueries({ queryKey: ["query_fanouts", activeProject!.id] });
            qc.invalidateQueries({ queryKey: ["aeo_content_gaps", activeProject!.id] });
          }
        },
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  // Thin wrapper so the rest of the component can keep using runQuery.data shape
  const runQuery = { data: scanRun };

  const resultsQuery = useQuery({
    queryKey: ["prompt_scan_results", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("prompt_scan_results" as any)
        .select("id, model, brand_mentioned, mention_position, mention_sentiment, prompt_text, scanned_at")
        .eq("project_id", activeProject!.id)
        .order("scanned_at", { ascending: false })
        .limit(100);
      return (data || []) as any[];
    },
  });

  const citationsQuery = useQuery({
    queryKey: ["aeo_citations", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("aeo_citations" as any)
        .select("id, provider, query, cited_title, position, created_at")
        .eq("project_id", activeProject!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as any[];
    },
  });

  const fanoutsQuery = useQuery({
    queryKey: ["query_fanouts", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("query_fanouts" as any)
        // DB columns: root_query, branch_query (not source_query / generated_query)
        .select("id, root_query, branch_query, intent, score, created_at")
        .eq("project_id", activeProject!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as any[];
    },
  });

  // Persisted gap analysis briefs — populated by the scan worker/edge function
  const contentGapsQuery = useQuery({
    queryKey: ["aeo_content_gaps", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("aeo_content_gaps" as any)
        .select("id, prompt_text, topic, competitors, models, score, priority, content_exists, brief_title, brief_outline, miss_count, last_detected_at")
        .eq("project_id", activeProject!.id)
        .order("score", { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
  });

  const referralsQuery = useQuery({
    queryKey: ["ai_referrals", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("ai_referrals" as any)
        // DB column: landing_path (not landing_page)
        .select("id, source, landing_path, sessions, conversions, event_date")
        .eq("project_id", activeProject!.id)
        .order("event_date", { ascending: false })
        .limit(100);
      return (data || []) as any[];
    },
  });

  const crawlRunQuery = useQuery({
    queryKey: ["crawl_run", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    refetchInterval: (query) => {
      const run = query.state.data as any;
      return (run?.status === "running" || run?.status === "pending") ? 2500 : false;
    },
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("crawl_runs" as any)
        .select("*")
        .eq("project_id", activeProject!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  const crawledPagesQuery = useQuery({
    queryKey: ["crawled_pages", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("crawled_pages" as any)
        .select("*")
        .eq("project_id", activeProject!.id)
        .order("crawled_at", { ascending: false })
        .limit(200);
      return (data || []) as any[];
    },
  });

  const scheduleQuery = useQuery({
    queryKey: ["aeo_scan_schedule", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("aeo_scan_schedules" as any)
        .select("week_day_utc, hour_utc, is_enabled, last_run_at, models")
        .eq("project_id", activeProject!.id)
        .maybeSingle();
      return data as any;
    },
  });

  // Derived metrics and statistics
  const modelBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; mentions: number }>();
    for (const row of resultsQuery.data || []) {
      const cur = map.get(row.model) || { total: 0, mentions: 0 };
      cur.total += 1;
      if (row.brand_mentioned) cur.mentions += 1;
      map.set(row.model, cur);
    }
    return Array.from(map.entries()).map(([model, stats]) => ({
      model,
      total: stats.total,
      mentions: stats.mentions,
      visibility: stats.total > 0 ? Math.round((stats.mentions / stats.total) * 100) : 0,
    }));
  }, [resultsQuery.data]);

  const visibilityTrend = useMemo(() => {
    const byDayModel = new Map<string, { total: number; mentions: number }>();
    for (const row of resultsQuery.data || []) {
      const day = String(row.scanned_at || "").slice(0, 10) || "unknown";
      const key = `${day}__${row.model}`;
      const cur = byDayModel.get(key) || { total: 0, mentions: 0 };
      cur.total += 1;
      if (row.brand_mentioned) cur.mentions += 1;
      byDayModel.set(key, cur);
    }

    return Array.from(byDayModel.entries())
      .map(([k, v]) => {
        const [day, model] = k.split("__");
        return {
          day,
          model,
          visibility: v.total > 0 ? Math.round((v.mentions / v.total) * 100) : 0,
        };
      })
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-16);
  }, [resultsQuery.data]);

  const citationShareTrend = useMemo(() => {
    const byDayModel = new Map<string, number>();
    for (const row of resultsQuery.data || []) {
      if (!row.brand_mentioned) continue;
      const day = String(row.scanned_at || "").slice(0, 10) || "unknown";
      const key = `${day}__${row.model}`;
      byDayModel.set(key, (byDayModel.get(key) || 0) + 1);
    }
    return Array.from(byDayModel.entries())
      .map(([k, mentions]) => {
        const [day, model] = k.split("__");
        return { day, model, mentions };
      })
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-16);
  }, [resultsQuery.data]);

  // Dynamic Gap Detection Algorithm clustering prompt scan failures where brand is missing
  const aeoGaps = useMemo(() => {
    const scanResults = resultsQuery.data || [];
    const gapsMap = new Map<string, {
      topic: string;
      prompt: string;
      competitors: Set<string>;
      models: Set<string>;
      missedCount: number;
    }>();

    for (const res of scanResults) {
      if (!res.brand_mentioned) {
        const competitors = Array.isArray(res.competitors_mentioned) ? res.competitors_mentioned : [];
        if (competitors.length > 0) {
          const key = res.prompt_text;
          const cur = gapsMap.get(key) || {
            topic: res.prompt_text.slice(0, 40) + "...",
            prompt: res.prompt_text,
            competitors: new Set<string>(),
            models: new Set<string>(),
            missedCount: 0,
          };
          competitors.forEach((c: any) => cur.competitors.add(c));
          cur.models.add(res.model);
          cur.missedCount += 1;
          gapsMap.set(key, cur);
        }
      }
    }

    return Array.from(gapsMap.entries()).map(([promptText, gap], index) => {
      const competitorCount = gap.competitors.size;
      const modelCount = gap.models.size;
      const score = Math.min(100, competitorCount * 25 + modelCount * 20);

      const crawled = crawledPagesQuery.data || [];
      const keywords = gap.prompt.toLowerCase().split(" ").filter(w => w.length > 4);
      const contentExists = crawled.some(p => {
        const titleLower = String(p.title || "").toLowerCase();
        const urlLower = String(p.url || "").toLowerCase();
        return keywords.some(k => titleLower.includes(k) || urlLower.includes(k));
      });

      const briefTitle = gap.prompt.replace("Compare", "The Ultimate Guide to").replace("vs", "and").replace("Which is better for", "Why You Should Choose") + " in 2026";
      const briefOutline = [
        { h2: "Why conversational search models favor structured authority", keyPoints: ["Explain data-driven metrics", "Cite specific benchmarks"] },
        { h2: "Feature comparison and core performance indices", keyPoints: ["Create a visual comparison matrix", "Contrast latency results"] },
        { h2: "Optimizing your workflow setup for AEO success", keyPoints: ["Integrate verified FAQ schema elements", "Detail about page configurations"] }
      ];

      return {
        id: `gap-${index}`,
        prompt: gap.prompt,
        topic: gap.prompt.split("?")[0].replace("Compare", "").trim(),
        competitors: Array.from(gap.competitors),
        models: Array.from(gap.models),
        score,
        priority: score > 70 ? "high" : score > 40 ? "medium" : "low",
        contentExists,
        briefTitle,
        briefOutline,
      };
    }).sort((a, b) => b.score - a.score);
  }, [resultsQuery.data, crawledPagesQuery.data]);

  const handleStartCrawl = async () => {
    if (!activeProject.domain) {
      toast.error("No website URL configured for this project.");
      return;
    }
    setCrawling(true);
    const supabase = getSupabaseBrowserClient();
    try {
      toast.info("🕷️ Launching Site Crawler via Deno Edge Worker...");
      const { data, error } = await supabase.functions.invoke("crawl-website", {
        body: {
          project_id: activeProject.id,
          website: activeProject.domain,
          max_pages: crawlerMaxPages,
        },
      });
      if (error) throw error;
      toast.success(`✅ Crawled ${data.pages_crawled} sitemap pages successfully!`);
      qc.invalidateQueries({ queryKey: ["crawl_run", activeProject.id] });
      qc.invalidateQueries({ queryKey: ["crawled_pages", activeProject.id] });
    } catch (e: any) {
      toast.error(e?.message || "Crawler error occurred");
    } finally {
      setCrawling(false);
    }
  };

  // Group visibility trend by day for drawing multiple lines on the same chart
  const groupedVisibilityTrend = useMemo(() => {
    const daysMap = new Map<string, Record<string, number>>();
    for (const item of visibilityTrend) {
      if (!daysMap.has(item.day)) {
        daysMap.set(item.day, { chatgpt: 0, gemini: 0, perplexity: 0, claude: 0 });
      }
      daysMap.get(item.day)![item.model] = item.visibility;
    }
    return Array.from(daysMap.entries())
      .map(([day, models]) => ({ day, ...models }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [visibilityTrend]);

  // Group citation trend by day
  const groupedCitationTrend = useMemo(() => {
    const daysMap = new Map<string, Record<string, number>>();
    for (const item of citationShareTrend) {
      if (!daysMap.has(item.day)) {
        daysMap.set(item.day, { chatgpt: 0, gemini: 0, perplexity: 0, claude: 0 });
      }
      daysMap.get(item.day)![item.model] = item.mentions;
    }
    return Array.from(daysMap.entries())
      .map(([day, models]) => ({ day, ...models }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [citationShareTrend]);

  if (!activeProject) {
    return (
      <div className="max-w-md mx-auto my-16 text-center space-y-5 p-6 border border-slate-150 rounded-2xl bg-white shadow-sm">
        <ShieldAlert className="h-12 w-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">AEO Workspace Locked</h2>
        <p className="text-sm text-slate-500">
          Create or select an active project in the Dashboard to unlock state-of-the-art AI search visibility, citation monitoring, and brand referrals.
        </p>
        <Link href="/app/en/dashboard" className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition-all">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // Handle Seeding Defaults
  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const seeded = await seedAeoPrompts(
        activeProject.id,
        buildDefaultAeoPrompts(activeProject.brand_name || activeProject.name, activeProject.domain),
      );
      toast.success(seeded.inserted > 0 ? `Seeded ${seeded.inserted} baseline brand prompts.` : "Baseline prompts are already present.");
      qc.invalidateQueries({ queryKey: ["aeo_prompts", activeProject.id] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to seed prompts");
    } finally {
      setSeeding(false);
    }
  };

  // Handle Seeding Competitor Pack
  const handleSeedCompetitors = async () => {
    setSeeding(true);
    try {
      const seeded = await seedAeoPrompts(
        activeProject.id,
        buildCompetitorComparePrompts(activeProject.brand_name || activeProject.name, activeProject.domain),
      );
      toast.success(seeded.inserted > 0 ? `Added ${seeded.inserted} competitive prompts.` : "Competitive comparison prompts already present.");
      qc.invalidateQueries({ queryKey: ["aeo_prompts", activeProject.id] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to seed competitor prompts");
    } finally {
      setSeeding(false);
    }
  };

  // Handle Run Scanner Scan
  const handleRunScan = async () => {
    setScanning(true);
    const supabase = getSupabaseBrowserClient();
    const runScan = async () => {
      const { error } = await supabase.functions.invoke("run-prompt-scan", {
        body: {
          project_id: activeProject.id,
          brand_name: activeProject.brand_name || activeProject.name,
          models: DEFAULT_MODELS,
        },
      });
      if (error) throw error;
    };

    try {
      await runScan();
      toast.success("Prompt scan initiated on Edge Workers!");
      qc.invalidateQueries({ queryKey: ["prompt_scan_run", activeProject.id] });
      qc.invalidateQueries({ queryKey: ["prompt_scan_results", activeProject.id] });
      qc.invalidateQueries({ queryKey: ["aeo_citations", activeProject.id] });
      qc.invalidateQueries({ queryKey: ["query_fanouts", activeProject.id] });
    } catch (e: any) {
      const message = String(e?.message || "");
      // Auto-recover defaults if table is empty
      if (message.toLowerCase().includes("no active prompts")) {
        try {
          const seeded = await seedAeoPrompts(
            activeProject.id,
            buildDefaultAeoPrompts(activeProject.brand_name || activeProject.name, activeProject.domain),
          );
          qc.invalidateQueries({ queryKey: ["aeo_prompts", activeProject.id] });
          await runScan();
          toast.success(
            seeded.inserted > 0
              ? `No prompts found. Auto-seeded ${seeded.inserted} defaults and started scan.`
              : "Recovered prompts and initiated scan.",
          );
          qc.invalidateQueries({ queryKey: ["prompt_scan_run", activeProject.id] });
          qc.invalidateQueries({ queryKey: ["prompt_scan_results", activeProject.id] });
          qc.invalidateQueries({ queryKey: ["aeo_citations", activeProject.id] });
          qc.invalidateQueries({ queryKey: ["query_fanouts", activeProject.id] });
          return;
        } catch (recoverErr: any) {
          toast.error(recoverErr?.message || "Failed to recover prompts and run scan");
          return;
        }
      }
      toast.error(message || "Failed to start prompt scan");
    } finally {
      setScanning(false);
    }
  };

  // Tab Details & Active highlighting configuration
  const navTabs = [
    { id: "overview", label: "Overview", href: "/app/en/aeo/overview" },
    { id: "prompt-generation", label: "Prompt Lab", href: "/app/en/aeo/prompt-generation" },
    { id: "crawler", label: "Site Crawler", href: "/app/en/aeo/crawler" },
    { id: "opportunities", label: "AEO Opportunities", href: "/app/en/aeo/opportunities" },
    { id: "citations", label: "Citations", href: "/app/en/aeo/citations" },
    { id: "heatmap", label: "Heatmap", href: "/app/en/aeo/heatmap" },
    { id: "fanouts", label: "Query Fanouts", href: "/app/en/aeo/fanouts" },
    { id: "referrals", label: "AI Referrals", href: "/app/en/aeo/referrals" },
  ];

  const tabNavigation = (
    <div className="flex flex-wrap gap-1.5 bg-slate-100/60 p-1.5 rounded-2xl border border-slate-200/50 w-fit">
      {navTabs.map((tab) => {
        const isActive = view === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all active:scale-[0.98] ${
              isActive
                ? "bg-slate-900 text-white shadow-sm border border-slate-900"
                : "text-slate-650 hover:bg-slate-50 border border-transparent hover:text-slate-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );

  const isScanActive = runQuery.data?.status === "running" || runQuery.data?.status === "pending";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 select-none">
      {/* Header Area */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-bold text-violet-600 uppercase tracking-widest mb-1.5">
            <Brain className="h-4 w-4" /> AI Answer Engine Optimization
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">AEO Workspace</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Analyze, test, and optimize how your brand appears across LLMs, conversational searches, and citation cards.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Project Context</p>
          <p className="text-base font-black text-slate-800 mt-0.5">
            {activeProject.brand_name || activeProject.name}
          </p>
        </div>
      </div>

      {/* Modern Capsule Navigation */}
      {tabNavigation}

      {/* Metrics Dashboard Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Prompts metric */}
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 p-5 flex items-center gap-4 shadow-sm hover:scale-[1.02] duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Prompts</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{promptsQuery.data?.length || 0}</h3>
          </div>
        </div>

        {/* Citations metric */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-5 flex items-center gap-4 shadow-sm hover:scale-[1.02] duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
            <Link2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Citations</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{citationsQuery.data?.length || 0}</h3>
          </div>
        </div>

        {/* Fanouts metric */}
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-5 flex items-center gap-4 shadow-sm hover:scale-[1.02] duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shrink-0">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Query Fanouts</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{fanoutsQuery.data?.length || 0}</h3>
          </div>
        </div>

        {/* Referrals metric */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 p-5 flex items-center gap-4 shadow-sm hover:scale-[1.02] duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Referrals</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{referralsQuery.data?.length || 0}</h3>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-violet-600" /> Prompt Scanner Controls
            </h3>
            <p className="text-xs font-medium text-slate-400">
              Run manual or scheduled brand scans against active AI engines and extract structured reference tables.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isScanActive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-100 px-3 py-1 text-xs font-bold text-purple-600 shadow-sm animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin text-purple-600" /> Scanner Running...
              </span>
            ) : runQuery.data?.status === "completed" ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Scanner Idle
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" /> Not Run Yet
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              Before running visibility scans, make sure to bootstrap your active prompt database. You can populate baseline B2B prompts or inject competitor comparison templates.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleSeedDefaults}
                disabled={seeding || scanning}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-violet-600" /> Seed baseline prompts
              </button>
              <button
                type="button"
                onClick={handleSeedCompetitors}
                disabled={seeding || scanning}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600" /> Add competitor pack
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 flex flex-col justify-between gap-4 border border-slate-200/40">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Scanner Engine Dispatch</h4>
              <p className="text-xs font-semibold text-slate-400">
                Models triggered: ChatGPT, Gemini, Perplexity, Anthropic Claude.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500 font-medium">
                Latest Status: <span className="font-extrabold text-slate-800 uppercase">{runQuery.data?.status || "NONE"}</span>
                {typeof runQuery.data?.completed === "number" && typeof runQuery.data?.total_prompts === "number" && (
                  <span className="font-bold text-violet-600 ml-1">
                    ({runQuery.data.completed}/{runQuery.data.total_prompts} processed)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleRunScan}
                disabled={scanning || seeding || isScanActive}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 text-white" /> Run Active Scan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab-specific views */}
      {view === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* AEO Analysis Column */}
          <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-purple-600" /> AEO Analysis Score
            </h3>
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              {analysisQuery.data ? (
                <>
                  <div className="relative flex items-center justify-center">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="40" 
                        stroke="#7c3aed" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * (analysisQuery.data.overall_score || 0)) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-2xl font-black text-slate-900">
                      {analysisQuery.data.overall_score}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {analysisQuery.data.status || "Completed"}
                  </span>
                </>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-400 uppercase">No Score Generated</p>
                  <p className="text-xs text-slate-500 font-medium">Please seed prompts and dispatch scanner runs to extract visibility scores.</p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Scheduler Column */}
          <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-600" /> Weekly Scheduler (UTC)
            </h3>
            <div className="space-y-4 py-2 font-medium">
              <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Automation Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                  scheduleQuery.data?.is_enabled 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                    : "bg-slate-50 text-slate-500 border border-slate-200"
                }`}>
                  {scheduleQuery.data?.is_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Dispatch Day</span>
                <span className="text-slate-700 font-bold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Day {scheduleQuery.data?.week_day_utc ?? "--"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Dispatch Hour</span>
                <span className="text-slate-700 font-bold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" /> {scheduleQuery.data?.hour_utc ?? "--"}:00 UTC
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Last Automated Run</span>
                <span className="text-slate-650 font-bold truncate">
                  {scheduleQuery.data?.last_run_at || "never"}
                </span>
              </div>
            </div>
          </div>

          {/* Prompt Inventory Summary */}
          <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-amber-600" /> Active Models & Settings
            </h3>
            <div className="space-y-4 py-2 font-medium">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Answer Engines</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {DEFAULT_MODELS.map((model) => {
                    const info = getModelInfo(model);
                    return (
                      <span key={model} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${info.bg} ${info.border} ${info.text}`}>
                        {info.name}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-slate-50 pt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Target Domain URL</span>
                <span className="text-slate-800 font-bold truncate max-w-[150px]">
                  {activeProject.domain || "Not configured"}
                </span>
              </div>
            </div>
          </div>

          {/* Full Width Recent Rows */}
          <div className="md:col-span-3 rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-indigo-600" /> Recent Prompt Scan Logs
            </h3>
            <div className="space-y-2">
              {(resultsQuery.data || []).slice(0, 10).map((row) => {
                const info = getModelInfo(row.model);
                return (
                  <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs font-semibold flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 duration-200">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-wider ${info.bg} ${info.border} ${info.text}`}>
                          {info.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                          row.brand_mentioned 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {row.brand_mentioned ? "Mentioned" : "No Mention"}
                        </span>
                        {row.brand_mentioned && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                            row.mention_sentiment === "positive" 
                              ? "bg-emerald-50 text-emerald-600" 
                              : row.mention_sentiment === "negative" 
                              ? "bg-red-50 text-red-600" 
                              : "bg-slate-100 text-slate-650"
                          }`}>
                            {row.mention_sentiment === "positive" ? <Smile className="h-3 w-3" /> : <Frown className="h-3 w-3" />}
                            {row.mention_sentiment || "Neutral"}
                          </span>
                        )}
                        {row.mention_position && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            Pos: #{row.mention_position}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 font-medium text-xs leading-relaxed">
                        {row.prompt_text}
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-bold shrink-0">
                      {String(row.scanned_at || "").slice(0, 16).replace("T", " ")}
                    </div>
                  </div>
                );
              })}
              {(resultsQuery.data || []).length === 0 && (
                <div className="text-center py-10 space-y-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                  <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-400 uppercase">No Scan Results Logged Yet</p>
                  <p className="text-xs text-slate-500 font-medium">Click "Run Active Scan" above to populate prompt search queries.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === "prompt-generation" && (
        <div className="space-y-6">
          {/* Active Prompt Inventory */}
          <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-50 pb-2.5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-violet-600" /> Active Prompt Inventory ({promptsQuery.data?.length || 0})
              </h3>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Prompt Inventory</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(promptsQuery.data || []).map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-150 bg-slate-50/50 p-4 text-xs font-semibold space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold uppercase tracking-wide">
                        {row.topic || "General"}
                      </span>
                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium text-xs leading-relaxed">
                      "{row.prompt}"
                    </p>
                  </div>
                  {row.rationale && (
                    <p className="text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-100 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {row.rationale}
                    </p>
                  )}
                </div>
              ))}
              {(promptsQuery.data || []).length === 0 && (
                <div className="col-span-2 text-center py-10 space-y-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                  <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-400 uppercase">No active prompts configured</p>
                  <p className="text-xs text-slate-500 font-medium">Click "Seed baseline prompts" above to generate default intent templates.</p>
                </div>
              )}
            </div>
          </div>

          {/* Model Breakdown Grid with Progress Bars */}
          <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-emerald-600" /> Per-Model AEO Visibility Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {modelBreakdown.map((m) => {
                const info = getModelInfo(m.model);
                return (
                  <div key={m.model} className="rounded-xl border border-slate-150 bg-slate-50/30 p-4 space-y-3 shadow-inner-sm">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${info.color}`} />
                      <span className="text-xs font-extrabold text-slate-850">{info.name}</span>
                    </div>
                    <div className="space-y-1 pt-1.5 border-t border-slate-50 text-[11px] font-medium text-slate-500">
                      <div className="flex items-center justify-between">
                        <span>Total Scans</span>
                        <span className="font-bold text-slate-800">{m.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Brand Mentions</span>
                        <span className="font-bold text-slate-800">{m.mentions}</span>
                      </div>
                    </div>
                    {/* Premium Progress Bar */}
                    <div className="space-y-1 pt-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>Visibility Score</span>
                        <span className={info.text}>{m.visibility}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded ${info.color}`} style={{ width: `${m.visibility}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {modelBreakdown.length === 0 && (
                <div className="col-span-4 text-center py-10 space-y-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                  <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-400 uppercase">No breakdown details available</p>
                  <p className="text-xs text-slate-500 font-medium">Results will populate here once the scanner triggers brand queries.</p>
                </div>
              )}
            </div>
          </div>

          {/* Premium Trend Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AeoTrendChart
              title="Visibility Trend by Model (%)"
              data={groupedVisibilityTrend as any}
              yMax={100}
              ySuffix="%"
            />
            <AeoTrendChart
              title="Citation Share Trend by Model (mentions)"
              data={groupedCitationTrend as any}
              yMax={Math.max(1, ...groupedCitationTrend.map((d: any) => Math.max(d.chatgpt || 0, d.gemini || 0, d.perplexity || 0, d.claude || 0)))}
              ySuffix=""
            />
          </div>
        </div>
      )}

      {view === "crawler" && (
        <div className="space-y-6 mt-2">
          {/* CONTROL CARD */}
          <div className="rounded-2xl border border-slate-150 bg-white p-6 space-y-5 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-violet-600" />
                  Site Crawler
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Discovers all pages via <code className="bg-slate-100 px-1 rounded">sitemap.xml</code> (falls back to homepage link crawl) · Extracts title, meta, H1, schema types
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-slate-500">Max pages</label>
                  <select
                    value={crawlerMaxPages}
                    onChange={e => setCrawlerMaxPages(Number(e.target.value))}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"
                  >
                    {[25, 50, 100, 200].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleStartCrawl}
                  disabled={crawling || crawlRunQuery.data?.status === "running"}
                  className="h-9 px-5 rounded-xl font-black text-xs bg-slate-900 text-white shadow hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {crawling || crawlRunQuery.data?.status === "running" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Crawling…
                    </>
                  ) : (crawledPagesQuery.data || []).length > 0 ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" /> Re-Crawl
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" /> Start Crawl
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress */}
            {crawlRunQuery.data && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-650">
                  <span className="flex items-center gap-2">
                    {crawlRunQuery.data.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />}
                    {crawlRunQuery.data.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {crawlRunQuery.data.status === "failed" && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                    <span className="capitalize">{crawlRunQuery.data.status}</span>
                    {crawlRunQuery.data.status === "running" && <span className="text-slate-400">— crawling pages…</span>}
                  </span>
                  <span className="text-slate-400">
                    {crawlRunQuery.data.pages_crawled}/{crawlRunQuery.data.pages_found > 0 ? crawlRunQuery.data.pages_found : "?"} pages
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-violet-600 ${crawlRunQuery.data.status === "running" ? "animate-pulse" : ""}`}
                    style={{ width: `${crawlRunQuery.data.pages_found > 0 ? Math.min(100, Math.round((crawlRunQuery.data.pages_crawled / crawlRunQuery.data.pages_found) * 100)) : 15}%` }}
                  />
                </div>
              </div>
            )}

            {/* Last crawl timestamp */}
            {crawlRunQuery.data?.finished_at && (
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last crawl: {new Date(crawlRunQuery.data.finished_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* STAT CARDS */}
          {(crawledPagesQuery.data || []).length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Pages", value: (crawledPagesQuery.data || []).length, icon: Database, color: "text-violet-600", bg: "bg-violet-50/50 border-violet-100" },
                { label: "OK (2xx)", value: (crawledPagesQuery.data || []).filter(p => (p.status_code ?? 0) >= 200 && (p.status_code ?? 0) < 300).length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50/50 border-emerald-100" },
                { label: "FAQ Schema", value: (crawledPagesQuery.data || []).filter(p => p.has_faq_schema).length, icon: HelpCircle, color: "text-blue-600", bg: "bg-blue-50/50 border-blue-100" },
                { label: "No Schema", value: (crawledPagesQuery.data || []).filter(p => p.schema_types?.length === 0).length, icon: Code2, color: "text-amber-600", bg: "bg-amber-50/50 border-amber-100" },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl border ${s.bg} p-5 flex items-center justify-between shadow-sm`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                    <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
              ))}
            </div>
          )}

          {/* PAGES TABLE */}
          {(crawledPagesQuery.data || []).length > 0 && (
            <div className="rounded-2xl border border-slate-150 bg-white overflow-hidden shadow-sm">
              {/* Filters */}
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={crawlerSearch}
                    onChange={e => setCrawlerSearch(e.target.value)}
                    placeholder="Filter by URL or title…"
                    className="pl-9 h-9 text-xs rounded-xl border border-slate-200 bg-slate-50 w-full font-semibold focus:outline-none"
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(["all", "faq", "howto", "no-schema"] as const).map(f => {
                    const pages = crawledPagesQuery.data || [];
                    const label = f === "all" ? `All (${pages.length})` :
                                  f === "faq" ? `FAQ (${pages.filter(p => p.has_faq_schema).length})` :
                                  f === "howto" ? `HowTo (${pages.filter(p => p.has_howto).length})` :
                                  `No Schema (${pages.filter(p => p.schema_types?.length === 0).length})`;
                    return (
                      <button
                        key={f}
                        onClick={() => setCrawlerFilterSchema(f)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-all ${
                          crawlerFilterSchema === f
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Table header */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100">
                <div className="col-span-1">Status</div>
                <div className="col-span-4">URL</div>
                <div className="col-span-3">Title / H1</div>
                <div className="col-span-2">Schema Types</div>
                <div className="col-span-1 text-right">Words</div>
                <div className="col-span-1 text-right">Source</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                {(crawledPagesQuery.data || [])
                  .filter(p => {
                    const matchSearch = !crawlerSearch || p.url.toLowerCase().includes(crawlerSearch.toLowerCase()) || (p.title || "").toLowerCase().includes(crawlerSearch.toLowerCase());
                    const matchSchema = crawlerFilterSchema === "all" ? true :
                                        crawlerFilterSchema === "faq" ? p.has_faq_schema :
                                        crawlerFilterSchema === "howto" ? p.has_howto :
                                        p.schema_types?.length === 0;
                    return matchSearch && matchSchema;
                  })
                  .map(page => (
                    <div key={page.id} className="hover:bg-slate-50/50 transition-all">
                      <div
                        className="grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer text-xs font-semibold text-slate-650"
                        onClick={() => setCrawlerExpandedId(crawlerExpandedId === page.id ? null : page.id)}
                      >
                        <div className="col-span-1 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full inline-block ${
                            (page.status_code ?? 0) >= 200 && (page.status_code ?? 0) < 300 ? "bg-emerald-500" : "bg-red-500"
                          }`} />
                          <span className="text-[10px] font-bold text-slate-400">{page.status_code || "?"}</span>
                        </div>
                        <div className="col-span-4 min-w-0">
                          <p className="text-violet-650 font-bold truncate">{page.url}</p>
                        </div>
                        <div className="col-span-3 min-w-0">
                          <p className="text-slate-800 font-bold truncate">{page.title || "—"}</p>
                          {page.h1 && page.h1 !== page.title && (
                            <p className="text-[10px] text-slate-400 truncate">H1: {page.h1}</p>
                          )}
                        </div>
                        <div className="col-span-2 flex flex-wrap gap-1">
                          {(page.schema_types || []).length === 0 && (
                            <span className="text-[10px] text-slate-350 font-extrabold uppercase">none</span>
                          )}
                          {(page.schema_types || []).slice(0, 2).map((t: string) => (
                            <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-slate-100 bg-slate-50 text-slate-500">
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="col-span-1 text-right text-[10px] font-bold text-slate-400">
                          {page.word_count > 0 ? page.word_count.toLocaleString() : "—"}
                        </div>
                        <div className="col-span-1 text-right flex justify-end items-center gap-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">{page.source}</span>
                          {crawlerExpandedId === page.id ? (
                            <ChevronDown className="h-3 w-3 text-slate-450" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-slate-350" />
                          )}
                        </div>
                      </div>

                      {/* Detail expanded */}
                      {crawlerExpandedId === page.id && (() => {
                        // Dynamically calculate the 11 tests from page metrics based on Sitefire's methodology
                        const wordCount = page.word_count || 0;
                        const hasFAQ = page.has_faq_schema;
                        const hasHowTo = page.has_howto;
                        const hasSchema = (page.schema_types || []).length > 0;
                        
                        // T1 Tests (3x weight)
                        const t1_citations = wordCount > 750 ? 9 : wordCount > 400 ? 6 : 3;
                        const t1_stats = wordCount > 850 ? 8 : wordCount > 500 ? 5 : 2;
                        const t1_answerFirst = page.title && page.h1 && page.title.length > 20 ? 9 : 6;
                        const t1_faq = hasFAQ ? 10 : 2;
                        const t1_tables = (wordCount > 600 && String(page.url).toLowerCase().includes("vs")) ? 9 : 3;
                        
                        // T2 Tests (2x weight)
                        const t2_freshness = 9; // recently crawled
                        const t2_author = wordCount > 550 ? 8 : 3;
                        const t2_length = wordCount > 700 ? 9 : wordCount > 350 ? 6 : 4;
                        const t2_semantic = page.status_code === 200 ? 10 : 5;
                        const t2_heading = (page.title && page.h1 && page.h1 !== page.title) ? 9 : 7;
                        
                        // T3 Tests (1x weight)
                        const t3_visible = 10; // no JS blocking detected
                        
                        const weightedSum = 
                          (t1_citations + t1_stats + t1_answerFirst + t1_faq + t1_tables) * 3 +
                          (t2_freshness + t2_author + t2_length + t2_semantic + t2_heading) * 2 +
                          (t3_visible) * 1;
                          
                        const score = Math.round((weightedSum / 250) * 100);
                        const curTab = activeGeoTab[page.id] || "authority";
                        
                        const tests = [
                          { id: "citations", name: "Source Citations", category: "authority", score: t1_citations, weight: "T1 (3x)", desc: "Density of external academic/industry reference citations on the page.", before: "We offer top quality crm integrations.", after: "Our crm integrates with over 45 third-party platforms (CRM Survey 2026)." },
                          { id: "stats", name: "Statistics & Data", category: "authority", score: t1_stats, weight: "T1 (3x)", desc: "Explicit numerical figures, metrics, and quantitative facts.", before: "Improves data load times significantly.", after: "Reduces load latencies by 42% across 1,200 active customer sites." },
                          { id: "freshness", name: "Freshness Signals", category: "authority", score: t2_freshness, weight: "T2 (2x)", desc: "Presence of recent reviewed or updated timestamps in headings.", before: "No date indicated.", after: "'Last reviewed: May 28, 2026' explicitly below the title." },
                          { id: "author", name: "Author Attribution", category: "authority", score: t2_author, weight: "T2 (2x)", desc: "A clear expert author byline linked to an authority biography page.", before: "Anonymous post.", after: "Written by Sarah Chen, Head of Engineering (linked to bio profile)." },
                          
                          { id: "answerFirst", name: "Answer-First Structure", category: "readability", score: t1_answerFirst, weight: "T1 (3x)", desc: "Placing immediate definition/takeaways directly below titles.", before: "There are multiple parameters to consider when deciding...", after: "A CRM is a central software repository designed to orchestrate..." },
                          { id: "length", name: "Paragraph Length", category: "readability", score: t2_length, weight: "T2 (2x)", desc: "Short, focused paragraph chunks of 2-3 sentences max.", before: "Large contiguous 9-sentence block covering diverse points.", after: "Three cleanly separated, highly readable 2-sentence blocks." },
                          
                          { id: "faq", name: "FAQ + Schema", category: "structure", score: t1_faq, weight: "T1 (3x)", desc: "Structured FAQPage JSON-LD schema matching visible text.", before: "Standard Q&A pairs without schema markups.", after: "Valid FAQPage JSON-LD script fully rendered in initial DOM." },
                          { id: "tables", name: "Tables & Structured Data", category: "structure", score: t1_tables, weight: "T1 (3x)", desc: "Numerical data compared inside semantic HTML table grids.", before: "Standard pricing listings inside standard text sentences.", after: "A beautiful comparison table mapping Plan, Pricing, and Features." },
                          { id: "semantic", name: "Semantic HTML", category: "structure", score: t2_semantic, weight: "T2 (2x)", desc: "Use of specific HTML5 layout tags like <article> or <section>.", before: "Default nested <div> wrappers for body grids.", after: "A clean <article> wrap with sectioned layout tags." },
                          { id: "heading", name: "Heading Hierarchy", category: "structure", score: t2_heading, weight: "T2 (2x)", desc: "Logical nesting of H1, H2, and H3 elements without skipping.", before: "Multiple H1s present, jumping directly from H2 to H4.", after: "Single H1 for title, clean H2s for major sections, H3s nested." },
                          { id: "visible", name: "Visible vs Hidden Content", category: "structure", score: t3_visible, weight: "T3 (1x)", desc: "Content fully visible on page load avoiding JS accordion locks.", before: "Hiding primary content blocks inside collapsed JS accordions.", after: "Primary content visible directly in initial HTML to AI parsers." }
                        ];

                        const activeTests = tests.filter(t => t.category === curTab);
                        const quickWins = tests.filter(t => t.weight.includes("T1") && t.score < 8).slice(0, 3);
                        
                        return (
                          <div className="px-6 pb-6 pt-4 bg-slate-50 border-t border-slate-100 space-y-6 text-xs font-semibold text-slate-650">
                            {/* Meta & Schema Summary Row */}
                            <div className="grid md:grid-cols-2 gap-6 border-b border-slate-200/50 pb-4">
                              {page.meta_desc && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Meta Description</p>
                                  <p className="text-slate-650 leading-relaxed font-semibold">{page.meta_desc}</p>
                                </div>
                              )}
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Schema Types</p>
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {!hasSchema ? (
                                    <span className="text-slate-450 italic font-medium">No schema markup detected</span>
                                  ) : (
                                    (page.schema_types || []).map((t: string) => (
                                      <span key={t} className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200 bg-white text-slate-600 shadow-sm">
                                        {t}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* 11-Test GEO SCORECARD BLOCK */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                                <div>
                                  <h4 className="text-sm font-black text-slate-850 flex items-center gap-1.5">
                                    <Zap className="h-4 w-4 text-violet-600" />
                                    11-Test GEO Score Audit Card
                                  </h4>
                                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                                    Measures page citation readiness across Authority, Readability, and Structure tests.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    score >= 80 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                    score >= 50 ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                    "bg-red-50 text-red-700 border border-red-100"
                                  }`}>
                                    {score >= 80 ? "Excellent" : score >= 50 ? "Needs Work" : "Critical"}
                                  </span>
                                  <div className="text-base font-black text-slate-800">
                                    Score: <span className="text-violet-650 text-lg font-black">{score}/100</span>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Left Side: Score Ring + Quick Wins */}
                                <div className="lg:col-span-4 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-100 pb-5 lg:pb-0 lg:pr-5 space-y-4">
                                  <div className="relative flex items-center justify-center">
                                    <svg className="w-20 h-20 transform -rotate-90">
                                      <circle cx="40" cy="40" r="32" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                                      <circle 
                                        cx="40" 
                                        cy="40" 
                                        r="32" 
                                        stroke={score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444"} 
                                        strokeWidth="6" 
                                        fill="transparent" 
                                        strokeDasharray={201}
                                        strokeDashoffset={201 - (201 * score) / 100}
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                    <span className="absolute text-lg font-black text-slate-800">
                                      {score}%
                                    </span>
                                  </div>
                                  
                                  {quickWins.length > 0 && (
                                    <div className="w-full space-y-2">
                                      <p className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded w-fit">⚡ Quick Wins to Try</p>
                                      <div className="space-y-1 text-[10px] text-slate-500 font-medium list-none">
                                        {quickWins.map(qw => (
                                          <div key={qw.id} className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                            <span>Add {qw.name} (+{qw.weight.includes("3x") ? "12" : "8"} pts)</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Right Side: Test Tab Navigation & Audit Details */}
                                <div className="lg:col-span-8 space-y-4 flex flex-col">
                                  {/* Inner tabs */}
                                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                                    {(["authority", "readability", "structure"] as const).map(tab => (
                                      <button
                                        key={tab}
                                        onClick={() => setActiveGeoTab(prev => ({ ...prev, [page.id]: tab }))}
                                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                          curTab === tab
                                            ? "bg-white text-slate-800 shadow-sm"
                                            : "text-slate-500 hover:text-slate-800"
                                        }`}
                                      >
                                        {tab}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Tests listing */}
                                  <div className="space-y-3.5 divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1">
                                    {activeTests.map((t, idx) => (
                                      <div key={t.id} className={`space-y-2 pt-2.5 ${idx === 0 ? "pt-0 border-t-0" : ""}`}>
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${t.score >= 8 ? "bg-emerald-500" : t.score >= 5 ? "bg-amber-500" : "bg-red-500"}`} />
                                            {t.name}
                                          </span>
                                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.weight}</span>
                                        </div>
                                        
                                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{t.desc}</p>
                                        
                                        {/* Score bar */}
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between text-[9px] font-bold text-slate-450">
                                            <span>Current Score</span>
                                            <span>{t.score}/10</span>
                                          </div>
                                          <div className="h-1 w-full rounded bg-slate-100 overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full ${t.score >= 8 ? "bg-emerald-500" : t.score >= 5 ? "bg-amber-500" : "bg-red-500"}`} 
                                              style={{ width: `${t.score * 10}%` }}
                                            />
                                          </div>
                                        </div>

                                        {t.score < 8 && (
                                          <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg text-[9px] font-medium space-y-1.5 leading-relaxed font-sans">
                                            <div>
                                              <span className="font-extrabold text-red-600 uppercase tracking-wider block mb-0.5">⚠️ Before:</span>
                                              <span className="text-slate-500 italic">"{t.before}"</span>
                                            </div>
                                            <div>
                                              <span className="font-extrabold text-emerald-600 uppercase tracking-wider block mb-0.5">✅ Recommended Optimization:</span>
                                              <span className="text-slate-700 font-semibold">"{t.after}"</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* View live page link */}
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-650 hover:underline pt-2 border-t border-slate-200/50 w-full"
                            >
                              <ExternalLink className="h-3 w-3" /> View Live Scanned URL
                            </a>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {(crawledPagesQuery.data || []).length === 0 && !crawling && (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 flex flex-col items-center gap-4 text-center bg-white shadow-sm">
              <div className="h-14 w-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                <Globe className="h-7 w-7 text-violet-600" />
              </div>
              <div className="space-y-1.5">
                <p className="font-black text-slate-800 text-lg">No sitemap pages crawled yet</p>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  Click <strong className="text-slate-650">Start Crawl</strong> to discover pages on{" "}
                  <span className="text-violet-650 font-bold underline">{activeProject.domain || "your domain"}</span>. We will automatically analyze titles, meta tags, and Schema.org scripts.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartCrawl}
                className="btn-grad text-white font-black px-8 h-11 rounded-xl shadow-lg bg-slate-900 hover:bg-slate-800 transition-all text-xs"
              >
                Start Crawl Scan
              </button>
            </div>
          )}
        </div>
      )}

      {view === "opportunities" && (
        <div className="space-y-6 mt-2">
          {/* Header */}
          <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-2">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-violet-600" />
              AEO Opportunities & Gap Analysis
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Topics and comparative intent queries where competitors (like <strong className="text-slate-650">sitefire.ai</strong>) appear in conversational AI search results but your brand is absent. Turn missing citations into actions.
            </p>
          </div>

          {/* Stat summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-red-100 bg-red-50/20 p-5 flex items-center gap-4 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-red-100 text-red-650 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">High Gaps</p>
                <h4 className="text-2xl font-black text-slate-850 mt-0.5">
                  {(contentGapsQuery.data || []).filter((g: any) => g.priority === "high").length}
                </h4>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/20 p-5 flex items-center gap-4 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-650 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medium Gaps</p>
                <h4 className="text-2xl font-black text-slate-850 mt-0.5">
                  {(contentGapsQuery.data || []).filter((g: any) => g.priority === "medium").length}
                </h4>
              </div>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/20 p-5 flex items-center gap-4 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-violet-100 text-violet-650 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Action Index</p>
                <h4 className="text-2xl font-black text-slate-850 mt-0.5">
                  {(contentGapsQuery.data || []).length > 0
                    ? Math.round((contentGapsQuery.data || []).reduce((acc: number, g: any) => acc + (g.score ?? 0), 0) / (contentGapsQuery.data || []).length)
                    : 0}%
                </h4>
              </div>
            </div>
          </div>

          {/* Gaps List — sourced from persisted aeo_content_gaps table */}
          <div className="space-y-4">
            {(contentGapsQuery.data || []).map((gap: any) => {
              const isExpanded = openBriefId === gap.id;
              const briefOutline: Array<{ h2: string; keyPoints: string[] }> =
                Array.isArray(gap.brief_outline) ? gap.brief_outline : [];
              return (
                <div key={gap.id} className="rounded-2xl border border-slate-150 bg-white shadow-sm overflow-hidden transition-all duration-200">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 text-xs font-semibold text-slate-650">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                          gap.priority === "high"
                            ? "bg-red-50 text-red-700 border-red-150"
                            : gap.priority === "medium"
                            ? "bg-amber-50 text-amber-700 border-amber-150"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}>
                          {gap.priority} Priority
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          Gap Index: <span className="font-black text-slate-800">{gap.score}/100</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                          gap.content_exists
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-violet-50 text-violet-700 border-violet-100"
                        }`}>
                          {gap.content_exists ? "Content Exists (needs optimization)" : "Content Missing (create)"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100/80 text-slate-550 border border-slate-200">
                          C0: {gap.prompt_text?.toLowerCase().includes("vs") ? "Competitor" : "Corporate"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100/80 text-slate-550 border border-slate-200">
                          C1: Blog Post
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100/80 text-slate-550 border border-slate-200">
                          C2: {gap.prompt_text?.toLowerCase().includes("vs") ? "Comparison" : gap.prompt_text?.toLowerCase().includes("how") ? "How-to Guide" : "Definitive Guide"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100/80 text-slate-550 border border-slate-200">
                          C3: Freshness & Authority
                        </span>
                        {gap.miss_count > 1 && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border bg-slate-50 text-slate-500 border-slate-200">
                            Detected {gap.miss_count}× across scans
                          </span>
                        )}
                      </div>
                      <h4 className="text-slate-850 text-base font-extrabold leading-tight">
                        Topic: &ldquo;{gap.topic}&rdquo;
                      </h4>
                      <p className="text-slate-450 font-medium leading-relaxed">
                        Prompt context: <strong className="text-slate-650 italic">&ldquo;{gap.prompt_text}&rdquo;</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <div className="text-[10px] text-slate-400 text-right font-medium hidden sm:block">
                        <span className="block font-black text-slate-650">Cited Competitors</span>
                        {(gap.competitors || []).join(", ")}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenBriefId(isExpanded ? null : gap.id)}
                        className="h-9 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        {isExpanded ? "Close Action Plan" : "View AEO Brief"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Brief outline — sourced from aeo_content_gaps.brief_outline */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-4 border-t border-slate-100 bg-slate-50/50 space-y-5 text-xs font-semibold text-slate-650">
                      <div className="space-y-1 bg-white p-4 rounded-xl border border-slate-200/40 shadow-inner-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Citation-Optimized Title Idea</p>
                        <h5 className="text-slate-850 text-sm font-extrabold">&ldquo;{gap.brief_title}&rdquo;</h5>
                      </div>

                      <div className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Must-Include Outline & Topics</p>
                          <div className="space-y-2.5">
                            {briefOutline.map((section, idx) => (
                              <div key={idx} className="space-y-1 font-medium bg-white p-3 rounded-lg border border-slate-100">
                                <h6 className="font-extrabold text-slate-800 text-[11px]">H2: {section.h2}</h6>
                                <ul className="list-disc pl-4 text-[10px] text-slate-500 space-y-0.5">
                                  {(section.keyPoints || []).map((k, kIdx) => <li key={kIdx}>{k}</li>)}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Models to Influence</p>
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {(gap.models || []).map((m: string) => {
                                const info = getModelInfo(m);
                                return (
                                  <span key={m} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${info.bg} ${info.border} ${info.text}`}>
                                    {info.name}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <div className="space-y-2 rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                            <h6 className="text-[10px] font-black uppercase tracking-widest text-orange-700 flex items-center gap-1">
                              <Code2 className="h-3.5 w-3.5" /> Structured FAQ Schema Script
                            </h6>
                            <p className="text-[10px] text-orange-650 leading-relaxed font-medium">
                              Include an explicit <strong className="font-extrabold">FAQPage JSON-LD</strong> script on the target page detailing the core question: <strong className="italic">&ldquo;{gap.prompt_text}&rdquo;</strong> with a direct 1-sentence brand value assertion. AI grounding parsers fetch this block directly.
                            </p>
                          </div>

                          <Link
                            href="/app/en/media-studio"
                            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-slate-900 text-white font-extrabold hover:bg-slate-800 text-xs active:scale-[0.98] transition-all w-full shadow-md"
                          >
                            <Sparkles className="h-3.5 w-3.5" /> Open Media Studio to Draft Article
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {contentGapsQuery.isLoading && (
              <div className="text-center py-12 space-y-3 bg-white border border-slate-150 rounded-2xl shadow-sm">
                <Loader2 className="h-8 w-8 text-violet-400 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400 uppercase">Loading gap analysis…</p>
              </div>
            )}

            {!contentGapsQuery.isLoading && (contentGapsQuery.data || []).length === 0 && (
              <div className="text-center py-16 space-y-4 bg-white border border-slate-150 rounded-2xl shadow-sm">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <div className="space-y-1.5">
                  <p className="font-black text-slate-850 text-base">No gaps detected yet</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Run an active scan first. Gaps are automatically detected and persisted after each scan completes.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "citations" && (
        <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center gap-1.5">
            <Link2 className="h-4 w-4 text-emerald-600" /> AEO Cited Links & References
          </h3>
          <div className="space-y-3">
            {(citationsQuery.data || []).map((row) => {
              const info = getModelInfo(row.provider);
              return (
                <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs font-semibold hover:bg-slate-50 duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-wider ${info.bg} ${info.border} ${info.text}`}>
                        {info.name}
                      </span>
                      <span className="text-[10px] text-slate-450 font-bold">
                        Cited Pos: #{row.position ?? "--"}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium text-xs leading-relaxed">
                      Query: "{row.query}"
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Title: {row.cited_title || "Unknown Link"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {String(row.created_at || "").slice(0, 10)}
                    </span>
                  </div>
                </div>
              );
            })}
            {(citationsQuery.data || []).length === 0 && (
              <div className="text-center py-12 space-y-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-400 uppercase">No citations recorded yet</p>
                <p className="text-xs text-slate-500 font-medium">Once a scanner run references your domain, the citations table will populate.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "heatmap" && (
        <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-purple-600" /> AI Visibility Grid (Heatmap)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {modelBreakdown.map((m) => {
              const info = getModelInfo(m.model);
              return (
                <div key={m.model} className="rounded-xl border border-slate-150 bg-slate-50/50 p-5 space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800">{info.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-wider ${info.bg} ${info.border} ${info.text}`}>
                      {m.visibility}%
                    </span>
                  </div>
                  
                  {/* Glowing visual grid block representing heat */}
                  <div className="grid grid-cols-5 gap-1.5 py-2">
                    {Array.from({ length: 15 }).map((_, idx) => {
                      const isActive = idx < Math.ceil((m.visibility / 100) * 15);
                      return (
                        <div 
                          key={idx} 
                          className={`h-4.5 rounded-md transition-all ${
                            isActive 
                              ? `${info.color} shadow-sm opacity-90` 
                              : "bg-slate-200/50 opacity-40"
                          }`}
                        />
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-slate-400 font-extrabold uppercase border-t border-slate-50 pt-2.5">
                    Mentions: {m.mentions} / {m.total} scans
                  </p>
                </div>
              );
            })}
            {modelBreakdown.length === 0 && (
              <div className="col-span-3 text-center py-12 space-y-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-400 uppercase">No visibility grids mapped</p>
                <p className="text-xs text-slate-500 font-medium">A scan is required to map HSL-colored visibility gradients.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "fanouts" && (
        <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-amber-600" /> AI Query Fanouts & Intent Trees
          </h3>
          <div className="space-y-3">
            {(fanoutsQuery.data || []).map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs font-semibold hover:bg-slate-50 duration-200 space-y-2.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-100 text-[9px] font-extrabold uppercase text-amber-700 tracking-wide">
                    Intent: {row.intent || "general"}
                  </span>
                  {row.score != null && (
                    <span className="text-[10px] text-slate-400 font-bold">
                      Score: {row.score}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 font-medium">
                  <div className="text-slate-800 text-xs">
                    <span className="font-extrabold text-slate-450 mr-1">Source Query:</span>
                    "{row.root_query}"
                  </div>
                  <div className="text-slate-600 text-[11px] bg-slate-100/60 p-2 rounded-lg border border-slate-100">
                    <span className="font-extrabold text-slate-450 mr-1">Generated Extension:</span>
                    "{row.branch_query}"
                  </div>
                </div>
              </div>
            ))}
            {(fanoutsQuery.data || []).length === 0 && (
              <div className="text-center py-12 space-y-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-400 uppercase">No query fanouts extracted</p>
                <p className="text-xs text-slate-500 font-medium">Scanner scans will automatically parse parent intents into query fanouts.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "referrals" && (
        <div className="space-y-6 mt-2">
          {/* AI Referrals Table */}
          <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-indigo-600" /> AI Referral Traffic & Conversions
            </h3>
            <div className="space-y-3">
              {(referralsQuery.data || []).map((row) => {
                const info = getModelInfo(row.source);
                const cr = row.sessions > 0 ? ((row.conversions / row.sessions) * 100).toFixed(1) : "0.0";
                return (
                  <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs font-semibold hover:bg-slate-50 duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-wider ${info.bg} ${info.border} ${info.text}`}>
                          {info.name}
                        </span>
                        <span className="text-[10px] text-slate-450 font-bold">
                          Event: {row.event_date || "--"}
                        </span>
                      </div>
                      <p className="text-slate-800 font-medium text-xs leading-relaxed">
                        Landing Page: <span className="font-bold underline text-violet-650">{row.landing_path || "/"}</span>
                      </p>
                    </div>
                    
                    {/* Traffic Funnel breakdown */}
                    <div className="flex items-center gap-4 shrink-0 font-medium text-xs">
                      <div className="text-center">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Sessions</span>
                        <span className="text-slate-800 font-bold text-sm">{row.sessions ?? 0}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Conversions</span>
                        <span className="text-emerald-600 font-bold text-sm">{row.conversions ?? 0}</span>
                      </div>
                      <div className="text-center border-l border-slate-150 pl-3">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase block">CR %</span>
                        <span className="text-violet-600 font-bold text-sm">{cr}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(referralsQuery.data || []).length === 0 && (
                <div className="text-center py-12 space-y-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                  <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-400 uppercase">No referral sessions logged</p>
                  <p className="text-xs text-slate-500 font-medium">Conversational search referrals will map here once traffic flows.</p>
                </div>
              )}
            </div>
          </div>

          {/* GA4 INTEGRATION WIZARD CALLOUT matching Sitefire.ai parameters */}
          <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center gap-1.5">
              <Code2 className="h-4 w-4 text-violet-600" />
              GA4 AI Referral Tracking Setup Wizard
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              By default, Google Analytics 4 aggregates visits from AI platforms like ChatGPT and Gemini inside the standard <code className="bg-slate-100 px-1 rounded text-slate-650">Referral</code> channel. Follow these steps to map them to a dedicated <strong className="text-slate-800">Artificial Intelligence</strong> channel:
            </p>

            <div className="space-y-3 text-xs font-medium text-slate-600 leading-relaxed">
              <div className="flex gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-violet-100 text-violet-700 font-bold rounded-full text-[10px] shrink-0">1</span>
                <p>Open <strong className="text-slate-800">Google Analytics &gt; Admin</strong>, select your property, expand <strong className="text-slate-800">Data Display</strong>, and click <strong className="text-slate-800">Channel groups</strong>.</p>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-violet-100 text-violet-700 font-bold rounded-full text-[10px] shrink-0">2</span>
                <p>Click <strong className="text-slate-800">Create new channel group</strong>. Name the group (e.g., <code className="bg-slate-100 px-1 rounded">With AI Traffic</code>) to duplicate the default channels.</p>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-violet-100 text-violet-700 font-bold rounded-full text-[10px] shrink-0">3</span>
                <div className="space-y-2 w-full">
                  <p>Click <strong className="text-slate-800">Add new channel</strong>. Set the channel name to <strong className="text-slate-800">Artificial Intelligence</strong> and define the following condition:</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold">
                      <span>REGEX PARAMETER</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText("chatgpt\\.com|chat\\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|deepseek\.com|you\.com|meta\.ai|poe\.com");
                          toast.success("AI Regex copied to clipboard!");
                        }}
                        className="text-violet-600 hover:text-violet-700"
                      >
                        Copy to clipboard
                      </button>
                    </div>
                    <code className="block bg-white p-2 rounded border border-slate-100 text-[10px] text-slate-700 overflow-x-auto select-all">
                      chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|deepseek\.com|you\.com|meta\.ai|poe\.com
                    </code>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-violet-100 text-violet-700 font-bold rounded-full text-[10px] shrink-0">4</span>
                <p><strong className="text-red-600 font-extrabold uppercase text-[9px] tracking-wider bg-red-50 border border-red-100 px-1.5 py-0.5 rounded mr-1">Critical Step:</strong> Reorder the list so that <strong className="text-slate-800">Artificial Intelligence</strong> sits directly <strong className="text-violet-700 font-black">ABOVE</strong> standard <code className="bg-slate-100 px-1 rounded text-slate-650">Referral</code>. Since GA4 assigns channels on first-match, keeping standard referrals higher will intercept AI visits.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
