"use client";

import { OperationalModulePage } from "@/components/layout/operational-module-page";
import { Plug } from "lucide-react";

export default function IntegrationsSettingsPage() {
  return (
    <OperationalModulePage
      title="Integrations"
      icon={Plug}
      description="Review connected publishing and analytics paths used by the migrated Next workspace."
      metrics={[
        { label: "Supabase", value: "Connected" },
        { label: "Edge Functions", value: "Reachable" },
      ]}
      sections={[
        {
          title: "Connected Services",
          items: [
            "Supabase auth, database, storage, and edge functions are used by Next routes.",
            "Social generation uses the deployed `generate-social-post` function.",
            "Prompt scans use `run-prompt-scan` with bounded workload settings.",
          ],
        },
        {
          title: "Verification Paths",
          items: [
            "Run the migration smoke script from the Next app package.",
            "Open Media Studio to validate generation and asset persistence.",
            "Open Prompt Lab to validate prompt scans and trends.",
          ],
        },
      ]}
      actions={[
        { label: "Prompt Lab", href: "/app/en/aeo/prompt-generation" },
        { label: "Media Studio", href: "/app/en/media-studio" },
      ]}
    />
  );
}
