import { AppShell } from "@/components/layout/app-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
