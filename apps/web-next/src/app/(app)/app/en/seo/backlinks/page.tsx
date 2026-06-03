"use client";

import { OperationalModulePage } from "@/components/layout/operational-module-page";
import { Link2 } from "lucide-react";

export default function SeoBacklinksPage() {
  return (
    <OperationalModulePage
      title="SEO Backlink Tracker"
      icon={Link2}
      description="Monitor link-building priorities and connect backlink work to content and citation opportunities."
      metrics={[
        { label: "Tracker State", value: "Active" },
        { label: "Source Coverage", value: "Project scoped" },
      ]}
      sections={[
        {
          title: "Backlink Review",
          items: [
            "Organize authority opportunities by the active project.",
            "Use AEO citation sources as outreach candidates.",
            "Keep backlink review aligned with SEO and content workflows.",
          ],
        },
        {
          title: "Workflow Links",
          items: [
            "Generate supporting articles from the content workspace.",
            "Check citation visibility before outreach prioritization.",
            "Return to dashboard to switch projects without losing context.",
          ],
        },
      ]}
      actions={[
        { label: "Content Generator", href: "/app/en/content/generate" },
        { label: "AEO Citations", href: "/app/en/aeo/citations" },
      ]}
    />
  );
}
