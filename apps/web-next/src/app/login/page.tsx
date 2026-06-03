"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const redirectedFrom = "/app/en/dashboard";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
      router.replace(redirectedFrom);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app/en/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to login with Google");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={
      {
        "--bg": "#ffffff",
        "--bg-2": "#f8f6ff",
        "--panel": "#ffffff",
        "--line": "#e5e7eb",
        "--ink": "#000000",
        "--ink-2": "#0f172a",
        "--muted": "#334155",
      } as React.CSSProperties
    }>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-bg-2 border-r border-line items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink/5 blur-[150px] rounded-full pointer-events-none -translate-x-1/2 translate-y-1/2" />
        
        <div className="max-w-md text-center relative z-10">
          <div className="flex items-center justify-center mb-8">
            <img src="/assets/solospider-logo.png" alt="Solo Spider" className="h-[42px] w-auto" />
          </div>
          <p className="text-lg text-ink-2">
            Hire Autonomy. Not a team. The autonomous execution layer for every business on earth.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white relative">
        <div className="w-full max-w-sm">
          <div className="flex items-center mb-6 lg:hidden">
            <img src="/assets/solospider-logo.png" alt="Solo Spider" className="h-[34px] w-auto" />
          </div>
          <h2 className="font-display text-[26px] font-bold tracking-tight text-ink mb-1">
            Welcome back
          </h2>
          <p className="text-[15px] text-ink-2 mb-8">
            Sign in to your account
          </p>

          <div className="space-y-4">
            <button
              className="w-full flex items-center justify-center gap-2 border border-line rounded-xl py-3 text-sm font-semibold hover:bg-bg-2 transition-colors disabled:opacity-50"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
              )}
              Sign in with Google
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-line" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500 font-semibold tracking-wider">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@agency.com"
                  className="w-full border border-line rounded-xl px-3.5 py-2.5 bg-white text-sm focus:outline-none focus:border-primary transition-colors text-ink"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full border border-line rounded-xl px-3.5 py-2.5 bg-white text-sm focus:outline-none focus:border-primary transition-colors text-ink"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <button 
                type="submit" 
                className="w-full btn btn-grad justify-center py-3"
                disabled={loading || googleLoading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
