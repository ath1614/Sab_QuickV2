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
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Phone,
  User,
  Eye,
  EyeOff,
} from "lucide-react";
import { BRAND_ASSETS } from "@/lib/assets";
import { OtpInput } from "@/components/auth/OtpInput";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [step, setStep] = React.useState<"PHONE" | "VERIFY">("PHONE");
  const [phone, setPhone] = React.useState<string>("");
  const [fullName, setFullName] = React.useState<string>("");
  const [isNewUser, setIsNewUser] = React.useState<boolean>(false);
  const [verifyCode, setVerifyCode] = React.useState<string>("");
  const [otpDigits, setOtpDigits] = React.useState<string[]>(["", "", "", ""]);
  const [showCode, setShowCode] = React.useState<boolean>(true);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [autoOtp, setAutoOtp] = React.useState<string | null>(null);
  const [countdown, setCountdown] = React.useState<number>(0);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setStep("PHONE");
      setPhone("");
      setFullName("");
      setIsNewUser(false);
      setVerifyCode("");
      setAutoOtp(null);
      setErrorMsg(null);
      setSuccessMsg(null);
      setCountdown(0);
    }
  }, [open]);

  // Resend cooldown timer effect
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPhone = phone.trim();
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number starting with 6-9.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      setIsNewUser(Boolean(data.isNewUser));
      setCountdown(data.cooldown || 60);
      setVerifyCode("");
      setStep("VERIFY");

      if (data.freeOtp) {
        setAutoOtp(data.freeOtp);
        setVerifyCode(data.freeOtp);
        setSuccessMsg("Verification code ready! Click 'Verify & Continue' below.");
      } else {
        setAutoOtp(null);
        setSuccessMsg(data.message || "Verification code sent to your mobile phone.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCode = verifyCode.trim();
    if (cleanCode.length < 4 || cleanCode.length > 6) {
      setErrorMsg("Please enter the complete verification code (4 to 6 digits).");
      return;
    }

    if (isNewUser && !fullName.trim()) {
      setErrorMsg("Please enter your full name to complete registration.");
      return;
    }

    try {
      setIsLoading(true);

      const signInPayload: Record<string, string> = {
        phone: phone.trim(),
        pin: cleanCode,
        otp: cleanCode,
      };
      if (fullName.trim()) {
        signInPayload.name = fullName.trim();
      }

      const res = await signIn("credentials", {
        ...signInPayload,
        redirect: false,
      });

      if (res?.error) {
        throw new Error(res.error);
      }

      if (res?.ok) {
        setSuccessMsg("Authenticated successfully! Loading your session...");
        onOpenChange(false);
        window.location.reload();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4 sm:p-6 w-full max-w-full overflow-x-hidden box-border">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1 min-w-0">
            <img
              src={BRAND_ASSETS.appIcon}
              alt="SABQuick"
              className="h-8 w-8 rounded-xl object-contain shadow-xs shrink-0"
            />
            <DialogTitle className="text-lg sm:text-xl font-black text-surface-dark truncate">
              {step === "PHONE" ? "Welcome to SABQuick" : "Enter Verification Code"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground break-words">
            {step === "PHONE"
              ? "Sign in or create your account for hyper-local grocery delivery."
              : `Enter the verification code sent to +91 ${phone}`}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in break-words">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0 flex-1">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in break-words">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span className="min-w-0 flex-1">{successMsg}</span>
          </div>
        )}

        {step === "PHONE" ? (
          <div className="space-y-4 py-2">
            {/* Phone Number Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-surface-dark flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  Mobile Number
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Instant Login
                </span>
              </label>
              <div className="flex items-center gap-2">
                <div className="h-11 px-3 bg-slate-100 border border-border-subtle rounded-xl flex items-center text-xs font-bold text-surface-dark select-none shrink-0">
                  <span>+91</span>
                </div>
                <Input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && phone.trim().length === 10) {
                      handleSendOtp();
                    }
                  }}
                  className="h-11 rounded-xl text-base tracking-wider font-semibold font-mono w-full min-w-0"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Enter your 10-digit mobile number for instant doorstep verification.
              </p>
            </div>

            {/* Primary Action Button */}
            <Button
              variant="default"
              className="w-full h-11 rounded-xl gap-2 font-bold shadow-sm"
              disabled={phone.trim().length !== 10 || isLoading}
              onClick={handleSendOtp}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Sending Code...
                </>
              ) : (
                <>
                  Continue with Mobile <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </Button>

            <p className="text-[11px] text-center text-muted-foreground pt-1">
              By proceeding, you agree to SABQuick&apos;s Terms of Service and Privacy Policy.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Number Display & Change Action */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-border-subtle gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-muted-foreground block">Verification Code For</span>
                <span className="font-mono font-bold text-sm text-surface-dark truncate block">+91 {phone}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("PHONE");
                  setVerifyCode("");
                  setErrorMsg(null);
                }}
                className="text-xs text-primary font-bold hover:bg-white shrink-0 h-8 px-2"
              >
                Change
              </Button>
            </div>

            {/* Auto-fill Quick-Code Banner (Local dev / testing) */}
            {autoOtp && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                <span className="flex items-center gap-1.5 font-medium min-w-0 truncate">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">Auto-fill Code:</span>
                  <strong className="font-mono font-bold text-sm text-primary shrink-0">{autoOtp}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVerifyCode(autoOtp)}
                  className="text-[11px] font-bold h-6 px-2 bg-white hover:bg-emerald-100 border-emerald-300 shrink-0"
                >
                  Auto-fill
                </Button>
              </div>
            )}

            {/* New Customer Name Input */}
            {isNewUser && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs font-bold uppercase tracking-wider text-surface-dark flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary shrink-0" />
                  Your Full Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Aakash Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 rounded-xl text-sm font-medium w-full"
                />
              </div>
            )}

            {/* Unified 4 to 6-Digit Code Input */}
            <div className="space-y-1.5">
              <div className="flex items-center rounded-xl border border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-slate-50 overflow-hidden px-3 h-11">
                <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200 text-sm font-bold text-primary select-none">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-wider">OTP</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Enter OTP"
                  value={verifyCode}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setVerifyCode(clean);
                    if (clean.length === 6) {
                      handleVerifyAndLogin();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && verifyCode.trim().length >= 4) {
                      handleVerifyAndLogin();
                    }
                  }}
                  className="w-full h-full bg-transparent px-3 text-base font-bold font-mono tracking-widest text-surface-dark outline-none placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-center text-muted-foreground pt-0.5">
                Enter the 4-digit or 6-digit code sent to your mobile.
              </p>
            </div>

            {/* 60-Second Cooldown & Resend Timer */}
            <div className="text-center pt-1">
              {countdown > 0 ? (
                <span className="text-xs text-muted-foreground">
                  Resend code in{" "}
                  <span className="font-mono font-bold text-primary">
                    {countdown}s
                  </span>
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="text-xs text-primary hover:text-primary gap-1.5 font-bold"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Resend Code
                </Button>
              )}
            </div>

            {/* Verify CTA Button */}
            <Button
              variant="default"
              className="w-full h-11 rounded-xl font-bold gap-2 shadow-sm text-xs sm:text-sm px-3"
              disabled={verifyCode.trim().length < 4 || isLoading}
              onClick={handleVerifyAndLogin}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 shrink-0" /> <span className="truncate">Verify & Continue</span>
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
