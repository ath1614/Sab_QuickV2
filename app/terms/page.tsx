import * as React from "react";
import Link from "next/link";
import { FileText, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle, Clock, MapPin } from "lucide-react";

export const metadata = {
  title: "Terms of Service | SabQuick Provision Store",
  description: "Terms and Conditions governing orders, hyper-local 10-15 minute delivery, pricing, and services at SabQuick.",
};

export default function TermsOfServicePage() {
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold mb-3">
              <FileText className="w-3.5 h-3.5 text-slate-700" />
              <span>Customer Agreement &amp; Fulfillment SLA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-surface-dark">
              SabQuick Terms of Service
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Effective Date: September 20, 2026 &bull; Governing all mobile, web, and physical provision store transactions.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">1</span>
              Hyper-Local Fulfillment Service &amp; Geofence SLA
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              SabQuick operates a network of hyper-local dark stores delivering everyday groceries, dairy, provisions, and household essentials. Deliveries are strictly restricted to delivery addresses verified within our active <strong>2.5 kilometer delivery geofence</strong> from the dark store hub.
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-slate-900">
                <Clock className="w-4 h-4 text-primary" />
                <span>10–15 Minute Delivery Commitment</span>
              </div>
              <p>
                Our operational SLA targets 10 to 15 minute delivery from packing completion to your doorstep under standard weather and traffic conditions. In cases of severe torrential weather, unpassable roadblocks, or force majeure events, estimated times may adjust dynamically in real time.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">2</span>
              Pricing, Inventory &amp; Payment Methods
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              All prices listed on SabQuick are inclusive of applicable Goods and Services Tax (GST). We offer multiple secure payment methods for physical goods delivery:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 space-y-1">
              <li><strong>UPI &amp; Digital Payments:</strong> Google Pay, PhonePe, Paytm, and Net Banking processed via Cashfree Payments / Razorpay.</li>
              <li><strong>Pay on Delivery (Cash / Dynamic UPI at Doorstep):</strong> Cash on Delivery or QR scan upon arrival.</li>
            </ul>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
              <strong>Apple App Store &amp; Google Play Billing Compliance:</strong> SabQuick sells physical goods and provisions delivered in the physical world. Under Apple App Store Guideline 3.1.3(e) and Google Play Billing Policy, physical goods transactions are exempted from 30% In-App Purchase commissions.
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">3</span>
              Order Cancellation &amp; Returns
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Customers can cancel an order free of charge at any moment prior to dispatch from the dark store. For detailed return criteria and damaged item replacement guarantees, please view our dedicated{" "}
              <Link href="/refund" className="text-primary font-bold underline underline-offset-2">
                Refund &amp; Cancellation Policy
              </Link>.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">4</span>
              Governing Law &amp; Jurisdiction
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              These terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or related to these terms shall be subject to the exclusive jurisdiction of the competent courts in Ambikapur, Chhattisgarh, India.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
