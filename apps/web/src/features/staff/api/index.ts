import { apiFetch } from "@/lib/apiClient";

export interface CreateStaffRequest {
  name: string;
  phone?: string;
  role: string;
  branch_id: string;
  employee_id?: string;
}

export function createStaff(data: CreateStaffRequest, token: string) {
  return apiFetch<{
    status: string;
    staff: Record<string, unknown>;
    credentials: { username: string; temporary_password: string };
  }>("/admin/staff", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

export function getStaffList(branchId: string, token: string) {
  return apiFetch<{ staff: Record<string, unknown>[] }>(`/admin/staff?branch_id=${branchId}`, { token });
}

export function updateStaffStatus(userId: string, status: string, token: string) {
  return apiFetch<{ status: string; new_status: string }>(`/admin/staff/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    token,
  });
}

export function getStaffAnalytics(userId: string, token: string) {
  return apiFetch<{ data: { hours_logged: number; orders_prepared: number; avg_prep_time_mins: number } }>(`/admin/staff/${userId}/analytics`, { token });
}

export function updateStaff(userId: string, data: { name?: string; role?: string; branch_id?: string }, token: string) {
  return apiFetch<{ status: string; message: string }>(`/admin/staff/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    token,
  });
}

export function deleteStaff(userId: string, token: string) {
  return apiFetch<{ status: string; message: string }>(`/admin/staff/${userId}`, {
    method: "DELETE",
    token,
  });
}

export function resetStaffPassword(userId: string, token: string) {
  return apiFetch<{ status: string; new_password: string; email: string }>(`/admin/staff/${userId}/reset-password`, {
    method: "POST",
    token,
  });
}
