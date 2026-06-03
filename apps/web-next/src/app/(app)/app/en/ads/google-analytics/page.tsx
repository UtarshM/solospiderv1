"use client";

import { OperationalModulePage } from "@/components/layout/operational-module-page";
import { TrendingUp } from "lucide-react";

export default function GoogleAdsAnalyticsPage() {
  return (
    <OperationalModulePage
      title="Google Ads Analytics"
      icon={TrendingUp}
      description="Keep paid-search performance review in the migrated app shell alongside content and AEO workflows."
      metrics={[
        { label: "Analytics Route", value: "Migrated" },
        { label: "Review Context", value: "Project scoped" },
      ]}
      sections={[
        {
          title: "Analytics Review",
          items: [
            "Use project context to review campaign-level performance work.",
            "Compare paid-search actions with organic content priorities.",
            "Route creative follow-up into Media Studio.",
          ],
        },
        {
          title: "Follow-up Workflow",
          items: [
            "Use Google Ads Improvement for optimization ideas.",
            "Generate supporting content for high-value campaigns.",
            "Track brand visibility changes from AEO workspace.",
          ],
        },
      ]}
      actions={[
        { label: "Google Ads Improvement", href: "/app/en/ads/google" },
        { label: "Content Generator", href: "/app/en/content/generate" },
      ]}
    />
  );
}
