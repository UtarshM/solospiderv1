"use client";

import React from "react";
import { Activity, FileText, Share2, Eye, Megaphone } from "lucide-react";

const actions = [
  { id: 1, label: "Run SEO Audit", icon: <Activity className="w-4 h-4 text-emerald-500" />, bgColor: "bg-emerald-50" },
  { id: 2, label: "Create Blog", icon: <FileText className="w-4 h-4 text-indigo-500" />, bgColor: "bg-indigo-50" },
  { id: 3, label: "Generate Social Post", icon: <Share2 className="w-4 h-4 text-pink-500" />, bgColor: "bg-pink-50" },
  { id: 4, label: "Check AI Visibility", icon: <Eye className="w-4 h-4 text-amber-500" />, bgColor: "bg-amber-50" },
  { id: 5, label: "Optimize Ads", icon: <Megaphone className="w-4 h-4 text-blue-500" />, bgColor: "bg-blue-50" },
];

export function QuickActions() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full p-5">
      <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
      <div className="flex flex-col gap-3">
        {actions.map((action) => (
          <button 
            key={action.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all text-left bg-white"
          >
            <div className={`p-2 rounded-lg ${action.bgColor}`}>
              {action.icon}
            </div>
            <span className="text-sm font-semibold text-slate-700">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
