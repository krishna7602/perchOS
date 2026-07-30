"use client";

import { useState, useEffect } from "react";
import { listCafes, registerCafe, updateCafe, deleteCafe, resetCafeOwnerPassword, CafeItem } from "@/features/superadmin/api";
import { Shield, Search, MoreVertical, Edit2, KeyRound, Trash2 } from "lucide-react";

export default function SuperAdminCafesPage() {
  const [cafes, setCafes] = useState<CafeItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modals state
  const [newCafeName, setNewCafeName] = useState("");
  const [editingCafe, setEditingCafe] = useState<CafeItem | null>(null);
  const [editName, setEditName] = useState("");
  const [credentials, setCredentials] = useState<{ email: string; pass: string } | null>(null);

  useEffect(() => {
    fetchCafes();
  }, []);

  const fetchCafes = async () => {
    setLoading(true);
    const token = localStorage.getItem("perch_admin_token") || "";
    try {
      const res = await listCafes(token);
      setCafes(res.cafes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCafeName.trim()) return;
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      // we generate a random password for them and they will have to change it, or we just let registerCafe handle it
      // actually register-cafe requires a password in the payload right now.
      const tempPass = Math.random().toString(36).slice(-8);
      
      const res = await fetch("http://localhost:8000/superadmin/register-cafe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ cafe_name: newCafeName, password: tempPass })
      });
      const data = await res.json();
      if (res.ok) {
        setCredentials({ email: data.cafe_id, pass: tempPass });
        setNewCafeName("");
        fetchCafes();
      } else {
        alert("Failed: " + data.detail);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = async () => {
    if (!editingCafe || !editName.trim()) return;
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      await updateCafe(editingCafe.restaurant_id, { cafe_name: editName }, token);
      setEditingCafe(null);
      fetchCafes();
    } catch (e) {
      alert("Failed to update cafe");
    }
  };

  const handleDelete = async (cafeId: string) => {
    if (!confirm("Are you sure you want to completely delete this cafe and all its data?")) return;
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      await deleteCafe(cafeId, token);
      fetchCafes();
    } catch (e) {
      alert("Failed to delete cafe");
    }
  };

  const handleResetPassword = async (ownerId: string) => {
    if (!confirm("Reset this owner's password? They will be logged out.")) return;
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      const res = await resetCafeOwnerPassword(ownerId, token);
      setCredentials({ email: res.email, pass: res.new_password });
    } catch (e) {
      alert("Failed to reset password");
    }
  };

  const filteredCafes = cafes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.owner_email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 relative">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold mb-1 flex items-center gap-2"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
        >
          <Shield className="text-[var(--color-primary)]" />
          Super Admin: Cafe Management
        </h1>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Manage all registered cafes and their owners across the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
        {/* Left: Register New */}
        <div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-semibold mb-4 text-gray-900">Onboard New Cafe</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Cafe Name</label>
                <input
                  type="text"
                  required
                  value={newCafeName}
                  onChange={e => setNewCafeName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border outline-none bg-gray-50 focus:bg-white focus:border-[var(--color-primary)] transition-colors text-sm"
                  placeholder="e.g. The Coffee House"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-medium text-white transition-opacity hover:opacity-90 text-sm"
                style={{ background: "var(--color-primary)" }}
              >
                Create Cafe Account
              </button>
            </form>
          </div>

          {credentials && (
            <div className="mt-4 bg-green-50 border border-green-200 p-6 rounded-2xl">
              <h3 className="text-green-800 font-semibold mb-2">Credentials Generated</h3>
              <p className="text-sm text-green-700 mb-4">Please securely share these credentials with the owner.</p>
              <div className="bg-white p-3 rounded-xl border border-green-100 font-mono text-sm mb-2">
                <div className="text-gray-500 text-xs">Email</div>
                <div className="text-gray-900 mb-2">{credentials.email}</div>
                <div className="text-gray-500 text-xs">Temporary Password</div>
                <div className="text-gray-900">{credentials.pass}</div>
              </div>
              <button 
                onClick={() => setCredentials(null)}
                className="text-xs text-green-700 font-medium underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Right: List */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Registered Cafes</h2>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cafes..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border rounded-xl outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-gray-500">Loading cafes...</div>
            ) : filteredCafes.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">No cafes found.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">Cafe Details</th>
                    <th className="px-6 py-4 font-medium">Owner</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCafes.map(cafe => (
                    <tr key={cafe.restaurant_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{cafe.name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {cafe.restaurant_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900">{cafe.owner_name}</div>
                        <div className="text-xs text-gray-500">{cafe.owner_email}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => { setEditingCafe(cafe); setEditName(cafe.name); }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Cafe"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleResetPassword(cafe.owner_id)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(cafe.restaurant_id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Cafe"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingCafe && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Edit Cafe</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cafe Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border outline-none bg-gray-50 focus:bg-white focus:border-[var(--color-primary)] transition-colors text-sm"
              />
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={() => setEditingCafe(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--color-primary)" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
