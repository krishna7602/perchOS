import { apiFetch } from "@/lib/apiClient";

export function getDashboard(token: string) {
  return apiFetch<{
    venue_count: number;
    active_chat_rooms: number;
    total_online_users: number;
    total_orders: number;
    total_revenue: number;
    total_menu_items: number;
  }>("/admin/dashboard", { token });
}

export function registerCafe(data: { cafe_name: string; password: string }, token: string) {
  return apiFetch<{ status: string; cafe_id: string; restaurant_id: string }>("/superadmin/register-cafe", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}
