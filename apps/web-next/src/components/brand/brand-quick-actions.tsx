"use client";

import React from "react";
import { Zap, RefreshCw, FileEdit, Sparkles, Share } from "lucide-react";

export function BrandQuickActions() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full flex flex-col">
      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-indigo-500" />
        Quick Actions
      </h3>
      
      <div className="grid grid-cols-1 gap-3 flex-1 content-start">
        <button className="flex items-center gap-3 p-3 text-left border border-slate-100 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
          <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-900">Refresh Brand Data</span>
            <span className="block text-[10px] text-slate-500 font-medium">Pull latest data from web</span>
          </div>
        </button>
        
        <button className="flex items-center gap-3 p-3 text-left border border-slate-100 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
          <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
            <FileEdit className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-900">Edit Brand Guidelines</span>
            <span className="block text-[10px] text-slate-500 font-medium">Update voice & identity</span>
          </div>
        </button>

        <button className="flex items-center gap-3 p-3 text-left border border-slate-100 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
          <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-900">Generate Brand Suggestions</span>
            <span className="block text-[10px] text-slate-500 font-medium">Get AI-powered ideas</span>
          </div>
        </button>

        <button className="flex items-center gap-3 p-3 text-left border border-slate-100 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
          <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
            <Share className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-900">Sync Across Modules</span>
            <span className="block text-[10px] text-slate-500 font-medium">Apply to all modules</span>
          </div>
        </button>
      </div>
    </div>
  );
}
