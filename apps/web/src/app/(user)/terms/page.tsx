"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2, Lock, Utensils } from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-[#FAF6F0] text-stone-800 px-4 py-8 sm:px-8 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-amber-900 bg-white/80 border border-stone-200 px-3 py-1.5 rounded-full mb-6 transition-all"
      >
        <ArrowLeft size={14} /> Back to Perch
      </Link>

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 rounded-2xl bg-amber-100 text-amber-900">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif">
              Terms & Conditions
            </h1>
            <p className="text-xs text-stone-500 font-mono mt-0.5">Last updated: August 9, 2026</p>
          </div>
        </div>
        <p className="text-sm text-stone-600 leading-relaxed">
          Welcome to <strong>Perch Restaurant OS</strong> ("Perch", "we", "us", or "our"). By scanning venue QR codes, creating an account, accessing our live chatrooms, or placing food and beverage orders, you agree to be bound by these Terms & Conditions.
        </p>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {/* Section 1 */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-700" />
            1. Service Overview & QR Scanning
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Perch provides interactive dining and community software for restaurants, cafes, and venues. By scanning a venue’s table QR code or connecting via Google OAuth, you receive access to digital menus, live cafe chatrooms, order tracking, and waiter pickup requests.
          </p>
        </section>

        {/* Section 2 */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-amber-700" />
            2. Orders, Table Numbers & Payments
          </h2>
          <ul className="list-disc list-inside text-xs sm:text-sm text-stone-600 space-y-2 leading-relaxed">
            <li>
              <strong>Table Accuracy:</strong> You agree to provide accurate table numbers when placing orders so staff and waiters can deliver your items correctly.
            </li>
            <li>
              <strong>Cash on Delivery (COD):</strong> If selecting COD, you agree to pay the exact order total in cash directly to the assigned waiter upon delivery.
            </li>
            <li>
              <strong>Digital Payments:</strong> Online transactions processed via payment gateways (e.g. Razorpay) are subject to payment provider verification. Orders are confirmed upon payment success.
            </li>
            <li>
              <strong>Cancellations:</strong> Once kitchen staff mark an order as <em>Preparing</em> or <em>Ready for Pickup</em>, orders cannot be cancelled without staff approval.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-700" />
            3. Cafe Chatroom & Conduct Rules
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-3">
            Perch live cafe chatrooms are designed to foster welcoming, respectful in-venue connections. Users agree NOT to:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-stone-600 space-y-1.5">
            <li>Harass, bully, spam, or impersonate other cafe guests or venue staff.</li>
            <li>Post offensive, illegal, explicit, or hate-speech content.</li>
            <li>Attempt to bypass security tokens or manipulate order status APIs.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-700" />
            4. Privacy & System Security
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Your privacy is important to us. Perch handles your account credentials and order details in accordance with our{" "}
            <Link href="/privacy" className="text-amber-900 font-bold underline hover:text-amber-700">
              Privacy Policy
            </Link>
            . Access tokens are used to secure order viewing so that customer orders remain private and accessible only to you and venue staff.
          </p>
        </section>

        {/* Section 5 */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-3">
            5. Modifications & Support
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Perch reserves the right to update these terms at any time. Continued use of the platform constitutes agreement to the updated terms. For support or queries, contact us at <strong>support@perch.store</strong>.
          </p>
        </section>
      </div>

      {/* Footer Nav */}
      <div className="mt-8 text-center text-xs text-stone-500 space-x-4 border-t border-stone-300 pt-6">
        <Link href="/privacy" className="hover:text-amber-900 font-semibold underline">
          Privacy Policy
        </Link>
        <span>•</span>
        <Link href="/" className="hover:text-amber-900 font-semibold underline">
          Home
        </Link>
      </div>
    </div>
  );
}
