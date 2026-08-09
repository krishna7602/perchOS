"use client";

import { useState, useEffect } from "react";
import { getStaffList, getStaffAnalytics } from "@/features/staff/api";
import { getBranchKitchenAnalytics } from "@/features/orders/api";
import { listVenues } from "@/features/venues/api";
import { Clock, ShoppingBag, Timer, ArrowUpRight } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; icon: string; color: string }> = {
  AVAILABLE: { label: "Available", icon: "🟢", color: "text-green-600" },
  BUSY: { label: "Busy", icon: "🟡", color: "text-yellow-600" },
  BREAK: { label: "Break", icon: "🔵", color: "text-blue-600" },
  OFFLINE: { label: "Offline", icon: "🔴", color: "text-gray-500" },
  PREPARING: { label: "Preparing", icon: "🍽", color: "text-orange-600" },
  CLEANING: { label: "Cleaning", icon: "🧹", color: "text-teal-600" },
  NEED_HELP: { label: "Need Help", icon: "⚠", color: "text-red-600" },
};

export default function StaffAnalyticsPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [venueAnalytics, setVenueAnalytics] = useState<{ hours_logged: number; orders_prepared: number; avg_prep_time_mins: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("perch_admin_token") || "";
    listVenues(token).then((res) => {
      setBranches(res.venues || []);
      if (res.venues && res.venues.length > 0) {
        const defaultBranch = String(res.venues[0]._id || res.venues[0].id);
        setSelectedBranch(defaultBranch);
        fetchAnalyticsDashboard(defaultBranch);
      }
    });
  }, []);

  const fetchAnalyticsDashboard = async (branchId: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("perch_admin_token") || "";
      
      // 1. Fetch Venue Analytics
      try {
        const branchStats = await getBranchKitchenAnalytics(branchId, token);
        setVenueAnalytics(branchStats.data || { hours_logged: 0, orders_prepared: 0, avg_prep_time_mins: 0 });
      } catch (err) {
        setVenueAnalytics({ hours_logged: 0, orders_prepared: 0, avg_prep_time_mins: 0 });
      }

      // 2. Fetch Staff and their individual analytics
      const res = await getStaffList(branchId, token);
      if (res.staff && res.staff.length > 0) {
         const staffPromises = res.staff.map(async (staff: any) => {
             // For now, kitchen analytics might only apply strictly to chefs, but we fetch for everyone
             try {
                const sRes = await getStaffAnalytics(staff._id || staff.id, token);
                return {
                   ...staff,
                   stats: sRes.data || { hours_logged: 0, orders_prepared: 0, avg_prep_time_mins: 0 }
                };
             } catch (err) {
                return {
                   ...staff,
                   stats: { hours_logged: 0, orders_prepared: 0, avg_prep_time_mins: 0 }
                };
             }
         });
         const enrichedStaff = await Promise.all(staffPromises);
         setStaffList(enrichedStaff);
      } else {
         setStaffList([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBranch = e.target.value;
    setSelectedBranch(newBranch);
    fetchAnalyticsDashboard(newBranch);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
          >
            Staff Analytics
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Monitor kitchen performance and operational efficiency.
          </p>
        </div>
        
        <select 
          value={selectedBranch} 
          onChange={handleBranchChange}
          className="px-4 py-2 border rounded-xl outline-none text-sm font-medium bg-white shadow-sm min-w-[200px]"
        >
          {branches.map(b => (
            <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading analytics...</div>
      ) : (
        <>
          {/* Venue Aggregates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock size={64} style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="relative z-10">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-muted)" }}>Venue Hours Logged</p>
                <h3 className="text-4xl font-bold" style={{ color: "var(--color-text)" }}>{venueAnalytics?.hours_logged || 0}h</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShoppingBag size={64} style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="relative z-10">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-muted)" }}>Total Orders Prepared</p>
                <h3 className="text-4xl font-bold" style={{ color: "var(--color-text)" }}>{venueAnalytics?.orders_prepared || 0}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Timer size={64} style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="relative z-10">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-muted)" }}>Venue Avg Prep Time</p>
                <h3 className="text-4xl font-bold" style={{ color: "var(--color-text)" }}>{venueAnalytics?.avg_prep_time_mins || 0}m</h3>
              </div>
            </div>
          </div>

           {/* Detailed Table */}
          <h2 className="text-lg font-bold mb-4">Staff Performance breakdown</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                 <tr>
                   <th className="p-4 font-medium">Name</th>
                   <th className="p-4 font-medium">Role</th>
                   <th className="p-4 font-medium">Status</th>
                   <th className="p-4 font-medium text-right">Orders Completed</th>
                   <th className="p-4 font-medium text-right">COD Cash Collected</th>
                   <th className="p-4 font-medium text-right">Avg Time</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {staffList.length === 0 ? (
                   <tr>
                     <td colSpan={6} className="p-8 text-center text-gray-500 text-sm border-dashed">
                       No staff found for this venue.
                     </td>
                   </tr>
                 ) : (
                   staffList.map(staff => {
                     const isWaiter = staff.role === "waiter";
                     const completedCount = isWaiter ? (staff.stats?.orders_delivered || 0) : (staff.stats?.orders_prepared || 0);
                     const avgTime = isWaiter ? (staff.stats?.avg_delivery_time_mins || 0) : (staff.stats?.avg_prep_time_mins || 0);
                     const cashColl = staff.stats?.cash_collected || 0;

                     return (
                       <tr key={staff.id || staff._id}>
                         <td className="p-4 font-medium text-gray-900">{staff.name}</td>
                         <td className="p-4 text-gray-500 text-sm capitalize">{staff.role.replace("_", " ")}</td>
                         <td className="p-4">
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700`}>
                              {STATUS_MAP[staff.status]?.icon || "🔴"} {STATUS_MAP[staff.status]?.label || "Offline"}
                           </span>
                         </td>
                         <td className="p-4 text-right font-bold text-gray-900">
                           {completedCount} <span className="text-[10px] text-gray-400 font-normal">{isWaiter ? "delivered" : "prepared"}</span>
                         </td>
                         <td className="p-4 text-right font-mono font-bold text-emerald-700">
                           {isWaiter ? `₹${cashColl.toFixed(2)}` : "—"}
                         </td>
                         <td className="p-4 text-right font-medium text-gray-600">{avgTime} mins</td>
                       </tr>
                     );
                   })
                 )}
               </tbody>
             </table>
          </div>
        </>
      )}
    </div>
  );
}
