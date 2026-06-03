"use client";

import { OperationalModulePage } from "@/components/layout/operational-module-page";
import { Link2 } from "lucide-react";

export default function GeneralBacklinksPage() {
  return (
    <OperationalModulePage
      title="Backlink Outreach Dashboard"
      icon={Link2}
      description="Review authority work, outreach priorities, and backlink follow-up tasks from the Next workspace."
      metrics={[
        { label: "Authority Workflow", value: "Active" },
        { label: "Outreach Queue", value: "Ready" },
      ]}
      sections={[
        {
          title: "Backlink Operations",
          items: [
            "Track referring-domain opportunities by project.",
            "Use outreach tasks for link-building follow-up.",
            "Keep anchor-text and authority checks visible during SEO work.",
          ],
        },
        {
          title: "Recommended Next Actions",
          items: [
            "Open SEO backlink tracker for focused analysis.",
            "Pair backlink tasks with content generation campaigns.",
            "Review AEO citations for sources worth outreach.",
          ],
        },
      ]}
      actions={[
        { label: "SEO Backlinks", href: "/app/en/seo/backlinks" },
        { label: "AEO Citations", href: "/app/en/aeo/citations" },
      ]}
    />
  );
}
