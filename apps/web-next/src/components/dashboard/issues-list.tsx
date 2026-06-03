"use client";

import React from "react";
import { FileText, Link as LinkIcon, Image as ImageIcon, LayoutTemplate } from "lucide-react";
import Link from "next/link";

const issues = [
  { id: 1, icon: <FileText className="w-4 h-4 text-red-500" />, title: "5 Pages have missing meta title", severity: "High", color: "text-red-500" },
  { id: 2, icon: <FileText className="w-4 h-4 text-amber-500" />, title: "12 Pages have duplicate meta description", severity: "Medium", color: "text-amber-500" },
  { id: 3, icon: <LinkIcon className="w-4 h-4 text-amber-500" />, title: "8 Pages blocked by robots.txt", severity: "Medium", color: "text-amber-500" },
  { id: 4, icon: <ImageIcon className="w-4 h-4 text-emerald-500" />, title: "15 Images missing alt text", severity: "Low", color: "text-emerald-500" },
  { id: 5, icon: <LayoutTemplate className="w-4 h-4 text-red-500" />, title: "3 Pages have multiple H1 tags", severity: "High", color: "text-red-500" },
];

export function IssuesList() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-900">Top SEO Issues</h3>
        <Link href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View All</Link>
      </div>
      <div className="p-2 flex-1">
        {issues.map((issue) => (
          <div key={issue.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md bg-opacity-10 ${issue.color.replace('text-', 'bg-')}`}>
                {issue.icon}
              </div>
              <span className="text-sm font-medium text-slate-700">{issue.title}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-xs font-semibold flex items-center gap-1 ${issue.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${issue.color.replace('text-', 'bg-')}`}></span>
                {issue.severity}
              </span>
              <button className="px-3 py-1 text-xs font-semibold text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
                Fix Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
