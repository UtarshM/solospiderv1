import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  try {
    // Verify the user owns this project
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
    }

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("social_posts")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, posts: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

