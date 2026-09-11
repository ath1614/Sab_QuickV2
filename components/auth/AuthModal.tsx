"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  ShieldCheck,
  Truck,
  Package,
  KeyRound,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEV_ACCOUNTS = [
  {
    role: "CUSTOMER",
    label: "Aakash Verma (Demo Customer)",
    email: "customer@sabquick.local",
    badge: "Customer",
    badgeVariant: "default" as const,
    icon: User,
  },
  {
    role: "RIDER",
    label: "Vikram Rider 01 (EV Scooter)",
    email: "rider1@sabquick.local",
    badge: "Rider",
    badgeVariant: "accent" as const,
    icon: Truck,
  },
  {
    role: "PACKER",
    label: "Express Dark Store Packer",
    email: "packer@sabquick.local",
    badge: "Packer",
    badgeVariant: "secondary" as const,
    icon: Package,
  },
  {
    role: "MANAGER",
    label: "Hub Operations Manager",
    email: "manager@sabquick.local",
    badge: "Manager",
    badgeVariant: "dark" as const,
    icon: KeyRound,
  },
  {
    role: "OWNER",
    label: "SabQuick Platform Owner",
    email: "owner@sabquick.local",
    badge: "Owner",
    badgeVariant: "default" as const,
    icon: ShieldCheck,
  },
];

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [loadingEmail, setLoadingEmail] = React.useState<string | null>(null);

  const handleDevLogin = async (email: string) => {
    try {
      setLoadingEmail(email);
      const res = await signIn("credentials", {
        email,
        callbackUrl: window.location.pathname,
        redirect: false,
      });
      if (res?.ok) {
        onOpenChange(false);
        window.location.href = window.location.pathname;
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setLoadingEmail(null);
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: window.location.pathname });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <Logo variant="icon" size={32} className="rounded-lg shadow-sm shrink-0" />
            <DialogTitle className="text-xl">SabQuick Authentication</DialogTitle>
          </div>
          <DialogDescription>
            Authenticate with Google OAuth or use instant role switching for local development.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Production Google OAuth */}
          <Button
            variant="outline"
            className="w-full h-11 relative flex items-center justify-center gap-3 border-border-subtle hover:bg-slate-50 font-medium"
            onClick={handleGoogleLogin}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-border-subtle w-full" />
            <span className="bg-background px-3 text-xs uppercase text-muted-foreground font-semibold tracking-wider whitespace-nowrap">
              Dev Fast-Login (1-Click)
            </span>
            <div className="border-t border-border-subtle w-full" />
          </div>

          {/* Dev Role Quick Switchers */}
          <div className="space-y-2">
            {DEV_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              const isLoading = loadingEmail === acc.email;
              return (
                <button
                  key={acc.email}
                  disabled={Boolean(loadingEmail)}
                  onClick={() => handleDevLogin(acc.email)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border-subtle hover:border-primary/50 hover:bg-slate-50/80 transition-all text-left group disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-surface-dark group-hover:text-primary transition-colors">
                        {acc.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {acc.email}
                      </div>
                    </div>
                  </div>
                  <Badge variant={acc.badgeVariant} className="text-[10px]">
                    {acc.badge}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
