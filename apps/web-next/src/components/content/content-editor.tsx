"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Copy, Check, Pencil, Eye, Globe, RefreshCw, BarChart3, Send } from "lucide-react";

interface ContentItem {
  id: string;
  main_keyword: string;
  h1: string;
  status: string;
  word_count_target: number;
  generated_title: string | null;
  meta_description: string | null;
  generated_content: string | null;
  current_section: string | null;
  sections_completed: number | null;
  total_sections: number | null;
  tone: string;
  target_country: string;
  secondary_keywords: string[] | null;
  h2_list: string[];
  h3_list: string[] | null;
  created_at: string;
}

// --- SEO SCORE LOGIC ---
function computeSEOScore(content: ContentItem) {
  const text = content.generated_content || "";
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const keyword = content.main_keyword.toLowerCase();
  const lowerText = text.toLowerCase();

  const checks: { label: string; pass: boolean; tip: string }[] = [];
  let totalScore = 0;
  const maxScore = 6;

  // 1. Title length
  const titleLen = (content.generated_title || content.h1 || "").length;
  const titleOk = titleLen >= 30 && titleLen <= 70;
  checks.push({ label: "Title Length", pass: titleOk, tip: titleOk ? `${titleLen} chars (good)` : `${titleLen} chars (aim 30-70)` });
  if (titleOk) totalScore++;

  // 2. Word count vs target
  const wcRatio = wordCount / content.word_count_target;
  const wcOk = wcRatio >= 0.75 && wcRatio <= 1.35;
  checks.push({ label: "Word Count", pass: wcOk, tip: `${wordCount} / ${content.word_count_target} target` });
  if (wcOk) totalScore++;

  // 3. Keyword in title
  const kwInTitle = (content.generated_title || "").toLowerCase().includes(keyword);
  checks.push({ label: "Keyword in Title", pass: kwInTitle, tip: kwInTitle ? "Present" : "Missing" });
  if (kwInTitle) totalScore++;

  // 4. Keyword density
  const kwCount = (lowerText.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length;
  const density = wordCount > 0 ? (kwCount / wordCount) * 100 : 0;
  const densityOk = density >= 0.5 && density <= 3;
  checks.push({ label: "Keyword Density", pass: densityOk, tip: `${density.toFixed(1)}% (aim 0.5-3%)` });
  if (densityOk) totalScore++;

  // 5. Has H2 headings
  const h2Matches = text.match(/^## /gm) || [];
  const hasH2 = h2Matches.length >= 2;
  checks.push({ label: "H2 Headings", pass: hasH2, tip: `${h2Matches.length} found` });
  if (hasH2) totalScore++;

  // 6. Readability (avg sentence length)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const avgSentenceLen = sentences.length > 0 ? words.length / sentences.length : 0;
  const readabilityOk = avgSentenceLen >= 10 && avgSentenceLen <= 25;
  checks.push({ label: "Readability", pass: readabilityOk, tip: `~${avgSentenceLen.toFixed(0)} words/sentence` });
  if (readabilityOk) totalScore++;

  return { score: Math.round((totalScore / maxScore) * 100), checks, totalScore, maxScore };
}

export function ContentEditor({ id }: { id: string }) {
  const router = useRouter();
  const { activeProjectId } = useProjects();
  const { user } = useAuth();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editMetaDesc, setEditMetaDesc] = useState("");
  const [editContent, setEditContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [showSEO, setShowSEO] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [refining, setRefining] = useState(false);

  // WP Publish Settings State
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishStatus, setPublishStatus] = useState("draft");
  const [wpCategories, setWpCategories] = useState<{ id: number, name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("none");
  const [fetchingCategories, setFetchingCategories] = useState(false);
  const [wpIntegrations, setWpIntegrations] = useState<any[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>("none");
  const [wpAuthors, setWpAuthors] = useState<{ id: number, name: string }[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState<string>("none");
  const [fetchingAuthors, setFetchingAuthors] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [canonicalUrl, setCanonicalUrl] = useState<string>("");

  const toTitleCase = (str: string) => {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  };

  const fetchContent = useCallback(async () => {
    if (!id || !user) return;
    const supabase = getSupabaseBrowserClient();
    let query = supabase
      .from("content_items")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id);
    if (activeProjectId) {
      query = query.eq("project_id", activeProjectId);
    }
    const { data, error } = await query.single();

    if (error) {
      toast.error("Failed to load content");
    } else {
      setContent(data as unknown as ContentItem);
      if (!editing) {
        setEditTitle(data?.generated_title ? toTitleCase(data.generated_title) : (data?.h1 ? toTitleCase(data.h1) : ""));
        setEditMetaDesc((data as any)?.meta_description || "");
        setEditContent(data?.generated_content || "");
      }
    }
    setLoading(false);
  }, [id, editing, user, activeProjectId]);

  useEffect(() => {
    fetchContent();
    if (!id) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`content-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "content_items",
        filter: `id=eq.${id}`,
      }, (payload) => {
        const updated = payload.new as unknown as ContentItem;
        setContent(updated);
        if (!editing) {
          setEditTitle(updated?.generated_title ? toTitleCase(updated.generated_title) : (updated?.h1 ? toTitleCase(updated.h1) : ""));
          setEditMetaDesc(updated.meta_description || "");
          setEditContent(updated.generated_content || "");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchContent, editing]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content?.generated_content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  const handleSave = async () => {
    setSaving(true);
    if (!content) {
      toast.error("Content not loaded.");
      setSaving(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    let updateQuery = supabase
      .from("content_items")
      .update({
        generated_title: toTitleCase(editTitle),
        meta_description: editMetaDesc,
        generated_content: editContent
      })
      .eq("id", content.id)
      .eq("user_id", user?.id);
    if (activeProjectId) updateQuery = updateQuery.eq("project_id", activeProjectId);
    const { error } = await updateQuery;
    if (error) toast.error("Failed to save");
    else {
      toast.success("Saved");
      setEditing(false);
    }
    setSaving(false);
  };

  const openPublishDialog = async () => {
    setPublishDialogOpen(true);
    setFetchingCategories(true);
    setFetchingAuthors(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: integrations } = await (supabase
        .from("workspace_integrations" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .eq("platform", "wordpress")
        .eq("is_active", true) as any);

      if (integrations && integrations.length > 0) {
        setWpIntegrations(integrations);
        setSelectedIntegration(integrations[0].id);

        // Fetch properties for the first integration
        await fetchWpProperties(integrations[0].credentials);
      } else {
        setFetchingCategories(false);
        setFetchingAuthors(false);
      }
    } catch (e) {
      console.error(e);
      setFetchingCategories(false);
      setFetchingAuthors(false);
    }
  };

  const fetchWpProperties = async (creds: any) => {
    setFetchingCategories(true);
    setFetchingAuthors(true);
    if (creds && creds.url && creds.username && creds.app_password) {
      let cleanUrl = creds.url.trim();
      if (cleanUrl.endsWith("/")) cleanUrl = cleanUrl.slice(0, -1);
      const authString = btoa(`${creds.username}:${creds.app_password}`);

      try {
        const [catRes, authRes] = await Promise.all([
          fetch(`${cleanUrl}/wp-json/wp/v2/categories?per_page=100`, { headers: { Authorization: `Basic ${authString}` } }),
          fetch(`${cleanUrl}/wp-json/wp/v2/users?per_page=100`, { headers: { Authorization: `Basic ${authString}` } })
        ]);

        if (catRes.ok) {
          const cats = await catRes.json();
          setWpCategories(cats);
        }
        if (authRes.ok) {
          const authors = await authRes.json();
          setWpAuthors(authors);
        }
      } catch (e) {
        console.error("Failed to fetch WP properties", e);
      }
    }
    setFetchingCategories(false);
    setFetchingAuthors(false);
  };

  useEffect(() => {
    if (publishDialogOpen && selectedIntegration !== "none" && wpIntegrations.length > 0) {
      const integration = wpIntegrations.find(int => int.id === selectedIntegration);
      if (integration) {
        fetchWpProperties(integration.credentials);
      }
    }
  }, [selectedIntegration, publishDialogOpen, wpIntegrations]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (!content || !content.id) throw new Error("No content to publish");

      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // 1. Fetch Integration
      const { data: integrations, error: intError } = await (supabase
        .from("workspace_integrations" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .eq("platform", "wordpress")
        .eq("is_active", true) as any);

      if (intError) throw new Error("Failed to check WordPress integration: " + intError.message);
      if (!integrations || integrations.length === 0) {
        throw new Error("No active WordPress integration found. Please connect in Settings > Integrations.");
      }

      const integration = selectedIntegration === "none" ? integrations[0] : integrations.find((i: any) => i.id === selectedIntegration);
      if (!integration) {
        throw new Error("Selected integration not found or inactive.");
      }
      const creds = integration.credentials;
      if (!creds || !creds.url || !creds.username || !creds.app_password) {
        throw new Error("WordPress integration is missing credentials.");
      }

      // 2. Upload Feature Image if selected
      if (selectedImageFile) {
        const fileExt = selectedImageFile.name.split('.').pop();
        const fileName = `${content.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('blog_images')
          .upload(fileName, selectedImageFile, { upsert: true });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          throw new Error("Failed to upload image. Please ensure the 'blog_images' public storage bucket exists.");
        }

        const { data: { publicUrl } } = supabase.storage
          .from('blog_images')
          .getPublicUrl(fileName);

        // Update the content item with the new image url
        let imageQuery = supabase
          .from("content_items")
          .update({ featured_image_url: publicUrl } as any)
          .eq("id", content.id)
          .eq("user_id", user?.id);
        if (activeProjectId) imageQuery = imageQuery.eq("project_id", activeProjectId);
        await imageQuery;
      }

      // 3. Publish to WP via Edge Function
      const categoriesArray = selectedCategory !== "none" ? [parseInt(selectedCategory)] : undefined;
      const authorId = selectedAuthor !== "none" ? parseInt(selectedAuthor) : undefined;

      const { data: wpData, error: invokeError } = await supabase.functions.invoke("publish-to-wordpress", {
        body: {
          contentId: content.id,
          integrationId: integration.id,
          publishStatus: publishStatus,
          categories: categoriesArray,
          authorId: authorId,
          canonicalUrl: canonicalUrl.trim() || undefined
        },
      });

      if (invokeError) throw invokeError;
      if (wpData && wpData.error) throw new Error(wpData.error);

      toast.success("Successfully sent to WordPress!");
      setPublishDialogOpen(false);
      fetchContent();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const handleRetry = async () => {
    if (!id) return;
    setRetrying(true);
    try {
      const supabase = getSupabaseBrowserClient();
      let retryQuery = supabase.from("content_items").update({
        status: "generating",
        sections_completed: 0,
        total_sections: null,
        current_section: null,
        generated_content: null,
        generated_title: null,
      })
        .eq("id", id)
        .eq("user_id", user?.id);
      if (activeProjectId) retryQuery = retryQuery.eq("project_id", activeProjectId);
      const { error: updateError } = await retryQuery;

      if (updateError) throw updateError;

      supabase.functions.invoke("generate-blog", {
        body: { contentId: id },
      }).catch((err: any) => console.error("Retry invoke error:", err));

      toast.success("Retrying generation...");
      fetchContent();
    } catch (err: any) {
      toast.error(err.message || "Failed to retry");
    } finally {
      setRetrying(false);
    }
  };

  const handleRegenerateSection = async (sectionHeading: string) => {
    if (!content) return;
    setRegeneratingSection(sectionHeading);
    try {
      const supabase = getSupabaseBrowserClient();
      const currentContent = content.generated_content || "";

      // Call AI to regenerate just this section
      const { data, error } = await supabase.functions.invoke("generate-blog", {
        body: {
          contentId: content.id,
          step: "regenerate_section",
          sectionHeading: sectionHeading,
          currentMarkdown: currentContent,
        },
      });

      if (error) throw error;

      toast.success(`Regenerated "${sectionHeading}"`);
      fetchContent();
    } catch (e: any) {
      toast.error(e.message || "Failed to regenerate section");
    } finally {
      setRegeneratingSection(null);
    }
  };

  const handleRefineContent = async () => {
    if (!id || !refinePrompt.trim()) return;
    setRefining(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke("refine-content", {
        body: { contentId: id, prompt: refinePrompt.trim() },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success("Content updated!");
      setRefinePrompt("");
      fetchContent();
    } catch (e: any) {
      toast.error(e.message || "Failed to refine content");
    } finally {
      setRefining(false);
    }
  };

  const renderMarkdown = (md: string) => {
    return md
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2 text-slate-800">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 text-slate-900">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 text-slate-900">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/^\s*-\s+(.+)$/gm, '<li class="ml-4 list-disc text-slate-700">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed text-slate-700">')
      .replace(/^/, '<p class="mb-4 leading-relaxed text-slate-700">')
      .concat("</p>");
  };

  const extractH2Headings = (md: string): string[] => {
    const matches = md.match(/^## (.+)$/gm);
    return matches ? matches.map(m => m.replace("## ", "")) : [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-8">
        <p>Content not found.</p>
        <button
          onClick={() => router.push("/app/en/dashboard")}
          className="mt-4 border border-slate-300 rounded-xl px-4 py-2 hover:bg-slate-50 transition-all font-semibold"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isGenerating = content.status === "generating";
  const wordCount = (content.generated_content || "").split(/\s+/).filter(Boolean).length;
  const seoResult = content.status === "completed" || content.status === "published" ? computeSEOScore(content) : null;
  const h2Headings = extractH2Headings(content.generated_content || "");

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <button
          onClick={() => router.push("/app/en/dashboard")}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{content.generated_title || content.h1}</h1>
          <p className="text-sm text-slate-500">{content.main_keyword} · {wordCount} words</p>
        </div>
        <span
          className={`px-3 py-1 text-xs font-bold rounded-full ${
            content.status === "completed"
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25"
              : content.status === "generating"
                ? "bg-amber-500/10 text-amber-600 border border-amber-500/25"
                : content.status === "published"
                  ? "bg-blue-500/10 text-blue-600 border border-blue-500/25"
                  : "bg-red-500/10 text-red-600 border border-red-500/25"
          }`}
        >
          {isGenerating
            ? `Generating ${content.sections_completed || 0}/${content.total_sections || "?"}`
            : content.status}
        </span>
      </div>

      {/* Generation progress */}
      {isGenerating && (
        <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span className="text-sm font-medium text-slate-800">Writing: {content.current_section || "..."}</span>
            </div>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="border border-slate-200 text-xs font-semibold rounded-lg px-3 py-1 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center gap-1"
            >
              {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Restart
            </button>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{
                width: `${((content.sections_completed || 0) / (content.total_sections || 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Failed state */}
      {content.status === "failed" && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
          <span className="text-sm font-medium text-red-600">Generation failed</span>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="border border-red-500/30 text-red-600 bg-white text-xs font-semibold rounded-lg px-3 py-1 hover:bg-red-50 disabled:opacity-50 transition-all flex items-center gap-1"
          >
            {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Retry Generation
          </button>
        </div>
      )}

      {/* SEO Score Card */}
      {seoResult && (
        <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <button
            onClick={() => setShowSEO(!showSEO)}
            className="flex items-center gap-2 w-full p-4 hover:bg-slate-50/50 transition-all"
          >
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <span className="font-bold text-slate-800">SEO Score</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-lg font-black text-indigo-600">{seoResult.score}%</span>
            </div>
          </button>
          {showSEO && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {seoResult.checks.map((check) => (
                  <div key={check.label} className="flex items-start gap-2.5 text-xs text-slate-800">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${check.pass ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <div>
                      <p className="font-bold">{check.label}</p>
                      <p className="text-slate-500 font-semibold">{check.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview / Editor */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${!editing ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
            <button
              onClick={() => setEditing(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${editing ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Pencil className="h-3.5 w-3.5" /> Editor
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!content.generated_content}
              className="border border-slate-200 text-xs font-bold rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center gap-1 text-slate-700 bg-white"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={openPublishDialog}
              disabled={!content.generated_content || isGenerating}
              className="bg-indigo-600 text-white text-xs font-bold rounded-lg px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1 shadow-sm shadow-indigo-600/10"
            >
              <Globe className="h-3.5 w-3.5" /> Publish to WordPress
            </button>
          </div>
        </div>

        <div className="p-8">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-lg font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Meta Description</label>
                <textarea
                  value={editMetaDesc}
                  onChange={(e) => setEditMetaDesc(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-h-[60px] text-sm font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Article Content (Markdown)</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-h-[400px] font-mono text-sm leading-relaxed"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all shadow-md"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="prose max-w-none">
              {content.generated_content ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content.generated_content) }} />
              ) : (
                <p className="text-slate-500 text-center py-20 font-bold">Your post is generating. Content will appear here shortly.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Regeneration and AI Assistant Console */}
      {content.generated_content && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section Refiner */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <span className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600"><RefreshCw className="h-4 w-4" /></span>
              Section Regeneration
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">Choose a heading to regenerate that specific section with AI.</p>
            {h2Headings.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold">No sections detected in markdown</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {h2Headings.map((heading) => (
                  <div key={heading} className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                    <span className="text-xs font-bold text-slate-800 truncate pr-3">{heading}</span>
                    <button
                      onClick={() => handleRegenerateSection(heading)}
                      disabled={Boolean(regeneratingSection)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-950 disabled:opacity-50 text-white font-black px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors shrink-0"
                    >
                      {regeneratingSection === heading ? "Regenerating..." : "Regenerate"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Quick Refinement */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50/10 rounded-lg text-indigo-600"><Send className="h-4 w-4" /></span>
                AI Content Assistant
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">Enter instructions to rewrite or refine the overall generated article.</p>
            </div>
            <div className="space-y-3">
              <textarea
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                placeholder="e.g. rewrite introduction to be more conversational and include a statistic about SaaS growth"
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-xs min-h-[60px] font-semibold"
              />
              <button
                onClick={handleRefineContent}
                disabled={refining || !refinePrompt.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
              >
                {refining ? "Refining Content..." : "Apply AI Edits"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WordPress Publisher Modal */}
      {publishDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Publish to WordPress</h3>
                <p className="text-xs text-slate-500 font-semibold">Select WordPress target and configuration</p>
              </div>
              <button
                onClick={() => setPublishDialogOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-black text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Integration Select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">WordPress Target Site</label>
                <select
                  value={selectedIntegration}
                  onChange={(e) => setSelectedIntegration(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm font-semibold"
                >
                  {wpIntegrations.length === 0 ? (
                    <option value="none">No active WordPress accounts connected</option>
                  ) : (
                    wpIntegrations.map((int) => (
                      <option key={int.id} value={int.id}>{int.credentials.url} ({int.credentials.username})</option>
                    ))
                  )}
                </select>
              </div>

              {wpIntegrations.length > 0 && (
                <>
                  {/* Category Select */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">WordPress Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm font-semibold"
                      disabled={fetchingCategories}
                    >
                      {fetchingCategories ? (
                        <option value="none">Fetching categories...</option>
                      ) : wpCategories.length === 0 ? (
                        <option value="none">No categories found / fallback to default</option>
                      ) : (
                        <>
                          <option value="none">Select Category (Optional)</option>
                          {wpCategories.map((cat) => (
                            <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Author Select */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">WordPress Author</label>
                    <select
                      value={selectedAuthor}
                      onChange={(e) => setSelectedAuthor(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm font-semibold"
                      disabled={fetchingAuthors}
                    >
                      {fetchingAuthors ? (
                        <option value="none">Fetching authors...</option>
                      ) : wpAuthors.length === 0 ? (
                        <option value="none">No authors found / fallback to default</option>
                      ) : (
                        <>
                          <option value="none">Select Author (Optional)</option>
                          {wpAuthors.map((auth) => (
                            <option key={auth.id} value={auth.id.toString()}>{auth.name}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Canonical URL */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Canonical URL override (optional)</label>
                    <input
                      type="url"
                      placeholder="e.g. https://yoursite.com/blog/article"
                      value={canonicalUrl}
                      onChange={(e) => setCanonicalUrl(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm font-semibold"
                    />
                  </div>

                  {/* Featured Image */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase block">Featured Image override (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedImageFile(e.target.files?.[0] || null)}
                      className="cursor-pointer bg-white border border-slate-300 w-full rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 text-xs"
                    />
                  </div>

                  {/* Publish Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Publish Action</label>
                    <select
                      value={publishStatus}
                      onChange={(e) => setPublishStatus(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm font-semibold"
                    >
                      <option value="draft">Save as Draft in WordPress</option>
                      <option value="publish">Publish Directly to Live Site</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button
                onClick={() => setPublishDialogOpen(false)}
                className="border border-slate-300 rounded-xl px-4 py-2 hover:bg-slate-50 transition-all font-bold text-slate-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing || wpIntegrations.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10"
              >
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send to WordPress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
