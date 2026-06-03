"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast.success("Signup successful. Please check email confirmation if enabled.");
      router.replace("/app/en/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-black">Signup</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded border bg-white p-4">
        <input className="w-full rounded border px-3 py-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded border px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="rounded bg-slate-900 px-4 py-2 text-white" disabled={loading} type="submit">{loading ? "Creating account..." : "Create account"}</button>
      </form>
      <Link className="text-sm underline" href="/login">Already have an account? Login</Link>
    </main>
  );
}
