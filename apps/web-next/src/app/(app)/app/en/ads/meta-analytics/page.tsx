"use client";

import { OperationalModulePage } from "@/components/layout/operational-module-page";
import { TrendingUp } from "lucide-react";

export default function MetaAdsAnalyticsPage() {
  return (
    <OperationalModulePage
      title="Meta Ads Analytics"
      icon={TrendingUp}
      description="Review Meta campaign performance work inside the migrated protected app shell."
      metrics={[
        { label: "Analytics Route", value: "Migrated" },
        { label: "Creative Review", value: "Media linked" },
      ]}
      sections={[
        {
          title: "Analytics Workflow",
          items: [
            "Review campaign learnings in the active project context.",
            "Turn creative observations into new Media Studio generations.",
            "Compare paid creative themes against content and AEO messaging.",
          ],
        },
        {
          title: "Next Actions",
          items: [
            "Open Meta Ads Improvement for creative iteration planning.",
            "Generate visual assets for new campaign tests.",
            "Use dashboard project switching for multi-brand review.",
          ],
        },
      ]}
      actions={[
        { label: "Meta Ads Improvement", href: "/app/en/ads/meta" },
        { label: "Dashboard", href: "/app/en/dashboard" },
      ]}
    />
  );
}
