"use client";

import React from "react";
import { Radio, Edit2 } from "lucide-react";

export function BrandVoiceCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Radio className="w-4 h-4 text-indigo-500" />
          Brand Voice
        </h3>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <Edit2 className="w-3 h-3" /> Edit
        </button>
      </div>

      <div className="space-y-6 mb-6">
        <div className="flex items-center gap-4">
          <span className="w-20 text-xs font-bold text-slate-900">Professional</span>
          <div className="flex-1 h-1.5 bg-indigo-100 rounded-full relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-[20%] w-3 h-3 bg-indigo-600 rounded-full shadow-sm ring-2 ring-white"></div>
          </div>
          <span className="w-20 text-xs font-medium text-slate-500 text-right">Casual</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="w-20 text-xs font-bold text-slate-900">Friendly</span>
          <div className="flex-1 h-1.5 bg-indigo-100 rounded-full relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-[80%] w-3 h-3 bg-indigo-600 rounded-full shadow-sm ring-2 ring-white"></div>
          </div>
          <span className="w-20 text-xs font-medium text-slate-500 text-right">Formal</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="w-20 text-xs font-bold text-slate-900">Bold</span>
          <div className="flex-1 h-1.5 bg-indigo-100 rounded-full relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-[90%] w-3 h-3 bg-indigo-600 rounded-full shadow-sm ring-2 ring-white"></div>
          </div>
          <span className="w-20 text-xs font-medium text-slate-500 text-right">Subtle</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="w-20 text-xs font-bold text-slate-900">Premium</span>
          <div className="flex-1 h-1.5 bg-indigo-100 rounded-full relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-[10%] w-3 h-3 bg-indigo-600 rounded-full shadow-sm ring-2 ring-white"></div>
          </div>
          <span className="w-20 text-xs font-medium text-slate-500 text-right">Accessible</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="w-20 text-xs font-bold text-slate-900">Simple</span>
          <div className="flex-1 h-1.5 bg-indigo-100 rounded-full relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-[75%] w-3 h-3 bg-indigo-600 rounded-full shadow-sm ring-2 ring-white"></div>
          </div>
          <span className="w-20 text-xs font-medium text-slate-500 text-right">Complex</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-between">
        {["Confident", "Trustworthy", "Innovative", "Clear"].map((tag, i) => (
          <span key={i} className="px-4 py-1.5 border border-indigo-200 text-indigo-700 rounded-full text-xs font-semibold bg-indigo-50/50">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
