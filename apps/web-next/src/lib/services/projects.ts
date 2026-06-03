import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Project, UserSubscription } from "@/types/project";
import { mapServiceError } from "./errors";

const PLAN_LIMITS: Record<UserSubscription["plan"], number> = {
  free: 1,
  starter: 5,
  pro: 50,
};

export async function getProjects(): Promise<Project[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Project[];
  } catch (err) {
    throw mapServiceError(err);
  }
}

export async function getSubscription(): Promise<UserSubscription> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("user_subscriptions" as any)
      .select("plan")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { plan: "free" };
    }

    const plan = (data?.plan || "free") as UserSubscription["plan"];
    return { plan: ["free", "starter", "pro"].includes(plan) ? plan : "free" };
  } catch {
    return { plan: "free" };
  }
}

export function getPlanLimit(plan: UserSubscription["plan"]): number {
  return PLAN_LIMITS[plan] ?? 1;
}

export async function createProject(input: {
  name: string;
  domain: string;
  brand_name?: string;
  brand_tagline?: string;
  brand_description?: string;
  og_image_url?: string;
}): Promise<Project> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("projects")
      .insert(input as any)
      .select("*")
      .single();

    if (error) throw error;
    return data as Project;
  } catch (err) {
    throw mapServiceError(err);
  }
}
