"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, FileText } from "lucide-react";

export default function PrivacyPolicyPage() {
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
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-900">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif">
              Privacy Policy
            </h1>
            <p className="text-xs text-stone-500 font-mono mt-0.5">Last updated: August 9, 2026</p>
          </div>
        </div>
        <p className="text-sm text-stone-600 leading-relaxed">
          At <strong>Perch Restaurant OS</strong>, we respect your privacy and are committed to protecting the personal data you share when scanning venue QR codes, ordering food, or participating in cafe chatrooms.
        </p>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {/* Section 1 */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-700" />
            1. Information We Collect
          </h2>
          <ul className="list-disc list-inside text-xs sm:text-sm text-stone-600 space-y-2 leading-relaxed">
            <li>
              <strong>Account Profile:</strong> Name, email address, and profile photo when signing in with Google OAuth.
            </li>
            <li>
              <strong>Order Details:</strong> Items selected, total bill amount, table number, and payment method choice.
            </li>
            <li>
              <strong>Technical Data:</strong> Browser session handle, WebSocket connection tokens, and local preference storage.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-700" />
            2. How We Use Your Data
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-3">
            We use collected information solely to power your cafe dining experience:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-stone-600 space-y-1.5">
            <li>Transmitting order details to kitchen chefs and assigned delivery waiters.</li>
            <li>Displaying real-time order status, tax invoices, and payment confirmations.</li>
            <li>Enabling live cafe chatroom handles and connection wave requests.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-700" />
            3. Data Security & Third Parties
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            We employ cryptographically secure access tokens and HTTPS encryption. We do NOT sell or rent your personal data to third parties. Data is shared exclusively with venue staff and verified payment processors (e.g. Razorpay) to complete your transaction.
          </p>
        </section>

        {/* Section 4 */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-700" />
            4. Cookies & Storage
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Perch uses browser `sessionStorage` and `localStorage` to save your active table number, session handle, and local notifications so you don’t need to re-enter them during your cafe visit.
          </p>
        </section>
      </div>

      {/* Footer Nav */}
      <div className="mt-8 text-center text-xs text-stone-500 space-x-4 border-t border-stone-300 pt-6">
        <Link href="/terms" className="hover:text-amber-900 font-semibold underline">
          Terms & Conditions
        </Link>
        <span>•</span>
        <Link href="/" className="hover:text-amber-900 font-semibold underline">
          Home
        </Link>
      </div>
    </div>
  );
}
