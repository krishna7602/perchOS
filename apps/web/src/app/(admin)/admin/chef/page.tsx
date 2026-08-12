"use client";

import { useState, useEffect } from "react";
import { updateStaffStatus, getStaffAnalytics, getStaffList } from "@/features/staff/api";
import { listVenueOrders, updateOrderStatus, acceptOrder, rejectOrder } from "@/features/orders/api";
import { listVenues } from "@/features/venues/api";
import { getWsUrl } from "@/features/chat/api";
import { UtensilsCrossed, Clock, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import Link from "next/link";

import { getMe } from "@/features/auth/api";

const STATUS_MAP: Record<string, { label: string; icon: string; color: string }> = {
  AVAILABLE: { label: "Available", icon: "🟢", color: "text-green-600" },
  BUSY: { label: "Busy", icon: "🔴", color: "text-red-600" },
  BREAK: { label: "Break", icon: "🔵", color: "text-blue-600" },
  OFFLINE: { label: "Offline", icon: "🔴", color: "text-gray-500" },
  PREPARING: { label: "Preparing", icon: "🔴", color: "text-red-600" },
  CLEANING: { label: "Cleaning", icon: "🔴", color: "text-red-600" },
  NEED_HELP: { label: "Need Help", icon: "🔴", color: "text-red-600" },
};

export default function ChefPortalPage() {
  const [userId, setUserId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [userRole, setUserRole] = useState("chef");
  const [branches, setBranches] = useState<any[]>([]);
  
  const [analytics, setAnalytics] = useState({ hours: 0, orders: 0, avg_time: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState("OFFLINE");
  const [channelFilter, setChannelFilter] = useState<"ALL" | "PERCH" | "ZOMATO" | "SWIGGY">("ALL");

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const t = localStorage.getItem("perch_admin_token") || "";
    if (!t) return;
    const interval = setInterval(() => {
      getMe(t).then(res => {
        if (res.status && res.status !== currentStatus) {
          setCurrentStatus(res.status);
        }
      }).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentStatus]);

  useEffect(() => {
    if (branchId) {
      fetchOrders(); // immediate fetch on change
      const interval = setInterval(fetchOrders, 2000);
      window.addEventListener("order_status_updated", fetchOrders);
      return () => {
        clearInterval(interval);
        window.removeEventListener("order_status_updated", fetchOrders);
      };
    }
  }, [branchId]);

  const init = async () => {
    const t = localStorage.getItem("perch_admin_token") || "";
    if (!t) return;
    
    try {
      const payloadBase64 = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(payloadBase64));
      setUserId(payload.sub);
      setUserRole(payload.role || "chef");
      
      let bid = payload.branch_id;
      if (bid) {
        setBranchId(bid);
      } else {
        try {
          const res = await listVenues(t);
          if (res.venues && res.venues.length > 0) {
            setBranches(res.venues);
            bid = String(res.venues[0]._id || res.venues[0].id);
            setBranchId(bid);
          }
        } catch (err) {
          console.warn("Could not fetch venues for branch_id fallback");
        }
      }
      
      await fetchAnalytics(payload.sub, t);

      // Fetch current status
      try {
        const me = await getMe(t);
        if (me.status) {
          setCurrentStatus(me.status);
        }
      } catch (err) {
        console.error("Failed to fetch initial status", err);
      }
    } catch (e) {
      console.error(e);
    }
    
    await fetchOrders();
  };

  const fetchAnalytics = async (uid: string, token: string) => {
    try {
      const analyticsRes = await getStaffAnalytics(uid, token);
      if (analyticsRes.data) {
        setAnalytics({
          hours: analyticsRes.data.hours_logged,
          orders: analyticsRes.data.orders_prepared,
          avg_time: analyticsRes.data.avg_prep_time_mins
        });
      }
    } catch (e) {
      console.error("Failed to fetch analytics", e);
    }
  };

  // WebSocket for Real-time Order Assignment
  // No page-specific WS loop needed anymore as GlobalOrderNotifier handles popups globally.

  const fetchOrders = async () => {
    const t = localStorage.getItem("perch_admin_token") || "";
    let bid = branchId;
    
    // If state hasn't updated yet, try to read from JWT
    if (!bid && t) {
      try {
        const payloadBase64 = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(payloadBase64));
        if (payload.branch_id) {
          bid = payload.branch_id;
          setBranchId(bid);
        } else {
          const res = await listVenues(t);
          if (res.venues && res.venues.length > 0) {
            bid = String(res.venues[0]._id || res.venues[0].id);
            setBranchId(bid);
          }
        }
      } catch (err) {
        console.warn("Could not determine branch_id in fetchOrders");
      }
    }

    if (bid) {
      try {
        const ordersRes = await listVenueOrders(bid, t);
        setOrders(ordersRes.orders || []);
      } catch (err) {
        console.error("Failed to fetch orders", err);
      }
    }
    setLoading(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    setCurrentStatus(newStatus);
    try {
      const t = localStorage.getItem("perch_admin_token") || "";
      await updateStaffStatus(userId, newStatus, t);
    } catch(e) {
      alert("Failed to update status");
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      const t = localStorage.getItem("perch_admin_token") || "";
      await acceptOrder(orderId, t);
      fetchOrders();
      window.dispatchEvent(new Event("order_status_updated"));
    } catch (e: any) {
      if (e?.status === 409) {
        alert("This order was already accepted by another chef.");
      } else {
        alert("Failed to accept order.");
      }
      fetchOrders();
      window.dispatchEvent(new Event("order_status_updated"));
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      const t = localStorage.getItem("perch_admin_token") || "";
      await rejectOrder(orderId, t);
      fetchOrders();
    } catch (e) {
      alert("Failed to reject");
    }
  };

  const handleReady = async (orderId: string) => {
    try {
      const t = localStorage.getItem("perch_admin_token") || "";
      await updateOrderStatus(orderId, "ready", t);
      fetchOrders();
      if (userId) {
        fetchAnalytics(userId, t);
      }
    } catch (e) {
      alert("Failed to mark ready");
    }
  };

  // Filter orders assigned to this chef or active in venue
  const channelFiltered = orders.filter(o => {
    if (channelFilter === "ALL") return true;
    const src = (o.source || "PERCH").toUpperCase();
    return src === channelFilter;
  });

  const myOrders = channelFiltered.filter(o => (o.assigned_chef_id === userId || !o.assigned_chef_id) && (o.order_status !== "served"));
  
  const pendingAcceptance = myOrders.filter(o => o.order_status === "received");
  const currentlyPreparing = myOrders.filter(o => o.order_status === "preparing");
  const readyOrders = myOrders.filter(o => o.order_status === "ready");

  const renderChannelBadge = (source?: string) => {
    const src = (source || "PERCH").toUpperCase();
    if (src === "ZOMATO") {
      return <span className="px-2.5 py-0.5 bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold tracking-wide">🟠 ZOMATO</span>;
    }
    if (src === "SWIGGY") {
      return <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 border border-orange-200 rounded-lg text-xs font-bold tracking-wide">🔵 SWIGGY</span>;
    }
    return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold tracking-wide">🟢 PERCH DINE-IN</span>;
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="text-[var(--color-primary)]" />
            Chef Portal & Unified KDS
          </h1>
          <p className="text-sm text-gray-500">Manage orders across Zomato, Swiggy, and Perch dine-in channels.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/chat" 
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            <MessageSquare size={16} />
            Team Chat
          </Link>
          
          <select 
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-4 py-2 border rounded-xl outline-none text-sm font-medium bg-white shadow-sm"
          >
            <option value="OFFLINE" disabled>Your Status</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* POS Channel Aggregator Filter Bar */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <span className="text-xs font-semibold uppercase text-gray-400 mr-2">Filter Channels:</span>
        {(["ALL", "PERCH", "ZOMATO", "SWIGGY"] as const).map((ch) => (
          <button
            key={ch}
            onClick={() => setChannelFilter(ch)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              channelFilter === ch
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {ch === "ALL" && "All Orders"}
            {ch === "PERCH" && "🟢 Perch Dine-In"}
            {ch === "ZOMATO" && "🟠 Zomato"}
            {ch === "SWIGGY" && "🔵 Swiggy"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Active Load</div>
          <div className="text-3xl font-bold text-gray-900">{currentlyPreparing.length} <span className="text-lg font-normal text-gray-400">orders</span></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Avg Prep Time</div>
          <div className="text-3xl font-bold text-gray-900">{analytics.avg_time} <span className="text-lg font-normal text-gray-400">mins</span></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Orders Completed (Today)</div>
          <div className="text-3xl font-bold text-[var(--color-primary)]">{analytics.orders}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading assignments...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Incoming Assignments */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="bg-amber-100 text-amber-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">{pendingAcceptance.length}</span>
              New Assignments
            </h2>
            <div className="space-y-4">
              {pendingAcceptance.length === 0 ? (
                <div className="border border-dashed rounded-xl p-8 text-center text-gray-500 text-sm">
                  No new orders assigned. You're all caught up!
                </div>
              ) : (
                pendingAcceptance.map(order => (
                  <div key={order._id || order.id} className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {renderChannelBadge(order.source)}
                          <span className="font-bold text-gray-900">
                            #{order.external_order_id || order.order_token || String(order._id || order.id).slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} /> {order.table_number || "Takeout / Delivery"}
                        </div>
                      </div>
                      <div className="font-bold text-lg">₹{order.total}</div>
                    </div>
                    
                    <ul className="space-y-2 mb-4 text-sm bg-gray-50 p-3 rounded-xl">
                      {order.items.map((item: any, idx: number) => (
                        <li key={idx} className="flex justify-between">
                          <span><span className="font-medium">{item.quantity}x</span> {item.name} {item.variant_name ? `(${item.variant_name})` : ""}</span>
                        </li>
                      ))}
                    </ul>

                    {order.channel_metadata?.instructions && (
                      <div className="mb-4 text-xs bg-amber-50 text-amber-800 p-2.5 rounded-lg border border-amber-100 font-medium">
                        📝 Note: {order.channel_metadata.instructions}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleAccept(order._id || order.id)}
                        className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                      >
                        <CheckCircle size={16} /> Accept Order
                      </button>
                      <button 
                        onClick={() => handleReject(order._id || order.id)}
                        className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors flex items-center justify-center"
                      >
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Currently Preparing */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">{currentlyPreparing.length}</span>
              Preparing Now
            </h2>
            <div className="space-y-4">
              {currentlyPreparing.length === 0 ? (
                <div className="border border-dashed rounded-xl p-8 text-center text-gray-500 text-sm">
                  Nothing currently in the kitchen.
                </div>
              ) : (
                currentlyPreparing.map(order => (
                  <div key={order._id || order.id} className="bg-white p-5 rounded-2xl border shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {renderChannelBadge(order.source)}
                          <span className="font-bold text-gray-900">
                            #{order.external_order_id || order.order_token || String(order._id || order.id).slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.table_number || "Takeout / Delivery"}
                        </div>
                      </div>
                    </div>
                    
                    <ul className="space-y-2 mb-4 text-sm bg-blue-50/50 p-3 rounded-xl">
                      {order.items.map((item: any, idx: number) => (
                        <li key={idx} className="flex justify-between">
                          <span><span className="font-medium">{item.quantity}x</span> {item.name} {item.variant_name ? `(${item.variant_name})` : ""}</span>
                        </li>
                      ))}
                    </ul>

                    {order.channel_metadata?.rider_name && (
                      <div className="mb-4 text-xs bg-blue-50 text-blue-800 p-2.5 rounded-lg border border-blue-100 font-medium">
                        🛵 Valet: {order.channel_metadata.rider_name}
                      </div>
                    )}

                    <button 
                      onClick={() => handleReady(order._id || order.id)}
                      className="w-full py-2.5 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                      style={{ background: "var(--color-primary)" }}
                    >
                      <CheckCircle size={16} /> Mark as Ready
                    </button>
                  </div>
                ))
              )}

              {/* Ready Orders */}
              {readyOrders.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Waiting for Pickup</h3>
                  <div className="space-y-3">
                    {readyOrders.map(order => (
                      <div key={order._id || order.id} className="bg-green-50 p-4 rounded-xl border border-green-100 flex justify-between items-center">
                         <div>
                           <div className="font-bold text-green-900 text-sm">Order #{String(order._id || order.id).slice(-6).toUpperCase()}</div>
                           <div className="text-xs text-green-700">Ready to serve</div>
                         </div>
                         <CheckCircle className="text-green-600" size={20} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
