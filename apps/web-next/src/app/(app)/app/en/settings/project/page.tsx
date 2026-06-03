"use client";

import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Globe, Building2, Sparkles, Link as LinkIcon, Image as ImageIcon, Loader2, Save, ArrowLeft, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ProjectSettingsPage() {
  const { activeProject, isLoading } = useProjects();
  const qc = useQueryClient();

  // Form states
  const [brandName, setBrandName] = useState("");
  const [domain, setDomain] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with active project
  useEffect(() => {
    if (activeProject) {
      setBrandName(activeProject.brand_name || activeProject.name || "");
      setDomain(activeProject.domain || "");
      setTagline(activeProject.brand_tagline || "");
      setDescription(activeProject.brand_description || "");
      setBrandLogoUrl(activeProject.brand_logo_url || "");
      setOgImageUrl(activeProject.og_image_url || "");
      setFaviconUrl(activeProject.favicon_url || "");
    }
  }, [activeProject]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) {
      toast.error("No active project selected");
      return;
    }

    setIsSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("projects")
        .update({
          brand_name: brandName.trim() || activeProject.name,
          domain: domain.trim(),
          brand_tagline: tagline.trim() || null,
          brand_description: description.trim() || null,
          brand_logo_url: brandLogoUrl.trim() || null,
          og_image_url: ogImageUrl.trim() || null,
          favicon_url: faviconUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeProject.id);

      if (error) throw error;

      await qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Branding identity saved successfully!");
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "Failed to update branding settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm font-bold text-slate-500">Loading project settings...</p>
        </div>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <ShieldCheck className="h-12 w-12 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">No active workspace selected</h2>
          <p className="text-sm text-slate-500">
            Please create or select a project from the workspace list in the sidebar.
          </p>
          <Link href="/app/en/dashboard" className="inline-flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700">
            <ArrowLeft className="h-4 w-4" /> Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Determine active logo to show in real time preview
  const resolvedPreviewLogo = brandLogoUrl || ogImageUrl || faviconUrl || "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 select-none">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-bold text-violet-600 uppercase tracking-widest mb-1.5">
            <Building2 className="h-4 w-4" /> Workspace Settings
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Brand Identity</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Configure the brand presets, design values, and metadata that empower your B2B asset generation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/app/en/media-studio"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
          >
            Media Studio
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Settings Form */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Core Brand Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Project Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Project / Name</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. My Awesome Brand"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none transition-all shadow-inner-sm"
                  />
                </div>
              </div>

              {/* Domain */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Website URL (Domain)</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Globe className="h-4 w-4" />
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none transition-all shadow-inner-sm"
                  />
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Brand Tagline</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Grow Your Business Autonomously"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none transition-all shadow-inner-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Brand Description</label>
              <div className="relative">
                <div className="pointer-events-none absolute top-3 left-3 flex items-center text-slate-400">
                  <FileText className="h-4 w-4" />
                </div>
                <textarea
                  rows={4}
                  placeholder="Describe your target market, core services, values, and business objective..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none transition-all shadow-inner-sm"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-violet-500" /> Brand Logo & Creative Assets
            </h3>

            <div className="space-y-5">
              {/* Brand Logo URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Custom Logo URL (Recommended)</label>
                  <span className="text-[10px] text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded-full">Primary</span>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <LinkIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={brandLogoUrl}
                    onChange={(e) => setBrandLogoUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none transition-all shadow-inner-sm"
                  />
                </div>
              </div>

              {/* OG Image URL */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">OG / Social Share Image URL</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <LinkIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="url"
                    placeholder="https://example.com/og-image.jpg"
                    value={ogImageUrl}
                    onChange={(e) => setOgImageUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none transition-all shadow-inner-sm"
                  />
                </div>
              </div>

              {/* Favicon URL */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Website Favicon URL</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <LinkIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="url"
                    placeholder="https://example.com/favicon.ico"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none transition-all shadow-inner-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-3 shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Saving Identity...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-white" />
                  Save Brand Identity
                </>
              )}
            </button>
          </div>
        </form>

        {/* Brand Live Preview Column */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-150 bg-slate-50 p-6 space-y-6 sticky top-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Live Brand Preview</h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                Real-time UI representations
              </p>
            </div>

            {/* Project Switcher Preview */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Sidebar Project Switcher representation:
              </span>
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  {resolvedPreviewLogo ? (
                    <img
                      src={resolvedPreviewLogo}
                      alt={brandName || "Logo"}
                      className="w-5 h-5 rounded-md object-cover border border-slate-200 shrink-0 shadow-sm"
                      onError={(e) => {
                        // Suppress react image error console noise
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded bg-violet-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm shadow-violet-600/20">
                      {(brandName || activeProject.name).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate text-sm font-extrabold text-slate-800">
                    {brandName || activeProject.name}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 opacity-40">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                </div>
              </div>
            </div>

            {/* Brand Preset Preview */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Media Studio Brand Preset button:
              </span>
              <div className="flex gap-2 flex-wrap bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 text-white px-4 py-2 text-sm font-bold shadow-sm cursor-default"
                >
                  {resolvedPreviewLogo ? (
                    <img
                      src={resolvedPreviewLogo}
                      alt={brandName || "Logo"}
                      className="h-5 w-5 rounded-md object-cover border border-slate-800 shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded bg-violet-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm">
                      {(brandName || activeProject.name).charAt(0).toUpperCase()}
                    </div>
                  )}
                  {brandName || activeProject.name}
                </button>

                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-400 cursor-default"
                >
                  + Add New
                </button>
              </div>
            </div>

            {/* Context Card Preview */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Social Prompt context preview:
              </span>
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-[10px]">
                    AI
                  </div>
                  <span className="text-xs font-bold text-slate-700">Brand Context Builder</span>
                </div>
                <div className="space-y-1.5 border-t border-slate-50 pt-2.5 text-[11px] font-medium text-slate-500 leading-relaxed">
                  <div>
                    <span className="font-extrabold text-slate-800">Brand: </span>
                    {brandName || activeProject.name}
                  </div>
                  {tagline && (
                    <div>
                      <span className="font-extrabold text-slate-800">Tagline: </span>
                      {tagline}
                    </div>
                  )}
                  {description && (
                    <div className="line-clamp-3">
                      <span className="font-extrabold text-slate-800">Description: </span>
                      {description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
