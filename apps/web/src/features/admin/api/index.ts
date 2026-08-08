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

export function registerCafe(data: { cafe_name: string; password: string; gst_number?: string }, token: string) {
  return apiFetch<{ status: string; cafe_id: string; restaurant_id: string }>("/superadmin/register-cafe", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

export function getPaymentSettings(token: string) {
  return apiFetch<{
    razorpay_key_id: string;
    razorpay_key_secret: string;
    razorpay_webhook_secret: string;
    allow_cod?: boolean;
    allow_online_payment?: boolean;
  }>("/admin/settings/payments", { token });
}

export function updatePaymentSettings(data: {
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  razorpay_webhook_secret?: string;
  allow_cod?: boolean;
  allow_online_payment?: boolean;
}, token: string) {
  return apiFetch<{ status: string }>("/admin/settings/payments", {
    method: "PATCH",
    body: JSON.stringify(data),
    token,
  });
}
