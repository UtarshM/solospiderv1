"use client";

import { OperationalModulePage } from "@/components/layout/operational-module-page";
import { Search } from "lucide-react";

export default function KeywordResearchRoute() {
  return (
    <OperationalModulePage
      title="Keyword Research"
      icon={Search}
      description="Turn keyword ideas into content briefs and prompt-monitoring targets from the active project workspace."
      metrics={[
        { label: "Research Mode", value: "Active" },
        { label: "Output Paths", value: "Content + AEO" },
      ]}
      sections={[
        {
          title: "Research Workflow",
          items: [
            "Frame keyword ideas around the selected brand and domain.",
            "Separate keyword clusters by search intent and content type.",
            "Use selected terms as inputs for article generation.",
          ],
        },
        {
          title: "Migration Coverage",
          items: [
            "Route resolves in Next and shares protected app shell behavior.",
            "Project context is available without returning to the legacy app.",
            "Related content and AEO routes are connected through direct actions.",
          ],
        },
      ]}
      actions={[
        { label: "Generate Article", href: "/app/en/content/generate" },
        { label: "Prompt Lab", href: "/app/en/aeo/prompt-generation" },
      ]}
    />
  );
}
