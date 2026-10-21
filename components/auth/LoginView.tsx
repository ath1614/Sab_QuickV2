"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  CheckCircle2,
  Phone,
  User,
  ShoppingBag,
  Sparkle,
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
  const [otpDigits, setOtpDigits] = React.useState<string[]>(["", "", "", ""]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [autoOtp, setAutoOtp] = React.useState<string | null>(null);
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
        setAutoOtp(data.freeOtp);
        setVerifyCode(data.freeOtp);
        setSuccessMsg("Verification code ready! Click 'Verify Code' below.");
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
          }, 400);
        } else {
          // Returning user or reviewer: complete immediately
          setSuccessMsg("Authenticated successfully! Loading your store...");
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

      setSuccessMsg(`Welcome to SABQuick, ${cleanName}! Loading store...`);
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update name. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-linear-to-b from-emerald-50/60 via-white to-slate-50 flex flex-col justify-between items-center px-4 py-8 sm:py-12 select-none overflow-y-auto">
      {/* Top Banner / Delivery Pill */}
      <div className="w-full max-w-md flex flex-col items-center text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200/60 text-emerald-800 text-xs font-bold tracking-wide shadow-xs animate-in fade-in duration-500">
          <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
          <span>India&apos;s Last-Minute Grocery App</span>
        </div>

        {/* Brand Icon & Title */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-center">
            <div className="relative">
              <img
                src={BRAND_ASSETS.appIcon}
                alt="SABQuick"
                className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-contain shadow-md shadow-emerald-900/10 border border-emerald-100"
              />
              <span className="absolute -bottom-2 -right-2 bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> 10m
              </span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-surface-dark tracking-tight">
            SABQuick
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-xs mx-auto">
            Fresh groceries, dairy &amp; daily essentials delivered to your doorstep in 10 minutes.
          </p>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/70 border border-slate-100 space-y-5 my-6">
        {/* ============================================================ */}
        {/* STEP 1: MOBILE NUMBER INPUT                                  */}
        {/* ============================================================ */}
        {step === "PHONE" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-black text-surface-dark">
                Get started
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter your mobile number for instant doorstep verification.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            {/* Mobile Number Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-dark flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" /> Mobile Number
              </label>
              <div className="flex items-center rounded-2xl border-2 border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all bg-slate-50/60 overflow-hidden px-3.5 h-13">
                <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200 text-sm font-bold text-surface-dark">
                  <span className="text-base">🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="Enter 10-digit number"
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
            </div>

            {/* Continue CTA */}
            <Button
              variant="default"
              className="w-full h-12 rounded-2xl font-black text-sm tracking-wide gap-2 shadow-md shadow-emerald-900/15"
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
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: OTP VERIFICATION                                     */}
        {/* ============================================================ */}
        {step === "OTP" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header with phone & Change action */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">Verification Code For</span>
                <span className="font-mono font-black text-sm text-surface-dark">+91 {phone}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("PHONE");
                  setVerifyCode("");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-primary font-bold hover:text-primary hover:bg-emerald-50 rounded-xl"
              >
                Change
              </Button>
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

            {/* Segmented 6-digit OTP Inputs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-surface-dark block text-center">
                Enter Verification Code
              </label>
              <OtpInput
                value={verifyCode}
                onChange={setVerifyCode}
                length={6}
                disabled={isLoading}
                autoFocus
                onComplete={(code) => {
                  handleVerifyOtp(code);
                }}
              />
              <p className="text-[11px] text-center text-muted-foreground">
                Enter the code sent to your mobile.
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
              className="w-full h-12 rounded-2xl font-black text-sm tracking-wide gap-2 shadow-md shadow-emerald-900/15"
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
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100/70 border border-emerald-200/60 flex items-center justify-center mx-auto text-emerald-700 shadow-xs">
                <Sparkles className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-surface-dark">
                Welcome to SABQuick!
              </h2>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                What should we call you? Enter your name to personalize your orders and doorstep delivery.
              </p>
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
                className="h-13 rounded-2xl font-bold text-base px-4 border-2 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-slate-50/60"
                autoFocus
              />
            </div>

            {/* Submit Name & Start Shopping */}
            <Button
              variant="default"
              className="w-full h-12 rounded-2xl font-black text-sm tracking-wide gap-2 shadow-md shadow-emerald-900/15"
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

        {/* Optional Explore as Guest (only shown on Phone step) */}
        {step === "PHONE" && onExploreAsGuest && (
          <div className="pt-2 text-center border-t border-slate-100">
            <button
              type="button"
              onClick={onExploreAsGuest}
              className="text-xs font-bold text-slate-500 hover:text-primary transition-colors py-1 inline-flex items-center gap-1"
            >
              <span>Explore store as guest</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Footer / Trust Badges */}
      <div className="w-full max-w-md text-center space-y-2">
        <div className="flex items-center justify-center gap-6 text-[11px] text-slate-500 font-semibold">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Secure
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-600" /> 10-Min Fast
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Best Quality
          </span>
        </div>
        <p className="text-[10px] text-slate-400">
          By proceeding, you agree to SABQuick&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
