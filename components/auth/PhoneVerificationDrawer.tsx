"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  PhoneCall,
  ShieldCheck,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface PhoneVerificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhone?: string | null;
}

export function PhoneVerificationDrawer({
  open,
  onOpenChange,
  initialPhone = "",
}: PhoneVerificationDrawerProps) {
  const { data: session, update: updateSession } = useSession();

  const [step, setStep] = React.useState<"PHONE" | "OTP">("PHONE");
  const [phone, setPhone] = React.useState<string>(initialPhone || "");
  const [otpDigits, setOtpDigits] = React.useState<string[]>(["", "", "", ""]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [autoOtp, setAutoOtp] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [countdown, setCountdown] = React.useState<number>(0);

  // References for 4 OTP inputs to auto-focus next
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  React.useEffect(() => {
    if (initialPhone && !phone) {
      setPhone(initialPhone);
    }
  }, [initialPhone, phone]);

  // Countdown timer effect
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSavePhoneDirect = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPhone = phone.trim();
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number starting with 6-9.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/phone/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save contact number.");
      }

      setSuccessMsg("Delivery contact number verified & linked successfully!");
      await updateSession();

      setTimeout(() => {
        onOpenChange(false);
        window.location.reload();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save contact number.");
    } finally {
      setIsLoading(false);
    }
  };

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
        throw new Error(data.error || "Failed to send OTP");
      }

      setStep("OTP");
      setCountdown(data.cooldown || 30);

      if (data.freeOtp) {
        setAutoOtp(data.freeOtp);
        setOtpDigits(data.freeOtp.split(""));
        setSuccessMsg("Quick-Code ready! Click 'Verify & Activate Account' below.");
      } else {
        setAutoOtp(null);
        setSuccessMsg("OTP sent! Please check your mobile messages.");
      }

      // Focus first OTP input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send OTP. Please try again.");
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

  const handleVerifyOtp = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const code = otpDigits.join("");
    if (code.length !== 4) {
      setErrorMsg("Please enter the complete 4-digit OTP.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          otp: code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setSuccessMsg("Phone number verified successfully! Refreshing session...");
      await updateSession();

      setTimeout(() => {
        onOpenChange(false);
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid OTP entered.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full flex flex-col justify-between">
        <SheetHeader>
          <div className="flex items-center gap-2.5">
            <img
              src="/brand/app-icon.png"
              alt="SabQuick"
              className="h-9 w-9 rounded-xl object-contain shadow-xs shrink-0"
            />
            <div>
              <SheetTitle className="text-lg">Mobile Number Verification</SheetTitle>
              <Badge variant="accent" className="text-[10px] mt-0.5">
                Required for 10-15 Min Delivery
              </Badge>
            </div>
          </div>
          <SheetDescription className="text-xs pt-1">
            SabQuick riders require an authenticated mobile number to share live delivery OTPs and dispatch updates within your 2.5 km geofence.
          </SheetDescription>
        </SheetHeader>

        {/* Content Body */}
        <div className="flex-1 py-6 space-y-6">
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
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  10-Digit Delivery Mobile Number
                </label>
                <div className="flex items-center gap-2">
                  <div className="h-11 px-3 bg-slate-100 border border-border-subtle rounded-xl flex items-center text-xs font-bold text-surface-dark select-none">
                    <span>+91</span>
                  </div>
                  <Input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="h-11 rounded-xl text-base tracking-wider font-semibold font-mono"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Used exclusively by delivery riders to coordinate 10-15 min drop-off.
                </p>
              </div>

              {/* Primary Direct Save (Recommended: 100% Free & Instant for Google/Customer accounts) */}
              <Button
                variant="default"
                className="w-full h-11 rounded-xl gap-2 font-bold shadow-sm"
                disabled={phone.trim().length !== 10 || isLoading}
                onClick={handleSavePhoneDirect}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Contact...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Save Contact Number
                  </>
                )}
              </Button>

              {/* Secondary Option: Verify via OTP code */}
              <div className="relative flex items-center justify-center py-1">
                <div className="border-t border-border-subtle w-full" />
                <span className="bg-background px-3 text-[10px] uppercase text-muted-foreground font-semibold tracking-wider whitespace-nowrap">
                  or verify via code
                </span>
                <div className="border-t border-border-subtle w-full" />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 rounded-xl text-xs font-medium border-border-subtle hover:bg-slate-50"
                disabled={phone.trim().length !== 10 || isLoading}
                onClick={handleSendOtp}
              >
                Send 4-Digit Verification Code
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground">Verifying number</span>
                  <div className="font-mono font-bold text-sm text-surface-dark">
                    +91 {phone}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("PHONE")}
                  className="text-xs text-primary underline p-0 h-auto"
                >
                  Change
                </Button>
              </div>

              {/* Free Quick-Code Banner */}
              {autoOtp && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    Free Code: <strong className="font-mono font-bold text-sm text-primary">{autoOtp}</strong>
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

              {/* 4 Numeric OTP Input Boxes */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center block">
                  Enter 4-Digit OTP Code
                </label>
                <div className="flex justify-center gap-3">
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
                      className="w-12 h-14 sm:w-14 sm:h-16 shrink-0 text-center text-2xl font-black font-mono rounded-xl border border-border-subtle bg-slate-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                    />
                  ))}
                </div>
              </div>

              {/* Countdown & Resend */}
              <div className="text-center pt-2">
                {countdown > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Resend OTP in{" "}
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
                    className="text-xs text-primary hover:text-primary gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Resend OTP Code
                  </Button>
                )}
              </div>

              <Button
                variant="accent"
                className="w-full h-11 rounded-xl font-bold gap-2 text-surface-dark shadow-sm"
                disabled={otpDigits.join("").length !== 4 || isLoading}
                onClick={handleVerifyOtp}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Verify & Activate Account
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <div className="w-full text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Protected by SabQuick Hyper-Local Redis & PostgreSQL Security
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
