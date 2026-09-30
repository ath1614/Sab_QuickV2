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
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Phone,
  User,
  KeyRound,
  Lock,
  Crown,
  Shield,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [step, setStep] = React.useState<"PHONE" | "OTP" | "OWNER_PIN" | "STAFF_PIN">("PHONE");
  const [phone, setPhone] = React.useState<string>("");
  const [fullName, setFullName] = React.useState<string>("");
  const [isNewUser, setIsNewUser] = React.useState<boolean>(false);
  const [otpDigits, setOtpDigits] = React.useState<string[]>(["", "", "", ""]);
  const [pinValue, setPinValue] = React.useState<string>("");
  const [staffRole, setStaffRole] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [autoOtp, setAutoOtp] = React.useState<string | null>(null);
  const [countdown, setCountdown] = React.useState<number>(0);

  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setStep("PHONE");
      setPhone("");
      setFullName("");
      setIsNewUser(false);
      setOtpDigits(["", "", "", ""]);
      setPinValue("");
      setStaffRole("");
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

      // Check if this account requires Passcode / PIN instead of SMS OTP
      if (data.requirePin) {
        setPinValue("");
        if (data.isOwner) {
          setStep("OWNER_PIN");
          setSuccessMsg("Store Owner detected. Enter your 6-digit passcode.");
        } else {
          setStep("STAFF_PIN");
          setStaffRole(data.role || "STAFF");
          setSuccessMsg(`Staff account [${data.role}] detected. Enter your 4-digit PIN.`);
        }
        return;
      }

      setIsNewUser(Boolean(data.isNewUser));
      setCountdown(data.cooldown || 60);

      // Customer verification path: Direct 4-digit OTP (Zero-Captcha / Instant Verification)
      setOtpDigits(["", "", "", ""]);
      setStep("OTP");

      if (data.freeOtp) {
        setAutoOtp(data.freeOtp);
        setOtpDigits(data.freeOtp.split(""));
        setSuccessMsg("Verification code ready! Click 'Verify & Continue' below.");
      } else {
        setAutoOtp(null);
        setSuccessMsg(data.message || "4-digit verification code dispatched via SMS.");
      }

      // Focus first OTP box
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance
    if (val && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyAndLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const otpCode = otpDigits.join("");
    if (otpCode.length !== 4) {
      setErrorMsg("Please enter the complete 4-digit verification code.");
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
        otp: otpCode,
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

  const handleVerifyPinAndLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPin = pinValue.trim();
    if (step === "OWNER_PIN" && cleanPin.length !== 6) {
      setErrorMsg("Owner Passcode must be exactly 6 digits.");
      return;
    }
    if (step === "STAFF_PIN" && cleanPin.length !== 4) {
      setErrorMsg("Staff PIN must be exactly 4 digits.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await signIn("credentials", {
        phone: phone.trim(),
        pin: cleanPin,
        redirect: false,
      });

      if (res?.error) {
        throw new Error(res.error);
      }

      if (res?.ok) {
        setSuccessMsg("Authenticated successfully! Loading portal...");
        onOpenChange(false);
        if (step === "OWNER_PIN") {
          window.location.href = "/owner";
        } else if (staffRole === "RIDER") {
          window.location.href = "/rider/dashboard";
        } else if (staffRole === "PACKER") {
          window.location.href = "/packer";
        } else if (staffRole === "MANAGER") {
          window.location.href = "/manager";
        } else {
          window.location.reload();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Incorrect passcode or PIN. Access denied.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Detect if running inside Capacitor native mobile app (Android APK)
    const isNative =
      typeof window !== "undefined" &&
      (Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
        Boolean((window as any).Capacitor?.isNative));

    if (isNative) {
      // In native mobile app:
      // Launch external Chrome with /auth/google-start so the entire OAuth handshake,
      // PKCE cookies, and callback reside in Chrome.
      // Chrome will then redirect to /auth/mobile-return -> sabquick://auth-callback
      // which hands the exchange token back to MobileAuthBridge.
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://srv1985371.hstgr.cloud";
      const googleStartUrl = `${appUrl}/auth/google-start`;

      setSuccessMsg(
        "Opening Google Sign-In in browser... Please choose your account and tap 'Open SabQuick App' when prompted."
      );

      const NativeUpi = (window as any).Capacitor?.Plugins?.NativeUpi;
      if (NativeUpi?.launchUpi) {
        NativeUpi.launchUpi({ uri: googleStartUrl }).catch(() => {
          window.open(googleStartUrl, "_system");
        });
      } else {
        window.open(googleStartUrl, "_system");
      }
      return;
    }

    const callbackUrl = window.location.pathname;
    signIn("google", { callbackUrl });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4 sm:p-6 w-full max-w-full overflow-x-hidden box-border">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1 min-w-0">
            <img
              src="/brand/app-icon.png"
              alt="SabQuick"
              className="h-8 w-8 rounded-xl object-contain shadow-xs shrink-0"
            />
            <DialogTitle className="text-lg sm:text-xl font-black text-surface-dark truncate">
              {step === "PHONE"
                ? "Welcome to SabQuick"
                : step === "OWNER_PIN"
                ? "Store Owner Passcode"
                : step === "STAFF_PIN"
                ? `Staff Login (${staffRole})`
                : "Verify Mobile Number"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground break-words">
            {step === "PHONE"
              ? "Sign in or create your customer account for hyper-local grocery delivery."
              : step === "OWNER_PIN"
              ? "Store Owner account (+91 9109066668). Enter your 6-digit Secret Passcode."
              : step === "STAFF_PIN"
              ? `Internal Staff account (+91 ${phone}). Enter your 4-digit Staff PIN.`
              : `Enter the 4-digit verification code sent to +91 ${phone}`}
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
            {/* Phone Number Input (Primary Quick-Commerce Login) */}
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
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Verifying...
                </>
              ) : (
                <>
                  Continue with Mobile <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative flex items-center justify-center py-1">
              <div className="border-t border-border-subtle w-full" />
              <span className="bg-background px-3 text-[11px] uppercase text-muted-foreground font-semibold tracking-wider whitespace-nowrap">
                or continue with
              </span>
              <div className="border-t border-border-subtle w-full" />
            </div>

            {/* Google OAuth Button */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full h-11 flex items-center justify-center gap-3 px-4 border border-slate-200 hover:border-primary/40 hover:bg-slate-50 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs group"
                onClick={handleGoogleLogin}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span className="text-surface-dark font-extrabold truncate">Continue with Google</span>
                </div>
              </Button>
            </div>

            <p className="text-[11px] text-center text-muted-foreground pt-1">
              By proceeding, you agree to SabQuick&apos;s Terms of Service and Privacy Policy.
            </p>
          </div>
        ) : step === "OWNER_PIN" ? (
          <div className="space-y-4 py-2">
            {/* Account Display */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200 gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className="gap-1 bg-amber-500 text-white font-black text-[10px] px-1.5 py-0 shrink-0">
                    <Crown className="w-3 h-3" /> OWNER
                  </Badge>
                  <span className="text-[11px] text-amber-900 font-semibold truncate">Anurag Soni</span>
                </div>
                <span className="font-mono font-bold text-sm text-surface-dark block mt-0.5 truncate">+91 {phone}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("PHONE");
                  setPinValue("");
                  setErrorMsg(null);
                }}
                className="text-xs text-amber-800 font-bold hover:bg-white shrink-0 h-8 px-2"
              >
                Change
              </Button>
            </div>

            {/* 6-Digit Passcode Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-surface-dark flex items-center justify-between flex-wrap gap-1">
                <span className="flex items-center gap-1.5 shrink-0">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" /> 6-Digit Passcode
                </span>
                <span className="text-[10px] text-muted-foreground font-normal shrink-0">Zero-SMS Instant Auth</span>
              </label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pinValue.trim().length === 6) {
                    handleVerifyPinAndLogin();
                  }
                }}
                className="h-13 sm:h-14 text-center text-2xl sm:text-3xl font-black tracking-widest font-mono rounded-xl border-amber-300 focus:border-amber-500 focus:ring-amber-200 w-full max-w-full box-border"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Enter your confidential 6-digit passcode to enter the Owner Command Center.
              </p>
            </div>

            {/* Verify Button */}
            <Button
              variant="default"
              className="w-full h-11 rounded-xl font-bold gap-2 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white shadow-md text-xs sm:text-sm px-3"
              disabled={pinValue.trim().length !== 6 || isLoading}
              onClick={handleVerifyPinAndLogin}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Verifying Passcode...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 shrink-0" /> <span className="truncate">Verify & Enter Owner Portal</span>
                </>
              )}
            </Button>

            {/* Google OAuth Alternative */}
            <div className="pt-1">
              <Button
                variant="outline"
                className="w-full h-auto py-2.5 px-3 rounded-xl text-xs font-semibold gap-1 border-slate-200 hover:bg-slate-50 flex flex-col sm:flex-row items-center justify-center whitespace-normal text-center"
                onClick={handleGoogleLogin}
              >
                <span>Sign in with Google</span>
                <span className="text-[11px] text-muted-foreground font-normal truncate max-w-[210px] sm:max-w-none">
                  (sabsupermart68@gmail.com)
                </span>
              </Button>
            </div>
          </div>
        ) : step === "STAFF_PIN" ? (
          <div className="space-y-4 py-2">
            {/* Staff Account Display */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200 gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className="bg-blue-600 text-white font-black text-[10px] px-1.5 py-0 shrink-0">
                    <Shield className="w-3 h-3" /> {staffRole}
                  </Badge>
                  <span className="text-[11px] text-blue-900 font-semibold truncate">Store Operations</span>
                </div>
                <span className="font-mono font-bold text-sm text-surface-dark block mt-0.5 truncate">+91 {phone}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("PHONE");
                  setPinValue("");
                  setErrorMsg(null);
                }}
                className="text-xs text-blue-800 font-bold hover:bg-white shrink-0 h-8 px-2"
              >
                Change
              </Button>
            </div>

            {/* 4-Digit Staff PIN Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-surface-dark flex items-center justify-between flex-wrap gap-1">
                <span className="flex items-center gap-1.5 shrink-0">
                  <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" /> 4-Digit Staff PIN
                </span>
                <span className="text-[10px] text-muted-foreground font-normal shrink-0">Fast Shift Clock-In</span>
              </label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pinValue.trim().length === 4) {
                    handleVerifyPinAndLogin();
                  }
                }}
                className="h-13 sm:h-14 text-center text-2xl sm:text-3xl font-black tracking-widest font-mono rounded-xl border-blue-300 focus:border-blue-500 focus:ring-blue-200 w-full max-w-full box-border"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Enter your 4-digit staff shift PIN assigned by the store owner.
              </p>
            </div>

            {/* Clock In Button */}
            <Button
              variant="default"
              className="w-full h-11 rounded-xl font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md text-xs sm:text-sm px-3"
              disabled={pinValue.trim().length !== 4 || isLoading}
              onClick={handleVerifyPinAndLogin}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Verifying Shift PIN...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 shrink-0" /> <span className="truncate">Clock In & Open Staff Portal</span>
                </>
              )}
            </Button>
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
                onClick={() => setStep("PHONE")}
                className="text-xs text-primary font-bold hover:bg-white shrink-0 h-8 px-2"
              >
                Change
              </Button>
            </div>

            {/* Free Quick-Code Banner */}
            {autoOtp && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                <span className="flex items-center gap-1.5 font-medium min-w-0 truncate">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">Free Quick Code:</span>
                  <strong className="font-mono font-bold text-sm text-primary shrink-0">{autoOtp}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOtpDigits(autoOtp.split(""))}
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

            {/* Numeric OTP Inputs (4-Digit Code) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-surface-dark text-center block">
                Enter 4-Digit Code
              </label>
              <div className="flex justify-center gap-2 sm:gap-2.5 max-w-full">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    size={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-10 sm:w-11 h-12 sm:h-14 text-center text-xl sm:text-2xl font-black font-mono rounded-xl border border-border-subtle bg-slate-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                  />
                ))}
              </div>
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
              disabled={otpDigits.join("").length !== 4 || isLoading}
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

