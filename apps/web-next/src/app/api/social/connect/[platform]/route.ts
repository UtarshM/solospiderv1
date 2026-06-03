import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/server/env";
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
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

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

    const env = getServerEnv();
    let oauthUrl = "";

    switch (platform) {
      case "linkedin":
        oauthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${env.LINKEDIN_CLIENT_ID ?? ""}&redirect_uri=${encodeURIComponent(env.LINKEDIN_REDIRECT_URI ?? "")}&state=${projectId}&scope=w_member_social`;
        break;
      case "twitter":
        oauthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${env.TWITTER_CLIENT_ID ?? ""}&redirect_uri=${encodeURIComponent(env.TWITTER_REDIRECT_URI ?? "")}&state=${projectId}&scope=tweet.read%20tweet.write%20users.read&code_challenge=challenge&code_challenge_method=plain`;
        break;
      default:
        return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
    }

    return NextResponse.redirect(oauthUrl);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to initiate oauth" }, { status: 500 });
  }
}

