"use client";

import { useState, useEffect } from "react";
import { getStaffList, updateStaffStatus, updateStaff, deleteStaff, resetStaffPassword } from "@/features/staff/api";
import { listVenues } from "@/features/venues/api";
import { Edit2, KeyRound, Trash2, X } from "lucide-react";

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

export function StaffList() {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "", branch_id: "" });
  const [credentials, setCredentials] = useState<{ email: string; pass: string } | null>(null);

  const fetchStaff = async (branchId: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("perch_admin_token") || "";
      const res = await getStaffList(branchId, token);
      setStaffList(res.staff || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("perch_admin_token") || "";
    listVenues(token).then((res) => {
      setBranches(res.venues || []);
      if (res.venues && res.venues.length > 0) {
        const defaultBranch = res.venues[0]._id || res.venues[0].id;
        setSelectedBranch(defaultBranch);
        fetchStaff(defaultBranch);
      }
    });
  }, []);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBranch = e.target.value;
    setSelectedBranch(newBranch);
    fetchStaff(newBranch);
  };

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      await updateStaffStatus(userId, newStatus, token);
      setStaffList(prev => prev.map(s => s.id === userId ? { ...s, status: newStatus } : s));
    } catch (e) {
      alert("Failed to update status");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this staff member completely?")) return;
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      await deleteStaff(userId, token);
      fetchStaff(selectedBranch);
    } catch (e) {
      alert("Failed to delete staff member.");
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm("Reset password? The staff member will be logged out and forced to change it on next login.")) return;
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      const res = await resetStaffPassword(userId, token);
      setCredentials({ email: res.email, pass: res.new_password });
    } catch (e) {
      alert("Failed to reset password.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      await updateStaff(editingStaff.id, editForm, token);
      setEditingStaff(null);
      fetchStaff(selectedBranch); // refresh
    } catch (e) {
      alert("Failed to update staff.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-8 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold">Staff Directory</h2>
          <p className="text-sm text-gray-500">View and manage your team members.</p>
        </div>
        
        <select 
          value={selectedBranch} 
          onChange={handleBranchChange}
          className="px-4 py-2 rounded-xl text-sm border outline-none bg-gray-50 min-w-[200px]"
        >
          {branches.map(b => (
            <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {credentials && (
        <div className="mb-6 bg-green-50 border border-green-200 p-6 rounded-2xl relative">
          <button 
            onClick={() => setCredentials(null)}
            className="absolute top-4 right-4 text-green-700 hover:bg-green-100 p-1 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
          <h3 className="text-green-800 font-semibold mb-2">Password Reset Successful</h3>
          <p className="text-sm text-green-700 mb-4">Please securely share these credentials with the staff member.</p>
          <div className="bg-white p-3 rounded-xl border border-green-100 font-mono text-sm">
            <div className="text-gray-500 text-xs">Email</div>
            <div className="text-gray-900 mb-2">{credentials.email}</div>
            <div className="text-gray-500 text-xs">New Temporary Password</div>
            <div className="text-gray-900">{credentials.pass}</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading staff...</div>
      ) : staffList.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500 border border-dashed rounded-xl">
          No staff members found in this branch.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffList.map((staff) => {
                const statusMeta = STATUS_MAP[staff.status] || STATUS_MAP.OFFLINE;
                return (
                  <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium">{staff.name}</div>
                      <div className="text-xs text-gray-500 flex gap-2">
                        <span>{staff.email}</span>
                        {staff.employee_id && <span>• ID: {staff.employee_id}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                        {staff.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{statusMeta.icon}</span>
                        <span className={`text-sm font-medium ${statusMeta.color}`}>{statusMeta.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                      <select 
                        value="" 
                        onChange={(e) => handleStatusUpdate(staff.id, e.target.value)}
                        className="text-xs border rounded-lg px-2 py-1.5 outline-none cursor-pointer bg-white mr-2"
                      >
                        <option value="" disabled>Status</option>
                        {Object.entries(STATUS_MAP).map(([key, meta]) => (
                          <option key={key} value={key}>{meta.icon} {meta.label}</option>
                        ))}
                      </select>
                      
                      <button 
                        onClick={() => {
                          setEditingStaff(staff);
                          setEditForm({ name: staff.name, role: staff.role, branch_id: selectedBranch });
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleResetPassword(staff.id)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <KeyRound size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(staff.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Staff"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Edit Staff Member</h2>
              <button onClick={() => setEditingStaff(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border outline-none bg-gray-50 focus:bg-white focus:border-[var(--color-primary)] transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm({...editForm, role: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border outline-none bg-gray-50 focus:bg-white focus:border-[var(--color-primary)] transition-colors text-sm"
                  >
                    <option value="waiter">Waiter</option>
                    <option value="chef">Chef</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select
                    value={editForm.branch_id}
                    onChange={e => setEditForm({...editForm, branch_id: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border outline-none bg-gray-50 focus:bg-white focus:border-[var(--color-primary)] transition-colors text-sm"
                  >
                    {branches.map(b => (
                      <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: "var(--color-primary)" }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
