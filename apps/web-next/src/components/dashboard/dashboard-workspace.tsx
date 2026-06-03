"use client";

import React from "react";
import { DashboardHeader } from "./dashboard-header";
import { MetricCards } from "./metric-cards";
import { IssuesList } from "./issues-list";
import { TrafficChart } from "./traffic-chart";
import { QuickActions } from "./quick-actions";
import { ModulesGrid } from "./modules-grid";
import { ActivityFeed } from "./activity-feed";

export function DashboardWorkspace() {
  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 bg-[#fcfcfd] min-h-screen">
      <DashboardHeader />
      
      <div className="mb-6">
        <MetricCards />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-4">
          <IssuesList />
        </div>
        <div className="lg:col-span-5">
          <TrafficChart />
        </div>
        <div className="lg:col-span-3">
          <QuickActions />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
        <div className="lg:col-span-9">
          <ModulesGrid />
        </div>
        <div className="lg:col-span-3">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
