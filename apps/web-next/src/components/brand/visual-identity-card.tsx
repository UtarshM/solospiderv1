"use client";

import React, { useState, useRef } from "react";
import { Palette, Edit2, UploadCloud, Loader2 } from "lucide-react";
import { Project } from "@/types/project";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function VisualIdentityCard({ project }: { project: Project | null }) {
  const [logoError, setLogoError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  
  const cleanDomain = project?.domain ? project.domain.replace(/^(https?:\/\/)+/, '').replace(/^www\./, '').replace(/\/$/, '') : null;
  const logoUrl = project?.brand_logo_url || (cleanDomain ? `https://logo.clearbit.com/${cleanDomain}` : null);
  const faviconUrl = project?.favicon_url || (cleanDomain ? `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128` : null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project?.id) return;
    
    setIsUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      
      const fileExt = file.name.split('.').pop();
      const fileName = `logos/${project.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('blog_images')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('blog_images')
        .getPublicUrl(fileName);
        
      const { error: updateError } = await supabase
        .from('projects')
        .update({ brand_logo_url: publicUrl })
        .eq('id', project.id);
        
      if (updateError) throw updateError;
      
      toast.success("Logo uploaded successfully!");
      setLogoError(false); // Reset error state so it tries to load the new one
      await qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload logo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-500" />
          Visual Identity
        </h3>
        <Link href="/app/en/settings/project" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <Edit2 className="w-3 h-3" /> Edit
        </Link>
      </div>

      <div className="flex gap-8 mb-6">
        <div className="flex-1">
          <span className="text-xs font-semibold text-slate-500 block mb-3">Logo</span>
          <div className="h-20 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center p-4 relative group">
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uploading...</span>
              </div>
            ) : logoUrl && !logoError ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="max-h-full max-w-full object-contain cursor-pointer transition-opacity hover:opacity-80" 
                onError={() => setLogoError(true)} 
                onClick={() => fileInputRef.current?.click()}
                title="Click to update logo"
              />
            ) : (
              <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => fileInputRef.current?.click()}
                title="Upload custom logo"
              >
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xl relative overflow-hidden group-hover:bg-indigo-700 transition-colors">
                  <span className="group-hover:hidden">A</span>
                  <UploadCloud className="w-5 h-5 hidden group-hover:block" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black text-slate-900 leading-none">acme</span>
                  <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">SOLUTIONS</span>
                </div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleLogoUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>
        <div className="w-24">
          <span className="text-xs font-semibold text-slate-500 block mb-3">Favicon</span>
          <div className="h-20 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center p-4">
            {faviconUrl ? (
              <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center text-white font-black text-sm">A</div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <span className="text-xs font-semibold text-slate-500 block mb-3">Color Palette</span>
        <div className="flex gap-2">
          {[
            { hex: "#6366F1", label: "#6366F1" },
            { hex: "#4F46E5", label: "#4F46E5" },
            { hex: "#EC4899", label: "#EC4899" },
            { hex: "#10B981", label: "#10B981" },
            { hex: "#0F172A", label: "#0F172A" },
            { hex: "#F8FAFC", label: "#F8FAFC", border: true },
          ].map((color, i) => (
            <div key={i} className="flex-1">
              <div 
                className={`h-10 rounded-md mb-1.5 ${color.border ? 'border border-slate-200' : ''}`}
                style={{ backgroundColor: color.hex }}
              ></div>
              <p className="text-[9px] font-bold text-slate-400 text-center uppercase">{color.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-slate-500 block mb-3">Font Pairings</span>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 p-2 px-2.5 border border-slate-200 rounded-lg min-w-0">
              <span className="font-serif text-lg font-bold shrink-0">Aa</span>
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="text-[10px] font-bold text-slate-900 leading-none truncate">Inter</span>
                <span className="text-[8px] text-slate-500 truncate">(Primary)</span>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 p-2 px-2.5 border border-slate-200 rounded-lg min-w-0">
              <span className="font-sans text-lg font-bold shrink-0">Aa</span>
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="text-[10px] font-bold text-slate-900 leading-none truncate">Poppins</span>
                <span className="text-[8px] text-slate-500 truncate">(Secondary)</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <span className="text-xs font-semibold text-slate-500 block mb-3">Design Style</span>
          <div className="flex flex-wrap gap-2">
            {["Modern", "Clean", "Tech-forward", "Minimal", "AI-native"].map((tag, i) => (
              <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-semibold">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
