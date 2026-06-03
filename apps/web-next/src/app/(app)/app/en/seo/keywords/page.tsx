"use client";

import { OperationalModulePage } from "@/components/layout/operational-module-page";
import { Search } from "lucide-react";

export default function SeoKeywordsPage() {
  return (
    <OperationalModulePage
      title="SEO Keywords"
      icon={Search}
      description="Plan search-intent work for the active project and route high-potential terms into content generation."
      metrics={[
        { label: "Keyword Workflow", value: "Ready" },
        { label: "Intent Coverage", value: "SEO + AEO" },
      ]}
      sections={[
        {
          title: "Keyword Planning",
          items: [
            "Use project context to frame keyword research.",
            "Group ideas by informational, commercial, and comparison intent.",
            "Promote winning terms into article generation.",
          ],
        },
        {
          title: "Connected Workflows",
          items: [
            "Open keyword research for discovery support.",
            "Generate articles from selected terms.",
            "Validate AI visibility through the prompt scanner.",
          ],
        },
      ]}
      actions={[
        { label: "Keyword Research", href: "/app/en/content/keyword-research" },
        { label: "Generate Content", href: "/app/en/content/generate" },
      ]}
    />
  );
}
