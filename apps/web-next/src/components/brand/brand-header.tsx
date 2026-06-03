"use client";

import React from "react";
import { Bell, HelpCircle } from "lucide-react";

export function BrandHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1 flex items-center gap-2">
          Branding <span className="text-2xl">✨</span>
        </h1>
        <p className="text-slate-500 text-sm font-medium">Manage your brand identity, voice and AI brand memory.</p>
      </div>
    </div>
  );
}
