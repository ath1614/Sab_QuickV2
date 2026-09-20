"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ArrowLeft, Trash2, AlertTriangle, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DeleteAccountPage() {
  const { data: session } = useSession();
  const [phone, setPhone] = React.useState("");
  const [confirmText, setConfirmText] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (session?.user?.phone) {
      setPhone(session.user.phone);
    }
  }, [session?.user?.phone]);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (confirmText.trim().toUpperCase() !== "DELETE") {
      setErrorMsg("Please type 'DELETE' in all caps to confirm.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      setSuccess(true);
      if (session) {
        setTimeout(() => {
          signOut({ callbackUrl: "/" });
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-xs py-3 px-4 sm:px-8">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/brand/navbar-logo.png" alt="SabQuick" className="h-7 w-auto object-contain" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-sm space-y-6">
          
          <div className="border-b border-slate-100 pb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-bold mb-3">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Apple &amp; Google Data Privacy Compliance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-surface-dark">
              Permanent Account Deletion
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Submit a request to permanently purge your customer profile and personal records.
            </p>
          </div>

          {success ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-in fade-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h2 className="text-base font-bold text-emerald-950">
                Account Deleted Successfully
              </h2>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-sm mx-auto">
                Your profile, phone number, and saved addresses have been permanently purged from our servers. Redirecting to storefront...
              </p>
            </div>
          ) : (
            <form onSubmit={handleDelete} className="space-y-5">
              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>What happens when you delete your account?</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-800/90">
                  <li>Your phone number, name, and login credentials will be erased immediately.</li>
                  <li>All saved doorstep delivery addresses and map pins will be deleted.</li>
                  <li>Active cart items and coupons will be removed.</li>
                  <li>This action is <strong>irreversible</strong>.</li>
                </ul>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Registered 10-Digit Mobile Number
                </label>
                <div className="flex items-center gap-2">
                  <div className="h-11 px-3 bg-slate-100 border border-border-subtle rounded-xl flex items-center gap-1 text-xs font-bold text-slate-700 select-none">
                    <span>🇮🇳 +91</span>
                  </div>
                  <Input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    required
                    disabled={Boolean(session?.user?.phone) || isLoading}
                    className="h-11 rounded-xl font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Type <span className="text-rose-600 font-bold font-mono">DELETE</span> to confirm
                </label>
                <Input
                  type="text"
                  placeholder="DELETE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 rounded-xl font-mono font-bold"
                />
              </div>

              <Button
                type="submit"
                variant="default"
                disabled={isLoading || confirmText.trim().toUpperCase() !== "DELETE" || phone.length !== 10}
                className="w-full h-11 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white gap-2 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Purging Account...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Permanently Delete My Account
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Need assistance? Email our Grievance Officer at{" "}
              <a href="mailto:contact@sabquick.com" className="text-primary underline">
                contact@sabquick.com
              </a>
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
