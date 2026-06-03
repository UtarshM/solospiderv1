"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SocialComposer } from "./social-composer";
import { useProjects } from "@/hooks/useProjects";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { 
  Users, 
  Calendar, 
  Activity, 
  Clock, 
  Sparkles, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Check, 
  Loader2, 
  Share2, 
  ExternalLink,
  Globe, 
  ArrowUpRight,
  Eye,
  RefreshCw,
  Trash2,
  Camera,
  MessageSquare,
  Megaphone,
  Clapperboard,
  PlusCircle,
  LayoutTemplate
} from "lucide-react";

// Platform styling details
const platformMeta = {
  instagram: {
    name: "Instagram",
    bg: "from-pink-600 via-purple-600 to-orange-500",
    color: "text-pink-500",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    label: "@solospider_ig"
  },
  facebook: {
    name: "Facebook",
    bg: "from-blue-600 to-indigo-700",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    label: "SoloSpider AI"
  },
  linkedin: {
    name: "LinkedIn",
    bg: "from-sky-700 to-blue-800",
    color: "text-sky-700",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    label: "SoloSpider"
  },
  twitter: {
    name: "X (Twitter)",
    bg: "from-slate-900 to-slate-950",
    color: "text-slate-900",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    label: "@solospider_ai"
  }
};

// Preset Content Ideas
const contentIdeas = [
  { id: "idea-1", text: "5 AI tools every marketer should try in 2026", type: "Educational", badgeColor: "bg-emerald-500/10 text-emerald-600" },
  { id: "idea-2", text: "Behind the scenes of our latest automated growth campaign", type: "Behind the Scenes", badgeColor: "bg-amber-500/10 text-amber-600" },
  { id: "idea-3", text: "Customer success story: How we helped Acme Co grow by 40%", type: "Testimonial", badgeColor: "bg-indigo-500/10 text-indigo-600" },
];

export function SocialPlanner() {
  const { activeProject } = useProjects();
  const queryClient = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  // Selected state for planner composer
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram"]);
  const [caption, setCaption] = useState("AI is transforming the way businesses market, engage, and grow. Smarter workflows. Better insights. Real results. 🚀 Are you ready to future-proof your marketing?");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>(["AI", "Marketing", "Growth"]);
  const [ctaType, setCtaType] = useState("Learn More");
  const [ctaUrl, setCtaUrl] = useState("https://solospider.ai/ai-marketing");
  const [scheduleDate, setScheduleDate] = useState("2026-05-21");
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [mediaList, setMediaList] = useState<string[]>([
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60"
  ]);
  const [activeComposerTab, setActiveComposerTab] = useState<"create" | "drafts">("create");
  const [calendarViewMode, setCalendarViewMode] = useState<"week" | "month">("week");
  const [viewMode, setViewMode] = useState<"calendar" | "composer">("calendar");
  
  // Selected post details modal
  const [selectedPostDetails, setSelectedPostDetails] = useState<any>(null);

  // Fetch Connected Accounts status
  const accountsQuery = useQuery({
    queryKey: ["social_accounts", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("project_id", activeProject!.id);
      if (error) throw error;
      return data;
    }
  });

  // Fetch Scheduled Posts from DB
  const postsQuery = useQuery({
    queryKey: ["social_posts", activeProject?.id],
    enabled: Boolean(activeProject?.id),
    queryFn: async () => {
      const response = await fetch(`/api/social/posts/${activeProject!.id}`);
      if (!response.ok) throw new Error("Failed to load posts");
      const resData = await response.json();
      return resData.posts || [];
    }
  });

  // Mutation to insert new Social Post
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_posts", activeProject?.id] });
      toast.success("Successfully scheduled post!", {
        description: `Scheduled across ${selectedPlatforms.join(", ")} on ${scheduleDate} at ${scheduleTime}.`
      });
    },
    onError: (err: any) => {
      toast.error("Error scheduling post", { description: err.message });
    }
  });

  // Handle post generation
  const handleSchedulePost = () => {
    if (!activeProject) {
      toast.error("Please select a project first.");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform.");
      return;
    }
    if (!caption.trim()) {
      toast.error("Caption text cannot be empty.");
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();

    selectedPlatforms.forEach((platform) => {
      createPostMutation.mutate({
        project_id: activeProject.id,
        platform,
        caption: `${caption} ${hashtags.map(h => `#${h}`).join(" ")}`,
        image_url: mediaList[0] || undefined,
        scheduled_at: scheduledDateTime
      });
    });
  };

  // Generate AI Caption simulating Supabase edge function call
  const generateAICaption = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter an AI prompt to guide the generator.");
      return;
    }

    setIsGeneratingCaption(true);
    toast.info("Generating AI caption suggestions...", { duration: 1500 });
    
    // Simulate generation delay
    setTimeout(() => {
      const baseCaption = `🚀 Automated Growth Update:\n\n${aiPrompt}\n\nOur system analysed search vectors and citation patterns to drive high-impact growth channels automatically. Solospider leads the future of GEO/SEO orchestration.`;
      setCaption(baseCaption);
      setIsGeneratingCaption(false);
      toast.success("AI Caption generated!");
    }, 1500);
  };

  // Preset hashtags append helper
  const toggleHashtag = (tag: string) => {
    if (hashtags.includes(tag)) {
      setHashtags(hashtags.filter(h => h !== tag));
    } else {
      setHashtags([...hashtags, tag]);
    }
  };

  // Feed simulated accounts metrics (Instagram, Facebook, LinkedIn, Twitter/X)
  const connectedStats = [
    { platform: "instagram", reach: "12.4K", engagement: 589, engRate: "4.7%", arrow: "up", sparkline: [20, 35, 45, 30, 50, 75, 60] },
    { platform: "facebook", reach: "8.7K", engagement: 412, engRate: "3.6%", arrow: "up", sparkline: [10, 15, 25, 40, 35, 45, 55] },
    { platform: "linkedin", reach: "15.2K", engagement: 867, engRate: "5.7%", arrow: "up", sparkline: [30, 45, 40, 60, 65, 80, 95] },
    { platform: "twitter", reach: "6.1K", engagement: 213, engRate: "3.2%", arrow: "down", sparkline: [40, 35, 30, 25, 28, 22, 20] }
  ];

  // Helper to get formatted week dates for mockup representation (May 18 - May 24, 2026)
  const daysOfWeek = [
    { label: "SUN", dayNum: "17", dateStr: "2026-05-17" },
    { label: "MON", dayNum: "18", dateStr: "2026-05-18" },
    { label: "TUE", dayNum: "19", dateStr: "2026-05-19" },
    { label: "WED", dayNum: "20", dateStr: "2026-05-20" },
    { label: "THU", dayNum: "21", dateStr: "2026-05-21" },
    { label: "FRI", dayNum: "22", dateStr: "2026-05-22" },
    { label: "SAT", dayNum: "23", dateStr: "2026-05-23" }
  ];

  const timeSlots = ["All-day", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

  // Inject placeholder scheduled posts in UI to make calendar populate beautifully if Database is empty
  const defaultScheduledItems = [
    { id: "def-1", platform: "instagram", caption: "Productivity tips for modern marketers 🚀", scheduled_at: "2026-05-18T10:00:00Z" },
    { id: "def-2", platform: "linkedin", caption: "Case study: Scaling organic traffic automatically", scheduled_at: "2026-05-19T10:00:00Z" },
    { id: "def-3", platform: "facebook", caption: "Client shoutout to the Acme team!", scheduled_at: "2026-05-20T11:00:00Z" },
    { id: "def-4", platform: "twitter", caption: "Growth update: Our latest feature drops today!", scheduled_at: "2026-05-22T10:00:00Z" },
    { id: "def-5", platform: "instagram", caption: "Team spotlight: Meet our autonomous workflow experts", scheduled_at: "2026-05-19T13:00:00Z" },
    { id: "def-6", platform: "twitter", caption: "Tips & tricks: Master automated SEO indexing", scheduled_at: "2026-05-21T15:00:00Z" }
  ];

  // Merge database posts with placeholders for demonstration
  const allScheduledPosts = [...(postsQuery.data || []), ...defaultScheduledItems];

  // Check how many platforms are connected dynamically
  const connectedCount = accountsQuery.data?.length || 4; // defaults to 4 connected for gorgeous UI showcase

  if (viewMode === "composer") {
    return (
      <SocialComposer 
        onBack={() => setViewMode("calendar")} 
        initialDate={scheduleDate} 
        initialTime={scheduleTime} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Social Media Planner</h2>
          <p className="text-slate-500 text-sm mt-1">Plan, create, and schedule content across all your social channels.</p>
        </div>

        {/* Dynamic Navigation Calendar Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 text-xs font-semibold text-slate-700 select-none">May 17 – May 23, 2026</span>
            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button className="bg-white border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
            Today
          </button>

          {/* Week/Month tabs toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/50 shadow-inner">
            <button 
              onClick={() => setCalendarViewMode("week")}
              className={`text-xs font-bold py-1.5 px-3.5 rounded-lg transition-all ${
                calendarViewMode === "week" ? "bg-white text-violet-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Week
            </button>
            <button 
              onClick={() => setCalendarViewMode("month")}
              className={`text-xs font-bold py-1.5 px-3.5 rounded-lg transition-all ${
                calendarViewMode === "month" ? "bg-white text-violet-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Month
            </button>
          </div>

          {/* Creation Button Group */}
          <div className="flex items-center gap-2 ml-2">
            <button 
              onClick={() => setViewMode("composer")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutTemplate className="w-4 h-4" />
              Create Post
            </button>
            <button 
              className="bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Megaphone className="w-4 h-4" />
              Create ad
            </button>
            <button 
              className="bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Clapperboard className="w-4 h-4" />
              Create Reel
            </button>
            <button 
              className="bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Create Story
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cards Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-md transition-all duration-200 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-600"></div>
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform duration-200">
            <Users className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Connected Accounts</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800">{connectedCount} / 4</span>
              <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                All active
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-md transition-all duration-200 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-200">
            <Calendar className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Scheduled Posts</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800">{allScheduledPosts.length}</span>
              <span className="bg-indigo-500/10 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                This Week <ArrowUpRight className="w-3 h-3 text-indigo-500" /> +18%
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-md transition-all duration-200 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-pink-600"></div>
          <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform duration-200">
            <Activity className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Engagement Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800">4.8%</span>
              <span className="bg-pink-500/10 text-pink-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                +0.6% vs last 7d
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-md transition-all duration-200 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform duration-200">
            <Clock className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Best Time to Post</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-800">10:00 AM</span>
              <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Wednesday
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Feature Layout Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Interactive Week Calendar Grid (Takes 8/12 of container) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Calendar Column headers for Days */}
            <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50/50">
              <div className="p-3 border-r border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
                TIME
              </div>
              {daysOfWeek.map((day) => {
                const isToday = day.label === "THU"; // simulation target
                return (
                  <div key={day.label} className="p-3 border-r border-slate-100 last:border-r-0 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">{day.label}</span>
                    <span className={`text-base font-black mt-1 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isToday ? "bg-violet-600 text-white shadow-[0_4px_10px_rgba(124,58,237,0.3)] scale-105" : "text-slate-700"
                    }`}>
                      {day.dayNum}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Calendar Rows */}
            <div className="divide-y divide-slate-100">
              {timeSlots.map((timeSlot) => (
                <div key={timeSlot} className="grid grid-cols-8 min-h-[90px] group transition-colors duration-150">
                  {/* Time label */}
                  <div className="p-2 border-r border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 bg-slate-50/30">
                    {timeSlot}
                  </div>

                  {/* Days contents cells */}
                  {daysOfWeek.map((day) => {
                    // Check if there are scheduled posts matching this time & day
                    const matchingPosts = allScheduledPosts.filter((post) => {
                      const pDate = new Date(post.scheduled_at);
                      // Formulate comparisons
                      const hours = pDate.getUTCHours();
                      const postHourStr = `${hours === 0 ? 12 : hours > 12 ? hours - 12 : hours}:00 ${hours >= 12 ? 'PM' : 'AM'}`;
                      
                      // For presets, simplify comparison to static mocked times
                      if (post.id.startsWith("def-")) {
                        if (day.dateStr === "2026-05-18" && timeSlot === "10:00 AM" && post.id === "def-1") return true;
                        if (day.dateStr === "2026-05-19" && timeSlot === "10:00 AM" && post.id === "def-2") return true;
                        if (day.dateStr === "2026-05-20" && timeSlot === "11:00 AM" && post.id === "def-3") return true;
                        if (day.dateStr === "2026-05-22" && timeSlot === "10:00 AM" && post.id === "def-4") return true;
                        if (day.dateStr === "2026-05-19" && timeSlot === "1:00 PM" && post.id === "def-5") return true;
                        if (day.dateStr === "2026-05-21" && timeSlot === "3:00 PM" && post.id === "def-6") return true;
                        return false;
                      }

                      // Dynamic post format comparison
                      const dateMatch = post.scheduled_at.startsWith(day.dateStr);
                      const timeMatch = timeSlot.startsWith(post.scheduled_at.substring(11, 13)); // match hour
                      return dateMatch && timeMatch;
                    });

                    return (
                      <div 
                        key={`${day.label}-${timeSlot}`} 
                        className="p-1 border-r border-slate-100 last:border-r-0 relative hover:bg-slate-50/50 flex flex-col gap-1 transition-colors group/cell min-h-[90px]"
                      >
                        {/* Plus hover shortcut inside cell */}
                        <button 
                          onClick={() => {
                            setScheduleDate(day.dateStr);
                            const cleanTime = timeSlot === "All-day" ? "10:00" : timeSlot.split(" ")[0];
                            setScheduleTime(cleanTime.padStart(5, "0"));
                            setViewMode("composer");
                            toast.info(`Set composer target to ${day.dateStr} at ${timeSlot}`);
                          }}
                          className="absolute bottom-1 right-1 p-1 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-500 opacity-0 group-hover/cell:opacity-100 hover:text-violet-600 transition-all hover:scale-105 active:scale-[0.93] z-10"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* Display post cards in cell */}
                        {matchingPosts.map((post) => {
                          const meta = platformMeta[post.platform as keyof typeof platformMeta] || platformMeta.instagram;
                          return (
                            <div
                              key={post.id}
                              onClick={() => setSelectedPostDetails(post)}
                              className="relative overflow-hidden rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm hover:shadow-md cursor-pointer hover:border-violet-300 hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between h-full select-none"
                            >
                              {/* Glowing Left Platform Border Accent */}
                              <div className={`absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b ${meta.bg}`}></div>
                              
                              <p className="text-[11px] font-semibold text-slate-700 leading-snug line-clamp-2 pl-1 select-none">
                                {post.caption}
                              </p>

                              <div className="flex items-center justify-between mt-2 pl-1 select-none">
                                <span className={`text-[9px] font-black uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-slate-500`}>
                                  {post.scheduled_at.substring(11, 16) || "10:00"}
                                </span>
                                <div className={`w-4.5 h-4.5 rounded-full bg-gradient-to-tr ${meta.bg} flex items-center justify-center text-white text-[9px] font-extrabold uppercase shadow-sm`}>
                                  {post.platform[0]}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Columns: Content Ideas & Recent Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Content Ideas Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                    Content Ideas
                  </h3>
                  <button className="text-[11px] font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Generate Ideas
                  </button>
                </div>

                <div className="mt-4 space-y-3.5">
                  {contentIdeas.map((idea) => (
                    <div 
                      key={idea.id}
                      onClick={() => {
                        setCaption(idea.text);
                        setAiPrompt(`Flesh out this topic: ${idea.text}`);
                        toast.success("Copied idea to composer!");
                      }}
                      className="p-3 bg-slate-50/50 border border-slate-100 hover:border-violet-200 rounded-xl cursor-pointer hover:bg-violet-50/20 active:scale-[0.98] transition-all flex flex-col gap-2"
                    >
                      <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                        {idea.text}
                      </p>
                      <div>
                        <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${idea.badgeColor}`}>
                          {idea.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => {
                  setCaption("Write here a newly discovered niche marketing insight...");
                  toast.success("Ready for custom inputs.");
                }}
                className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-inner"
              >
                View all ideas
              </button>
            </div>

            {/* Recent Performance Analytics Grid */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Recent Performance
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                  Last 7 Days
                </span>
              </div>

              <div className="mt-4 space-y-4">
                {connectedStats.map((stat) => {
                  const meta = platformMeta[stat.platform as keyof typeof platformMeta] || platformMeta.instagram;
                  return (
                    <div key={stat.platform} className="flex items-center justify-between group hover:bg-slate-50/50 p-1.5 rounded-xl transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${meta.bg} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                          {stat.platform[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{meta.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{meta.label}</p>
                        </div>
                      </div>

                      {/* Reach & Engagement stats */}
                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-800">{stat.reach}</p>
                          <p className="text-[9px] font-bold text-emerald-500">Reach</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-800">{stat.engRate}</p>
                          <p className="text-[9px] font-bold text-indigo-500">Engagement</p>
                        </div>
                        {/* Sparkline simulation using SVG */}
                        <div className="w-12 h-6 flex items-center">
                          <svg className="w-full h-full text-emerald-500" viewBox="0 0 100 50">
                            <polyline
                              fill="none"
                              stroke={stat.arrow === "up" ? "#10B981" : "#EF4444"}
                              strokeWidth="4"
                              points={stat.sparkline.map((val, idx) => `${idx * 16},${50 - val}`).join(" ")}
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Right Composer Composition Drawer (Takes 4/12 of container) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-5 sticky top-20 space-y-5">
          {/* Create Post Header Tabs */}
          <div className="flex border-b border-slate-100 pb-3 justify-between items-center">
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveComposerTab("create")}
                className={`text-sm font-bold pb-2 border-b-2 transition-all ${
                  activeComposerTab === "create" ? "border-violet-600 text-violet-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Create Post
              </button>
              <button 
                onClick={() => setActiveComposerTab("drafts")}
                className={`text-sm font-bold pb-2 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeComposerTab === "drafts" ? "border-violet-600 text-violet-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Drafts
                <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold">3</span>
              </button>
            </div>
            
            <button 
              onClick={() => {
                setCaption("");
                setAiPrompt("");
                setSelectedPlatforms([]);
                toast.success("Composer canvas cleared!");
              }}
              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
              title="Reset Editor"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {activeComposerTab === "create" ? (
            <div className="space-y-4">
              {/* Select Platforms chips selection */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Select Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(platformMeta).map(([key, meta]) => {
                    const isSelected = selectedPlatforms.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedPlatforms(selectedPlatforms.filter(p => p !== key));
                          } else {
                            setSelectedPlatforms([...selectedPlatforms, key]);
                          }
                        }}
                        className={`flex items-center gap-2 py-1.5 px-3 rounded-full text-xs font-semibold border transition-all duration-200 select-none ${
                          isSelected
                            ? `bg-gradient-to-r ${meta.bg} text-white border-transparent shadow-[0_2px_8px_rgba(124,58,237,0.25)]`
                            : "bg-white hover:bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : `bg-gradient-to-tr ${meta.bg}`}`}></span>
                        {meta.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Media Uploader Box */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Media (Upload up to 10)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {mediaList.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group bg-slate-100 shadow-inner">
                      <img src={img} className="w-full h-full object-cover" alt="Media asset preview" />
                      <button 
                        onClick={() => {
                          setMediaList(mediaList.filter((_, i) => i !== idx));
                          toast.info("Image removed from planner draft.");
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Drag drop add block */}
                  <button 
                    onClick={() => {
                      setMediaList([...mediaList, "https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=500&auto=format&fit=crop&q=60"]);
                      toast.success("Mock image added successfully!");
                    }}
                    className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-violet-400 flex flex-col items-center justify-center text-slate-400 hover:text-violet-500 transition-colors bg-slate-50/50 hover:bg-violet-50/10 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-5 h-5 mb-1" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Add</span>
                  </button>
                </div>
              </div>

              {/* Caption details box */}
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Post Details</label>
                  <span className={`text-[10px] font-bold ${caption.length > 2000 ? "text-red-500" : "text-slate-400"}`}>
                    {caption.length}/2200
                  </span>
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full min-h-[100px] text-xs text-slate-700 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl p-3 outline-none resize-none leading-relaxed transition-all"
                  placeholder="Draft caption details here..."
                />
              </div>

              {/* AI Caption Generator Box */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                    AI Caption Helper
                  </span>
                  
                  <button 
                    onClick={generateAICaption}
                    disabled={isGeneratingCaption}
                    className="text-[10px] font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    {isGeneratingCaption ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Write a catchy marketing caption for organic traffic app"
                  className="w-full text-[11px] bg-white border border-slate-200 focus:border-violet-400 rounded-lg py-1.5 px-2.5 outline-none"
                />
              </div>

              {/* Preselected Hashtags Bank */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Suggested Hashtags</label>
                <div className="flex flex-wrap gap-1.5">
                  {["AI", "Marketing", "Growth", "FutureOfWork", "DigitalMarketing", "Automation", "SEO", "SaaS"].map((tag) => {
                    const isSelected = hashtags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleHashtag(tag)}
                        className={`text-[10px] font-bold py-1 px-2.5 rounded-lg border transition-all ${
                          isSelected 
                            ? "bg-violet-50 text-violet-600 border-violet-200" 
                            : "bg-white hover:bg-slate-50 text-slate-400 border-slate-200"
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Call to Action input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Call to Action</label>
                  <select 
                    value={ctaType} 
                    onChange={(e) => setCtaType(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-violet-500 rounded-xl p-2.5 outline-none cursor-pointer"
                  >
                    <option>Learn More</option>
                    <option>Book Now</option>
                    <option>Sign Up</option>
                    <option>Shop Now</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Destination URL</label>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-violet-500 focus:bg-white rounded-xl p-2 px-3 outline-none"
                    placeholder="https://"
                  />
                </div>
              </div>

              {/* Datepicker Scheduling Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-violet-500 focus:bg-white rounded-xl p-2 px-3 outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-violet-500 focus:bg-white rounded-xl p-2 px-3 outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Schedule CTA Button */}
              <button
                onClick={handleSchedulePost}
                disabled={createPostMutation.isPending}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold py-3 px-4 rounded-xl transition-all duration-200 shadow-md shadow-violet-600/20 active:scale-[0.98] flex items-center justify-center gap-2 select-none cursor-pointer"
              >
                {createPostMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Schedule Post
                  </>
                )}
              </button>

            </div>
          ) : (
            // Drafts list view
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {[
                { id: "draft-1", title: "Automated content calibration tips", platform: "linkedin", lastSaved: "2 hours ago" },
                { id: "draft-2", title: "Our custom branding assets rollout calendar", platform: "instagram", lastSaved: "1 day ago" },
                { id: "draft-3", title: "GEO visibility vs standard keyword index metrics", platform: "twitter", lastSaved: "3 days ago" }
              ].map((draft) => {
                const meta = platformMeta[draft.platform as keyof typeof platformMeta] || platformMeta.instagram;
                return (
                  <div 
                    key={draft.id}
                    onClick={() => {
                      setCaption(draft.title);
                      setSelectedPlatforms([draft.platform]);
                      setActiveComposerTab("create");
                      toast.success("Loaded draft into composer!");
                    }}
                    className="p-3 border border-slate-100 hover:border-violet-200 rounded-xl cursor-pointer hover:bg-violet-50/20 active:scale-[0.98] transition-all flex flex-col gap-2 relative overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b ${meta.bg}`}></div>
                    
                    <div className="flex items-center justify-between pl-1">
                      <span className="text-[10px] font-bold text-slate-400">{draft.lastSaved}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-slate-500`}>
                        {draft.platform}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-bold pl-1 line-clamp-2">{draft.title}</p>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* Selected Post Details Overlay Modal */}
      {selectedPostDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div 
            className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden flex flex-col gap-5 select-none animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Gradient border top banner */}
            <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${platformMeta[selectedPostDetails.platform as keyof typeof platformMeta]?.bg || platformMeta.instagram.bg}`}></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${platformMeta[selectedPostDetails.platform as keyof typeof platformMeta]?.bg || platformMeta.instagram.bg} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                  {selectedPostDetails.platform[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    {platformMeta[selectedPostDetails.platform as keyof typeof platformMeta]?.name} Post
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">Scheduled publishing</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedPostDetails(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors text-xs font-bold px-3 border border-slate-200"
              >
                Close
              </button>
            </div>

            {/* Thumbnail Image display */}
            {selectedPostDetails.image_url && (
              <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-inner">
                <img src={selectedPostDetails.image_url} className="w-full h-full object-cover" alt="Scheduled post graphic preview" />
              </div>
            )}

            {/* Caption Text Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {selectedPostDetails.caption}
              </p>
            </div>

            {/* Bottom details status bar */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Scheduled for</span>
                <span className="text-xs font-extrabold text-slate-700 mt-0.5 block">
                  {new Date(selectedPostDetails.scheduled_at).toLocaleDateString()} at {new Date(selectedPostDetails.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-200 shadow-sm animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Pending Queue
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
