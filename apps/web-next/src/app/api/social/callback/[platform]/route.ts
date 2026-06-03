import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ platform: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platform } = await params;
  const code = request.nextUrl.searchParams.get("code");
  const projectId = request.nextUrl.searchParams.get("state");

  if (!code || !projectId) {
    return NextResponse.json({ error: "Missing code or state (projectId)" }, { status: 400 });
  }

  try {
    // Verify the user owns the specified project
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
    }

    let accessToken = "mock_token";
    let platformAccountId = "mock_id";
    let handle = "mock_handle";

    if (platform === "linkedin") {
      accessToken = "li_real_token_stub";
      platformAccountId = "urn:li:person:stub";
      handle = "LinkedIn User";
    }

    const adminClient = getSupabaseAdminClient();
    const { error } = await adminClient.from("social_accounts").upsert(
      {
        project_id: projectId,
        platform,
        handle,
        access_token: accessToken,
        platform_account_id: platformAccountId,
        connection_status: "connected",
      },
      { onConflict: "project_id,platform" },
    );


    if (error) throw error;

    return new NextResponse("<h1>Connection successful! You can close this window.</h1><script>window.close();</script>", {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to connect account" }, { status: 500 });
  }
}
