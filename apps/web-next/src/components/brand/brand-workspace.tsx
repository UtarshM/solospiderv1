"use client";

import React from "react";
import { BrandHeader } from "./brand-header";
import { BrandScores } from "./brand-scores";
import { BrandProfileCard } from "./brand-profile-card";
import { VisualIdentityCard } from "./visual-identity-card";
import { BrandVoiceCard } from "./brand-voice-card";
import { BrandSummary } from "./brand-summary";
import { CompetitorSnapshot } from "./competitor-snapshot";
import { BrandQuickActions } from "./brand-quick-actions";
import { UsedAcrossModules } from "./used-across-modules";
import { useProjects } from "@/hooks/useProjects";

export function BrandWorkspace() {
  const { activeProject } = useProjects();

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 bg-[#fcfcfd] min-h-screen">
      <BrandHeader />
      
      <BrandScores />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <BrandProfileCard project={activeProject} />
        <VisualIdentityCard project={activeProject} />
        <BrandVoiceCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-3">
          <BrandSummary project={activeProject} />
        </div>
        <div className="lg:col-span-6">
          <CompetitorSnapshot />
        </div>
        <div className="lg:col-span-3">
          <BrandQuickActions />
        </div>
      </div>

      <UsedAcrossModules />
    </div>
  );
}
