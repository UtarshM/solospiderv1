"use client";

import React from "react";
import { Users2 } from "lucide-react";

const competitors = [
  { name: "Semrush", positioning: "All-in-one SEO Platform", strengths: "SEO data, tools", share: 28, logo: "O" },
  { name: "Ahrefs", positioning: "SEO & Backlink Intelligence", strengths: "Backlink data", share: 21, logo: "a" },
  { name: "Moz", positioning: "SEO Software Suite", strengths: "Domain authority", share: 15, logo: "M" },
  { name: "Surfer SEO", positioning: "Content Optimization", strengths: "Content scoring", share: 11, logo: "S" },
];

export function CompetitorSnapshot() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full">
      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Users2 className="w-4 h-4 text-indigo-500" />
        Competitor Snapshot
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 font-semibold border-b border-slate-100">
              <th className="pb-2 font-semibold">Competitor</th>
              <th className="pb-2 font-semibold">Positioning</th>
              <th className="pb-2 font-semibold">Strengths</th>
              <th className="pb-2 font-semibold">Share of Voice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {competitors.map((comp, i) => (
              <tr key={i}>
                <td className="py-3 flex items-center gap-2 font-bold text-slate-800">
                  <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                    {comp.logo}
                  </div>
                  {comp.name}
                </td>
                <td className="py-3 text-slate-600 font-medium">{comp.positioning}</td>
                <td className="py-3 text-slate-600 font-medium">{comp.strengths}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 w-6">{comp.share}%</span>
                    <div className="w-16 h-1.5 bg-indigo-50 rounded-full">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${comp.share}%` }}></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
