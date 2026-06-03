"use client";

import { useState, useEffect, FormEvent } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProjects } from "@/hooks/useProjects";
import { generateSocialPostDraft, generateHighQualityImage } from "@/lib/services/social";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapServiceError } from "@/lib/services/errors";

interface GeneratedAsset {
  id: string;
  url: string;
  prompt: string;
  enhancedPrompt?: string;
  caption: string;
  hashtags: string[];
  date: string;
  format: string;
}

interface BrandPreset {
  id: string;
  name: string;
  color: string;
  logoUrl?: string;
  tagline?: string;
  description?: string;
  domain?: string;
}

const FORMATS = [
  { id: "square", name: "Square", size: "1080×1080" },
  { id: "landscape", name: "Landscape", size: "1200×628" },
  { id: "portrait", name: "Portrait", size: "1080×1350" },
  { id: "story", name: "Story", size: "1080×1920" },
  { id: "banner", name: "Banner", size: "1920×1080" },
];

async function fetchSiteMetadata(url: string): Promise<{
  brand_name?: string;
  brand_tagline?: string;
  brand_description?: string;
  og_image_url?: string;
  favicon_url?: string;
}> {
  let html = "";
  if (!html) {
    try {
      const res = await fetch(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`);
      html = await res.text();
    } catch {}
  }
  if (!html) {
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data?.contents) html = data.contents;
    } catch {}
  }
  if (!html) return {};

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const getMeta = (name: string) =>
      doc.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ||
      doc.querySelector(`meta[property="${name}"]`)?.getAttribute("content") ||
      "";
    const title = getMeta("og:site_name") || getMeta("og:title") || doc.querySelector("title")?.textContent || "";
    const description = getMeta("og:description") || getMeta("description") || "";
    const image = getMeta("og:image") || "";
    const faviconHref =
      doc.querySelector('link[rel="icon"]')?.getAttribute("href") ||
      doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ||
      "/favicon.ico";
    const favicon = new URL(faviconHref, url).toString();
    return {
      brand_name: title.trim(),
      brand_tagline: getMeta("og:title").trim(),
      brand_description: description.trim(),
      og_image_url: image.trim(),
      favicon_url: favicon.trim(),
    };
  } catch {
    return {};
  }
}

function normalizeUrl(raw: string) {
  if (!raw) return "";
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) return `https://${raw}`;
  return raw;
}

function buildPremiumEnhancedPrompt(input: string, brand: {
  name?: string;
  tagline?: string;
  description?: string;
  domain?: string;
}): string {
  const clean = input.trim();
  const brandName = brand.name || "Brand";
  const tagline = brand.tagline || "";
  const description = brand.description || "";
  const domain = brand.domain || "";

  return [
    `Create a high-quality digital marketing banner for ${clean}.`,
    `Brand context: ${brandName}${tagline ? ` — ${tagline}` : ""}. ${description}`.trim(),
    `Visual direction: modern smart factory environment with advanced machinery, robotic arms, automated production lines, CNC systems, and industrial engineers using digital tablets.`,
    `Industry 4.0 cues: AI automation, IoT connectivity, cloud workflows, data analytics dashboards, and global supply-chain style overlays.`,
    `Composition: premium editorial layout with strong visual hierarchy, clean negative space, and clear focal flow from operations to digital growth outcomes.`,
    `Color and lighting: corporate blue, steel/silver, and controlled orange accents; cinematic yet professional lighting with crisp contrast.`,
    `Marketing intent: B2B authority, innovation, reliability, and measurable growth performance.`,
    `Deliverable quality: polished, campaign-ready creative suitable for social ads, website hero banners, and LinkedIn promotions.`,
    `Text and logo handling: reserve clean space for headline and CTA; reserve an explicit logo-safe area (top-right or bottom-right) with strong contrast and no obstruction.`,
    `Hard constraints: do not invent random brand names, do not add unrelated logos, no low-quality collage artifacts, no chaotic typography.`,
    domain ? `Brand website reference: ${domain}.` : "",
  ].filter(Boolean).join(" ");
}

export function MediaStudioWorkspace() {
  const { activeProject } = useProjects();
  const qc = useQueryClient();

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeFormat, setActiveFormat] = useState("square");
  const [activePreset, setActivePreset] = useState("brand-default");
  const [style, setStyle] = useState("auto");
  const [quality, setQuality] = useState("high");
  const [isFetchingBrand, setIsFetchingBrand] = useState(false);
  const [customPresets, setCustomPresets] = useState<BrandPreset[]>([]);

  // AI Enhancements State
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);

  // Dialog & View State
  const [activeTab, setActiveTab] = useState<"image" | "video">("image");
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState("");
  const [schedulingAsset, setSchedulingAsset] = useState<GeneratedAsset | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [schedulePlatform, setSchedulePlatform] = useState("instagram");
  const [lastGenerationRequest, setLastGenerationRequest] = useState<{
    prompt: string;
    format: string;
  } | null>(null);

  // Fetch Assets from Supabase
  const assetsQuery = useQuery({
    queryKey: ["media_assets", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("project_id", activeProject!.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        url: item.image_url,
        prompt: item.prompt,
        enhancedPrompt: item.enhanced_prompt,
        caption: item.caption,
        hashtags: item.hashtags || [],
        date: item.created_at,
        format: item.format || "square",
      })) as GeneratedAsset[];
    },
  });

  const savedAssets = assetsQuery.data || [];

  // Load Custom Presets
  useEffect(() => {
    if (!activeProject?.id) return;
    const stored = localStorage.getItem(`media_studio_presets_${activeProject.id}`);
    if (stored) {
      try {
        setCustomPresets(JSON.parse(stored));
      } catch {
        setCustomPresets([]);
      }
    } else {
      setCustomPresets([]);
    }
  }, [activeProject?.id]);

  const projectPreset: BrandPreset = {
    id: "brand-default",
    name: activeProject?.brand_name || activeProject?.name || "Your Brand",
    color: "bg-purple-500",
    logoUrl: (activeProject?.brand_logo_url || activeProject?.og_image_url || activeProject?.favicon_url) ?? undefined,
    tagline: activeProject?.brand_tagline ?? undefined,
    description: activeProject?.brand_description ?? undefined,
    domain: activeProject?.domain ?? undefined,
  };

  const presets = [projectPreset, ...customPresets];
  const activePresetData = presets.find((p) => p.id === activePreset) || presets[0];

  const savePresetsToLocal = (items: BrandPreset[]) => {
    setCustomPresets(items);
    if (activeProject?.id) {
      localStorage.setItem(`media_studio_presets_${activeProject.id}`, JSON.stringify(items));
    }
  };

  const handleAddPreset = () => {
    const name = window.prompt("Preset name");
    if (!name?.trim()) return;
    const next: BrandPreset = {
      id: `preset_${Date.now()}`,
      name: name.trim(),
      color: "bg-blue-500",
      logoUrl: (activeProject?.brand_logo_url || activeProject?.og_image_url || activeProject?.favicon_url) ?? undefined,
      tagline: activeProject?.brand_tagline ?? undefined,
      description: activeProject?.brand_description ?? undefined,
      domain: activeProject?.domain ?? undefined,
    };
    savePresetsToLocal([next, ...customPresets]);
    setActivePreset(next.id);
  };

  const handleAutoFetchBrand = async () => {
    const domain = normalizeUrl(activeProject?.domain || "");
    if (!domain) {
      toast.error("Set brand domain first in Branding");
      return;
    }
    setIsFetchingBrand(true);
    try {
      const meta = await fetchSiteMetadata(domain);
      const updated = customPresets.map((p) =>
        p.id === activePreset
          ? {
              ...p,
              name: meta.brand_name || p.name,
              tagline: meta.brand_tagline || p.tagline,
              description: meta.brand_description || p.description,
              logoUrl: meta.og_image_url || meta.favicon_url || p.logoUrl,
              domain,
            }
          : p
      );
      if (activePreset === "brand-default") {
        if (activeProject?.id) {
          const supabase = getSupabaseBrowserClient();
          const { error: updateErr } = await supabase
            .from("projects")
            .update({
              brand_name: meta.brand_name || activeProject.brand_name || activeProject.name,
              brand_tagline: meta.brand_tagline || activeProject.brand_tagline,
              brand_description: meta.brand_description || activeProject.brand_description,
              og_image_url: meta.og_image_url || activeProject.og_image_url,
              favicon_url: meta.favicon_url || activeProject.favicon_url,
            })
            .eq("id", activeProject.id);

          if (updateErr) throw updateErr;
          qc.invalidateQueries({ queryKey: ["projects"] });
          toast.success("Fetched and updated website branding in database!");
        } else {
          toast.error("No active project selected");
        }
      } else {
        savePresetsToLocal(updated);
        toast.success("Preset updated from website metadata");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Could not fetch brand info from website");
    } finally {
      setIsFetchingBrand(false);
    }
  };

  const handleGenerate = async () => {
    if (!activeProject?.id) {
      toast.error("No active project selected.");
      return;
    }

    if (!prompt.trim()) {
      toast.error("Please describe the image you want to create");
      return;
    }

    setGenerating(true);
    setLastGenerationRequest({ prompt, format: activeFormat });
    try {
      toast.info("Analyzing prompt and generating copy...");

      // 1. Build generation prompt
      const generationPrompt =
        enhancedPrompt?.trim() ||
        buildPremiumEnhancedPrompt(prompt, {
          name: activePresetData?.name || activeProject?.brand_name || activeProject?.name,
          tagline: activePresetData?.tagline || activeProject?.brand_tagline || "",
          description: activePresetData?.description || activeProject?.brand_description || "",
          domain: activePresetData?.domain || activeProject?.domain || "",
        });

      // 2. Generate Caption, Hashtags, and Refined Prompt
      const draft = await generateSocialPostDraft({
        brandName: activePresetData?.name || activeProject?.brand_name || activeProject?.name || "Brand",
        brandDescription: activePresetData?.description || activeProject?.brand_description || "",
        prompt: generationPrompt,
        platform: "instagram",
      });

      const safeCaption =
        draft.caption?.trim() ||
        `Discover what ${activePresetData?.name || activeProject?.brand_name || activeProject?.name || "our brand"} can do for your business.`;
      const safeHashtags =
        draft.hashtags && draft.hashtags.length > 0
          ? draft.hashtags
          : ["marketing", "business", "growth", "ai"];
      const safeImagePrompt = draft.imagePrompt?.trim() || generationPrompt;

      setEnhancedPrompt(safeImagePrompt);
      setGeneratedCaption(safeCaption);
      setGeneratedHashtags(safeHashtags);

      toast.info("Generating high-quality image...");

      // 3. Generate Image
      const imageUrl = await generateHighQualityImage(
        safeImagePrompt,
        activeProject?.id,
        "instagram",
        true,
        activePresetData?.name || activeProject?.brand_name || activeProject?.name || "Brand",
        activePresetData?.logoUrl || activeProject?.og_image_url || ""
      );

      if (!imageUrl) throw new Error("No image URL returned");

      // 4. Save to Supabase
      const supabase = getSupabaseBrowserClient();
      const userRes = await supabase.auth.getUser();

      const { error } = await supabase.from("media_assets").insert({
        project_id: activeProject.id,
        user_id: userRes.data.user?.id ?? null,
        image_url: imageUrl,
        prompt: prompt,
        enhanced_prompt: safeImagePrompt,
        caption: safeCaption,
        hashtags: safeHashtags,
        format: activeFormat,
      });

      if (error) {
        throw error;
      }

      toast.success("Asset generated and saved to database!");
      setPrompt("");
      qc.invalidateQueries({ queryKey: ["media_assets", activeProject.id] });
    } catch (error: any) {
      console.error("Generation error:", error);
      const mapped = mapServiceError(error);
      if (mapped.code === "AUTH_EXPIRED") {
        toast.error("Session expired. Please sign in again, then retry generation.");
      } else if (mapped.code === "NETWORK" || mapped.code === "TIMEOUT" || mapped.code === "ABORTED") {
        toast.error("Network issue while generating. Check connection and use Retry Last Generation.");
      } else {
        toast.error(error?.message || "Failed to generate asset. Please try again.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleRetryLastGeneration = async () => {
    if (!lastGenerationRequest) {
      toast.error("No previous failed generation to retry.");
      return;
    }
    setPrompt(lastGenerationRequest.prompt);
    setActiveFormat(lastGenerationRequest.format);
    await handleGenerate();
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("media_assets").delete().eq("id", id);

      if (error) throw error;

      toast.success("Asset deleted");
      if (activeProject?.id) {
        qc.invalidateQueries({ queryKey: ["media_assets", activeProject.id] });
      }
    } catch {
      toast.error("Failed to delete asset from database");
    }
  };

  const handleUpdateCaption = async (id: string, newCaption: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("media_assets").update({ caption: newCaption }).eq("id", id);

      if (error) throw error;

      toast.success("Caption updated");
      if (activeProject?.id) {
        qc.invalidateQueries({ queryKey: ["media_assets", activeProject.id] });
      }
    } catch {
      toast.error("Failed to update caption");
    }
  };

  const handleUpdateHashtags = async (id: string, newHashtags: string[]) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("media_assets").update({ hashtags: newHashtags }).eq("id", id);

      if (error) throw error;

      toast.success("Hashtags updated");
      if (activeProject?.id) {
        qc.invalidateQueries({ queryKey: ["media_assets", activeProject.id] });
      }
    } catch {
      toast.error("Failed to update hashtags");
    }
  };

  const handleSchedulePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!schedulingAsset || !scheduleDate) {
      toast.error("Please select a date and time");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("social_posts").insert({
        project_id: activeProject!.id,
        platform: schedulePlatform,
        caption: schedulingAsset.caption,
        hashtags: schedulingAsset.hashtags,
        image_url: schedulingAsset.url,
        status: "scheduled",
        scheduled_at: new Date(scheduleDate).toISOString(),
      });

      if (error) throw error;

      toast.success(`Post scheduled successfully for ${schedulePlatform}!`);
      setSchedulingAsset(null);
      setScheduleDate("");
    } catch {
      toast.error("Failed to schedule post");
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Media Studio</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Create stunning B2B visual assets, prompt enhancements, and schedule posts.
          </p>
          {assetsQuery.error && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-red-50 px-2 py-1 font-semibold text-red-700">
                Failed to load asset library.
              </span>
              <button
                type="button"
                onClick={() => assetsQuery.refetch()}
                className="rounded border px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Retry Load
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Generated Assets</p>
            <h3 className="text-2xl font-black text-slate-900">{savedAssets.length}</h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 8-6 4 6 4V8Z"/>
              <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Video Engine</p>
            <h3 className="text-2xl font-black text-slate-900">0</h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Brand Presets</p>
            <h3 className="text-2xl font-black text-slate-900">{presets.length}</h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Workspaces</p>
            <h3 className="text-2xl font-black text-slate-900">{activeProject ? 1 : 0}</h3>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Generator Form */}
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            {/* Tabs Headers */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setActiveTab("image")}
                className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-bold transition-all ${
                  activeTab === "image"
                    ? "border-slate-900 text-slate-900 bg-white"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
                Image Generation
              </button>
              <button
                onClick={() => setActiveTab("video")}
                className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-bold transition-all ${
                  activeTab === "video"
                    ? "border-slate-900 text-slate-900 bg-white"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 8-6 4 6 4V8Z"/>
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
                </svg>
                Video Generation
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              {activeTab === "image" ? (
                <div className="space-y-6">
                  {/* Prompt Textarea */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Describe visual style and target</label>
                    <div className="relative">
                      <textarea
                        rows={4}
                        placeholder="Describe the image you want to create..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 pr-32 text-sm font-medium focus:border-slate-900 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (!prompt.trim()) {
                            toast.error("Enter a base prompt first.");
                            return;
                          }
                          const enhanced = buildPremiumEnhancedPrompt(prompt, {
                            name: activePresetData?.name || activeProject?.brand_name || activeProject?.name,
                            tagline: activePresetData?.tagline || activeProject?.brand_tagline || "",
                            description: activePresetData?.description || activeProject?.brand_description || "",
                            domain: activePresetData?.domain || activeProject?.domain || "",
                          });
                          setEnhancedPrompt(enhanced);
                          toast.success("AI prompt generated.");
                        }}
                        className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold hover:bg-slate-50"
                      >
                        <svg className="h-3.5 w-3.5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m15 4 5 5"/>
                          <path d="M3 21v-3l12-12 3 3-12 12H3Z"/>
                        </svg>
                        Enhance with AI
                      </button>
                    </div>
                  </div>

                  {/* Brand Presets */}
                  <div className="space-y-3">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Brand Preset</label>
                      <button
                        type="button"
                        onClick={handleAutoFetchBrand}
                        disabled={isFetchingBrand || !activeProject?.domain}
                        className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {isFetchingBrand ? (
                          <svg className="animate-spin h-3 w-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                          </svg>
                        ) : (
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                        )}
                        Auto Fetch Site Info
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {presets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setActivePreset(preset.id)}
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                            activePreset === preset.id
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {preset.logoUrl ? (
                            <img
                              src={preset.logoUrl}
                              alt={preset.name}
                              className="h-5 w-5 rounded-md object-cover border border-slate-200 shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm ${
                              activePreset === preset.id
                                ? "bg-violet-600 text-white"
                                : "bg-violet-100 text-violet-700"
                            }`}>
                              {preset.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {preset.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddPreset}
                        className="flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"/><path d="M12 5v14"/>
                        </svg>
                        Add New
                      </button>
                    </div>
                  </div>

                  {/* Format Grid */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Format</label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {FORMATS.map((format) => (
                        <button
                          key={format.id}
                          onClick={() => setActiveFormat(format.id)}
                          className={`rounded-xl border p-3 text-center transition-all ${
                            activeFormat === format.id
                              ? "border-slate-900 bg-slate-50/50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <svg className={`mx-auto h-5 w-5 ${activeFormat === format.id ? "text-slate-900" : "text-slate-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                            <circle cx="9" cy="9" r="2"/>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                          </svg>
                          <p className="mt-1 text-xs font-bold text-slate-800">{format.name}</p>
                          <p className="text-[10px] font-semibold text-slate-400">{format.size}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dropdowns */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Style</label>
                      <select
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold focus:outline-none"
                      >
                        <option value="auto">Auto (Brand Based)</option>
                        <option value="photo">Realistic B2B Editorial</option>
                        <option value="minimal">Minimal Flat Lay</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Quality</label>
                      <select
                        value={quality}
                        onChange={(e) => setQuality(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold focus:outline-none"
                      >
                        <option value="high">High Definition</option>
                        <option value="standard">Standard</option>
                      </select>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-base font-bold text-white shadow hover:bg-slate-850 disabled:opacity-60"
                  >
                    {generating ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                        </svg>
                        Generating B2B Assets...
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
                        </svg>
                        Generate Media Campaign
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRetryLastGeneration}
                    disabled={generating || !lastGenerationRequest}
                    className="mt-2 w-full rounded-xl border py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Retry Last Generation
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m22 8-6 4 6 4V8Z"/>
                      <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
                    </svg>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">B2B Video Engine</h3>
                  <p className="mt-1 max-w-xs text-xs font-medium text-slate-500">
                    Next-generation text-to-video campaign generator. In pipeline.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI comparative sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <svg className="h-4 w-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
              </svg>
              AI Comparison
            </h3>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Original Base Input</span>
              <div className="rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-600 border min-h-[50px]">
                {prompt || "Provide base prompt..."}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">AI Enhanced Vision</span>
              <div className="rounded-lg bg-purple-50/50 p-3 text-xs font-semibold text-purple-950 border border-purple-100 min-h-[80px] leading-relaxed">
                {enhancedPrompt || "AI enhancement prompt will build here..."}
              </div>
            </div>

            <button
              onClick={() => {
                if (enhancedPrompt) {
                  setPrompt(enhancedPrompt);
                  toast.success("Enhanced prompt copied!");
                }
              }}
              disabled={!enhancedPrompt}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              Apply AI Prompt Detail
            </button>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <svg className="h-5 w-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            Generated Asset Library
          </h3>
          <p className="text-xs font-medium text-slate-500">Persistent visual outputs stored directly in Supabase DB.</p>
        </div>

        {savedAssets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <p className="text-sm font-bold text-slate-600">No media assets generated yet.</p>
            <p className="text-xs text-slate-400">Provide details above to generate and seed your brand library.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {savedAssets.map((asset) => (
              <div key={asset.id} className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
                {/* Image & Ratio badges */}
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  <img
                    src={asset.url}
                    alt={asset.prompt}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="rounded-lg bg-white/95 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-900 shadow">
                        {activeProject?.name || "Solospider"}
                      </div>
                      <span className="rounded-md bg-slate-900/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                        {asset.format}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Text area */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Caption</span>
                      {editingAssetId === asset.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              handleUpdateCaption(asset.id, editingCaption);
                              setEditingAssetId(null);
                            }}
                            className="text-[10px] font-bold text-emerald-600 hover:underline"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAssetId(null)}
                            className="text-[10px] font-bold text-slate-400 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingAssetId(asset.id);
                            setEditingCaption(asset.caption);
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {editingAssetId === asset.id ? (
                      <textarea
                        value={editingCaption}
                        onChange={(e) => setEditingCaption(e.target.value)}
                        rows={3}
                        className="w-full rounded border bg-slate-50 p-2 text-xs font-semibold focus:outline-none"
                      />
                    ) : (
                      <p className="text-xs font-semibold leading-relaxed text-slate-700 line-clamp-3">
                        {asset.caption}
                      </p>
                    )}
                  </div>

                  {/* Hashtags */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Hashtags</span>
                    <div className="flex flex-wrap gap-1">
                      {asset.hashtags.map((tag, idx) => (
                        <span key={idx} className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                          #{tag}
                        </span>
                      ))}
                      <button
                        onClick={() => {
                          const tag = window.prompt("Enter new hashtag:");
                          if (tag) {
                            handleUpdateHashtags(asset.id, [...asset.hashtags, tag.replace(/^#/, "").trim()]);
                          }
                        }}
                        className="rounded-full border border-dashed border-slate-350 px-2 py-0.5 text-[9px] font-bold text-slate-500 hover:border-slate-500"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400">
                      {asset.date ? new Date(asset.date).toLocaleDateString() : ""}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                      </button>

                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                        title="Download/Open"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                        </svg>
                      </a>

                      <button
                        onClick={() => setSchedulingAsset(asset)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                        title="Schedule Post"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Custom Dialog Overlay */}
      {schedulingAsset && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Schedule Social Campaign</h3>
              <p className="text-xs font-semibold text-slate-500">Pick scheduled date, hour, and network.</p>
            </div>

            <form onSubmit={handleSchedulePost} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Target Release Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Platform Network</label>
                <select
                  value={schedulePlatform}
                  onChange={(e) => setSchedulePlatform(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold focus:outline-none"
                >
                  <option value="instagram">Instagram Campaign</option>
                  <option value="linkedin">LinkedIn B2B</option>
                  <option value="twitter">X (Twitter)</option>
                  <option value="facebook">Facebook Ads</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSchedulingAsset(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Schedule Post Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
