"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProjects } from "@/hooks/useProjects";
import { toast } from "sonner";
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Laptop,
  Smartphone,
  Upload,
  Sparkles,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Smile,
  MapPin,
  Tag,
  Link as LinkIcon,
  HelpCircle,
  Loader2,
  ChevronLeft,
  Image as ImageIcon,
  Check,
  Globe,
  Share2,
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  RefreshCw,
  MoreHorizontal,
  Store,
  Pin
} from "lucide-react";

// Platform configurations
const platformConfigs = {
  facebook: {
    id: "facebook",
    name: "Facebook",
    color: "#1877F2",
    bgClass: "from-blue-600 to-indigo-700",
    icon: Facebook,
    avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
    handle: "Builditindia - Everything Construction"
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    color: "#E1306C",
    bgClass: "from-pink-600 via-purple-600 to-orange-500",
    icon: Instagram,
    avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
    handle: "builditindiaofficial"
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    bgClass: "from-sky-700 to-blue-800",
    icon: Linkedin,
    avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
    handle: "Builditindia Company"
  },
  twitter: {
    id: "twitter",
    name: "X (Twitter)",
    color: "#000000",
    bgClass: "from-slate-900 to-slate-950",
    icon: Twitter,
    avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
    handle: "builditindia_ai"
  }
};

const trendingHashtags = [
  "BuilditIndia", "AEO", "PropTech", "ConstructionAutomation", "SocialSelling", "BrandGrowth", "Solospider", "SaaS2026"
];

const mockImageOptions = [
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&auto=format&fit=crop&q=80", // construction site
  "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?w=600&auto=format&fit=crop&q=80", // tech engineer
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80", // modern high-rise
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80"  // analytics dashboard
];

interface SocialComposerProps {
  onBack?: () => void;
  initialDate?: string;
  initialTime?: string;
}

export function SocialComposer({ onBack, initialDate = "2026-05-25", initialTime = "10:00" }: SocialComposerProps) {
  const { activeProject } = useProjects();
  const queryClient = useQueryClient();

  // Basic Composer states
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [isCustomPostEnabled, setIsCustomPostEnabled] = useState(false);
  
  // Dynamic captions
  const [unifiedCaption, setUnifiedCaption] = useState(
    "Everything Construction. One Platform. We are automating how developers, engineers, and builders source materials and track progress in real-time. 🏗️🚀 #BuilditIndia #PropTech"
  );
  const [platformCaptions, setPlatformCaptions] = useState<Record<string, string>>({
    facebook: "Builditindia is launching the premier all-in-one ecosystem for construction orchestration! Find trusted vendors, schedule logistics, and deploy smart sensors seamlessly. 🏗️✨ Learn more on our page. #BuilditIndia #PropTech #SaaS2026",
    instagram: "One unified workspace for the entire construction cycle. 👷‍♂️🏗️ Elevate your delivery speeds, minimize material waist, and coordinate workforce deployment. Link in bio! 🚀 #BuilditIndia #PropTech #ConstructionAutomation #FutureOfBuilders",
    linkedin: "We are thrilled to announce the official rollout of Builditindia - the ultimate construction intelligence platform. Designed to drive efficiency, maximize margin safety, and automate procurement pipelines for enterprise developers. Read our full whitepaper. #BuilditIndia #PropTech #B2BConstruction",
    twitter: "The future of construction is digital, unified, and autonomous. Try Builditindia today: everything construction on one platform. 🏗️🤖 #BuilditIndia #PropTech"
  });

  // Media array
  const [mediaUrls, setMediaUrls] = useState<string[]>([
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&auto=format&fit=crop&q=80"
  ]);

  // CTA options
  const [isCtaEnabled, setIsCtaEnabled] = useState(true);
  const [ctaType, setCtaType] = useState("Learn More");
  const [ctaUrl, setCtaUrl] = useState("https://builditindia.com/register");

  // Scheduling details
  const [scheduleDate, setScheduleDate] = useState(initialDate);
  const [scheduleTime, setScheduleTime] = useState(initialTime);

  // Preview options
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<string>("facebook");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // AI assistant states
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Ensure active preview platform is one of the selected ones
  useEffect(() => {
    if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(activePreviewPlatform)) {
      setActivePreviewPlatform(selectedPlatforms[0]);
    }
  }, [selectedPlatforms, activePreviewPlatform]);

  const handlePlatformCaptionChange = (platform: string, text: string) => {
    setPlatformCaptions((prev) => ({ ...prev, [platform]: text }));
  };

  const getActiveCaption = (platform: string) => {
    return isCustomPostEnabled ? platformCaptions[platform] || "" : unifiedCaption;
  };

  // Add random mock photo helper
  const handleAddMockPhoto = () => {
    const nextIndex = mediaUrls.length % mockImageOptions.length;
    setMediaUrls((prev) => [...prev, mockImageOptions[nextIndex]]);
    toast.success("Media asset added successfully!");
  };

  // Run AI generator simulation
  const handleGenerateAICopy = () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt or keyword for the AI assistant.");
      return;
    }
    setIsGenerating(true);
    toast.info("Generating high-converting social copy...");

    setTimeout(() => {
      const generatedUnified = `🚧 Disrupting traditional workflows: ${aiPrompt}\n\nBuilditindia brings all stakeholders into a single, high-fidelity digital dashboard. Drive real-time coordination, optimize vendor costs, and scale construction securely. 🚀⚙️\n\n#BuilditIndia #PropTech #AutonomousOS`;
      
      const generatedFb = `🏗️ Transforming Construction Orchestration:\n\n${aiPrompt}\n\nOur intelligent enterprise panel eliminates critical delays and connects vendors in minutes. Build smart, build fast with Builditindia. 🌍🛡️ #BuilditIndia #PropTech`;
      const generatedIg = `Smarter workflows. Faster builds. Better margins. 👷‍♂️⚙️\n\n${aiPrompt}\n\nSwipe left to see our latest dashboard deployments! 🚀 #BuilditIndia #ConstructionAutomation #PropTech`;
      const generatedLi = `Autonomous project execution in PropTech is no longer a concept—it is here.\n\n${aiPrompt}\n\nBuilditindia brings structural data processing and vendor logistics under one automated platform. Read the study. #PropTech #EnterpriseSoftware #RealEstate`;
      const generatedTw = `How we're driving 40% faster project dispatch schedules: ${aiPrompt} 🏗️📈 #BuilditIndia #PropTech`;

      setUnifiedCaption(generatedUnified);
      setPlatformCaptions({
        facebook: generatedFb,
        instagram: generatedIg,
        linkedin: generatedLi,
        twitter: generatedTw
      });

      setIsGenerating(false);
      toast.success("AI Social Copy Generated!");
    }, 1500);
  };

  const createPostMutation = useMutation({
    mutationFn: async (payload: {
      project_id: string;
      platform: string;
      caption: string;
      image_url?: string;
      scheduled_at: string;
    }) => {
      const response = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to schedule post");
      }
      return response.json();
    }
  });

  // Schedule mutation
  const handleSchedulePost = async () => {
    if (!activeProject) {
      toast.error("Please select a project first.");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform to publish.");
      return;
    }

    const toastId = toast.loading("Scheduling post across selected channels...");
    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();

    try {
      for (const platform of selectedPlatforms) {
        const captionText = isCustomPostEnabled 
          ? platformCaptions[platform] || unifiedCaption 
          : unifiedCaption;

        await createPostMutation.mutateAsync({
          project_id: activeProject.id,
          platform,
          caption: captionText,
          image_url: mediaUrls[0] || undefined,
          scheduled_at: scheduledDateTime,
        });
      }

      toast.dismiss(toastId);
      toast.success("Social Post Scheduled successfully!", {
        description: `Scheduled for ${scheduleDate} at ${scheduleTime} across: ${selectedPlatforms.map(p => p.toUpperCase()).join(", ")}`
      });
      queryClient.invalidateQueries({ queryKey: ["social_posts", activeProject.id] });
      if (onBack) onBack();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Error scheduling post", { description: err.message });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header bar with controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white border border-slate-200 py-1.5 px-3 rounded-lg shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Planner
          </button>
          <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">Create Social Post</h2>
          <p className="text-slate-500 text-xs mt-1">Compose and customize dynamic content across multiple social platforms simultaneously.</p>
        </div>

        {/* Schedule button in header */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400">Draft Status: <span className="text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Ready</span></span>
          <button
            onClick={handleSchedulePost}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold py-2.5 px-5 rounded-xl shadow-md shadow-violet-600/10 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            Schedule Post
          </button>
        </div>
      </div>

      {/* Workspace Double-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-24">
        
        {/* Left Column: Editor & Inputs (7/12 cols) */}
        <div className="lg:col-span-7 space-y-6 scrollbar-thin">
          
          {/* Section 1: Post to Channels */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>
              Post to Channels
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(platformConfigs).map(([key, config]) => {
                const isSelected = selectedPlatforms.includes(key);
                const PlatformIcon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isSelected) {
                        if (selectedPlatforms.length === 1) {
                          toast.error("Must select at least one social channel.");
                          return;
                        }
                        setSelectedPlatforms(selectedPlatforms.filter(p => p !== key));
                      } else {
                        setSelectedPlatforms([...selectedPlatforms, key]);
                      }
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-extrabold transition-all relative select-none cursor-pointer overflow-hidden ${
                      isSelected 
                        ? `bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-950/10` 
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${
                      isSelected ? `bg-gradient-to-tr ${config.bgClass}` : "bg-slate-100 text-slate-500"
                    }`}>
                      <PlatformIcon className="w-4 h-4" />
                    </div>
                    {config.name}
                    
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-violet-600 text-white flex items-center justify-center scale-90">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Media Studio Hub */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>
                Post Media Assets
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase bg-slate-100 px-2 py-0.5 rounded-md">
                Instagram limit: 10 images
              </span>
            </div>

            {/* Media previews layout grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3.5">
              {mediaUrls.map((url, idx) => (
                <div 
                  key={idx} 
                  className="aspect-square rounded-2xl border border-slate-200 overflow-hidden relative group bg-slate-50 shadow-inner"
                >
                  <img src={url} className="w-full h-full object-cover" alt="Social post attachment" />
                  
                  {/* Remove hover button */}
                  <button 
                    onClick={() => {
                      setMediaUrls(mediaUrls.filter((_, i) => i !== idx));
                      toast.info("Image removed from attachment draft.");
                    }}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="absolute bottom-1 left-1.5 text-[9px] font-black text-white bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                    #{idx + 1}
                  </div>
                </div>
              ))}

              {/* Add attachment block */}
              <button 
                onClick={handleAddMockPhoto}
                className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-violet-500 hover:bg-violet-50/5 flex flex-col items-center justify-center text-slate-400 hover:text-violet-600 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-wider">Add Photo</span>
              </button>
            </div>
            
            <p className="text-[10px] font-semibold text-slate-400 leading-normal">
              Drag and drop your images or videos to reorder them in the gallery viewer. Supported up to 15MB.
            </p>
          </div>

          {/* Section 3: Caption Editor Box */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            
            {/* Header with customization toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>
                Post Caption details
              </h3>

              {/* Switch for Customize post for FB/IG */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={isCustomPostEnabled}
                  onChange={(e) => {
                    setIsCustomPostEnabled(e.target.checked);
                    if (e.target.checked) {
                      toast.info("Custom captions enabled for each active channel.");
                    } else {
                      toast.success("Unified caption enabled for all channels.");
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600 relative"></div>
                <span className="text-xs font-extrabold text-slate-700">Customise text per channel</span>
              </label>
            </div>

            {/* AI Assistant Drawer Box */}
            <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                  AI Writer Assistant
                </span>
                
                {isGenerating && (
                  <span className="text-[10px] font-black text-violet-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generating...
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Write a launch announcement post for our PropTech builder SaaS..."
                  className="flex-1 text-xs bg-white border border-slate-200 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none"
                />
                <button
                  onClick={handleGenerateAICopy}
                  disabled={isGenerating}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Draft Copy
                </button>
              </div>
            </div>

            {/* Custom Tabbed Textarea Editors */}
            {isCustomPostEnabled ? (
              <div className="space-y-4">
                {/* Platform caption tabs */}
                <div className="flex gap-1.5 border-b border-slate-100 pb-1 overflow-x-auto">
                  {selectedPlatforms.map((plat) => {
                    const config = platformConfigs[plat as keyof typeof platformConfigs];
                    const active = activePreviewPlatform === plat;
                    if (!config) return null;
                    return (
                      <button
                        key={plat}
                        onClick={() => setActivePreviewPlatform(plat)}
                        className={`text-xs font-bold pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          active 
                            ? "border-violet-600 text-violet-600 font-extrabold" 
                            : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-tr ${config.bgClass}`}></span>
                        {config.name}
                      </button>
                    );
                  })}
                </div>

                {/* Text Area per platform */}
                {selectedPlatforms.map((plat) => {
                  if (activePreviewPlatform !== plat) return null;
                  const config = platformConfigs[plat as keyof typeof platformConfigs];
                  return (
                    <div key={plat} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-400">Editing caption for {config.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{platformCaptions[plat]?.length || 0}/2200</span>
                      </div>
                      <textarea
                        value={platformCaptions[plat] || ""}
                        onChange={(e) => handlePlatformCaptionChange(plat, e.target.value)}
                        className="w-full min-h-[140px] text-xs text-slate-700 bg-slate-50/30 focus:bg-white border border-slate-200 focus:border-violet-500 rounded-2xl p-4 outline-none resize-none leading-relaxed transition-all"
                        placeholder={`Write custom caption for ${config.name}...`}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              // Unified single textarea
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">Unified Caption (All Channels)</span>
                  <span className="text-[10px] text-slate-400 font-bold">{unifiedCaption.length}/2200</span>
                </div>
                <textarea
                  value={unifiedCaption}
                  onChange={(e) => setUnifiedCaption(e.target.value)}
                  className="w-full min-h-[140px] text-xs text-slate-700 bg-slate-50/30 focus:bg-white border border-slate-200 focus:border-violet-500 rounded-2xl p-4 outline-none resize-none leading-relaxed transition-all"
                  placeholder="Draft unified post caption here..."
                />
              </div>
            )}

            {/* Quick action bar inside input editor */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    const smileys = ["🏗️", "🚀", "⚙️", "👷‍♂️", "📐", "📈"];
                    const randomSmiley = smileys[Math.floor(Math.random() * smileys.length)];
                    if (isCustomPostEnabled) {
                      handlePlatformCaptionChange(activePreviewPlatform, getActiveCaption(activePreviewPlatform) + " " + randomSmiley);
                    } else {
                      setUnifiedCaption((prev) => prev + " " + randomSmiley);
                    }
                    toast.info("Emoji inserted!");
                  }}
                  className="p-2 hover:bg-slate-50 hover:text-violet-600 rounded-xl text-slate-400 transition-colors" 
                  title="Insert Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => toast.success("Location: Mumbai, India tagged!")}
                  className="p-2 hover:bg-slate-50 hover:text-violet-600 rounded-xl text-slate-400 transition-colors" 
                  title="Tag Location"
                >
                  <MapPin className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => toast.info("Sponsor tagging is active in premium profiles.")}
                  className="p-2 hover:bg-slate-50 hover:text-violet-600 rounded-xl text-slate-400 transition-colors" 
                  title="Tag Sponsor"
                >
                  <Tag className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Hashtag recommendations */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full sm:max-w-md no-scrollbar">
                {trendingHashtags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      const add = ` #${tag}`;
                      if (isCustomPostEnabled) {
                        handlePlatformCaptionChange(activePreviewPlatform, getActiveCaption(activePreviewPlatform) + add);
                      } else {
                        setUnifiedCaption((prev) => prev + add);
                      }
                      toast.info(`Added #${tag}`);
                    }}
                    className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 hover:border-violet-200 hover:text-violet-600 px-2 py-1 rounded-lg whitespace-nowrap transition-all"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Section 4: Call to Action block */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>
                Action Link (Call to Action Button)
              </h3>
              
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={isCtaEnabled}
                  onChange={(e) => setIsCtaEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600 relative"></div>
                <span className="text-xs font-extrabold text-slate-700">Add Link Button</span>
              </label>
            </div>

            {isCtaEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-150">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Button Type</label>
                  <select 
                    value={ctaType}
                    onChange={(e) => setCtaType(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 focus:border-violet-500 rounded-xl p-3 outline-none cursor-pointer"
                  >
                    <option>Learn More</option>
                    <option>Book Now</option>
                    <option>Sign Up</option>
                    <option>Shop Now</option>
                    <option>Download</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Destination URL</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="url" 
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-violet-500 focus:bg-white rounded-xl pl-9 pr-4 py-3 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-[10px] font-semibold text-slate-400 leading-normal">
              CTA buttons are displayed on Facebook Pages, LinkedIn Articles, and can be integrated dynamically inside biological link bio trees.
            </p>
          </div>

          {/* Section 5: Scheduling calendar engine */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>
              Scheduling Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Publish Date
                </label>
                <input 
                  type="date" 
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Publish Time
                </label>
                <input 
                  type="time" 
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Best Time to Post Recommendation</span>
                <p className="text-[10px] font-semibold text-slate-600 mt-1">
                  Based on target client activity, publishing this post on <span className="font-extrabold text-slate-800">Wednesday at 10:00 AM</span> is predicted to maximize organic reach by up to 24%.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Feed Mockup Sandbox (5/12 cols) */}
        <div className="lg:col-span-5 space-y-6 sticky top-24">
          
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            
            {/* Preview controls bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              
              {/* Selector dropdown for mockup feeds */}
              <div className="relative">
                <select
                  value={activePreviewPlatform}
                  onChange={(e) => setActivePreviewPlatform(e.target.value)}
                  className="text-xs font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 outline-none cursor-pointer appearance-none shadow-sm"
                >
                  {selectedPlatforms.map((plat) => {
                    const config = platformConfigs[plat as keyof typeof platformConfigs];
                    if (!config) return null;
                    return (
                      <option key={plat} value={plat}>
                        {config.name} Feed Preview
                      </option>
                    );
                  })}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none w-3.5 h-3.5 text-slate-400 bg-slate-50 flex items-center justify-center">
                  ▼
                </div>
              </div>

              {/* Desktop vs Mobile Toggle */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center self-start sm:self-auto border border-slate-200/50">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded-lg transition-all ${
                    previewDevice === "desktop" ? "bg-white text-violet-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Desktop feed preview"
                >
                  <Laptop className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded-lg transition-all ${
                    previewDevice === "mobile" ? "bg-white text-violet-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Mobile app feed preview"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Mock feed platform renderer */}
            <div className="w-full flex justify-center bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
              
              {/* iPhone casing wrapper for mobile */}
              <div className={`w-full transition-all duration-300 ${
                previewDevice === "mobile" 
                  ? "max-w-[340px] bg-slate-900 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800 relative ring-4 ring-slate-950" 
                  : "max-w-full"
              }`}>
                {/* Speaker/notch mockup for iPhone */}
                {previewDevice === "mobile" && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-900 rounded-b-xl z-20 flex items-center justify-center">
                    <div className="w-10 h-1 bg-slate-800 rounded-full mb-1"></div>
                  </div>
                )}

                {/* Main screen content */}
                <div className={`bg-white text-slate-800 transition-all ${
                  previewDevice === "mobile" ? "rounded-[28px] overflow-hidden min-h-[500px] border border-slate-800" : "w-full"
                }`}>
                  
                  {/* --- PLATFORM 1: FACEBOOK FEED PREVIEW --- */}
                  {activePreviewPlatform === "facebook" && (
                    <div className="w-full p-4.5 space-y-3.5 select-none animate-in fade-in duration-200">
                      
                      {/* Post Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={platformConfigs.facebook.avatarUrl} 
                            className="w-10 h-10 rounded-full border border-slate-100 shadow-sm object-cover" 
                            alt="Facebook Profile"
                          />
                          <div>
                            <span className="text-[13px] font-black text-slate-900 hover:underline block leading-snug cursor-pointer">
                              {platformConfigs.facebook.handle}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              Just now · <Globe className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                        <button className="p-1 hover:bg-slate-100 text-slate-400 rounded-full">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Caption text */}
                      <p className="text-[12.5px] text-slate-800 leading-relaxed whitespace-pre-wrap pl-0.5">
                        {getActiveCaption("facebook") || "Type some details to build post preview..."}
                      </p>

                      {/* Mock Custom Media viewer grid */}
                      {mediaUrls.length > 0 && (
                        <div className={`rounded-xl overflow-hidden border border-slate-150 bg-slate-50 relative shadow-sm ${
                          mediaUrls.length === 1 ? "aspect-[4/3]" : "aspect-[16/10]"
                        }`}>
                          {mediaUrls.length === 1 && (
                            <img src={mediaUrls[0]} className="w-full h-full object-cover" alt="Facebook attachment" />
                          )}
                          
                          {mediaUrls.length === 2 && (
                            <div className="grid grid-cols-2 h-full gap-0.5">
                              <img src={mediaUrls[0]} className="w-full h-full object-cover" alt="attachment-1" />
                              <img src={mediaUrls[1]} className="w-full h-full object-cover" alt="attachment-2" />
                            </div>
                          )}

                          {mediaUrls.length === 3 && (
                            <div className="grid grid-cols-3 h-full gap-0.5">
                              <img src={mediaUrls[0]} className="col-span-2 w-full h-full object-cover" alt="attachment-1" />
                              <div className="grid grid-rows-2 gap-0.5">
                                <img src={mediaUrls[1]} className="w-full h-full object-cover" alt="attachment-2" />
                                <img src={mediaUrls[2]} className="w-full h-full object-cover" alt="attachment-3" />
                              </div>
                            </div>
                          )}

                          {mediaUrls.length >= 4 && (
                            <div className="grid grid-cols-2 h-full gap-0.5">
                              <img src={mediaUrls[0]} className="w-full h-full object-cover" alt="attachment-1" />
                              <div className="grid grid-cols-2 gap-0.5 relative">
                                <img src={mediaUrls[1]} className="w-full h-full object-cover" alt="attachment-2" />
                                <img src={mediaUrls[2]} className="w-full h-full object-cover" alt="attachment-3" />
                                {mediaUrls.length > 3 && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-lg font-black border border-white/10 rounded">
                                    +{mediaUrls.length - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Facebook Bottom Call to Action strip overlay */}
                          {isCtaEnabled && (
                            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3.5 flex justify-between items-center select-none shadow-inner">
                              <div className="flex-1 min-w-0 pr-3">
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block leading-none">
                                  {new URL(ctaUrl || "https://builditindia.com").hostname.toUpperCase()}
                                </span>
                                <span className="text-[12.5px] font-black text-slate-800 truncate block mt-1 leading-snug">
                                  {ctaType} & Register
                                </span>
                              </div>
                              <a 
                                href={ctaUrl} 
                                target="_blank"
                                rel="noreferrer"
                                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-[11px] font-extrabold px-4 py-2 rounded-lg whitespace-nowrap shadow-sm"
                              >
                                {ctaType.toUpperCase()}
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mock Interaction buttons list */}
                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-slate-500 px-1">
                        <button className="flex items-center gap-1.5 hover:text-slate-800 py-1 px-2 hover:bg-slate-50 rounded-lg text-xs font-extrabold select-none">
                          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                          <span>1.4K</span>
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-slate-800 py-1 px-2 hover:bg-slate-50 rounded-lg text-xs font-extrabold select-none">
                          <MessageCircle className="w-4 h-4" />
                          <span>18 Comments</span>
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-slate-800 py-1 px-2 hover:bg-slate-50 rounded-lg text-xs font-extrabold select-none">
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>
                      </div>

                    </div>
                  )}

                  {/* --- PLATFORM 2: INSTAGRAM FEED PREVIEW --- */}
                  {activePreviewPlatform === "instagram" && (
                    <div className="w-full select-none animate-in fade-in duration-200 bg-white">
                      
                      {/* IG Post Header */}
                      <div className="p-3.5 flex items-center justify-between border-b border-slate-50">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={platformConfigs.instagram.avatarUrl} 
                            className="w-8.5 h-8.5 rounded-full p-[1.5px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 object-cover" 
                            alt="Instagram Avatar"
                          />
                          <div>
                            <span className="text-[12px] font-black text-slate-900 block leading-tight cursor-pointer hover:underline">
                              {platformConfigs.instagram.handle}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Mumbai, India</span>
                          </div>
                        </div>
                        <button className="p-1 text-slate-400 hover:bg-slate-50 rounded-full">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Main Square Graphic preview */}
                      {mediaUrls.length > 0 ? (
                        <div className="w-full aspect-square bg-slate-50 relative border-y border-slate-100 flex items-center justify-center">
                          <img src={mediaUrls[0]} className="w-full h-full object-cover" alt="Instagram graphic" />
                          
                          {/* Indicator dots inside photo */}
                          {mediaUrls.length > 1 && (
                            <div className="absolute bottom-3 right-3 bg-black/75 text-white text-[9px] font-black px-2 py-0.5 rounded-full select-none">
                              1/{mediaUrls.length}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full aspect-square bg-slate-50 flex items-center justify-center border-y border-slate-100">
                          <ImageIcon className="w-12 h-12 text-slate-300" />
                        </div>
                      )}

                      {/* IG interaction tray */}
                      <div className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3.5 text-slate-800">
                            <button className="hover:scale-110 active:scale-95 transition-transform"><Heart className="w-5.5 h-5.5 text-rose-600 fill-rose-600" /></button>
                            <button className="hover:scale-110 active:scale-95 transition-transform"><MessageCircle className="w-5.5 h-5.5" /></button>
                            <button className="hover:scale-110 active:scale-95 transition-transform"><Send className="w-5.5 h-5.5" /></button>
                          </div>
                          
                          {/* Carousel dots in middle */}
                          {mediaUrls.length > 1 && (
                            <div className="flex items-center gap-1">
                              {mediaUrls.slice(0, 5).map((_, i) => (
                                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-sky-500" : "bg-slate-200"}`}></span>
                              ))}
                            </div>
                          )}

                          <button className="text-slate-800 hover:scale-110 active:scale-95 transition-transform"><Bookmark className="w-5.5 h-5.5" /></button>
                        </div>

                        {/* Likes counter details */}
                        <p className="text-[12px] font-black text-slate-900 leading-tight">Liked by buildit_ai and 8,432 others</p>

                        {/* Text Caption display */}
                        <div className="text-[12px] text-slate-800 leading-relaxed">
                          <span className="font-black text-slate-900 mr-1.5 hover:underline cursor-pointer">
                            {platformConfigs.instagram.handle}
                          </span>
                          <span className="whitespace-pre-wrap">
                            {getActiveCaption("instagram") || "Write custom details in composer..."}
                          </span>
                        </div>

                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1.5">
                          2 HOURS AGO
                        </span>

                      </div>

                    </div>
                  )}

                  {/* --- PLATFORM 3: LINKEDIN POST PREVIEW --- */}
                  {activePreviewPlatform === "linkedin" && (
                    <div className="w-full p-4.5 space-y-3.5 select-none animate-in fade-in duration-200 bg-white">
                      
                      {/* LinkedIn Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={platformConfigs.linkedin.avatarUrl} 
                            className="w-11 h-11 rounded-lg border border-slate-100 shadow-sm object-cover" 
                            alt="LinkedIn Company logo"
                          />
                          <div>
                            <span className="text-[13px] font-black text-slate-900 hover:underline hover:text-sky-700 block cursor-pointer">
                              {platformConfigs.linkedin.handle}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">38,412 followers</span>
                            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-0.5">
                              Just now · 🌍
                            </span>
                          </div>
                        </div>
                        <button className="p-1 hover:bg-slate-50 text-slate-400 rounded-full">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Caption text */}
                      <p className="text-[12px] text-slate-800 leading-relaxed whitespace-pre-wrap pl-0.5">
                        {getActiveCaption("linkedin") || "Draft caption details..."}
                      </p>

                      {/* Graphic Preview */}
                      {mediaUrls.length > 0 && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 relative bg-slate-50">
                          <img src={mediaUrls[0]} className="w-full aspect-[16/10] object-cover" alt="LinkedIn attachment" />
                          
                          {/* Action Button box inside LinkedIn preview */}
                          {isCtaEnabled && (
                            <div className="bg-slate-50 border-t border-slate-100 p-3.5 flex justify-between items-center select-none shadow-sm">
                              <div>
                                <span className="text-[12.5px] font-black text-slate-800 truncate block leading-snug">
                                  {ctaType} & Register
                                </span>
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5 block leading-none">
                                  {new URL(ctaUrl || "https://builditindia.com").hostname}
                                </span>
                              </div>
                              <span className="bg-white border border-slate-300 text-violet-600 text-[11px] font-extrabold px-4 py-2 rounded-full whitespace-nowrap shadow-sm hover:bg-slate-50 cursor-pointer">
                                {ctaType}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mock reactions count */}
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 pt-1">
                        <span className="flex items-center gap-1 hover:text-sky-700 cursor-pointer">
                          👏 👍 💡 432
                        </span>
                        <span className="hover:underline cursor-pointer">
                          4 comments · 2 reposts
                        </span>
                      </div>

                      {/* Action buttons bar */}
                      <div className="border-t border-slate-150 pt-2 flex items-center justify-around text-slate-500 font-black">
                        <button className="flex items-center gap-2 hover:bg-slate-50 py-2 px-3 rounded-lg text-xs select-none">
                          👍 <span className="text-slate-600">Like</span>
                        </button>
                        <button className="flex items-center gap-2 hover:bg-slate-50 py-2 px-3 rounded-lg text-xs select-none">
                          💬 <span className="text-slate-600">Comment</span>
                        </button>
                        <button className="flex items-center gap-2 hover:bg-slate-50 py-2 px-3 rounded-lg text-xs select-none">
                          🔁 <span className="text-slate-600">Repost</span>
                        </button>
                      </div>

                    </div>
                  )}

                  {/* --- PLATFORM 4: TWITTER TWEET PREVIEW --- */}
                  {activePreviewPlatform === "twitter" && (
                    <div className="w-full p-4.5 select-none animate-in fade-in duration-200 bg-white">
                      
                      {/* Left circular avatar + Right layout structure */}
                      <div className="flex gap-3">
                        <img 
                          src={platformConfigs.twitter.avatarUrl} 
                          className="w-10 h-10 rounded-full border border-slate-100 object-cover" 
                          alt="Twitter Avatar"
                        />
                        
                        <div className="flex-1 space-y-2.5 min-w-0">
                          {/* Username info header */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-black text-slate-900 hover:underline cursor-pointer block leading-none">
                              {platformConfigs.twitter.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-semibold truncate block leading-none">
                              @{platformConfigs.twitter.handle} · Just now
                            </span>
                          </div>

                          {/* Tweet Caption */}
                          <p className="text-[12.5px] text-slate-950 leading-relaxed whitespace-pre-wrap">
                            {getActiveCaption("twitter") || "Compose your tweet details..."}
                          </p>

                          {/* Graphic display inside tweet card */}
                          {mediaUrls.length > 0 && (
                            <div className="rounded-xl overflow-hidden border border-slate-150 relative bg-slate-50">
                              <img src={mediaUrls[0]} className="w-full aspect-[16/9] object-cover" alt="Tweet media attachment" />
                            </div>
                          )}

                          {/* Twitter standard interaction tray */}
                          <div className="flex items-center justify-between text-slate-400 max-w-sm pt-2">
                            <button className="hover:text-sky-500 text-xs font-semibold flex items-center gap-1">
                              💬 <span className="text-[10px]">12</span>
                            </button>
                            <button className="hover:text-emerald-500 text-xs font-semibold flex items-center gap-1">
                              🔁 <span className="text-[10px]">8</span>
                            </button>
                            <button className="hover:text-rose-500 text-xs font-semibold flex items-center gap-1">
                              ❤️ <span className="text-[10px]">142</span>
                            </button>
                            <button className="hover:text-sky-500 text-xs font-semibold flex items-center gap-1">
                              📊 <span className="text-[10px]">5K</span>
                            </button>
                          </div>

                        </div>
                      </div>

                    </div>
                  )}

                </div>
              </div>

            </div>

            {/* Platform limits validator notifications */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Validation Dashboard</span>
              
              <div className="space-y-1.5">
                {selectedPlatforms.map((plat) => {
                  const limit = plat === "twitter" ? 280 : 2200;
                  const textLength = getActiveCaption(plat).length;
                  const valid = textLength <= limit;
                  const platName = platformConfigs[plat as keyof typeof platformConfigs]?.name || plat;
                  return (
                    <div key={plat} className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${valid ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`}></span>
                        {platName} Text length
                      </span>
                      <span className={valid ? "text-slate-500" : "text-red-500 font-extrabold"}>
                        {textLength} / {limit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Bottom stick bar for action items */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md sticky bottom-4 z-30">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-black text-slate-600">Local internet connection stable. Sync ready.</span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-extrabold py-2.5 px-5 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          
          <button 
            onClick={() => toast.success("Draft saved in Solospider Assets!")}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold py-2.5 px-5 rounded-xl transition-all cursor-pointer"
          >
            Finish Later
          </button>

          <button
            onClick={handleSchedulePost}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold py-2.5 px-6 rounded-xl shadow-md shadow-violet-600/10 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            Schedule & Publish
          </button>
        </div>
      </div>

    </div>
  );
}
