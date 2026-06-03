import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertSupabaseEnv, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

type CookieSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export async function getSupabaseServerClient() {
  assertSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
