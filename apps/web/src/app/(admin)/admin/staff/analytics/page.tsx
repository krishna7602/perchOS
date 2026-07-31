"use client";

import { useState, useEffect } from "react";
import { getStaffList, getStaffAnalytics } from "@/features/staff/api";
import { listVenues } from "@/features/venues/api";
import { Clock, ShoppingBag, Timer, ArrowUpRight } from "lucide-react";

export default function StaffAnalyticsPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [analytics, setAnalytics] = useState<{ hours_logged: number; orders_prepared: number; avg_prep_time_mins: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("perch_admin_token") || "";
    listVenues(token).then((res) => {
      setBranches(res.venues || []);
      if (res.venues && res.venues.length > 0) {
        const defaultBranch = String(res.venues[0]._id || res.venues[0].id);
        setSelectedBranch(defaultBranch);
        fetchStaff(defaultBranch);
      }
    });
  }, []);

  const fetchStaff = async (branchId: string) => {
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      const res = await getStaffList(branchId, token);
      setStaffList(res.staff || []);
      if (res.staff && res.staff.length > 0) {
        setSelectedStaff(String(res.staff[0].id));
        fetchAnalytics(String(res.staff[0].id));
      } else {
        setSelectedStaff("");
        setAnalytics(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnalytics = async (userId: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("perch_admin_token") || "";
      const res = await getStaffAnalytics(userId, token);
      setAnalytics(res.data);
    } catch (e) {
      console.error(e);
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBranch = e.target.value;
    setSelectedBranch(newBranch);
    fetchStaff(newBranch);
  };

  const handleStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStaff = e.target.value;
    setSelectedStaff(newStaff);
    fetchAnalytics(newStaff);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
        >
          Staff Analytics
        </h1>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Monitor performance, working hours, and operational efficiency.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <select 
          value={selectedBranch} 
          onChange={handleBranchChange}
          className="px-4 py-2.5 rounded-xl text-sm border outline-none bg-white shadow-sm min-w-[200px]"
        >
          {branches.map(b => (
            <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
          ))}
        </select>

        <select 
          value={selectedStaff} 
          onChange={handleStaffChange}
          className="px-4 py-2.5 rounded-xl text-sm border outline-none bg-white shadow-sm min-w-[250px]"
          disabled={staffList.length === 0}
        >
          {staffList.length === 0 && <option value="">No Staff Available</option>}
          {staffList.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.role.replace("_", " ")})</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading analytics...</div>
      ) : !analytics ? (
        <div className="py-12 text-center text-sm text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
          Select a staff member to view their performance analytics.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock size={64} style={{ color: "var(--color-primary)" }} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-muted)" }}>Hours Logged (7 Days)</p>
              <h3 className="text-4xl font-bold" style={{ color: "var(--color-text)" }}>{analytics.hours_logged}h</h3>
              <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                <ArrowUpRight size={12} /> Active this week
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShoppingBag size={64} style={{ color: "var(--color-primary)" }} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-muted)" }}>Orders Prepared</p>
              <h3 className="text-4xl font-bold" style={{ color: "var(--color-text)" }}>{analytics.orders_prepared}</h3>
              <p className="text-xs text-gray-500 mt-2">Completed in the last 7 days</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Timer size={64} style={{ color: "var(--color-primary)" }} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-muted)" }}>Avg. Prep Time</p>
              <h3 className="text-4xl font-bold" style={{ color: "var(--color-text)" }}>{analytics.avg_prep_time_mins}m</h3>
              <p className="text-xs text-gray-500 mt-2">Per order on average</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
