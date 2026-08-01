"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Coffee,
  ChefHat,
  UtensilsCrossed,
  Calculator,
  BrainCircuit,
  PackageSearch,
  WalletCards,
  CalendarClock,
  ArrowRight,
  BarChart3,
  Globe,
  Smartphone,
  ShieldCheck
} from "lucide-react";

const Typewriter = ({ words }: { words: string[] }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (index === words.length) {
      setIndex(0);
      return;
    }

    if (
      subIndex === words[index].length + 1 &&
      !isDeleting &&
      index !== words.length - 1
    ) {
      const timeout = setTimeout(() => setIsDeleting(true), 1500);
      return () => clearTimeout(timeout);
    }

    if (subIndex === 0 && isDeleting) {
      setIsDeleting(false);
      setIndex((prev) => prev + 1);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (isDeleting ? -1 : 1));
    }, Math.max(isDeleting ? 50 : 100, parseInt((Math.random() * 50).toString())));

    return () => clearTimeout(timeout);
  }, [subIndex, index, isDeleting, words]);

  return (
    <span className="inline-block">
      <span style={{ color: "var(--color-primary)" }}>
        {words[index]?.substring(0, subIndex)}
      </span>
      <span className="animate-pulse" style={{ color: "var(--color-primary)" }}>|</span>
    </span>
  );
};

export default function HomePage() {
  const heroWords = [
    "Restaurant ERP.",
    "Advanced POS.",
    "Smart HRMS.",
    "CRM & Loyalty.",
    "AI Analytics.",
    "Everything."
  ];

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Background Gradients ONLY behind hero */}
      <div className="absolute top-0 left-0 right-0 h-[800px] pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-40 -left-20 w-[800px] h-[800px] rounded-full blur-[140px] opacity-10"
          style={{ background: "var(--color-primary)" }}
        />
        <div
          className="absolute top-0 -right-20 w-[600px] h-[600px] rounded-full blur-[120px] opacity-10"
          style={{ background: "var(--color-accent)" }}
        />
      </div>

      <main className="relative z-10">

        {/* ================= NAVBAR ================= */}
        <nav
          className="sticky top-0 z-50 backdrop-blur-xl border-b"
          style={{
            borderColor: "var(--color-border)",
            background: "rgba(255,255,255,.8)"
          }}
        >
          <div className="w-full px-6 lg:px-12 xl:px-20 max-w-[1800px] mx-auto h-20 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.png" className="w-10 h-10 rounded-xl object-cover shadow-sm" alt="Perch Logo" />
              <div>
                <h2
                  className="text-xl font-black leading-none tracking-tight"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
                >
                  Perch
                </h2>
                <p className="text-[10px] tracking-[0.2em] uppercase font-semibold mt-0.5" style={{ color: "var(--color-muted)" }}>
                  Restaurant OS
                </p>
              </div>
            </Link>

            {/* Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {["Platform", "Solutions", "Analytics", "Pricing", "Developers"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-sm font-semibold transition-colors hover:text-black"
                  style={{ color: "var(--color-muted)" }}
                >
                  {item}
                </a>
              ))}
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              <div
                className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(124,148,115,.1)", border: "1px solid rgba(124,148,115,.2)" }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-accent)" }} />
                <span className="text-xs font-bold" style={{ color: "var(--color-accent)" }}>AI Powered</span>
              </div>
              <Link
                href="/admin/login"
                className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-105"
                style={{ background: "var(--color-primary)", color: "white", boxShadow: "var(--shadow-md)" }}
              >
                Staff Login
              </Link>
            </div>
          </div>
        </nav>

        {/* ================= HERO SECTION ================= */}
        <section className="pt-24 pb-16 lg:pb-20 w-full px-6 lg:px-12 xl:px-20 max-w-[1800px] mx-auto">
          <div className="grid lg:grid-cols-[58%_42%] items-center gap-12 lg:gap-8">
            
            {/* Left Content */}
            <div className="pr-0 lg:pr-12 xl:pr-24">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
                style={{ background: "rgba(139,94,60,.08)", border: "1px solid rgba(139,94,60,.15)" }}
              >
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-primary)" }}>
                  The Operating System for Restaurants
                </span>
              </div>

              <h1
                className="text-6xl md:text-7xl xl:text-[5.5rem] font-black leading-[1.05] tracking-tighter mb-8"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
              >
                One login.<br />
                One dashboard.<br />
                <Typewriter words={heroWords} />
              </h1>

              <p
                className="text-xl md:text-2xl leading-relaxed mb-10 max-w-2xl font-light"
                style={{ color: "var(--color-muted)" }}
              >
                Replace scattered tools with a single enterprise-grade platform. Unify customer engagement, POS, kitchen ops, workforce management, inventory, and AI.
              </p>

              <div className="flex flex-wrap gap-4 items-center">
                <Link
                  href="/admin/login"
                  className="px-8 py-4 rounded-xl text-lg font-bold transition-transform hover:-translate-y-1 flex items-center gap-2"
                  style={{ background: "var(--color-primary)", color: "white", boxShadow: "0 10px 30px rgba(139,94,60,.3)" }}
                >
                  Start Building <ArrowRight size={20} />
                </Link>
                <a
                  href="#platform"
                  className="px-8 py-4 rounded-xl text-lg font-bold transition-all hover:bg-black/5"
                  style={{ color: "var(--color-text)" }}
                >
                  Explore Platform
                </a>
              </div>
            </div>

            {/* Right Content - Enterprise Dashboard */}
            <div className="w-full max-w-[700px] lg:max-w-none mx-auto relative animate-fade-in delay-200">
              <div
                className="rounded-2xl p-6 md:p-8 backdrop-blur-md"
                style={{
                  background: "rgba(255,255,255,.6)",
                  border: "1px solid rgba(0,0,0,.08)",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)"
                }}
              >
                <div className="flex items-center justify-between mb-8 border-b pb-4" style={{ borderColor: "rgba(0,0,0,.05)" }}>
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>HQ Overview</h3>
                    <p className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>Live Analytics</p>
                  </div>
                  <BrainCircuit size={28} style={{ color: "var(--color-primary)" }} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid rgba(0,0,0,.04)" }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-muted)" }}>Today's Revenue</p>
                    <h2 className="text-3xl font-black">₹1.84L</h2>
                    <span className="text-xs font-bold" style={{ color: "var(--color-accent)" }}>↑ 18.2%</span>
                  </div>
                  <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid rgba(0,0,0,.04)" }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-muted)" }}>Live Orders</p>
                    <h2 className="text-3xl font-black">472</h2>
                    <span className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>Peak Hour</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid rgba(0,0,0,.04)" }}>
                    <div className="flex items-center gap-2 mb-2"><ChefHat size={18} style={{ color: "var(--color-primary)" }}/><span className="text-sm font-bold">Kitchen</span></div>
                    <h3 className="text-lg font-bold">14 Active</h3>
                    <p className="text-xs font-semibold mt-1" style={{ color: "var(--color-muted)" }}>Avg Prep: 11m</p>
                  </div>
                  <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid rgba(0,0,0,.04)" }}>
                    <div className="flex items-center gap-2 mb-2"><Users size={18} style={{ color: "var(--color-accent)" }}/><span className="text-sm font-bold">Staff</span></div>
                    <h3 className="text-lg font-bold">22 Online</h3>
                    <p className="text-xs font-semibold mt-1" style={{ color: "var(--color-muted)" }}>Shift Efficiency: 94%</p>
                  </div>
                </div>

                <div className="rounded-xl p-5" style={{ background: "rgba(124,148,115,.1)", border: "1px solid rgba(124,148,115,.2)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <BrainCircuit size={16} style={{ color: "var(--color-accent)" }} />
                    <h4 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>AI Recommendation</h4>
                  </div>
                  <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--color-muted)" }}>
                    Dinner orders expected to rise by <strong style={{ color: "var(--color-text)" }}>22%</strong>. Prepare 12 extra pizza bases before 6 PM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= TRUSTED BY SECTION ================= */}
        <section className="py-10 border-y" style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,.01)" }}>
          <div className="w-full px-6 lg:px-12 xl:px-20 max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-8 opacity-70">
            <div className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>Trusted by</div>
            <div className="flex items-center gap-2 font-black text-xl" style={{ color: "var(--color-text)" }}><Building2 size={24}/> 250+ Restaurants</div>
            <div className="flex items-center gap-2 font-black text-xl" style={{ color: "var(--color-text)" }}><UtensilsCrossed size={24}/> 15K+ Orders/day</div>
            <div className="flex items-center gap-2 font-black text-xl" style={{ color: "var(--color-text)" }}><Globe size={24}/> 99.9% Uptime</div>
          </div>
        </section>

        {/* ================= RESTAURANT MODULES (BENTO GRID) ================= */}
        <section id="platform" className="py-32 w-full px-6 lg:px-12 xl:px-20 max-w-[1800px] mx-auto">
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              The Restaurant Ecosystem
            </h2>
            <p className="text-xl max-w-2xl font-medium" style={{ color: "var(--color-muted)" }}>
              Every vertical built to seamlessly talk to each other. No more importing and exporting Excel sheets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Top Row: Enterprise Dashboard & AI Insights */}
            <div className="md:col-span-2 rounded-[2rem] p-10 flex flex-col justify-between group transition-transform hover:-translate-y-1" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
              <div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: "rgba(139,94,60,.1)", color: "var(--color-primary)" }}><BarChart3 size={28} /></div>
                <h3 className="text-3xl font-black mb-4" style={{ fontFamily: "var(--font-heading)" }}>Enterprise Dashboard</h3>
                <p className="text-lg font-medium leading-relaxed max-w-md" style={{ color: "var(--color-muted)" }}>
                  A centralized command center for your entire chain. Compare revenue, staff efficiency, and inventory across all locations in real-time.
                </p>
              </div>
            </div>
            
            <div className="md:col-span-1 rounded-[2rem] p-10 flex flex-col justify-between group transition-transform hover:-translate-y-1" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
              <div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: "rgba(124,148,115,.1)", color: "var(--color-accent)" }}><BrainCircuit size={28} /></div>
                <h3 className="text-2xl font-black mb-4" style={{ fontFamily: "var(--font-heading)" }}>AI Insights</h3>
                <p className="font-medium leading-relaxed" style={{ color: "var(--color-muted)" }}>
                  Get actionable recommendations, not just charts. Predict demand and optimize staffing instantly.
                </p>
              </div>
            </div>

            {/* Middle Row: POS, Kitchen, Inventory */}
            <div className="rounded-[2rem] p-10 group transition-transform hover:-translate-y-1" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: "rgba(139,94,60,.1)", color: "var(--color-primary)" }}><Calculator size={24} /></div>
              <h3 className="text-xl font-bold mb-3">Advanced POS</h3>
              <p className="font-medium text-sm" style={{ color: "var(--color-muted)" }}>Billing, GST, split bills, and seamless shift closings.</p>
            </div>

            <div className="rounded-[2rem] p-10 group transition-transform hover:-translate-y-1" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: "rgba(124,148,115,.1)", color: "var(--color-accent)" }}><ChefHat size={24} /></div>
              <h3 className="text-xl font-bold mb-3">Kitchen Display (KDS)</h3>
              <p className="font-medium text-sm" style={{ color: "var(--color-muted)" }}>Prep timers, intelligent order routing, and delay alerts.</p>
            </div>

            <div className="rounded-[2rem] p-10 group transition-transform hover:-translate-y-1" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: "rgba(0,0,0,.05)", color: "var(--color-text)" }}><PackageSearch size={24} /></div>
              <h3 className="text-xl font-bold mb-3">Smart Inventory</h3>
              <p className="font-medium text-sm" style={{ color: "var(--color-muted)" }}>Ingredient-level deductions and automatic PO generation.</p>
            </div>

            {/* Bottom Row: CRM, HRMS, Accounting */}
            <div className="rounded-[2rem] p-10 group transition-transform hover:-translate-y-1" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: "rgba(139,94,60,.1)", color: "var(--color-primary)" }}><Users size={24} /></div>
              <h3 className="text-xl font-bold mb-3">CRM & Loyalty</h3>
              <p className="font-medium text-sm" style={{ color: "var(--color-muted)" }}>Customer profiling, spending habits, and automated offers.</p>
            </div>

            <div className="rounded-[2rem] p-10 group transition-transform hover:-translate-y-1" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: "rgba(124,148,115,.1)", color: "var(--color-accent)" }}><CalendarClock size={24} /></div>
              <h3 className="text-xl font-bold mb-3">Workforce (HRMS)</h3>
              <p className="font-medium text-sm" style={{ color: "var(--color-muted)" }}>Attendance, payroll, and real-time task assignments (Chef & Waiter workflows).</p>
            </div>

            <div className="rounded-[2rem] p-10 group transition-transform hover:-translate-y-1" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: "rgba(0,0,0,.05)", color: "var(--color-text)" }}><WalletCards size={24} /></div>
              <h3 className="text-xl font-bold mb-3">Accounting Ledger</h3>
              <p className="font-medium text-sm" style={{ color: "var(--color-muted)" }}>Centralized cash flow, vendor payments, and expense tracking.</p>
            </div>

          </div>
        </section>

        {/* ================= WORKFLOW ANIMATION / HORIZONTAL STRIP ================= */}
        <section className="py-24 border-y overflow-hidden" style={{ borderColor: "var(--color-border)", background: "var(--color-primary)", color: "white" }}>
          <div className="w-full px-6 lg:px-12 xl:px-20 max-w-[1800px] mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="md:w-1/2">
              <h2 className="text-4xl md:text-5xl font-black mb-6" style={{ fontFamily: "var(--font-heading)" }}>The Perfect Workflow</h2>
              <p className="text-xl text-white/80 max-w-lg mb-8 leading-relaxed font-medium">
                Customer scans the QR. Order hits the POS. Ingredients deduct from Inventory. Prep ticket prints in the Kitchen. Chef cooks, Waiter gets notified for pickup, and Revenue adds to Ledger. 
                <br/><br/>
                All instantly. Zero friction.
              </p>
            </div>
            <div className="md:w-1/2 flex items-center gap-4 text-white/50 font-bold text-lg md:text-2xl flex-wrap justify-center md:justify-end">
              <span className="text-white">Customer</span> <ArrowRight/>
              <span>QR Menu</span> <ArrowRight/>
              <span>POS</span> <ArrowRight/>
              <span>KDS</span> <ArrowRight/>
              <span>Ledger</span>
            </div>
          </div>
        </section>

        {/* ================= WHY CHOOSE US ================= */}
        <section className="py-32 w-full px-6 lg:px-12 xl:px-20 max-w-[1800px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-6" style={{ fontFamily: "var(--font-heading)" }}>
                Why Restaurants Choose Perch
              </h2>
              <p className="text-xl leading-relaxed font-medium mb-10" style={{ color: "var(--color-muted)" }}>
                Stop paying for 5 different subscriptions that don't communicate. Perch was engineered for operators who want complete visibility and control over their business, from a single screen.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center" style={{ background: "rgba(139,94,60,.1)", color: "var(--color-primary)" }}><ShieldCheck size={24}/></div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Enterprise Security & Roles</h4>
                    <p className="font-medium text-sm" style={{ color: "var(--color-muted)" }}>Strict permissions for Owners, Managers, Chefs, and Waiters.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center" style={{ background: "rgba(124,148,115,.1)", color: "var(--color-accent)" }}><Smartphone size={24}/></div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Mobile First Apps</h4>
                    <p className="font-medium text-sm" style={{ color: "var(--color-muted)" }}>Dedicated dashboard apps for every role in your restaurant.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="rounded-[2rem] p-10 relative overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
               <h3 className="text-3xl font-black mb-8" style={{ fontFamily: "var(--font-heading)" }}>Ready to modernize?</h3>
               <Link
                  href="/admin/login"
                  className="w-full py-5 rounded-xl text-lg font-bold transition-transform hover:-translate-y-1 flex items-center justify-center gap-3"
                  style={{ background: "var(--color-text)", color: "var(--color-bg)" }}
                >
                  Create your workspace <ArrowRight size={20} />
                </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ================= FOOTER ================= */}
      <footer
        className="relative z-10 py-12 border-t"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <div className="w-full px-6 lg:px-12 xl:px-20 max-w-[1800px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Coffee size={24} style={{ color: "var(--color-primary)" }} />
            <span className="text-2xl font-black tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>Perch</span>
            <span className="text-sm font-semibold ml-4" style={{ color: "var(--color-muted)" }}>© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-8 font-semibold text-sm">
            <a href="#" className="hover:text-black transition-colors" style={{ color: "var(--color-muted)" }}>Privacy</a>
            <a href="#" className="hover:text-black transition-colors" style={{ color: "var(--color-muted)" }}>Terms</a>
            <Link
              href="/admin/login"
              className="transition-colors hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              Staff & Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
