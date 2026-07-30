"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { createStaff, CreateStaffRequest } from "@/features/staff/api";
import { listVenues } from "@/features/venues/api";

const ROLES = [
  "manager",
  "chef",
  "waiter",
  "cashier",
  "kitchen_staff",
  "inventory_manager",
  "cleaner",
  "reception",
  "delivery_staff",
];

export function StaffManager() {
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; temporary_password: string } | null>(null);

  const [formData, setFormData] = useState<CreateStaffRequest>({
    name: "",
    phone: "",
    role: "waiter",
    branch_id: "",
    employee_id: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("perch_admin_token") || "";
    listVenues(token).then((res) => {
      setBranches(res.venues || []);
      if (res.venues && res.venues.length > 0) {
        setFormData((prev) => ({ ...prev, branch_id: (res.venues[0] as any)._id || (res.venues[0] as any).id }));
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCredentials(null);
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      const res = await createStaff(formData, token);
      setCredentials(res.credentials);
      setFormData({
        ...formData,
        name: "",
        phone: "",
        employee_id: "",
      });
    } catch (err: any) {
      alert("Failed to create staff: " + err.detail || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
      <h2 className="text-xl font-bold mb-6">Onboard New Staff</h2>
      
      {credentials && (
        <div className="mb-6 p-4 rounded-xl border border-green-200 bg-green-50 flex flex-col gap-2">
          <p className="text-green-800 font-medium text-sm">Staff member created successfully! Share these temporary credentials with them:</p>
          <div className="bg-white p-3 rounded-lg border border-green-100 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Username (Email)</p>
              <p className="font-mono text-sm font-semibold">{credentials.username}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Temporary Password</p>
              <p className="font-mono text-sm font-semibold">{credentials.temporary_password}</p>
            </div>
          </div>
          <p className="text-xs text-green-700">They will be required to change their password on first login.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Full Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-xl text-sm border outline-none focus:border-blue-500" placeholder="e.g. Ramesh Kumar" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Phone Number (Optional)</label>
            <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 rounded-xl text-sm border outline-none focus:border-blue-500" placeholder="e.g. +91 9876543210" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Role</label>
            <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 rounded-xl text-sm border outline-none appearance-none bg-white focus:border-blue-500">
              {ROLES.map(r => (
                <option key={r} value={r}>{r.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Branch</label>
            <select required value={formData.branch_id} onChange={e => setFormData({...formData, branch_id: e.target.value})} className="w-full px-4 py-2 rounded-xl text-sm border outline-none appearance-none bg-white focus:border-blue-500">
              {branches.map((b: any) => (
                <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5">Employee ID (Optional)</label>
          <input type="text" value={formData.employee_id} onChange={e => setFormData({...formData, employee_id: e.target.value})} className="w-full px-4 py-2 rounded-xl text-sm border outline-none focus:border-blue-500" placeholder="e.g. EMP-1042" />
        </div>

        <div className="pt-4">
          <Button type="submit" isLoading={isLoading} className="w-full">
            Create Staff Account
          </Button>
        </div>
      </form>
    </div>
  );
}
