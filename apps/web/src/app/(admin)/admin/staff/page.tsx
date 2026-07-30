import { StaffManager } from "@/features/staff/components/StaffManager";
import { StaffList } from "@/features/staff/components/StaffList";

export default function StaffPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
        >
          Staff & Team
        </h1>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Manage your restaurant team, roles, and branch assignments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
        <div>
          <StaffManager />
        </div>
        <div className="flex flex-col gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold mb-2">Team Statistics</h3>
            <p className="text-sm text-gray-500">Analytics available in the <a href="/admin/staff/analytics" className="text-blue-600 hover:underline">Analytics Dashboard</a>.</p>
          </div>
        </div>
      </div>
      
      <StaffList />
    </div>
  );
}
