"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, CircleAlert, FolderKanban, Sparkles, Loader2 } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";

type ModuleItem = {
  label: string;
  value?: string;
};

type ModuleAction = {
  label: string;
  href: string;
};

type OperationalModulePageProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  metrics: readonly ModuleItem[];
  sections: ReadonlyArray<{
    title: string;
    items: readonly string[];
  }>;
  actions?: readonly ModuleAction[];
};

export function OperationalModulePage({
  title,
  description,
  icon: Icon,
  metrics,
  sections,
  actions = [],
}: OperationalModulePageProps) {
  const { activeProject, projects, isLoading } = useProjects();

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-8 animate-slide-in">
      {/* Premium Header HUD */}
      <header className="flex flex-col gap-6 border-b border-slate-100 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-violet-100 text-violet-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-violet-200">
                Growth OS Module
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">{title}</h1>
            <p className="mt-1.5 max-w-2xl text-xs font-semibold text-slate-500 leading-normal">{description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-violet-700 hover:border-violet-300 hover:bg-violet-50/50 shadow-sm transition-all duration-200"
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          ))}
        </div>
      </header>

      {/* Premium HUD Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Active Project Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-100/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <FolderKanban className="w-16 h-16 text-violet-600" />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <FolderKanban className="h-4 w-4 text-violet-500" />
            Active Project
          </div>
          <p className="mt-3 text-lg font-black text-slate-900 truncate">
            {isLoading ? (
              <span className="flex items-center gap-1 text-slate-400 animate-pulse text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading project...
              </span>
            ) : (
              activeProject?.brand_name || activeProject?.name || "No project selected"
            )}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400 truncate">
            {activeProject?.domain || `${projects.length} project(s) available`}
          </p>
        </div>

        {/* Dynamic Metric Cards */}
        {metrics.slice(0, 2).map((metric, index) => (
          <div 
            key={metric.label} 
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-100/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles className="w-16 h-16 text-violet-600" />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className={`h-4 w-4 ${index === 0 ? "text-emerald-500" : "text-sky-500"}`} />
              {metric.label}
            </div>
            <p className="mt-3 text-lg font-black text-slate-900">{metric.value || "Ready"}</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">Successfully integrated</p>
          </div>
        ))}
      </div>

      {/* Structured Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md shadow-slate-100/50 hover:shadow-lg transition-all duration-300">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">{section.title}</h3>
            <div className="mt-4 space-y-3.5">
              {section.items.map((item) => (
                <div key={item} className="flex items-start gap-3 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Warnings & Gateways */}
      {!activeProject && (
        <div className="flex items-center gap-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 text-xs font-semibold text-amber-800 shadow-sm animate-pulse-gentle">
          <CircleAlert className="h-5 w-5 shrink-0 text-amber-600" />
          <span>Create or select a project from the dashboard before using project-specific actions here.</span>
        </div>
      )}
    </section>
  );
}
