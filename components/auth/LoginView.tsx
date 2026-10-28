"use client";

import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  Zap,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  RotateCw,
  AlertCircle,
  Loader2,
  Sparkles,
  CheckCircle2,
  Phone,
  User,
} from "lucide-react";
import { BRAND_ASSETS } from "@/lib/assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/auth/OtpInput";
import { useAuthModalStore } from "@/store/useAuthModalStore";

interface LoginViewProps {
  onSuccess?: () => void;
  onExploreAsGuest?: () => void;
}

export function LoginView({ onSuccess, onExploreAsGuest }: LoginViewProps) {
  const { setIsLoginScreenActive } = useAuthModalStore();

  React.useEffect(() => {
    setIsLoginScreenActive(true);
    return () => {
      setIsLoginScreenActive(false);
    };
  }, [setIsLoginScreenActive]);

  const [step, setStep] = React.useState<"PHONE" | "OTP" | "NAME">("PHONE");
  const [phone, setPhone] = React.useState<string>("");
  const [fullName, setFullName] = React.useState<string>("");
  const [isNewUser, setIsNewUser] = React.useState<boolean>(false);
  const [verifyCode, setVerifyCode] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [countdown, setCountdown] = React.useState<number>(0);

  // Countdown timer effect for OTP resend
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Step 1: Send OTP to Phone
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
      setStep("OTP");

      if (data.freeOtp) {
        setVerifyCode(data.freeOtp);
        setSuccessMsg("Verification code ready! Click 'Verify Code' below.");
      } else {
        setSuccessMsg(data.message || "Verification code sent to your mobile phone.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCode = (codeToVerify || verifyCode).trim();
    if (cleanCode.length < 4 || cleanCode.length > 6) {
      setErrorMsg("Please enter the complete verification code.");
      return;
    }

    try {
      setIsLoading(true);

      const res = await signIn("credentials", {
        phone: phone.trim(),
        pin: cleanCode,
        otp: cleanCode,
        redirect: false,
      });

      if (res?.error) {
        throw new Error(res.error);
      }

      if (res?.ok) {
        // If this is a newly registered customer, transition smoothly to Step 3: Name
        if (isNewUser) {
          setSuccessMsg("Mobile verified successfully!");
          setTimeout(() => {
            setErrorMsg(null);
            setSuccessMsg(null);
            setStep("NAME");
          }, 350);
        } else {
          // Returning user or reviewer: complete immediately
          setSuccessMsg("Authenticated successfully! Loading store...");
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.reload();
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Save Name for New User
  const handleSaveNameAndProceed = async () => {
    setErrorMsg(null);
    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg("Please enter your name (at least 2 characters) to continue.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile name");
      }

      setSuccessMsg(`Welcome, ${cleanName}! Loading store...`);
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update name. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 flex flex-col select-none overflow-hidden">
      {/* Pinned Top Safe-Area Header: Pinned to shield notch & dynamic island with frosted glass */}
      <header className="sticky top-0 z-30 w-full pt-[max(env(safe-area-inset-top,0px),12px)] pb-2 px-4 bg-emerald-50/80 backdrop-blur-md border-b border-emerald-100/50 flex justify-center shrink-0">
        <div className="w-full max-w-sm sm:max-w-md flex items-center justify-between h-9">
          {step !== "PHONE" ? (
            <button
              type="button"
              onClick={() => {
                setStep("PHONE");
                setVerifyCode("");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              aria-label="Go Back"
              className="w-9 h-9 rounded-full bg-white/95 border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-700 hover:text-surface-dark hover:bg-slate-50 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}

          {/* Minimalist Top-Right "Skip" Button (Blinkit & Zepto parity) */}
          {step === "PHONE" && onExploreAsGuest ? (
            <button
              type="button"
              onClick={onExploreAsGuest}
              className="px-4 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xs text-xs font-bold text-slate-700 hover:text-primary hover:border-primary/40 active:scale-95 transition-all"
            >
              Skip
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}
        </div>
      </header>

      {/* Scrollable Form Body: Glides cleanly under the blurred safe header */}
      {/* Centred as one group on iPad/desktop instead of hero-at-top /
          form-pinned-to-bottom, which left a dead half-screen on tablets. */}
      <div className="flex-1 w-full overflow-y-auto overscroll-contain flex flex-col items-center gap-4 sm:gap-6 px-4 py-3 pb-[max(env(safe-area-inset-bottom,0px),16px)]">
        {/* Hero Section — Minimal, No Duplicate "SABQuick" text.
            mt-auto / mb-auto on hero + card centre the pair when there is room
            and collapse to 0 when the keyboard makes the content scroll, so
            nothing can be pushed above the scroll origin. */}
        <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center text-center py-1 mt-auto">
          <div className="relative mb-3">
            <img
              src={BRAND_ASSETS.appIcon}
              alt="SABQuick"
              data-boot-logo="login"
              className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-contain shadow-lg shadow-emerald-950/10 border border-emerald-100/80 bg-white"
            />
          </div>

          {/* Single punchy headline — no delivery-time promise */}
          <h1 className="text-2xl sm:text-3xl font-black text-surface-dark tracking-tight">
            Sab kuch, ek tap mein
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
            Fresh groceries &amp; daily essentials from our Ambikapur store.
          </p>
        </div>

        {/* Form Container Card */}
        <div className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-200/80 border border-slate-100 space-y-4 mb-auto">
        {/* ============================================================ */}
        {/* STEP 1: MOBILE NUMBER INPUT                                  */}
        {/* ============================================================ */}
        {step === "PHONE" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-0.5">
              <h2 className="text-lg sm:text-xl font-black text-surface-dark tracking-tight">
                Log In or Sign Up
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter your mobile number for instant verification.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            {/* Clean Mobile Number Input Box (Blinkit / Zepto format) */}
            <div className="flex items-center rounded-2xl border-2 border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all bg-slate-50/70 overflow-hidden px-3.5 h-12">
              <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200 text-sm font-bold text-surface-dark select-none">
                <span className="text-base">🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="Mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && phone.trim().length === 10) {
                    handleSendOtp();
                  }
                }}
                className="w-full h-full bg-transparent px-3 text-base font-bold font-mono tracking-wider text-surface-dark outline-none placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal"
                autoFocus
              />
            </div>

            {/* Continue Button */}
            <Button
              variant="default"
              className="w-full h-12 rounded-2xl font-black text-sm tracking-wide gap-2 shadow-md shadow-emerald-950/15"
              disabled={phone.trim().length !== 10 || isLoading}
              onClick={handleSendOtp}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Sending Code...
                </>
              ) : (
                <>
                  Continue <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: OTP VERIFICATION                                     */}
        {/* ============================================================ */}
        {step === "OTP" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-surface-dark tracking-tight">
                  Verify Mobile
                </h2>
                <p className="text-xs text-muted-foreground">
                  Code sent to <span className="font-mono font-bold text-surface-dark">+91 {phone}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("PHONE");
                  setVerifyCode("");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-primary font-bold hover:underline"
              >
                Change
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="flex-1">{successMsg}</span>
              </div>
            )}

            {/* Clean OTP Input Field (Matching Phone Input Style) */}
            <div className="space-y-1.5">
              <div className="flex items-center rounded-2xl border-2 border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all bg-slate-50/70 overflow-hidden px-3.5 h-12">
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
                      handleVerifyOtp(clean);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && verifyCode.trim().length >= 4) {
                      handleVerifyOtp();
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

            {/* 60s Resend Timer */}
            <div className="text-center pt-0.5">
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
              className="w-full h-12 rounded-2xl font-black text-sm tracking-wide gap-2 shadow-md shadow-emerald-950/15"
              disabled={verifyCode.trim().length < 4 || isLoading}
              onClick={() => handleVerifyOtp()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 shrink-0" /> Verify Code
                </>
              )}
            </Button>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: NAME PROMPT (NEW USER REGISTRATION)                   */}
        {/* ============================================================ */}
        {step === "NAME" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-black text-surface-dark tracking-tight">
                Welcome to SABQuick!
              </h2>
              <p className="text-xs text-muted-foreground">
                What should we call you? Enter your name to complete your profile.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-dark flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" /> Full Name
              </label>
              <Input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && fullName.trim().length >= 2) {
                    handleSaveNameAndProceed();
                  }
                }}
                className="h-12 rounded-2xl font-bold text-base px-4 border-2 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-slate-50/70"
                autoFocus
              />
            </div>

            {/* Submit Name & Start Shopping */}
            <Button
              variant="default"
              className="w-full h-12 rounded-2xl font-black text-sm tracking-wide gap-2 shadow-md shadow-emerald-950/15"
              disabled={fullName.trim().length < 2 || isLoading}
              onClick={handleSaveNameAndProceed}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Setting up your account...
                </>
              ) : (
                <>
                  Start Shopping <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Minimal Legal Footer — both policies are tappable */}
        <p className="text-[11px] text-center text-slate-400 pt-1 leading-relaxed">
          By continuing, you agree to our{" "}
          <Link
            href="/terms"
            className="inline-block whitespace-nowrap font-semibold text-slate-600 underline underline-offset-2 decoration-slate-300 hover:text-primary hover:decoration-primary/50 transition-colors"
          >
            Terms of Service
          </Link>{" "}
          &amp;{" "}
          <Link
            href="/privacy"
            className="inline-block whitespace-nowrap font-semibold text-slate-600 underline underline-offset-2 decoration-slate-300 hover:text-primary hover:decoration-primary/50 transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {/* Safe Area Spacer */}
      <div className="w-full h-2" />
    </div>
  </div>
);
}
