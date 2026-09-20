import * as React from "react";
import Link from "next/link";
import { RotateCcw, ArrowLeft, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Refund & Cancellation Policy | SabQuick Provision Store",
  description: "Learn about SabQuick's policies for order cancellations, replacements, and refund processing timelines.",
};

export default function RefundPolicyPage() {
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
              <RotateCcw className="w-3.5 h-3.5 text-primary" />
              <span>Customer Satisfaction &amp; Quality Guarantee</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-surface-dark">
              Refund &amp; Cancellation Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Effective Date: September 20, 2026 &bull; Clear, fair, and fast resolutions for every order.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">1</span>
              Order Cancellation by Customer
            </h2>
            <div className="space-y-2 text-xs sm:text-sm text-slate-600">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Before Dark Store Dispatch (100% Full Immediate Refund)</span>
                </div>
                <p className="pl-6 text-slate-600">
                  You may cancel any order directly from the order tracking screen while the order status is <code>PLACED</code> or <code>CONFIRMED</code>. If payment was made online via UPI, Cards, or Net Banking, your payment is reversed immediately.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>After Dispatch / Rider In Transit</span>
                </div>
                <p className="pl-6">
                  Once a delivery rider has picked up the packed provision items and is in transit, cancellation cannot be completed through the app to protect perishable groceries (milk, dairy, bread). If you face an emergency, contact our support team immediately.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">2</span>
              Damaged, Expired, or Missing Items Guarantee
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We inspect all grocery packaging prior to dispatch. If you receive an item that is:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 space-y-1">
              <li>Physically damaged, leaked, or unsealed during rider transit</li>
              <li>Past the manufacturer&apos;s expiry date</li>
              <li>Incorrect item delivered vs your placed order</li>
            </ul>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">
              Notify our team within <strong>24 hours of delivery</strong> with a photo of the item. We will issue an <strong>instant replacement</strong> dispatched within 15 minutes or a <strong>full refund</strong> to your original payment method.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">3</span>
              Refund Processing Timelines
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3">Refund Mode</th>
                    <th className="p-3">Estimated Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-3 font-semibold">UPI (GPay / PhonePe / Paytm)</td>
                    <td className="p-3">Direct Bank Transfer (Instant UPI reversal)</td>
                    <td className="p-3 text-emerald-700 font-bold">Within 15–30 Mins</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Debit / Credit Card</td>
                    <td className="p-3">Payment Gateway Reversal</td>
                    <td className="p-3">2–4 Business Days</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Net Banking</td>
                    <td className="p-3">Bank Account Transfer</td>
                    <td className="p-3">3–5 Business Days</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Cash on Delivery</td>
                    <td className="p-3">Direct UPI payout or Store Credit</td>
                    <td className="p-3 text-emerald-700 font-bold">Immediate upon verification</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">4</span>
              Customer Support Helpline
            </h2>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 space-y-1 font-mono">
              <div><strong>Direct WhatsApp &amp; Call:</strong> +91 9109066668</div>
              <div><strong>Support Email:</strong> sabsupermart68@gmail.com</div>
              <div><strong>Operating Hours:</strong> 7:00 AM – 11:00 PM IST (7 Days a Week)</div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
