import * as React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Lock, Eye, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy | SabQuick Provision Store",
  description: "Learn how SabQuick collects, protects, and manages your personal data and geolocation for 10-15 minute delivery.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-xs py-3 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
      <main className="max-w-4xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-border-subtle shadow-sm space-y-8">
          
          {/* Title Hero */}
          <div className="border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-3">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Consumer Data Protection &amp; Transparency</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-surface-dark">
              SabQuick Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Last Updated &amp; Effective Date: September 20, 2026 &bull; Compliant with Google Play Developer Policy, Apple App Store Guidelines 5.1.1, and the Digital Personal Data Protection (DPDP) Act.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">1</span>
              Introduction &amp; Scope
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              SabQuick Technologies (&quot;SabQuick&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the SabQuick hyper-local provision store mobile applications and web storefront accessible at{" "}
              <strong>https://srv1985371.hstgr.cloud</strong>. This Privacy Policy outlines our strict protocols regarding the collection, processing, storage, and deletion of personal data when you use our services.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">2</span>
              Information We Collect &amp; Exact Use
            </h2>
            <div className="space-y-3 text-xs sm:text-sm text-slate-600">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Mobile Phone Number &amp; Customer Name</span>
                </div>
                <p className="pl-6 text-slate-600">
                  Used exclusively to verify customer identity via secure One-Time Password (Firebase Phone Auth / SMS gateway), coordinate delivery rider drop-off, and send real-time order dispatch notifications.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Doorstep Delivery Address &amp; Precise GPS Location</span>
                </div>
                <p className="pl-6 text-slate-600">
                  Collected with explicit user permission (<code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">ACCESS_FINE_LOCATION</code> / <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">NSLocationWhenInUseUsageDescription</code>) solely to verify that your doorstep lies within our guaranteed <strong>2.5 km dark store fulfillment geofence</strong> and to navigate delivery riders to your delivery pin. Location data is never shared with third-party advertisers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Camera &amp; Photo Access (Optional / Staff)</span>
                </div>
                <p className="pl-6 text-slate-600">
                  Used on mobile devices to scan order verification QR codes and capture proof-of-delivery receipts. We do not scan or access your personal photo library without explicit user-initiated selection.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Payment &amp; Transaction Details</span>
                </div>
                <p className="pl-6 text-slate-600">
                  Payment processing is handled through RBI-licensed payment aggregators (Cashfree Payments and Razorpay). SabQuick <strong>never</strong> stores your raw credit/debit card numbers, CVV, or bank UPI MPIN on our servers.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">3</span>
              Third-Party Subprocessors
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              We integrate only trusted, industry-standard third-party SDKs required for essential application operations:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 space-y-1">
              <li><strong>Google Firebase</strong>: Phone authentication, SMS OTP dispatch, and push notification tokens.</li>
              <li><strong>Cashfree Payments &amp; Razorpay</strong>: Secure digital checkout, UPI intents, and payment verification.</li>
              <li><strong>Google Maps &amp; OpenStreetMap</strong>: Geofence radius verification, address reverse-geocoding, and rider transit mapping.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">4</span>
              Apple App Store &amp; Google Play Account Deletion Right
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              In strict adherence to <strong>Apple App Store Review Guideline 5.1.1(v)</strong> and the <strong>Google Play Data Safety Policy</strong>, all registered customers retain the right to permanently delete their account and associated personal data.
            </p>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-2">
              <div className="font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>How to Delete Your Account</span>
              </div>
              <p>
                You can delete your customer profile and saved delivery addresses at any time directly through the app or by visiting our public self-service portal:
              </p>
              <div>
                <Link href="/delete-account">
                  <Button variant="default" size="sm" className="rounded-xl font-bold text-xs h-9 bg-amber-700 hover:bg-amber-800 text-white">
                    Submit Account Deletion Request &rarr;
                  </Button>
                </Link>
              </div>
              <p className="text-[11px] text-amber-800/80">
                Upon confirmation, your personal profile, phone number, saved addresses, and active sessions will be permanently purged within 48 hours, retaining only statutory tax invoices as mandated by Indian GST regulations.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">5</span>
              Grievance Officer &amp; Store Contact
            </h2>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 space-y-1 font-mono">
              <div><strong>Store Operator:</strong> SabQuick Retail / Anurag Soni</div>
              <div><strong>Physical Fulfillment Center:</strong> Dark Store #01, Ambikapur, Chhattisgarh 497001, India</div>
              <div><strong>Grievance Email:</strong> contact@sabquick.com / sabsupermart68@gmail.com</div>
              <div><strong>Direct Phone:</strong> +91 9109066668</div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
