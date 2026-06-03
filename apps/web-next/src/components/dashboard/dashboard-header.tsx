"use client";

import React, { useState } from "react";
import { Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function DashboardHeader() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("7");
  
  // Try to get full name first, then fallback to email prefix, then "there"
  const rawName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  // Calculate dynamic date range based on selected timeRange
  const endDate = new Date();
  const startDate = new Date();
  
  if (timeRange === "today") {
    startDate.setDate(endDate.getDate());
  } else if (timeRange === "30") {
    startDate.setDate(endDate.getDate() - 29);
  } else if (timeRange === "90") {
    startDate.setDate(endDate.getDate() - 89);
  } else {
    // Default to last 7 days
    startDate.setDate(endDate.getDate() - 6);
  }
  
  const formatDate = (date: Date, includeYear = false) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      ...(includeYear && { year: 'numeric' })
    });
  };

  const dateRangeText = timeRange === "today" 
    ? formatDate(startDate, true) 
    : `${formatDate(startDate)} – ${formatDate(endDate, true)}`;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1 flex items-center gap-2">
          Welcome back, {displayName}! <span className="text-xl">👋</span>
        </h1>
        <p className="text-slate-500 text-sm font-medium">Here's what's happening with your brand today.</p>
      </div>
      
      <div className="relative group">
        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-sm gap-3 group-hover:border-slate-300 transition-colors">
          <span className="text-sm font-semibold text-slate-700 pointer-events-none">{dateRangeText}</span>
          <Calendar className="w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
        <select 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          title="Change date range"
        >
          <option value="today">Today</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>
    </div>
  );
}
