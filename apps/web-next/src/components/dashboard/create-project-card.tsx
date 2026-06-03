"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import { seedAeoPrompts, buildDefaultAeoPrompts } from "@/lib/aeoPrompts";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { runAeoAnalysis } from "@/lib/aeo";

function normalizeUrl(raw: string) {
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) return `https://${raw}`;
  return raw;
}

async function triggerInitialAeoScan(project: {
  id: string;
  domain: string;
  brand_name?: string | null;
  name: string;
  brand_description?: string | null;
}) {
  const supabase = getSupabaseBrowserClient();
  const website = project.domain;
  const resolvedBrandName = project.brand_name || project.name;
  const topics = ["brand visibility", "ai search", "seo optimization"];

  const { data: record, error: insertError } = await supabase
    .from("aeo_analyses" as any)
    .insert([
      {
        project_id: project.id,
        website,
        brand_name: resolvedBrandName,
        topics,
        status: "running",
      },
    ])
    .select()
    .single();

  if (insertError) throw insertError;

  const result = await runAeoAnalysis({
    website,
    brandName: resolvedBrandName,
    topics,
    brandDescription: project.brand_description || "",
  });

  await supabase
    .from("aeo_analyses" as any)
    .update({
      status: "completed",
      overall_score: result.overallScore,
      ai_insights: result.providers,
      category_scores: result.categoryScores,
      recommendations: result.recommendations,
      prompt_suggestions: result.promptSuggestions,
    })
    .eq("id", record.id);
}

export function CreateProjectCard() {
  const { addProject, canAddProject, currentPlan, projectLimit } = useProjects();
  const [domain, setDomain] = useState("");
  const [brandName, setBrandName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canAddProject) {
      toast.error(`Your ${currentPlan} plan is limited to ${projectLimit} project(s).`);
      return;
    }
    setSubmitting(true);
    try {
      const created = await addProject.mutateAsync({
        name: brandName || domain,
        domain: normalizeUrl(domain),
        brand_name: brandName || domain,
      });

      const seeded = await seedAeoPrompts(
        created.id,
        buildDefaultAeoPrompts(brandName || domain, normalizeUrl(domain)),
      );

      if (seeded.inserted > 0) {
        toast.success(`Project created and ${seeded.inserted} AEO prompts seeded.`);
      } else {
        toast.success("Project created. AEO prompts already present.");
      }

      try {
        await triggerInitialAeoScan(created as any);
        toast.success("Initial AEO scan kicked off.");
      } catch (scanErr: any) {
        toast.warning(`Project created but initial scan failed: ${scanErr?.message || "unknown"}`);
      }

      setDomain("");
      setBrandName("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border bg-white p-4 space-y-3">
      <h3 className="text-sm font-bold">Create Project</h3>
      <input
        className="w-full rounded border px-3 py-2 text-sm"
        placeholder="Website domain (example.com)"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        required
      />
      <input
        className="w-full rounded border px-3 py-2 text-sm"
        placeholder="Brand name (optional)"
        value={brandName}
        onChange={(e) => setBrandName(e.target.value)}
      />
      <button
        type="submit"
        disabled={submitting || addProject.isPending}
        className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {submitting || addProject.isPending ? "Creating..." : "Create Project"}
      </button>
    </form>
  );
}
