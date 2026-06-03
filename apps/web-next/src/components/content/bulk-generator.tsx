"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, CheckCircle2, Layers, Trash2 } from "lucide-react";

interface BulkTopic {
  id: string;
  keyword: string;
  title: string;
  language: string;
}

export function BulkGenerator() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeProjectId } = useProjects();
  const [loading, setLoading] = useState(false);
  const [generatingTitleFor, setGeneratingTitleFor] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);

  // Topics State
  const [topics, setTopics] = useState<BulkTopic[]>([
    { id: "1", keyword: "", title: "", language: "English (US)" }
  ]);

  // Core Settings
  const [globalLanguage, setGlobalLanguage] = useState("English (US)");
  const [articleType, setArticleType] = useState("Standard Blog Post");
  const [articleSize, setArticleSize] = useState("Medium (1000-1500 words)");
  const [researchLevel, setResearchLevel] = useState("Standard AI Search");
  const [tone, setTone] = useState("None");
  const [pointOfView, setPointOfView] = useState("None");
  const [textReadability, setTextReadability] = useState("None");
  const [targetCountry, setTargetCountry] = useState("United States");

  // Other Settings
  const [icp, setIcp] = useState("");
  const [brandVoice, setBrandVoice] = useState("none");
  const [details, setDetails] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [internalLinks, setInternalLinks] = useState("");
  const [generateImage, setGenerateImage] = useState(false);

  // Structure Settings
  const [structConclusion, setStructConclusion] = useState(true);
  const [structTables, setStructTables] = useState(true);
  const [structH3, setStructH3] = useState(true);
  const [structLists, setStructLists] = useState(true);
  const [structItalics, setStructItalics] = useState(true);
  const [structQuotes, setStructQuotes] = useState(true);
  const [structKeyTakeaways, setStructKeyTakeaways] = useState(true);
  const [structFaq, setStructFaq] = useState(true);
  const [structBold, setStructBold] = useState(true);

  useEffect(() => {
    const fetchIntegrations = async () => {
      if (!user) return;
      const supabase = getSupabaseBrowserClient();
      const { data } = await (supabase
        .from("workspace_integrations" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true) as any);
      if (data) setIntegrations(data);
    };
    fetchIntegrations();
  }, [user]);

  const addTopic = () => {
    setTopics([...topics, { id: Date.now().toString(), keyword: "", title: "", language: globalLanguage }]);
  };

  const removeTopic = (id: string) => {
    if (topics.length > 1) {
      setTopics(topics.filter(t => t.id !== id));
    } else {
      toast.error("You need at least one topic");
    }
  };

  const updateTopic = (id: string, field: keyof BulkTopic, value: string) => {
    setTopics(topics.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleGenerateTitle = async (id: string, keyword: string) => {
    if (!keyword.trim()) {
      toast.error("Please enter a Main Keyword first");
      return;
    }
    setGeneratingTitleFor(id);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke("generate-title", {
        body: { keyword: keyword.trim() }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (data.title) {
        updateTopic(id, 'title', data.title);
        toast.success("Title generated successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate title");
    } finally {
      setGeneratingTitleFor(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validTopics = topics.filter(t => t.keyword.trim() && t.title.trim());
    if (validTopics.length === 0) {
      toast.error("Please provide a keyword and title for at least one topic");
      return;
    }

    setLoading(true);
    try {
      const effectiveProjectId = activeProjectId;
      if (!effectiveProjectId) {
        toast.error("Please select a project first.");
        setLoading(false);
        return;
      }
      let wc = 1200;
      if (articleSize.includes("Small")) wc = 800;
      if (articleSize.includes("Medium")) wc = 1300;
      if (articleSize.includes("Large")) wc = 2200;

      const supabase = getSupabaseBrowserClient();

      // Create multiple content items
      const insertPromises = validTopics.map(topic => {
        return supabase.from("content_items").insert({
          user_id: user!.id,
          project_id: effectiveProjectId,
          main_keyword: topic.keyword.trim(),
          secondary_keywords: secondaryKeywords ? secondaryKeywords.split(",").map(k => k.trim()) : [],
          word_count_target: wc,
          tone: tone !== "None" ? tone : "Professional",
          target_country: targetCountry,
          h1: topic.title.trim(),
          h2_list: [], // Auto-generated
          h3_list: [],
          internal_links: internalLinks ? internalLinks.split(",").map(k => k.trim()) : [],
          generate_image: generateImage,
          status: "generating",
        }).select("id").single();
      });

      const results = await Promise.all(insertPromises);
      const ids = results.map(r => r.data?.id).filter(Boolean);

      if (ids.length === 0) throw new Error("Failed to insert records");

      // Fire generations
      ids.forEach(id => {
        supabase.functions.invoke("generate-blog", {
          body: { contentId: id },
        }).catch((err: any) => console.error("Generation invoke error:", err));
      });

      toast.success(`${validTopics.length} posts queued for generation!`);
      router.push(`/app/en/dashboard`);
    } catch (err: any) {
      toast.error(err.message || "Bulk generation failed");
    } finally {
      setLoading(false);
    }
  };

  const totalCreditsRequired = topics.filter(t => t.keyword.trim() && t.title.trim()).length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 text-slate-900">
            <span className="bg-indigo-500/10 text-indigo-600 p-2 rounded-xl">
              <Layers className="h-5 w-5" />
            </span>
            Bulk Article Generation
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-12 font-medium">Generate multiple high-quality articles at once.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold bg-pink-500/10 text-pink-600 px-4 py-2 rounded-full flex items-center gap-1.5 border border-pink-500/20 uppercase tracking-wider">
            Cost: {totalCreditsRequired || 1} Credits
          </span>
          <span className="text-xs font-bold bg-indigo-500/10 text-indigo-600 px-4 py-2 rounded-full flex items-center gap-1.5 border border-indigo-500/20 uppercase tracking-wider">
            <Sparkles className="h-4 w-4" /> 50 Credits Available
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Create Multiple Posts Table */}
        <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm shadow-slate-100">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Create Multiple Posts</h3>
              <p className="text-xs text-slate-500 font-semibold">Add topics to generate articles in bulk</p>
            </div>
            <div className="flex items-center gap-2.5 text-xs">
              <span className="text-slate-700 font-bold whitespace-nowrap">Translate all keywords to:</span>
              <select
                value={globalLanguage}
                onChange={(e) => {
                  const val = e.target.value;
                  setGlobalLanguage(val);
                  setTopics(topics.map(t => ({ ...t, language: val })));
                }}
                className="w-[140px] h-9 text-xs bg-white border border-slate-300 rounded-xl px-2 py-1 text-slate-900 focus:outline-none font-semibold"
              >
                <option value="English (US)">English (US)</option>
                <option value="English (UK)">English (UK)</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
              </select>
            </div>
          </div>

          <div className="p-5">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 mb-3 px-2 text-xs font-black text-slate-500 uppercase tracking-wider">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Main Keyword</div>
              <div className="col-span-7">Title & Actions</div>
            </div>

            {/* Rows */}
            <div className="space-y-3">
              {topics.map((topic, index) => (
                <div key={topic.id} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-1 text-center text-sm font-bold text-slate-800">
                    {index + 1}
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Your keyword"
                      value={topic.keyword}
                      onChange={(e) => updateTopic(topic.id, 'keyword', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm font-semibold"
                    />
                  </div>
                  <div className="col-span-7 flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Title will auto-generate if empty, or type here"
                      value={topic.title}
                      onChange={(e) => updateTopic(topic.id, 'title', e.target.value)}
                      className="bg-white rounded-xl h-10 flex-1 px-3 py-2 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => handleGenerateTitle(topic.id, topic.keyword)}
                      disabled={generatingTitleFor === topic.id || !topic.keyword.trim()}
                      className="h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 font-black text-[10px] uppercase tracking-widest transition-all rounded-xl shrink-0 flex items-center gap-1"
                    >
                      {generatingTitleFor === topic.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {generatingTitleFor === topic.id ? "..." : "Generate"}
                    </button>
                    {topics.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTopic(topic.id)}
                        className="text-slate-500 hover:text-red-500 p-2 transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Record Line */}
            <button
              type="button"
              onClick={addTopic}
              className="mt-4 flex items-center gap-2 text-xs text-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-50/50 p-3 w-full justify-center border border-dashed border-indigo-500/30 rounded-xl bg-indigo-50/10 transition-all"
            >
              <Plus className="h-4 w-4" /> Add Record
            </button>
          </div>
        </div>

        {/* Core Settings */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100 space-y-5">
          <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">Core Settings <span className="text-xs text-slate-500 font-semibold ml-2 tracking-normal">(applies to all generated posts)</span></h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Article Type</label>
              <select
                value={articleType}
                onChange={(e) => setArticleType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
              >
                <option value="Standard Blog Post">Standard Blog Post</option>
                <option value="How-to Guide">How-to Guide</option>
                <option value="Listicle">Listicle</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Article Size</label>
              <select
                value={articleSize}
                onChange={(e) => setArticleSize(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
              >
                <option value="Small (500-1000 words)">Small (500-1000 words)</option>
                <option value="Medium (1000-1500 words)">Medium (1000-1500 words)</option>
                <option value="Large (1500-2500 words)">Large (1500-2500 words)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Research Level</label>
              <select
                value={researchLevel}
                onChange={(e) => setResearchLevel(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
              >
                <option value="Standard AI Search">Standard AI Search</option>
                <option value="In-Depth Search">In-Depth Search</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Target Country</label>
              <select
                value={targetCountry}
                onChange={(e) => setTargetCountry(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
              >
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="India">India</option>
                <option value="Australia">Australia</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Tone of Voice</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
              >
                <option value="None">None</option>
                <option value="Professional">Professional</option>
                <option value="Conversational">Conversational</option>
                <option value="Authoritative">Authoritative</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Point of View</label>
              <select
                value={pointOfView}
                onChange={(e) => setPointOfView(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
              >
                <option value="None">None</option>
                <option value="First Person (I/We)">First Person (I/We)</option>
                <option value="Second Person (You)">Second Person (You)</option>
                <option value="Third Person (They/It)">Third Person (They/It)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Text Readability</label>
              <select
                value={textReadability}
                onChange={(e) => setTextReadability(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
              >
                <option value="None">None</option>
                <option value="7th Grade">7th Grade (Simple)</option>
                <option value="High School">High School</option>
              </select>
            </div>
          </div>
        </div>

        {/* Structure Settings */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100 space-y-5">
          <h3 className="font-black text-lg text-slate-900">Structure Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: "Conclusion", value: structConclusion, setter: setStructConclusion },
              { label: "Tables", value: structTables, setter: setStructTables },
              { label: "H3 Headings", value: structH3, setter: setStructH3 },
              { label: "Lists", value: structLists, setter: setStructLists },
              { label: "Italics", value: structItalics, setter: setStructItalics },
              { label: "Quotes", value: structQuotes, setter: setStructQuotes },
              { label: "Key Takeaways", value: structKeyTakeaways, setter: setStructKeyTakeaways },
              { label: "FAQ", value: structFaq, setter: setStructFaq },
              { label: "Bold", value: structBold, setter: setStructBold }
            ].map((struct) => (
              <div key={struct.label} className="flex flex-col gap-1.5 border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{struct.label}</span>
                <button
                  type="button"
                  onClick={() => struct.setter(!struct.value)}
                  className="flex items-center gap-2 text-sm font-bold w-full text-left text-slate-800 mt-1"
                >
                  <CheckCircle2 className={`h-4 w-4 rounded-full ${struct.value ? "text-indigo-600 bg-indigo-500/10" : "text-slate-400"}`} />
                  {struct.value ? "Yes" : "No"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-6 border-t flex flex-col items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="w-[300px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold h-14 rounded-xl text-lg flex items-center justify-center shadow-lg transition-all"
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Generate Posts
          </button>
        </div>
      </form>
    </div>
  );
}
