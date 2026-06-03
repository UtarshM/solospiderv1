"use client";

import { OperationalModulePage } from "@/components/layout/operational-module-page";
import { TrendingUp } from "lucide-react";

export default function MetaAdsPage() {
  return (
    <OperationalModulePage
      title="Meta Ads Improvement"
      icon={TrendingUp}
      description="Plan Meta campaign creative and audience tests from the same project context as Media Studio."
      metrics={[
        { label: "Creative Workflow", value: "Ready" },
        { label: "Campaign Context", value: "Project scoped" },
      ]}
      sections={[
        {
          title: "Creative Planning",
          items: [
            "Use active brand metadata for campaign creative direction.",
            "Generate visual variants in Media Studio for ad tests.",
            "Keep campaign claims aligned with content and AEO positioning.",
          ],
        },
        {
          title: "Optimization Path",
          items: [
            "Move winning creative prompts into Media Studio.",
            "Use content pages for landing-page and offer support.",
            "Review AEO visibility to keep paid and organic messaging aligned.",
          ],
        },
      ]}
      actions={[
        { label: "Media Studio", href: "/app/en/media-studio" },
        { label: "Meta Analytics", href: "/app/en/ads/meta-analytics" },
      ]}
    />
  );
}
