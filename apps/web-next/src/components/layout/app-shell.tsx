"use client";

import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { seedAeoPrompts, buildDefaultAeoPrompts } from "@/lib/aeoPrompts";
import { toast } from "sonner";
import { 
  LayoutDashboard, 
  Fingerprint, 
  Search, 
  FileText, 
  Link2, 
  Megaphone, 
  TrendingUp, 
  BarChart3, 
  Plug2, 
  Settings2, 
  LogOut, 
  Plus, 
  ChevronDown, 
  ChevronsUpDown,
  Check,
  Globe,
  Loader2,
  Menu,
  X,
  MessageSquare,
  Sparkles,
  PlayCircle
} from "lucide-react";

interface SidebarMenuItem {
  label: string;
  to: string;
  icon: React.ElementType;
  isActive: (pathname: string) => boolean;
}

function normalizeUrl(raw: string) {
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) return `https://${raw}`;
  return raw;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { 
    projects, 
    activeProject, 
    selectActiveProject, 
    addProject, 
    canAddProject, 
    currentPlan, 
    projectLimit 
  } = useProjects();

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectDomain, setNewProjectDomain] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems: SidebarMenuItem[] = [
    {
      label: "Dashboard",
      to: "/app/en/dashboard",
      icon: LayoutDashboard,
      isActive: (path) => path === "/app/en/dashboard" || path === "/dashboard"
    },
    {
      label: "Branding",
      to: "/app/en/brand",
      icon: Fingerprint,
      isActive: (path) => path.startsWith("/app/en/brand") || path.startsWith("/app/en/competitors") || path.startsWith("/brand-identity")
    },
    {
      label: "SEO",
      to: "/app/en/seo",
      icon: Search,
      isActive: (path) => path.startsWith("/app/en/seo") && !path.startsWith("/app/en/seo/rank-tracking")
    },
    {
      label: "Blogs",
      to: "/app/en/content/generate",
      icon: FileText,
      isActive: (path) => path.startsWith("/app/en/content") || path.startsWith("/app/en/blogs") || path.startsWith("/blogs") || path.startsWith("/bulk-generate") || path.startsWith("/calendar") || path.startsWith("/generate") || path.startsWith("/manage-posts")
    },
    {
      label: "Backlinks",
      to: "/app/en/backlinks",
      icon: Link2,
      isActive: (path) => path.startsWith("/app/en/backlinks")
    },
    {
      label: "Social Media",
      to: "/app/en/social/posts",
      icon: MessageSquare,
      isActive: (path) => path.startsWith("/app/en/social")
    },
    {
      label: "AEO / GEO",
      to: "/app/en/aeo/overview",
      icon: Sparkles,
      isActive: (path) => path.startsWith("/app/en/aeo")
    },
    {
      label: "Ads",
      to: "/app/en/ads/meta-analytics",
      icon: Megaphone,
      isActive: (path) => path.startsWith("/app/en/ads")
    },
    {
      label: "Media Studio",
      to: "/app/en/media-studio",
      icon: PlayCircle,
      isActive: (path) => path.startsWith("/app/en/media-studio")
    },
    {
      label: "Reports",
      to: "/app/en/reports",
      icon: BarChart3,
      isActive: (path) => path.startsWith("/app/en/reports")
    },
    {
      label: "Rank Tracking",
      to: "/app/en/seo/rank-tracking",
      icon: TrendingUp,
      isActive: (path) => path.startsWith("/app/en/seo/rank-tracking")
    },
    {
      label: "Integrations",
      to: "/app/en/settings/integrations",
      icon: Plug2,
      isActive: (path) => path.startsWith("/app/en/settings/integrations") || path.startsWith("/integrations")
    },
    {
      label: "Settings",
      to: "/app/en/settings/project",
      icon: Settings2,
      isActive: (path) => (path.startsWith("/app/en/settings") && !path.startsWith("/app/en/settings/integrations")) || (path.startsWith("/settings") && !path.startsWith("/settings/integrations"))
    }
  ];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddProject) {
      toast.error(`Your ${currentPlan} plan is limited to ${projectLimit} project(s).`);
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await addProject.mutateAsync({
        name: newProjectName || newProjectDomain,
        domain: normalizeUrl(newProjectDomain),
        brand_name: newProjectName || newProjectDomain,
      });

      try {
        await seedAeoPrompts(
          created.id,
          buildDefaultAeoPrompts(newProjectName || newProjectDomain, normalizeUrl(newProjectDomain)),
        );
      } catch (seedErr) {
        console.warn("Seeding defaults failed:", seedErr);
      }

      toast.success("Project created successfully!");
      setNewProjectDomain("");
      setNewProjectName("");
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.replace("/login");
    router.refresh();
  };

  const sidebarContent = (
    <aside className="w-full h-full bg-[#0a0822] flex flex-col justify-between select-none overflow-y-auto scrollbar-none text-white font-sans">
      <div>
        {/* Logo area */}
        <div className="h-16 px-6 flex items-center border-b border-white/[0.08]">
          <Link href="/app/en/dashboard" className="flex items-center gap-2.5 group flex-1">
            <img src="/assets/solospider-logo.png" alt="SoloSpider" className="h-[26px] w-auto block filter brightness-0 invert" />
          </Link>
        </div>

        {/* Project Switcher Section */}
        <div className="px-4 pt-5 pb-3">
          <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2.5 block px-1">
            Workspace
          </p>

          <div className="relative">
            <button
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              className="w-full flex items-center justify-between bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.07] transition-all px-3 py-2.5 rounded-2xl text-sm font-semibold shadow-sm"
            >
              {activeProject ? (
                <div className="flex items-center gap-3 truncate">
                  {activeProject.brand_logo_url || activeProject.og_image_url || activeProject.favicon_url ? (
                    <img
                      src={(activeProject.brand_logo_url || activeProject.og_image_url || activeProject.favicon_url) ?? undefined}
                      alt={activeProject.brand_name || activeProject.name}
                      className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9025F2] to-[#b260ff] text-white flex items-center justify-center text-[12px] font-extrabold shrink-0 shadow-[0_0_10px_rgba(144,37,242,0.3)]">
                      {(activeProject.brand_name || activeProject.name).substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col text-left truncate leading-tight">
                    <span className="truncate text-[13px] font-bold text-white">
                      {activeProject.brand_name || activeProject.name}
                    </span>
                    <span className="text-[10px] text-white/40 font-medium mt-0.5">
                      {currentPlan ? `${currentPlan} Plan` : "Free Plan"}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-white/40 text-xs font-medium">Select project...</span>
              )}
              <ChevronDown className="h-4 w-4 shrink-0 text-white/30" />
            </button>

            {isSwitcherOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsSwitcherOpen(false)} />
                <div className="absolute left-0 right-0 mt-1.5 p-2 bg-[#121133] border border-white/[0.08] shadow-2xl rounded-2xl z-30 space-y-1">
                  <div className="mb-1.5 px-2 pb-1.5 border-b border-white/[0.08]">
                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">
                      Your Projects
                    </p>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto space-y-0.5 scrollbar-thin">
                    {projects.length === 0 ? (
                      <div className="p-2 text-xs text-white/40">No projects found.</div>
                    ) : (
                      projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => {
                            selectActiveProject(project.id);
                            setIsSwitcherOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-xl text-xs text-left transition-colors ${
                            activeProject?.id === project.id
                              ? "bg-[#9025F2]/20 text-[#b260ff] font-bold border border-[#9025F2]/30"
                              : "text-white/70 hover:bg-white/[0.04] hover:text-white font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {project.brand_logo_url || project.og_image_url || project.favicon_url ? (
                              <img
                                src={(project.brand_logo_url || project.og_image_url || project.favicon_url) ?? undefined}
                                alt={project.brand_name || project.name}
                                className="w-6 h-6 rounded-md object-cover border border-white/10 shrink-0 shadow-sm"
                              />
                            ) : (
                              <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                activeProject?.id === project.id ? "bg-[#9025F2] text-white" : "bg-white/[0.08] text-white/50"
                              }`}>
                                {(project.brand_name || project.name).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="truncate">{project.brand_name || project.name}</span>
                          </div>
                          {activeProject?.id === project.id && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-[#b260ff]" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-white/[0.08]">
                    <button
                      onClick={() => {
                        setIsSwitcherOpen(false);
                        setIsDialogOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-white/40 hover:text-white hover:bg-white/[0.04] transition-all text-left"
                    >
                      <Plus className="h-4 w-4 text-white/30" />
                      Create New Project
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-3 space-y-1 overflow-y-auto scrollbar-none flex-1 max-h-[calc(100vh-250px)]">
          {menuItems.map((item) => {
            const active = item.isActive(pathname || "");
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                href={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold transition-all rounded-xl ${
                  active
                    ? "bg-gradient-to-r from-[#9025F2] to-[#b260ff] text-white shadow-[0_4px_16px_rgba(144,37,242,0.35)]"
                    : "text-white/60 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    active ? "text-white" : "text-white/50 group-hover:text-white"
                  }`}
                />
                <span className="flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile HUD */}
      <div className="border-t border-white/[0.08] p-4 space-y-2 bg-black/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#9025F2] to-[#b260ff] flex items-center justify-center text-white text-[11px] font-black shrink-0 shadow-[0_0_8px_rgba(144,37,242,0.25)]">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-white truncate">
              {user?.email?.split("@")[0] || "User"}
            </p>
            <p className="text-[10px] text-white/40 font-semibold truncate capitalize">
              {currentPlan || "free"} plan
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-bold text-white/50 hover:bg-white/[0.04] hover:text-white transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 text-white/40" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-100 bg-white z-20 sticky top-0">
        <img src="/assets/solospider-logo.png" alt="Solo Spider" className="h-[24px] w-auto" />
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-64 h-full z-50 flex flex-col bg-[#0a0822]">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0 sticky top-0 h-screen bg-[#0a0822]">
        {sidebarContent}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0 bg-transparent">
        {/* Content Box - direct render, transparent glass header is gone */}
        <div className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </div>
      </main>

      {/* Create Project Custom Modal Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setIsDialogOpen(false)} />
          <div className="relative bg-white rounded-3xl border border-slate-100 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-violet-600" />
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">
                  Create New Project
                </h3>
              </div>
              <button 
                onClick={() => setIsDialogOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Enter your website domain and we'll automatically configure your new workspace dashboard.
            </p>

            <form onSubmit={handleCreateProject} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Website Domain
                </label>
                <input
                  type="text"
                  required
                  placeholder="example.com"
                  value={newProjectDomain}
                  onChange={(e) => setNewProjectDomain(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-violet-600 focus:bg-white outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Brand Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="My Brand"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-violet-600 focus:bg-white outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || addProject.isPending}
                  className="px-5 py-2.5 rounded-xl btn-grad text-white text-xs font-bold shadow-sm shadow-violet-600/20 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isSubmitting || addProject.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Create Project
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

