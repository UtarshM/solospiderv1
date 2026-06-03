import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ScheduledSocialPost = {
  id: string;
  project_id: string;
  platform: string;
  caption: string;
  hashtags: string[] | null;
  image_url: string | null;
  status: "draft" | "scheduled" | "published";
  scheduled_at: string | null;
  publish_attempts?: number;
};

type SocialAccount = {
  id: string;
  handle: string;
  access_token: string | null;
  meta_ig_user_id: string | null;
  meta_page_id?: string | null;
  connection_status: string | null;
  token_expires_at: string | null;
  platform_account_id: string | null;
};

async function refreshMetaLongLivedToken(currentToken: string) {
  const appId = Deno.env.get("META_APP_ID") ?? "";
  const appSecret = Deno.env.get("META_APP_SECRET") ?? "";
  if (!appId || !appSecret) {
    throw new Error("Missing META_APP_ID or META_APP_SECRET for token refresh");
  }

  const exchangeUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
  exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
  exchangeUrl.searchParams.set("client_id", appId);
  exchangeUrl.searchParams.set("client_secret", appSecret);
  exchangeUrl.searchParams.set("fb_exchange_token", currentToken);

  const refreshRes = await fetch(exchangeUrl.toString());
  const refreshJson = await refreshRes.json();
  if (!refreshRes.ok || !refreshJson?.access_token) {
    throw new Error(`Meta token refresh failed: ${JSON.stringify(refreshJson)}`);
  }

  const refreshedToken = String(refreshJson.access_token);
  const expiresInSec = Number(refreshJson.expires_in || 0);
  const expiresAt = expiresInSec > 0
    ? new Date(Date.now() + (expiresInSec * 1000)).toISOString()
    : null;

  return { refreshedToken, expiresAt };
}

async function publishToInstagram(params: {
  accessToken: string;
  igUserId: string;
  imageUrl: string | null;
  caption: string;
}) {
  if (!params.imageUrl) {
    throw new Error("Cannot publish: image_url is required for Instagram publishing");
  }

  const mediaRes = await fetch(`https://graph.facebook.com/v20.0/${params.igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      image_url: params.imageUrl,
      caption: params.caption,
      access_token: params.accessToken,
    }),
  });
  const mediaJson = await mediaRes.json();
  if (!mediaRes.ok || !mediaJson?.id) {
    throw new Error(`Instagram media creation failed: ${JSON.stringify(mediaJson)}`);
  }

  const publishRes = await fetch(`https://graph.facebook.com/v20.0/${params.igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      creation_id: String(mediaJson.id),
      access_token: params.accessToken,
    }),
  });
  const publishJson = await publishRes.json();
  if (!publishRes.ok || !publishJson?.id) {
    throw new Error(`Instagram publish failed: ${JSON.stringify(publishJson)}`);
  }

  return {
    containerId: String(mediaJson.id),
    postId: String(publishJson.id),
  };
}

async function publishToFacebookPage(params: {
  accessToken: string;
  pageId: string;
  imageUrl: string | null;
  caption: string;
}) {
  let endpoint = `https://graph.facebook.com/v20.0/${params.pageId}/feed`;
  const bodyParams = new URLSearchParams({
    access_token: params.accessToken,
  });

  if (params.imageUrl) {
    endpoint = `https://graph.facebook.com/v20.0/${params.pageId}/photos`;
    bodyParams.set("url", params.imageUrl);
    bodyParams.set("caption", params.caption);
  } else {
    bodyParams.set("message", params.caption);
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: bodyParams,
  });

  const json = await res.json() as any;
  if (!res.ok || !(json?.id || json?.post_id)) {
    throw new Error(`Facebook Page publish failed: ${JSON.stringify(json)}`);
  }

  return {
    postId: String(json.id || json.post_id),
  };
}

async function publishToLinkedIn(params: {
  accessToken: string;
  authorUrn: string;
  imageUrl: string | null;
  caption: string;
}) {
  let assetUrn = null;

  if (params.imageUrl) {
    try {
      // Step 1: Register Upload
      const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${params.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: params.authorUrn,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent"
              }
            ]
          }
        }),
      });

      const registerJson = await registerRes.json();
      if (!registerRes.ok || !registerJson?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadMechanism"]?.uploadUrl) {
        throw new Error(`LinkedIn register upload failed: ${JSON.stringify(registerJson)}`);
      }

      const uploadUrl = registerJson.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadMechanism"].uploadUrl;
      assetUrn = registerJson.value.asset;

      // Step 2: Upload Binary
      const imageRes = await fetch(params.imageUrl);
      const blob = await imageRes.blob();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${params.accessToken}`,
          "Content-Type": blob.type || "image/jpeg",
        },
        body: blob,
      });

      if (!uploadRes.ok) {
        throw new Error(`LinkedIn image upload failed: ${uploadRes.statusText}`);
      }
    } catch (uploadErr: any) {
      console.error("LinkedIn media upload error:", uploadErr);
      // Fallback to text only if upload fails, or throw error?
      // Let's throw error to mark post as failed so user knows!
      throw uploadErr;
    }
  }

  // Step 3: Create Post
  const payload: any = {
    author: params.authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: params.caption
        },
        shareMediaCategory: assetUrn ? "IMAGE" : "NONE",
      }
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  if (assetUrn) {
    payload.specificContent["com.linkedin.ugc.ShareContent"].media = [
      {
        status: "READY",
        media: assetUrn
      }
    ];
  }

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${params.accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`LinkedIn publish failed: ${JSON.stringify(json)}`);
  }

  return { postId: json.id || "unknown" };
}

async function publishToTwitter(params: {
  accessToken: string;
  imageUrl: string | null;
  caption: string;
}) {
  const payload: any = {
    text: params.caption,
  };

  if (params.imageUrl) {
    payload.text = `${params.caption}\n\nImage: ${params.imageUrl}`;
  }

  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Twitter publish failed: ${JSON.stringify(json)}`);
  }

  return { postId: json.data?.id || "unknown" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase env");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(100, Number(body.limit || 25)));
    const dryRun = Boolean(body.dry_run || false);
    const force = Boolean(body.force || false);
    const requestedPostIds: string[] = Array.isArray(body.post_ids)
      ? body.post_ids.map((v: unknown) => String(v)).filter(Boolean).slice(0, 100)
      : [];

    const nowIso = new Date().toISOString();

    let query = supabase
      .from("social_posts")
      .select("id, project_id, platform, caption, hashtags, image_url, status, scheduled_at, publish_attempts")
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true })
      .limit(limit);

    if (requestedPostIds.length > 0) {
      query = query.in("id", requestedPostIds);
      if (!force) {
        query = query.lte("scheduled_at", nowIso);
      }
    } else {
      query = query.lte("scheduled_at", nowIso);
    }

    const { data: duePosts, error: fetchError } = await query;

    if (fetchError) throw fetchError;
    const rows = (duePosts || []) as ScheduledSocialPost[];

    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true,
        dry_run: true,
        force,
        due_count: rows.length,
        ids: rows.map((r) => r.id),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let published = 0;
    let failed = 0;
    const failures: Array<{ id: string; reason: string }> = [];

    for (const post of rows) {
      processed += 1;
      const attemptAt = new Date().toISOString();
      const nextAttempts = Number(post.publish_attempts || 0) + 1;

      try {
        // Check project social account for platform before "publishing".
        const { data: account, error: accountError } = await supabase
          .from("social_accounts")
          .select("id, handle, access_token, meta_ig_user_id, meta_page_id, connection_status, token_expires_at, platform_account_id")
          .eq("project_id", post.project_id)
          .eq("platform", post.platform)
          .maybeSingle();
        if (accountError) throw accountError;
        if (!account?.id) {
          throw new Error(`No connected ${post.platform} account for project`);
        }
        const socialAccount = account as SocialAccount;

        if (socialAccount.connection_status && socialAccount.connection_status !== "connected") {
          throw new Error(`${post.platform} connection status is ${socialAccount.connection_status}`);
        }

        let publishToken = socialAccount.access_token;
        if (socialAccount.token_expires_at && publishToken) {
          const expiresAtMs = Date.parse(socialAccount.token_expires_at);
          const refreshWindowMs = 48 * 60 * 60 * 1000;

          if (!Number.isNaN(expiresAtMs) && expiresAtMs <= (Date.now() + refreshWindowMs)) {
            try {
              const refreshed = await refreshMetaLongLivedToken(publishToken);
              publishToken = refreshed.refreshedToken;
              await supabase
                .from("social_accounts")
                .update({
                  access_token: refreshed.refreshedToken,
                  token_expires_at: refreshed.expiresAt,
                  connection_status: "connected",
                  last_publish_error: null,
                } as never)
                .eq("id", socialAccount.id);
            } catch (refreshErr: any) {
              // If token is already expired and refresh fails, block publish.
              if (expiresAtMs <= Date.now()) {
                await supabase
                  .from("social_accounts")
                  .update({
                    connection_status: "expired",
                    last_publish_status: "failed",
                    last_publish_error: `Token expired and refresh failed: ${String(refreshErr?.message || "unknown")}`,
                  } as never)
                  .eq("id", socialAccount.id);
                throw new Error("Publisher token expired and refresh failed");
              }
            }
          }
        }

        if (socialAccount.token_expires_at) {
          const expiresAtMs = Date.parse(socialAccount.token_expires_at);
          if (!Number.isNaN(expiresAtMs) && expiresAtMs <= Date.now()) {
            await supabase
              .from("social_accounts")
              .update({
                connection_status: "expired",
                last_publish_status: "failed",
                last_publish_error: "Token expired. Refresh token before scheduling publish.",
              } as never)
              .eq("id", socialAccount.id);
            throw new Error("Publisher token expired");
          }
        }

        let externalPostId = `sim_${post.platform}_${post.id.slice(0, 8)}_${Date.now()}`;
        let publishMode = "internal_scheduler";
        let publishMeta: Record<string, unknown> = {
          mode: publishMode,
          platform: post.platform,
          handle: socialAccount.handle,
          scheduled_at: post.scheduled_at,
          published_at: attemptAt,
        };

        if (post.platform === "instagram" && publishToken && socialAccount.meta_ig_user_id) {
          const result = await publishToInstagram({
            accessToken: publishToken,
            igUserId: socialAccount.meta_ig_user_id,
            imageUrl: post.image_url,
            caption: post.caption,
          });
          externalPostId = result.postId;
          publishMode = "meta_graph_api";
          publishMeta = {
            mode: publishMode,
            platform: post.platform,
            handle: socialAccount.handle,
            scheduled_at: post.scheduled_at,
            published_at: attemptAt,
            container_id: result.containerId,
            external_post_id: result.postId,
          };
        } else if (post.platform === "facebook" && publishToken && (socialAccount.meta_page_id || socialAccount.platform_account_id)) {
          const pageId = socialAccount.meta_page_id || socialAccount.platform_account_id;
          const result = await publishToFacebookPage({
            accessToken: publishToken,
            pageId: pageId!,
            imageUrl: post.image_url,
            caption: post.caption,
          });
          externalPostId = result.postId;
          publishMode = "meta_page_api";
          publishMeta = {
            mode: publishMode,
            platform: post.platform,
            handle: socialAccount.handle,
            scheduled_at: post.scheduled_at,
            published_at: attemptAt,
            external_post_id: result.postId,
          };
        } else if (post.platform === "linkedin" && publishToken && socialAccount.platform_account_id) {
          const result = await publishToLinkedIn({
            accessToken: publishToken,
            authorUrn: socialAccount.platform_account_id,
            imageUrl: post.image_url,
            caption: post.caption,
          });
          externalPostId = result.postId;
          publishMode = "linkedin_api";
          publishMeta = {
            mode: publishMode,
            platform: post.platform,
            handle: socialAccount.handle,
            scheduled_at: post.scheduled_at,
            published_at: attemptAt,
            external_post_id: result.postId,
          };
        } else if (post.platform === "twitter" && publishToken) {
          const result = await publishToTwitter({
            accessToken: publishToken,
            imageUrl: post.image_url,
            caption: post.caption,
          });
          externalPostId = result.postId;
          publishMode = "twitter_api";
          publishMeta = {
            mode: publishMode,
            platform: post.platform,
            handle: socialAccount.handle,
            scheduled_at: post.scheduled_at,
            published_at: attemptAt,
            external_post_id: result.postId,
          };
        }

        const publishPayload = {
          status: "published",
          published_at: attemptAt,
          publish_error: null,
          last_publish_attempt_at: attemptAt,
          publish_attempts: nextAttempts,
          external_post_id: externalPostId,
          publish_response: publishMeta,
        };

        const { error: updateError } = await supabase
          .from("social_posts")
          .update(publishPayload as never)
          .eq("id", post.id)
          .eq("status", "scheduled");
        if (updateError) throw updateError;

        await supabase
          .from("social_accounts")
          .update({
            last_publish_at: attemptAt,
            last_publish_status: "success",
            last_publish_error: null,
            connection_status: "connected",
          } as never)
          .eq("id", socialAccount.id);

        published += 1;
      } catch (err: any) {
        failed += 1;
        const reason = String(err?.message || "Unknown publish error");
        failures.push({ id: post.id, reason });

        await supabase
          .from("social_posts")
          .update({
            publish_error: reason,
            last_publish_attempt_at: attemptAt,
            publish_attempts: nextAttempts,
          } as never)
          .eq("id", post.id)
          .eq("status", "scheduled");

        await supabase
          .from("social_accounts")
          .update({
            last_publish_status: "failed",
            last_publish_error: reason,
          } as never)
          .eq("project_id", post.project_id)
          .eq("platform", post.platform);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      processed,
      published,
      failed,
      failures,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
