"use client";

import React from "react";
import { Activity, Radio, Users, Palette, Info } from "lucide-react";

interface ScoreCardProps {
  title: string;
  score: number;
  icon: React.ReactNode;
  status: string;
  trend: string;
  iconBgClass: string;
  textClass: string;
  progressColorClass: string;
}

function ScoreCard({ title, score, icon, status, trend, iconBgClass, textClass, progressColorClass }: ScoreCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-1.5 rounded-lg ${iconBgClass}`}>
          {icon}
        </div>
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1">
          {title} <Info className="w-3 h-3 text-slate-400" />
        </h3>
      </div>
      
      <div className="flex items-end gap-1 mb-3">
        <span className={`text-4xl font-bold ${textClass}`}>{score}</span>
        <span className="text-sm font-medium text-slate-400 mb-1">/100</span>
      </div>
      
      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
        <div className={`h-full ${progressColorClass} rounded-full`} style={{ width: `${score}%` }}></div>
      </div>
      
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span className="flex items-center gap-1 text-slate-700">
          <span className={`w-1.5 h-1.5 rounded-full ${textClass.replace('text-', 'bg-')}`}></span>
          {status}
        </span>
        <span className="text-emerald-500">{trend}</span>
      </div>
    </div>
  );
}

export function BrandScores() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <ScoreCard 
        title="Brand Health Score" 
        score={92} 
        icon={<Activity className="w-4 h-4 text-emerald-600" />} 
        status="Excellent" 
        trend="↑ 8 pts vs last 30 days" 
        iconBgClass="bg-emerald-100" 
        textClass="text-emerald-600"
        progressColorClass="bg-gradient-to-r from-emerald-400 to-emerald-600"
      />
      <ScoreCard 
        title="Tone of Voice" 
        score={87} 
        icon={<Radio className="w-4 h-4 text-indigo-600" />} 
        status="Strong & Consistent" 
        trend="↑ 6 pts" 
        iconBgClass="bg-indigo-100" 
        textClass="text-indigo-600"
        progressColorClass="bg-gradient-to-r from-indigo-400 to-indigo-600"
      />
      <ScoreCard 
        title="Audience Fit" 
        score={88} 
        icon={<Users className="w-4 h-4 text-blue-600" />} 
        status="Very Good" 
        trend="↑ 7 pts" 
        iconBgClass="bg-blue-100" 
        textClass="text-blue-600"
        progressColorClass="bg-gradient-to-r from-blue-400 to-blue-600"
      />
      <ScoreCard 
        title="Visual Identity" 
        score={90} 
        icon={<Palette className="w-4 h-4 text-pink-600" />} 
        status="Excellent" 
        trend="↑ 5 pts" 
        iconBgClass="bg-pink-100" 
        textClass="text-pink-600"
        progressColorClass="bg-gradient-to-r from-pink-400 to-pink-600"
      />
    </div>
  );
}
