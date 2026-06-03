"use client";

import { OperationalModulePage } from "@/components/layout/operational-module-page";
import { Search } from "lucide-react";

export default function SeoRankTrackingPage() {
  return (
    <OperationalModulePage
      title="SEO Audit & Rank Tracking"
      icon={Search}
      description="Track SEO work from the Next workspace and keep ranking actions tied to active project context."
      metrics={[
        { label: "Audit Surface", value: "Ready" },
        { label: "Rank Workflow", value: "Project scoped" },
      ]}
      sections={[
        {
          title: "SEO Checks",
          items: [
            "Review keyword and backlink work for the selected project.",
            "Use content generation to close gaps found during audits.",
            "Compare SEO actions against AEO visibility outcomes.",
          ],
        },
        {
          title: "Follow-up Paths",
          items: [
            "Open keyword planning before creating content.",
            "Review backlinks for authority improvements.",
            "Use dashboard project switching for multi-site work.",
          ],
        },
      ]}
      actions={[
        { label: "SEO Keywords", href: "/app/en/seo/keywords" },
        { label: "SEO Backlinks", href: "/app/en/seo/backlinks" },
      ]}
    />
  );
}
