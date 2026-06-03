import { Worker, Job } from "bullmq";
import { redis, env } from "../config.js";
import { supabase } from "../lib/supabase.js";
import type { PublishJobData } from "../queues.js";

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
  const appId = env.META_APP_ID || "";
  const appSecret = env.META_APP_SECRET || "";
  if (!appId || !appSecret) {
    throw new Error("Missing META_APP_ID or META_APP_SECRET for token refresh");
  }

  const exchangeUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
  exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
  exchangeUrl.searchParams.set("client_id", appId);
  exchangeUrl.searchParams.set("client_secret", appSecret);
  exchangeUrl.searchParams.set("fb_exchange_token", currentToken);

  const refreshRes = await fetch(exchangeUrl.toString());
  const refreshJson = await refreshRes.json() as any;
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
  const mediaJson = await mediaRes.json() as any;
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
  const publishJson = await publishRes.json() as any;
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

      const registerJson = await registerRes.json() as any;
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

  const json = await res.json() as any;
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

  const json = await res.json() as any;
  if (!res.ok) {
    throw new Error(`Twitter publish failed: ${JSON.stringify(json)}`);
  }

  return { postId: json.data?.id || "unknown" };
}

async function processPublishJob(job: Job<PublishJobData>): Promise<object> {
  const { post_id } = job.data;
  console.log(`[PublishWorker] Job ${job.id} — post_id=${post_id}`);

  await job.updateProgress(10);

  // 1. Fetch post details
  const { data: post, error: postError } = await supabase
    .from("social_posts")
    .select("*")
    .eq("id", post_id)
    .single();

  if (postError || !post) {
    throw new Error(`Post not found: ${postError?.message || "Unknown error"}`);
  }

  const scheduledPost = post as ScheduledSocialPost;

  await job.updateProgress(30);

  // 2. Fetch social account
  const { data: account, error: accountError } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("project_id", scheduledPost.project_id)
    .eq("platform", scheduledPost.platform)
    .maybeSingle();

  if (accountError) throw accountError;
  if (!account?.id) {
    throw new Error(`No connected ${scheduledPost.platform} account for project`);
  }
  const socialAccount = account as SocialAccount;

  if (socialAccount.connection_status && socialAccount.connection_status !== "connected") {
    throw new Error(`${scheduledPost.platform} connection status is ${socialAccount.connection_status}`);
  }

  let publishToken = socialAccount.access_token;
  const attemptAt = new Date().toISOString();
  const nextAttempts = Number(scheduledPost.publish_attempts || 0) + 1;

  await job.updateProgress(50);

  // 3. Refresh token if needed (Meta specific)
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

  await job.updateProgress(70);

  // 4. Publish
  let externalPostId = `sim_${scheduledPost.platform}_${scheduledPost.id.slice(0, 8)}_${Date.now()}`;
  let publishMode = "internal_worker";
  let publishMeta: Record<string, unknown> = {
    mode: publishMode,
    platform: scheduledPost.platform,
    handle: socialAccount.handle,
    scheduled_at: scheduledPost.scheduled_at,
    published_at: attemptAt,
  };

  try {
    if (scheduledPost.platform === "instagram" && publishToken && socialAccount.meta_ig_user_id) {
      const result = await publishToInstagram({
        accessToken: publishToken,
        igUserId: socialAccount.meta_ig_user_id,
        imageUrl: scheduledPost.image_url,
        caption: scheduledPost.caption,
      });
      externalPostId = result.postId;
      publishMode = "meta_graph_api";
      publishMeta = {
        ...publishMeta,
        mode: publishMode,
        container_id: result.containerId,
        external_post_id: result.postId,
      };
    } else if (scheduledPost.platform === "facebook" && publishToken && (socialAccount.meta_page_id || socialAccount.platform_account_id)) {
      const pageId = socialAccount.meta_page_id || socialAccount.platform_account_id;
      const result = await publishToFacebookPage({
        accessToken: publishToken,
        pageId: pageId!,
        imageUrl: scheduledPost.image_url,
        caption: scheduledPost.caption,
      });
      externalPostId = result.postId;
      publishMode = "meta_page_api";
      publishMeta = {
        ...publishMeta,
        mode: publishMode,
        external_post_id: result.postId,
      };
    } else if (scheduledPost.platform === "linkedin" && publishToken && socialAccount.platform_account_id) {
      const result = await publishToLinkedIn({
        accessToken: publishToken,
        authorUrn: socialAccount.platform_account_id,
        imageUrl: scheduledPost.image_url,
        caption: scheduledPost.caption,
      });
      externalPostId = result.postId;
      publishMode = "linkedin_api";
      publishMeta = {
        ...publishMeta,
        mode: publishMode,
        external_post_id: result.postId,
      };
    } else if (scheduledPost.platform === "twitter" && publishToken) {
      const result = await publishToTwitter({
        accessToken: publishToken,
        imageUrl: scheduledPost.image_url,
        caption: scheduledPost.caption,
      });
      externalPostId = result.postId;
      publishMode = "twitter_api";
      publishMeta = {
        ...publishMeta,
        mode: publishMode,
        external_post_id: result.postId,
      };
    }

    await job.updateProgress(90);

    // 5. Update DB on success
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
      .eq("id", scheduledPost.id);
      
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

    await job.updateProgress(100);
    return { success: true, post_id: scheduledPost.id, external_post_id: externalPostId };

  } catch (err: any) {
    const reason = String(err?.message || "Unknown publish error");
    
    await supabase
      .from("social_posts")
      .update({
        publish_error: reason,
        last_publish_attempt_at: attemptAt,
        publish_attempts: nextAttempts,
      } as never)
      .eq("id", scheduledPost.id);

    await supabase
      .from("social_accounts")
      .update({
        last_publish_status: "failed",
        last_publish_error: reason,
      } as never)
      .eq("project_id", scheduledPost.project_id)
      .eq("platform", scheduledPost.platform);

    throw err; // Throw error to mark job as failed in BullMQ
  }
}

export function startPublishWorker() {
  const worker = new Worker<PublishJobData>("publish", processPublishJob, {
    connection: redis,
    concurrency: 5,
  });

  worker.on("completed", (job) => console.log(`[PublishWorker] ✅ Job ${job.id} done`));
  worker.on("failed",    (job, err) => console.error(`[PublishWorker] ❌ Job ${job?.id}: ${err.message}`));
  worker.on("error",     (err) => console.error("[PublishWorker] Error:", err));

  console.log("🚀 PublishWorker started (concurrency: 5)");
  return worker;
}
