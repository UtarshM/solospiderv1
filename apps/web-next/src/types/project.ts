export type Project = {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  brand_name?: string | null;
  brand_tagline?: string | null;
  brand_description?: string | null;
  brand_logo_url?: string | null;
  og_image_url?: string | null;
  favicon_url?: string | null;
  created_at?: string;
};

export type UserSubscription = {
  plan: "free" | "starter" | "pro";
};
