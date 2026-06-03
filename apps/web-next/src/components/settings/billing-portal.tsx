"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Loader2, 
  User, 
  CreditCard, 
  Settings2, 
  Save, 
  ShieldCheck, 
  Zap, 
  History, 
  Check, 
  HelpCircle,
  Key
} from "lucide-react";

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  content_id: string | null;
}

export function BillingPortal() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [credits, setCredits] = useState<{ total: number; used: number; remaining: number } | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);

  // Security
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Preferences (stored in localStorage)
  const [defaultTone, setDefaultTone] = useState("Professional");
  const [defaultCountry, setDefaultCountry] = useState("United States");
  const [defaultWordCount, setDefaultWordCount] = useState("1200");

  useEffect(() => {
    // Load local storage values on client side
    if (typeof window !== "undefined") {
      setDefaultTone(localStorage.getItem("bf_default_tone") || "Professional");
      setDefaultCountry(localStorage.getItem("bf_default_country") || "United States");
      setDefaultWordCount(localStorage.getItem("bf_default_word_count") || "1200");
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      const supabase = getSupabaseBrowserClient();

      try {
        // Fetch credits
        const { data: creditData } = await supabase
          .from("workspace_credits")
          .select("total_credits, used_credits, locked_credits")
          .eq("user_id", user.id)
          .maybeSingle();

        if (creditData) {
          const total = creditData.total_credits || 0;
          const used = creditData.used_credits || 0;
          const locked = creditData.locked_credits || 0;
          setCredits({
            total,
            used,
            remaining: Math.max(0, total - used - locked),
          });
        } else {
          // Auto-provision 50 credits for new users fallback
          const { error: insertError } = await supabase
            .from("workspace_credits")
            .insert({
              user_id: user.id,
              total_credits: 50,
              used_credits: 0,
              locked_credits: 0
            });

          if (!insertError) {
            setCredits({ total: 50, used: 0, remaining: 50 });
          } else {
            console.error("Failed to auto-provision credits:", insertError);
            setCredits({ total: 50, used: 0, remaining: 50 });
          }
        }

        // Fetch transactions
        const { data: txData } = await supabase
          .from("credit_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        setTransactions((txData as CreditTransaction[]) || []);
      } catch (err) {
        console.error("Error fetching settings/billing data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSavePreferences = () => {
    setSaving(true);
    localStorage.setItem("bf_default_tone", defaultTone);
    localStorage.setItem("bf_default_country", defaultCountry);
    localStorage.setItem("bf_default_word_count", defaultWordCount);
    setTimeout(() => {
      setSaving(false);
      toast.success("Preferences saved successfully");
    }, 400);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsChangingPassword(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);

    if (error) {
      toast.error(error.message || "Failed to change password");
    } else {
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    }
  };

  const txTypeConfig: Record<string, { label: string; color: string }> = {
    usage: { label: "Usage", color: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
    refund: { label: "Refund", color: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
    manual_adjustment: { label: "Adjustment", color: "bg-amber-500/10 text-amber-600 border border-amber-500/20" },
    reset: { label: "Reset", color: "bg-purple-500/10 text-purple-600 border border-purple-500/20" },
  };

  const txStatusConfig: Record<string, string> = {
    locked: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    completed: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
    refunded: "bg-slate-100 text-slate-500 border border-slate-200",
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Synchronizing Neural Profile...</p>
      </div>
    );
  }

  const isEmailProvider = user?.app_metadata?.provider === "email";

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      {/* Header section */}
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <span className="bg-indigo-500/10 text-indigo-600 p-3 rounded-2xl border border-indigo-500/10">
            <Settings2 className="h-6 w-6" />
          </span>
          Preferences &amp; Billing
        </h1>
        <p className="text-slate-500 text-sm font-semibold mt-2 ml-16">
          Optimize your workspace limits, credential keys, and default tone profiles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Account Info & Preferences */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Default Preferences */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50 space-y-6">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-3">
              <span className="bg-purple-500/10 text-purple-600 p-2 rounded-xl">
                <Settings2 className="h-5 w-5" />
              </span>
              Default Generation Settings
            </h3>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              These configurations pre-fill all 1-Click and Bulk generator runs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Tone of Voice</label>
                <select
                  value={defaultTone}
                  onChange={(e) => setDefaultTone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold text-sm"
                >
                  <option value="Professional">Professional</option>
                  <option value="Conversational">Conversational</option>
                  <option value="Formal">Formal</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Authoritative">Authoritative</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Target Country</label>
                <select
                  value={defaultCountry}
                  onChange={(e) => setDefaultCountry(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold text-sm"
                >
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="India">India</option>
                  <option value="Australia">Australia</option>
                  <option value="Global">Global</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Target Length</label>
                <input
                  type="number"
                  min={500}
                  max={3000}
                  step={100}
                  value={defaultWordCount}
                  onChange={(e) => setDefaultWordCount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold text-sm"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSavePreferences}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-600/10 text-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving Preferences..." : "Save Default Presets"}
              </button>
            </div>
          </div>

          {/* Profile Card */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50 space-y-6">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-3">
              <span className="bg-indigo-500/10 text-indigo-600 p-2 rounded-xl">
                <User className="h-5 w-5" />
              </span>
              User Account Profile
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div>
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block mb-1">Email Address</label>
                <p className="font-black text-slate-900 text-sm">{user?.email || "—"}</p>
              </div>
              <div>
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block mb-1">Account ID</label>
                <p className="font-mono text-xs text-slate-600 truncate max-w-[200px]" title={user?.id}>{user?.id || "—"}</p>
              </div>
              <div>
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block mb-1">Created At</label>
                <p className="font-black text-slate-900 text-sm">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
                </p>
              </div>
              <div>
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block mb-1">Auth Credentials</label>
                <p className="font-black text-slate-900 text-sm capitalize">{user?.app_metadata?.provider || "email"}</p>
              </div>
            </div>
          </div>

          {/* Security Card */}
          {isEmailProvider && (
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50 space-y-6">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-3">
                <span className="bg-pink-500/10 text-pink-600 p-2 rounded-xl">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                Account Security &amp; Credentials
              </h3>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Regularly refresh your credential passkeys to ensure robust security.
              </p>

              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all text-sm"
                >
                  <Key className="h-4 w-4 text-slate-500" />
                  Change Password
                </button>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="new-password font-semibold" className="text-xs font-bold uppercase text-slate-700">New Password</label>
                      <input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={6}
                        required
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="confirm-password" className="text-xs font-bold uppercase text-slate-700">Confirm Password</label>
                      <input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={6}
                        required
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm font-semibold"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isChangingPassword || !newPassword || !confirmPassword}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all text-xs"
                    >
                      {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Update Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl transition-all text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Credits Usage & Recent Activity */}
        <div className="space-y-8">
          
          {/* Credit overview card */}
          {credits && (
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] bg-white/10 px-4 py-1.5 rounded-full text-indigo-200 border border-white/10">
                  Credit Bank Account
                </span>
                <Zap className="h-5 w-5 text-amber-400 fill-amber-400 shrink-0" />
              </div>

              <div>
                <h4 className="text-slate-400 font-bold text-xs uppercase tracking-widest">Available Balance</h4>
                <p className="text-5xl font-black text-white mt-1 tracking-tight">{credits.remaining} <span className="text-lg text-indigo-300 font-black">CR</span></p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-indigo-200">
                  <span>{credits.used} Used</span>
                  <span>{credits.total} Total Provisioned</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full" 
                    style={{ width: `${Math.min(100, Math.max(0, (credits.used / credits.total) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Subscription Active
                </span>
                <span className="hover:underline cursor-pointer flex items-center gap-1">
                  Add Credits <HelpCircle className="h-3 w-3" />
                </span>
              </div>
            </div>
          )}

          {/* Transaction Ledger */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50 space-y-6">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-3">
              <span className="bg-amber-500/10 text-amber-600 p-2 rounded-xl">
                <History className="h-5 w-5" />
              </span>
              Billing History
            </h3>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
              Recent Workspace Runs
            </p>

            {transactions.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">No Transaction Activity</p>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">Generate some articles to populate logs</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                {transactions.map((tx) => {
                  const typeConf = txTypeConfig[tx.type] || txTypeConfig.usage;
                  const statusClass = txStatusConfig[tx.status] || "";
                  return (
                    <div 
                      key={tx.id} 
                      className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between text-xs transition-all"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${typeConf.color}`}>
                            {typeConf.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${statusClass}`}>
                            {tx.status}
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          {new Date(tx.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 text-sm">
                          {tx.type === "refund" ? "+" : "-"}{Math.abs(tx.amount)}
                        </span>
                        <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">Credits</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
