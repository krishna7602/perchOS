"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getMe } from "@/features/auth/api";
import { updateStaffStatus } from "@/features/staff/api";

const STATUS_MAP: Record<string, { label: string; icon: string; color: string }> = {
  AVAILABLE: { label: "Available", icon: "🟢", color: "text-green-600" },
  BUSY: { label: "Busy", icon: "🔴", color: "text-red-600" },
  BREAK: { label: "Break", icon: "🔵", color: "text-blue-600" },
  OFFLINE: { label: "Offline", icon: "🔴", color: "text-gray-500" },
  PREPARING: { label: "Preparing", icon: "🔴", color: "text-red-600" },
  DELIVERING: { label: "Delivering", icon: "🔴", color: "text-red-600" },
  CLEANING: { label: "Cleaning", icon: "🧹", color: "text-teal-600" },
  INVENTORY: { label: "Inventory", icon: "📦", color: "text-amber-600" },
  NEED_HELP: { label: "Need Help", icon: "🔴", color: "text-red-600" },
};
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  ClipboardList,
  Shield,
  LogOut,
  Coffee,
  Users,
  MessageSquare,
  Menu,
  X
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/venues", label: "Venues", icon: Store },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/staff", label: "Staff", icon: Users, exact: true },
  { href: "/admin/staff/analytics", label: "Staff Analytics", icon: ClipboardList },
  { href: "/admin/chat", label: "Team Chat", icon: MessageSquare },
  { href: "/admin/moderation", label: "Moderation", icon: Shield },
  { href: "/admin/settings", label: "Settings", icon: ClipboardList },
  { href: "/admin/chef", label: "Chef Portal", icon: UtensilsCrossed },
  { href: "/admin/waiter", label: "Waiter Portal", icon: Coffee },
  { href: "/admin/superadmin/cafes", label: "Super Admin", icon: Shield },
];

import { useChatNotifier } from "@/hooks/useChatNotifier";
import { GlobalOrderNotifier } from "@/components/GlobalOrderNotifier";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminName, setAdminName] = useState("");
  const [token, setToken] = useState("");
  const [venueId, setVenueId] = useState(""); // Extract venueId

  const { hasUnread, showPopup, popupMessage, setShowPopup } = useChatNotifier(token);

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("owner");
  const [restaurantName, setRestaurantName] = useState("Admin Panel");
  const [status, setStatus] = useState("OFFLINE");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("perch_admin_token");
    const n = localStorage.getItem("perch_admin_name");

    // Skip auth check on login page
    if (pathname === "/admin/login") return;

    if (!t) {
      router.push("/admin/login");
      return;
    }

    try {
      // Decode JWT payload (base64url)
      const payloadBase64 = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(payloadBase64));
      setRole(payload.role || "owner");
      setUserId(payload.sub || "");
      if (payload.branch_id || payload.venue_id) {
        setVenueId(payload.branch_id || payload.venue_id);
      }
      if (payload.restaurant_name) {
        setRestaurantName(payload.restaurant_name);
      }
    } catch (e) {
      console.error("Failed to decode token", e);
    }

    setToken(t);
    setAdminName(n || "Admin");

    // Fetch user status
    getMe(t).then(res => {
      if (res.status) setStatus(res.status);
    }).catch(console.error);

  }, [pathname, router]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Poll user status periodically to sync with DB workflow changes in real-time
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      getMe(token).then(res => {
        if (res.status && res.status !== status) {
          setStatus(res.status);
        }
      }).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [token, status]);

  const handleLogout = () => {
    localStorage.removeItem("perch_admin_token");
    localStorage.removeItem("perch_admin_name");
    router.push("/admin/login");
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    if (userId && token) {
      try {
        await updateStaffStatus(userId, newStatus, token);
      } catch (err) {
        console.error("Failed to update status", err);
      }
    }
  };

  // Don't show sidebar on login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b z-40 relative">
        <div className="flex items-center gap-2">
          <img src="/logo.png" className="w-8 h-8 rounded-lg object-cover" alt="Perch Logo" />
          <span
            className="text-lg font-bold truncate"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            {role === "super_admin" ? "Perch HQ" : restaurantName}
          </span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2">
          <Menu size={24} style={{ color: "var(--color-text)" }} />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 w-64 shrink-0 flex flex-col transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 bg-white`}
        style={{
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {/* Brand */}
        <div className="px-5 py-5 flex items-center justify-between md:block">
          <Link href="/admin/dashboard" className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <img src="/logo.png" className="w-8 h-8 rounded-lg object-cover" alt="Perch Logo" />
              <span
                className="text-xl font-bold truncate"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
                title={restaurantName}
              >
                {role === "super_admin" ? "Perch HQ" : restaurantName}
              </span>
            </div>
            {role !== "super_admin" && (
              <p className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: "var(--color-muted)" }}>
                Powered by Perch
              </p>
            )}
          </Link>
          <button 
            className="md:hidden p-1 rounded-md text-gray-500 hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            // Role-based visibility
            if (role === "chef" && !["Dashboard", "Team Chat", "Chef Portal"].includes(label)) return null;
            if (role === "waiter" && !["Dashboard", "Team Chat", "Waiter Portal"].includes(label)) return null;
            if (role === "super_admin" && !["Dashboard", "Super Admin"].includes(label)) return null;
            if (role !== "super_admin" && label === "Super Admin") return null;
            if (["chef", "waiter"].includes(role) && label === "Staff Analytics") return null;

            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: isActive ? "rgba(139, 94, 60, 0.1)" : "transparent",
                  color: isActive ? "var(--color-primary)" : "var(--color-muted)",
                }}
              >
                <Icon size={18} />
                {label}
                {label === "Team Chat" && hasUnread && (
                  <div className="w-2 h-2 bg-yellow-500 rounded-full ml-auto animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-4 py-4 mt-auto"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <NotificationCenter venueId={venueId} />
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-xs"
              style={{ background: "var(--color-primary)", color: "white" }}
            >
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-900">
                {adminName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-medium text-[var(--color-primary)] capitalize">{role.replace("_", " ")}</span>
                <span className="opacity-50 text-xs">•</span>
                <div className="relative inline-block">
                  <select
                    value={status}
                    onChange={handleStatusChange}
                    className={`appearance-none bg-transparent outline-none cursor-pointer text-xs font-medium pl-1 pr-4 py-0.5 ${STATUS_MAP[status]?.color || "text-gray-500"}`}
                  >
                    <option value="OFFLINE" disabled>Status</option>
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-gray-400">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs w-full px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-black/5"
            style={{ color: "var(--color-danger)" }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto w-full md:w-auto h-[calc(100vh-65px)] md:h-screen">
        {children}
      </main>

      {/* Global Chat Popup */}
      {showPopup && (
        <div className="fixed top-4 right-4 z-[9999] bg-white border border-yellow-200 shadow-lg rounded-xl p-4 flex items-start gap-3 max-w-sm animate-in fade-in slide-in-from-top-5">
          <div className="bg-yellow-100 p-2 rounded-full text-yellow-600 mt-0.5">
            <MessageSquare size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">New Message</h4>
            <p className="text-sm text-gray-600 truncate">{popupMessage}</p>
          </div>
          <button 
            onClick={() => setShowPopup(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Global Order Popup & Background Push Notifier */}
      <GlobalOrderNotifier token={token} venueId={venueId} role={role} />
    </div>
  );
}
