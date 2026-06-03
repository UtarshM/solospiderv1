import { supabase } from "../lib/supabase.js";
import { publishQueue } from "../queues.js";

export async function processDueSocialPosts() {
  console.log("[Social] Checking for due posts…");
  try {
    // 1. Fetch due posts
    const { data: posts, error } = await supabase
      .from("social_posts")
      .select("id")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(10);

    if (error) throw error;
    if (!posts || posts.length === 0) {
      return;
    }

    console.log(`[Social] Found ${posts.length} due posts. Queuing…`);

    for (const post of posts) {
      await publishQueue.add("publish", { post_id: post.id }, {
        jobId: `publish-${post.id}-${Date.now()}`,
      });
    }
  } catch (err) {
    console.error("[Social] Error queuing due posts:", err);
  }
}
