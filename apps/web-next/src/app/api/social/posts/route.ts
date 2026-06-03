import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readJson } from "@/server/api";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SocialPostSchema = z.object({
  project_id: z.string().uuid(),
  platform: z.string().min(1),
  caption: z.string().optional(),
  image_url: z.string().url().optional(),
  scheduled_at: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = SocialPostSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    // Verify the user owns the specified project
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", parsed.data.project_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
    }

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("social_posts")
      .insert({
        project_id: parsed.data.project_id,
        platform: parsed.data.platform,
        caption: parsed.data.caption,
        image_url: parsed.data.image_url,
        status: parsed.data.scheduled_at ? "scheduled" : "draft",
        scheduled_at: parsed.data.scheduled_at,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, post: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

