import { apiFetch } from "@/lib/apiClient";

export function getMenuByQr(menuQrToken: string) {
  return apiFetch<{ venue_id: string; venue_name: string; items: Record<string, unknown>[] }>(
    `/menu/${menuQrToken}`
  );
}

export function getMenuByVenue(venueId: string) {
  return apiFetch<{ venue_id: string; venue_name: string; items: Record<string, unknown>[] }>(
    `/menu/by-venue/${venueId}`
  );
}

export function listMenuItems(venueId: string, token: string) {
  return apiFetch<{ items: Record<string, unknown>[] }>(`/admin/menu/${venueId}`, { token });
}

export function createMenuItem(venueId: string, data: Record<string, unknown>, token: string) {
  return apiFetch<{ item: Record<string, unknown> }>(`/admin/menu/${venueId}`, {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

export function updateMenuItem(itemId: string, data: Record<string, unknown>, token: string) {
  return apiFetch<{ item: Record<string, unknown> }>(`/admin/menu/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(data),
    token,
  });
}

export function deleteMenuItem(itemId: string, token: string) {
  return apiFetch<{ deleted: boolean }>(`/admin/menu/${itemId}`, {
    method: "DELETE",
    token,
  });
}
