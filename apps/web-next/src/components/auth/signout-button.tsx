"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      className="rounded border px-3 py-1.5 text-xs hover:bg-slate-100"
      onClick={async () => {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.replace("/login");
        router.refresh();
      }}
      type="button"
    >
      Sign out
    </button>
  );
}
