"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getMe } from "@/features/auth/api";
import { updateStaffStatus } from "@/features/staff/api";

const STATUS_MAP: Record<string, { label: string; icon: string; color: string }> = {
  AVAILABLE: { label: "Available", icon: "🟢", color: "text-green-600" },
  BUSY: { label: "Busy", icon: "🟡", color: "text-yellow-600" },
  BREAK: { label: "Break", icon: "🔵", color: "text-blue-600" },
  OFFLINE: { label: "Offline", icon: "🔴", color: "text-gray-500" },
  PREPARING: { label: "Preparing", icon: "🍽", color: "text-orange-600" },
  DELIVERING: { label: "Delivering", icon: "🚚", color: "text-purple-600" },
  CLEANING: { label: "Cleaning", icon: "🧹", color: "text-teal-600" },
  INVENTORY: { label: "Inventory", icon: "📦", color: "text-amber-600" },
  NEED_HELP: { label: "Need Help", icon: "⚠", color: "text-red-600" },
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
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/venues", label: "Venues", icon: Store },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/chat", label: "Team Chat", icon: MessageSquare },
  { href: "/admin/moderation", label: "Moderation", icon: Shield },
  { href: "/admin/settings", label: "Settings", icon: ClipboardList },
  { href: "/admin/chef", label: "Chef Portal", icon: UtensilsCrossed },
  { href: "/admin/superadmin/cafes", label: "Super Admin", icon: Shield },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminName, setAdminName] = useState("");
  const [token, setToken] = useState("");

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("owner");
  const [restaurantName, setRestaurantName] = useState("Admin Panel");
  const [status, setStatus] = useState("OFFLINE");

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
    <div className="flex min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* Sidebar */}
      <aside
        className="w-64 shrink-0 flex flex-col"
        style={{
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {/* Brand */}
        <div className="px-5 py-5">
          <Link href="/admin/dashboard" className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Coffee size={24} style={{ color: "var(--color-primary)" }} />
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
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            // Role-based visibility
            if (role === "chef" && !["Dashboard", "Team Chat", "Chef Portal"].includes(label)) return null;
            if (role === "waiter" && !["Team Chat"].includes(label)) return null;
            if (role === "super_admin" && !["Dashboard", "Super Admin"].includes(label)) return null;
            if (role !== "super_admin" && label === "Super Admin") return null;
            if (role === "owner" && label === "Chef Portal") return null; // Or maybe owners can see it too? Let's hide it for owners.

            const isActive = pathname.startsWith(href);
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
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
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
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
