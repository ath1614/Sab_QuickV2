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
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { signInWithPhoneNumber, ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

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
  const [isFirebaseOtp, setIsFirebaseOtp] = React.useState<boolean>(false);
  const [pinValue, setPinValue] = React.useState<string>("");
  const [staffRole, setStaffRole] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [autoOtp, setAutoOtp] = React.useState<string | null>(null);
  const [countdown, setCountdown] = React.useState<number>(0);

  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const confirmationResultRef = React.useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = React.useRef<RecaptchaVerifier | null>(null);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setStep("PHONE");
      setPhone("");
      setFullName("");
      setIsNewUser(false);
      setOtpDigits(["", "", "", ""]);
      setIsFirebaseOtp(false);
      setPinValue("");
      setStaffRole("");
      setAutoOtp(null);
      setErrorMsg(null);
      setSuccessMsg(null);
      setCountdown(0);
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          // ignore cleanup errors
        }
        recaptchaVerifierRef.current = null;
      }
      confirmationResultRef.current = null;
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
          setSuccessMsg("👑 Store Owner detected. Enter your 6-digit passcode.");
        } else {
          setStep("STAFF_PIN");
          setStaffRole(data.role || "STAFF");
          setSuccessMsg(`🛡️ Staff account [${data.role}] detected. Enter your 4-digit PIN.`);
        }
        return;
      }

      setIsNewUser(Boolean(data.isNewUser));
      setCountdown(data.cooldown || 60);

      // Customer verification path: Firebase Phone Auth (10,000 Free Real SMS/Month)
      if (data.useFirebase) {
        setIsFirebaseOtp(true);
        setOtpDigits(["", "", "", "", "", ""]);
        setStep("OTP");

        try {
          const auth = getFirebaseAuth();
          if (recaptchaVerifierRef.current) {
            try {
              recaptchaVerifierRef.current.clear();
            } catch (e) {
              // ignore
            }
            recaptchaVerifierRef.current = null;
          }

          const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
          });
          recaptchaVerifierRef.current = verifier;

          const confirmation = await signInWithPhoneNumber(auth, `+91${cleanPhone}`, verifier);
          confirmationResultRef.current = confirmation;
          setSuccessMsg(`📲 6-digit SMS verification code dispatched to +91 ${cleanPhone}`);
        } catch (fbErr: any) {
          console.error("[Firebase Send Error]:", fbErr);
          throw new Error(fbErr.message || "Failed to dispatch Firebase SMS. Please try again.");
        }
      } else {
        // Fallback OTP for Dev / Staging / CI tests
        setIsFirebaseOtp(false);
        setOtpDigits(["", "", "", ""]);
        setStep("OTP");

        if (data.freeOtp) {
          setAutoOtp(data.freeOtp);
          setOtpDigits(data.freeOtp.split(""));
          setSuccessMsg("⚡ Quick-Login Code ready! Click 'Verify & Continue' below.");
        } else {
          setAutoOtp(null);
          setSuccessMsg("Verification code dispatched via SMS.");
        }
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
    const maxIdx = otpDigits.length - 1;
    if (val && index < maxIdx) {
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
    const requiredLen = isFirebaseOtp ? 6 : 4;
    if (otpCode.length !== requiredLen) {
      setErrorMsg(`Please enter the complete ${requiredLen}-digit verification code.`);
      return;
    }

    if (isNewUser && !fullName.trim()) {
      setErrorMsg("Please enter your full name to complete registration.");
      return;
    }

    try {
      setIsLoading(true);

      let idToken: string | undefined;

      // If Firebase Phone Auth was used, confirm code with Firebase client
      if (isFirebaseOtp && confirmationResultRef.current) {
        const userCredential = await confirmationResultRef.current.confirm(otpCode);
        idToken = await userCredential.user.getIdToken();
      }

      const res = await signIn("credentials", {
        phone: phone.trim(),
        otp: !idToken ? otpCode : undefined,
        idToken: idToken || undefined,
        name: fullName.trim() || undefined,
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
    signIn("google", { callbackUrl: window.location.pathname });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <Logo variant="icon" size={32} className="rounded-lg shadow-sm shrink-0" />
            <DialogTitle className="text-xl font-black text-surface-dark">
              {step === "PHONE"
                ? "Welcome to SabQuick"
                : step === "OWNER_PIN"
                ? "Store Owner Passcode"
                : step === "STAFF_PIN"
                ? `Staff Shift Login (${staffRole})`
                : "Verify Mobile Number"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === "PHONE"
              ? "Sign in or create your customer account for hyper-local 10-15 minute grocery delivery."
              : step === "OWNER_PIN"
              ? "Store Owner account (+91 9109066668). Enter your 6-digit Secret Passcode."
              : step === "STAFF_PIN"
              ? `Internal Staff account (+91 ${phone}). Enter your 4-digit Staff PIN.`
              : `Enter the ${isFirebaseOtp ? "6-digit SMS" : "4-digit"} code sent to +91 ${phone}`}
          </DialogDescription>
        </DialogHeader>

        {/* Invisible Google reCAPTCHA Container for Firebase Phone Auth */}
        <div id="recaptcha-container" />

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === "PHONE" ? (
          <div className="space-y-4 py-2">
            {/* Google OAuth Hero Button (Option 1: Recommended, Instant & 100% Free) */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full h-12 relative flex items-center justify-between px-4 border-2 border-primary/20 hover:border-primary/50 hover:bg-emerald-50/40 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm group"
                onClick={handleGoogleLogin}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                  <span className="text-surface-dark font-extrabold">Continue with Google</span>
                </div>
                <Badge variant="accent" className="text-[10px] uppercase font-black px-2 py-0.5 tracking-wider">
                  ⚡ Instant Login
                </Badge>
              </Button>
              <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Recommended • 100% Free • Unlimited</span>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center py-1">
              <div className="border-t border-border-subtle w-full" />
              <span className="bg-background px-3 text-[11px] uppercase text-muted-foreground font-semibold tracking-wider whitespace-nowrap">
                or sign in with mobile
              </span>
              <div className="border-t border-border-subtle w-full" />
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-surface-dark flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" />
                Mobile Number
              </label>
              <div className="flex items-center gap-2">
                <div className="h-11 px-3 bg-slate-100 border border-border-subtle rounded-xl flex items-center gap-1.5 text-xs font-bold text-surface-dark select-none">
                  <span>🇮🇳</span>
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
                  className="h-11 rounded-xl text-base tracking-wider font-semibold font-mono"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Free verification code will be generated for fast checkout.
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
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Continue with Mobile <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <p className="text-[11px] text-center text-muted-foreground pt-1">
              By proceeding, you agree to SabQuick&apos;s Terms of Service and Privacy Policy.
            </p>
          </div>
        ) : step === "OWNER_PIN" ? (
          <div className="space-y-4 py-2">
            {/* Account Display */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200">
              <div>
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-amber-500 text-white font-black text-[10px] px-1.5 py-0">👑 OWNER</Badge>
                  <span className="text-[11px] text-amber-900 font-semibold">Anurag Soni</span>
                </div>
                <span className="font-mono font-bold text-sm text-surface-dark block mt-0.5">+91 {phone}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("PHONE");
                  setPinValue("");
                  setErrorMsg(null);
                }}
                className="text-xs text-amber-800 font-bold hover:bg-white"
              >
                Change
              </Button>
            </div>

            {/* 6-Digit Passcode Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-surface-dark flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" /> 6-Digit Owner Passcode
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">Zero-SMS Instant Auth</span>
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
                className="h-14 text-center text-3xl font-black tracking-widest font-mono rounded-xl border-amber-300 focus:border-amber-500 focus:ring-amber-200"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Enter your confidential 6-digit passcode to enter the Owner Command Center.
              </p>
            </div>

            {/* Verify Button */}
            <Button
              variant="default"
              className="w-full h-11 rounded-xl font-bold gap-2 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white shadow-md"
              disabled={pinValue.trim().length !== 6 || isLoading}
              onClick={handleVerifyPinAndLogin}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Passcode...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Verify & Enter Owner Portal
                </>
              )}
            </Button>

            {/* Google OAuth Alternative */}
            <div className="pt-1">
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl text-xs font-semibold gap-2 border-slate-200 hover:bg-slate-50"
                onClick={handleGoogleLogin}
              >
                <span>Or sign in with Google (sabsupermart68@gmail.com)</span>
              </Button>
            </div>
          </div>
        ) : step === "STAFF_PIN" ? (
          <div className="space-y-4 py-2">
            {/* Staff Account Display */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200">
              <div>
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-blue-600 text-white font-black text-[10px] px-1.5 py-0">
                    🛡️ {staffRole}
                  </Badge>
                  <span className="text-[11px] text-blue-900 font-semibold">Store Operations</span>
                </div>
                <span className="font-mono font-bold text-sm text-surface-dark block mt-0.5">+91 {phone}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("PHONE");
                  setPinValue("");
                  setErrorMsg(null);
                }}
                className="text-xs text-blue-800 font-bold hover:bg-white"
              >
                Change
              </Button>
            </div>

            {/* 4-Digit Staff PIN Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-surface-dark flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" /> 4-Digit Staff PIN
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">Fast Shift Clock-In</span>
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
                className="h-14 text-center text-3xl font-black tracking-widest font-mono rounded-xl border-blue-300 focus:border-blue-500 focus:ring-blue-200"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Enter your 4-digit staff shift PIN assigned by the store owner.
              </p>
            </div>

            {/* Clock In Button */}
            <Button
              variant="default"
              className="w-full h-11 rounded-xl font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              disabled={pinValue.trim().length !== 4 || isLoading}
              onClick={handleVerifyPinAndLogin}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Shift PIN...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Clock In & Open Staff Portal
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Number Display & Change Action */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-border-subtle">
              <div>
                <span className="text-[11px] text-muted-foreground block">Verification Code For</span>
                <span className="font-mono font-bold text-sm text-surface-dark">+91 {phone}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("PHONE")}
                className="text-xs text-primary font-bold hover:bg-white"
              >
                Change
              </Button>
            </div>

            {/* Free Quick-Code Banner */}
            {autoOtp && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Free Quick Code: <strong className="font-mono font-bold text-sm text-primary">{autoOtp}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOtpDigits(autoOtp.split(""))}
                  className="text-[11px] font-bold h-6 px-2 bg-white hover:bg-emerald-100 border-emerald-300"
                >
                  Auto-fill
                </Button>
              </div>
            )}

            {/* New Customer Name Input */}
            {isNewUser && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs font-bold uppercase tracking-wider text-surface-dark flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Your Full Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Aakash Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 rounded-xl text-sm font-medium"
                />
              </div>
            )}

            {/* Numeric OTP Inputs (4-digit fallback or 6-digit Firebase SMS) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-surface-dark text-center block">
                Enter {isFirebaseOtp ? "6-Digit SMS Code" : "4-Digit Code"}
              </label>
              <div className="flex justify-center gap-2 sm:gap-2.5">
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
              className="w-full h-11 rounded-xl font-bold gap-2 shadow-sm"
              disabled={otpDigits.join("").length !== (isFirebaseOtp ? 6 : 4) || isLoading}
              onClick={handleVerifyAndLogin}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Verify & Continue
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

