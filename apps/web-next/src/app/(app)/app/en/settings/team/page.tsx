"use client";

import { OperationalModulePage } from "@/components/layout/operational-module-page";
import { Users } from "lucide-react";

export default function TeamSettingsPage() {
  return (
    <OperationalModulePage
      title="Team & Access"
      icon={Users}
      description="View team-readiness and access-control expectations for the migrated Next workspace."
      metrics={[
        { label: "Access Model", value: "Auth scoped" },
        { label: "Project Isolation", value: "RLS backed" },
      ]}
      sections={[
        {
          title: "Access Behavior",
          items: [
            "Protected routes redirect unauthenticated users to login.",
            "Project data is scoped through Supabase row-level policies.",
            "Sign-out is available from the shared app shell.",
          ],
        },
        {
          title: "Migration Readiness",
          items: [
            "Next shell handles auth state across app modules.",
            "Existing database policies remain the source of truth.",
            "Team administration can extend this route without changing app navigation.",
          ],
        },
      ]}
      actions={[
        { label: "Billing", href: "/app/en/settings/billing" },
        { label: "Project Settings", href: "/app/en/settings/project" },
      ]}
    />
  );
}
