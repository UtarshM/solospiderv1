"use client";

import React from "react";
import { FileText, MessageSquare, Megaphone, ImageIcon, Video, Search } from "lucide-react";

export function UsedAcrossModules() {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-bold text-slate-900">Used Across Modules</h3>
        <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold">i</span>
      </div>
      <p className="text-xs font-medium text-slate-500 mb-4">Your brand memory powers consistency across every module.</p>
      
      <div className="flex flex-wrap gap-4">
        {[
          { name: "Blogs", desc: "Consistent voice in every post", icon: <FileText className="w-5 h-5 text-indigo-500" /> },
          { name: "Social Media", desc: "On-brand across all channels", icon: <MessageSquare className="w-5 h-5 text-blue-500" /> },
          { name: "Ads", desc: "Unified messaging in every campaign", icon: <Megaphone className="w-5 h-5 text-orange-500" /> },
          { name: "Image Generation", desc: "On-brand visuals with AI", icon: <ImageIcon className="w-5 h-5 text-emerald-500" /> },
          { name: "Video Generation", desc: "Branded videos that convert", icon: <Video className="w-5 h-5 text-pink-500" /> },
          { name: "SEO", desc: "Optimized content with brand intent", icon: <Search className="w-5 h-5 text-blue-600" /> },
        ].map((mod, i) => (
          <div key={i} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm min-w-[200px] flex-1">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              {mod.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">{mod.name}</p>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5">{mod.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
