"use client";

import React from "react";
import { CheckCircle2, FileText, Share2, Link as LinkIcon, Eye } from "lucide-react";
import Link from "next/link";

const activities = [
  { 
    id: 1, 
    title: "SEO Audit Completed", 
    desc: "All issues scanned successfully", 
    time: "10 min ago", 
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    bgColor: "bg-emerald-50"
  },
  { 
    id: 2, 
    title: "Blog Published", 
    desc: "10 Best Running Shoes in 2025", 
    time: "1 hour ago", 
    icon: <FileText className="w-4 h-4 text-indigo-500" />,
    bgColor: "bg-indigo-50"
  },
  { 
    id: 3, 
    title: "Social Post Scheduled", 
    desc: "Instagram post scheduled", 
    time: "2 hours ago", 
    icon: <Share2 className="w-4 h-4 text-pink-500" />,
    bgColor: "bg-pink-50"
  },
  { 
    id: 4, 
    title: "Backlink Created", 
    desc: "Nike listed on 5 new directories", 
    time: "3 hours ago", 
    icon: <LinkIcon className="w-4 h-4 text-blue-500" />,
    bgColor: "bg-blue-50"
  },
  { 
    id: 5, 
    title: "AI Visibility Checked", 
    desc: "Visibility score improved", 
    time: "5 hours ago", 
    icon: <Eye className="w-4 h-4 text-amber-500" />,
    bgColor: "bg-amber-50"
  },
];

export function ActivityFeed() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-slate-900">Recent Activity</h3>
        <Link href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View All</Link>
      </div>
      
      <div className="flex flex-col gap-5">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${activity.bgColor} shrink-0 mt-0.5`}>
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-800 truncate">{activity.title}</h4>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{activity.desc}</p>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 shrink-0 mt-1">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
