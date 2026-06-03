"use client";

import React from "react";
import { User, Edit2, Globe, Building2, Tag, Target, Target as Positioning } from "lucide-react";
import Link from "next/link";
import { Project } from "@/types/project";

export function BrandProfileCard({ project }: { project: Project | null }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          Brand Profile
        </h3>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <Edit2 className="w-3 h-3" /> Edit
        </button>
      </div>

      <div className="space-y-5">
        <div className="flex items-start">
          <div className="w-1/3 flex items-center gap-2 text-slate-500">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-semibold">Website</span>
          </div>
          <div className="w-2/3">
            <Link href={project?.domain ? `https://${project.domain}` : '#'} className="text-sm font-semibold text-blue-600 hover:underline">
              {project?.domain ? `https://${project.domain}` : 'https://acmesolutions.com'}
            </Link>
          </div>
        </div>

        <div className="flex items-start">
          <div className="w-1/3 flex items-center gap-2 text-slate-500">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-semibold">Industry</span>
          </div>
          <div className="w-2/3">
            <p className="text-sm font-medium text-slate-800">Software & Technology</p>
          </div>
        </div>

        <div className="flex items-start">
          <div className="w-1/3 flex items-center gap-2 text-slate-500">
            <Tag className="w-4 h-4" />
            <span className="text-xs font-semibold">Business Category</span>
          </div>
          <div className="w-2/3">
            <p className="text-sm font-medium text-slate-800">AI-Powered Growth Platform</p>
          </div>
        </div>

        <div className="flex items-start">
          <div className="w-1/3 flex items-center gap-2 text-slate-500">
            <Target className="w-4 h-4" />
            <span className="text-xs font-semibold">Target Audience</span>
          </div>
          <div className="w-2/3">
            <p className="text-sm font-medium text-slate-800">Founders, Marketers, Growth Teams at SMBs & Startups</p>
          </div>
        </div>

        <div className="flex items-start">
          <div className="w-1/3 flex items-center gap-2 text-slate-500">
            <Positioning className="w-4 h-4" />
            <span className="text-xs font-semibold">Brand Positioning</span>
          </div>
          <div className="w-2/3">
            <p className="text-xs font-medium text-slate-800 leading-relaxed">
              {project?.brand_description || "Acme Solutions helps ambition-driven teams scale faster with AI-powered marketing intelligence and automation."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
