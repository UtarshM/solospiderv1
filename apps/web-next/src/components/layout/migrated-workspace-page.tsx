"use client";

import { OperationalModulePage } from "@/components/layout/operational-module-page";
import { BarChart3, CalendarDays, FileText, Image, Link2, Megaphone, Search, Settings2, Shield, Sparkles, Users } from "lucide-react";

const modules = {
  "manage-posts": {
    title: "Manage Posts",
    description: "Review drafted, generated, and published content from the migrated Next workspace.",
    icon: FileText,
    actions: [{ label: "Generate Content", href: "/app/en/content/generate" }],
  },
  "content-calendar": {
    title: "Content Calendar",
    description: "Plan publishing work and keep content production tied to the active project.",
    icon: CalendarDays,
    actions: [{ label: "Bulk Generate", href: "/app/en/content/bulk-generate" }],
  },
  "social-posts": {
    title: "Social Posts",
    description: "Plan and review social content alongside generated media assets.",
    icon: Megaphone,
    actions: [{ label: "Media Studio", href: "/app/en/media-studio" }],
  },
  "social-images": {
    title: "Social Image Generation",
    description: "Create brand-aware social visuals through the migrated Media Studio flow.",
    icon: Image,
    actions: [{ label: "Media Studio", href: "/app/en/media-studio" }],
  },
  "social-calendar": {
    title: "Social Calendar",
    description: "Schedule and review social publishing plans in project context.",
    icon: CalendarDays,
    actions: [{ label: "Social Posts", href: "/app/en/social/posts" }],
  },
  "social-reels": {
    title: "Video & Reel Generation",
    description: "Plan short-form video concepts and captions from brand and content context.",
    icon: Megaphone,
    actions: [{ label: "Media Studio", href: "/app/en/media-studio" }],
  },
  "social-accounts": {
    title: "Social Accounts",
    description: "Review connected social channels and publishing readiness.",
    icon: Users,
    actions: [{ label: "Integrations", href: "/app/en/settings/integrations" }],
  },
  "seo-overview": {
    title: "SEO Workspace",
    description: "Use keyword, rank, and backlink workflows from the Next app shell.",
    icon: Search,
    actions: [
      { label: "Keywords", href: "/app/en/seo/keywords" },
      { label: "Backlinks", href: "/app/en/seo/backlinks" },
    ],
  },
  blogs: {
    title: "Blogs",
    description: "Manage blog planning, drafting, and editing workflows for the active project.",
    icon: FileText,
    actions: [{ label: "New Blog", href: "/app/en/blogs/new" }],
  },
  "blog-editor": {
    title: "Blog Editor",
    description: "Draft and refine long-form content inside the migrated workspace.",
    icon: FileText,
    actions: [{ label: "Blogs", href: "/app/en/blogs" }],
  },
  reports: {
    title: "Reports",
    description: "Review project performance and prepare reporting follow-up.",
    icon: BarChart3,
    actions: [{ label: "Dashboard", href: "/app/en/dashboard" }],
  },
  "aeo-analytics": {
    title: "AEO Analytics",
    description: "Review AI visibility trends and scan outcomes for the active project.",
    icon: BarChart3,
    actions: [{ label: "AEO Overview", href: "/app/en/aeo/overview" }],
  },
  "aeo-visibility": {
    title: "AEO Visibility Score",
    description: "Track how your brand appears across AI answer surfaces.",
    icon: Sparkles,
    actions: [{ label: "Prompt Lab", href: "/app/en/aeo/prompt-generation" }],
  },
  "aeo-opportunities": {
    title: "AEO Opportunities",
    description: "Turn scan gaps into content and citation actions.",
    icon: Link2,
    actions: [{ label: "Citations", href: "/app/en/aeo/citations" }],
  },
  brand: {
    title: "Brand Workspace",
    description: "Keep brand positioning and project context visible for generation workflows.",
    icon: Shield,
    actions: [{ label: "Project Settings", href: "/app/en/settings/project" }],
  },
  competitors: {
    title: "Competitors",
    description: "Track competitor positioning and use it to inform AEO and content prompts.",
    icon: BarChart3,
    actions: [{ label: "AEO Overview", href: "/app/en/aeo/overview" }],
  },
  "media-library": {
    title: "Media Library",
    description: "Review generated assets and reuse them in social and campaign workflows.",
    icon: Image,
    actions: [{ label: "Media Studio", href: "/app/en/media-studio" }],
  },
  admin: {
    title: "Admin Panel",
    description: "Review workspace readiness and operational controls in the migrated app.",
    icon: Settings2,
    actions: [{ label: "Dashboard", href: "/app/en/dashboard" }],
  },
} as const;

export type MigratedWorkspaceKey = keyof typeof modules;

export function MigratedWorkspacePage({ moduleKey }: { moduleKey: MigratedWorkspaceKey }) {
  const workspaceModule = modules[moduleKey];

  return (
    <OperationalModulePage
      title={workspaceModule.title}
      icon={workspaceModule.icon}
      description={workspaceModule.description}
      metrics={[
        { label: "Route Status", value: "Migrated" },
        { label: "Shell", value: "Next App Router" },
      ]}
      sections={[
        {
          title: "Workspace Behavior",
          items: [
            "Route is available in the Next.js app router.",
            "Project context is loaded through the shared app providers.",
            "Navigation remains inside the protected app shell.",
          ],
        },
        {
          title: "Migration Notes",
          items: [
            "Legacy React Router URL coverage has a matching Next route.",
            "The page is ready for deeper feature parity work without returning to Vite.",
            "Related actions point to migrated Next workflows.",
          ],
        },
      ]}
      actions={workspaceModule.actions}
    />
  );
}
