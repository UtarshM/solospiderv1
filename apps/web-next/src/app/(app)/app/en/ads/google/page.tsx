"use client";

import { OperationalModulePage } from "@/components/layout/operational-module-page";
import { TrendingUp } from "lucide-react";

export default function GoogleAdsPage() {
  return (
    <OperationalModulePage
      title="Google Ads Improvement"
      icon={TrendingUp}
      description="Plan paid-search improvements from project context and connect ad ideas to content and media generation."
      metrics={[
        { label: "Optimization Surface", value: "Ready" },
        { label: "Creative Path", value: "Media linked" },
      ]}
      sections={[
        {
          title: "Optimization Workflow",
          items: [
            "Review campaign themes against the active project domain.",
            "Use Media Studio to generate creative variants for campaign tests.",
            "Use keyword workflows to inform search-term and landing-page ideas.",
          ],
        },
        {
          title: "Connected Actions",
          items: [
            "Generate new campaign creative in Media Studio.",
            "Use content generation for landing-page support copy.",
            "Validate brand visibility through AEO prompt scans.",
          ],
        },
      ]}
      actions={[
        { label: "Media Studio", href: "/app/en/media-studio" },
        { label: "Keyword Research", href: "/app/en/content/keyword-research" },
      ]}
    />
  );
}
