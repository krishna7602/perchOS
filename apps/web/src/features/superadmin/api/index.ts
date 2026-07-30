import { apiFetch } from "@/lib/apiClient";

export interface CafeItem {
  restaurant_id: string;
  name: string;
  owner_id: string;
  owner_email: string;
  owner_name: string;
  created_at: string;
}

export function listCafes(token: string) {
  return apiFetch<{ cafes: CafeItem[] }>("/superadmin/cafes", { token });
}

export function registerCafe(data: { cafe_name: string }, token: string) {
  return apiFetch<{ status: string; cafe_id: string; restaurant_id: string }>("/superadmin/register-cafe", {
    method: "POST",
    body: JSON.stringify({ ...data, password: "temp_password_123" }), // Legacy compat, not really used if we do auto-pass, but keeping it for now
    token,
  });
}

export function updateCafe(restaurantId: string, data: { cafe_name: string }, token: string) {
  return apiFetch<{ status: string; message: string }>(`/superadmin/cafes/${restaurantId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    token,
  });
}

export function deleteCafe(restaurantId: string, token: string) {
  return apiFetch<{ status: string; message: string }>(`/superadmin/cafes/${restaurantId}`, {
    method: "DELETE",
    token,
  });
}

export function resetCafeOwnerPassword(ownerId: string, token: string) {
  return apiFetch<{ status: string; new_password: string; email: string }>(`/superadmin/cafes/${ownerId}/reset-password`, {
    method: "POST",
    token,
  });
}
