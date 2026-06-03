import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AeoAnalysisResult = {
  overallScore: number;
  providers: any[];
  categoryScores: any[];
  recommendations: any[];
  promptSuggestions: any[];
};

export async function runAeoAnalysis(params: {
  website: string;
  brandName: string;
  topics: string[];
  brandDescription?: string;
}): Promise<AeoAnalysisResult> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke("generate-aeo-analysis", { body: params });
  if (error) throw error;
  return data as AeoAnalysisResult;
}
