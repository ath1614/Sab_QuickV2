"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bike,
  CheckCircle2,
  ShieldCheck,
  Zap,
  TrendingUp,
  Clock,
  MapPin,
  Smartphone,
  User,
  CreditCard,
  Phone,
  AlertCircle,
  Loader2,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/Logo";

export default function RiderApplyPage() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [city, setCity] = React.useState("Bareilly");
  const [vehicleType, setVehicleType] = React.useState("Bike / Motorcycle");
  const [licenseNumber, setLicenseNumber] = React.useState("");
  const [emergencyPhone, setEmergencyPhone] = React.useState("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successResult, setSuccessResult] = React.useState<{
    status: string;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/rider/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          city: city.trim(),
          vehicleType,
          licenseNumber: licenseNumber.trim() || undefined,
          emergencyPhone: emergencyPhone.replace(/\D/g, "") || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application.");
      }

      setSuccessResult({
        status: data.status,
        message: data.message,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Header with Safe Area Notch Protection */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3.5 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-7 w-auto" />
          </Link>
          <span className="hidden sm:inline-block text-slate-500">|</span>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            Fleet Partner
          </span>
        </div>

        <Link
          href="/"
          className="text-xs font-bold text-slate-300 hover:text-white transition-colors"
        >
          Customer Store &rarr;
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-xl w-full mx-auto p-4 sm:p-6 my-4 space-y-6 flex-1">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-[11px] font-bold px-3 py-1 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Now Hiring Express Delivery Partners
          </Badge>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-display">
            Earn <span className="text-emerald-400">₹30</span> per Delivery
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Deliver groceries in your local neighborhood superfast. Get guaranteed payout per order, instant doorstep settlement, and 100% customer tips.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">₹30 / Order</h4>
              <p className="text-[11px] text-slate-400">Flat guaranteed pay on every completed drop.</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-950 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">&lt; 3.5 km Radius</h4>
              <p className="text-[11px] text-slate-400">Short local trips, quick turnaround time.</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Flexible Shifts</h4>
              <p className="text-[11px] text-slate-400">Toggle shift online/offline whenever you want.</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-950 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">100% Tips</h4>
              <p className="text-[11px] text-slate-400">All customer tips belong completely to you.</p>
            </div>
          </div>
        </div>

        {/* Application Card */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl">
          {successResult ? (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-white">Application Received!</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {successResult.message}
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Applicant Phone</span>
                  <span className="font-mono text-white font-bold">+91 {phone}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Assigned Hub</span>
                  <span className="text-emerald-400 font-bold">{city} Express Hub</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Review Status</span>
                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40 bg-amber-950/30">
                    PENDING APPROVAL
                  </Badge>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/">
                  <Button className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5">
                    Return to Home Store
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="pb-1 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Bike className="w-4 h-4 text-emerald-400" />
                    Rider Application Form
                  </h3>
                  <p className="text-[11px] text-slate-400">Takes less than 1 minute to submit</p>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                  Step 1 of 1
                </Badge>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <Input
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 pl-9 bg-slate-950 border-slate-700 focus:border-emerald-400 rounded-xl text-white text-base lg:text-xs"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  WhatsApp / Mobile Number *
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <Input
                    required
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="h-10 pl-9 bg-slate-950 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-mono text-base lg:text-xs"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  You will use this number to receive login OTPs once approved.
                </span>
              </div>

              {/* City / Hub & Vehicle Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    City / Operating Area *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Bareilly"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-10 bg-slate-950 border-slate-700 focus:border-emerald-400 rounded-xl text-white text-base lg:text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    Vehicle Type *
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full h-10 rounded-xl bg-slate-950 border border-slate-700 px-2.5 text-base lg:text-xs text-white font-medium focus:outline-none focus:border-emerald-400"
                  >
                    <option value="Bike / Motorcycle">Bike / Motorcycle</option>
                    <option value="Electric Scooter (EV)">Electric Scooter (EV)</option>
                    <option value="Bicycle">Bicycle</option>
                  </select>
                </div>
              </div>

              {/* Driving License */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Driving License Number / Gov ID (Optional)
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <Input
                    placeholder="UP25 20220000000 (Optional for Bicycle)"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="h-10 pl-9 bg-slate-950 border-slate-700 focus:border-emerald-400 rounded-xl text-white uppercase text-base lg:text-xs font-mono"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Emergency Contact Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <Input
                    type="tel"
                    maxLength={10}
                    placeholder="Family member phone number"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, ""))}
                    className="h-10 pl-9 bg-slate-950 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-mono text-base lg:text-xs"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || phone.length !== 10 || !name.trim()}
                  className="w-full h-12 rounded-xl text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/60 transition-all gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      Submit Partner Application
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>

              <p className="text-[11px] text-center text-slate-400 pt-1">
                By submitting, you agree to SabQuick&apos;s Delivery Partner guidelines and background review.
              </p>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center border-t border-slate-900 text-slate-400 text-xs">
        <p>&copy; {new Date().getFullYear()} SabQuick Fleet Operations. All rights reserved.</p>
      </footer>
    </div>
  );
}
