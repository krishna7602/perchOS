import { apiFetch } from "@/lib/apiClient";

export function getVenueByQr(qrToken: string) {
  return apiFetch<{ id: string; name: string; wifi_ssid: string | null; wifi_password: string | null }>(
    `/venues/by-qr/${qrToken}`
  );
}

export function createVenue(data: { name: string; lat: number; lng: number; wifi_ssid?: string; wifi_password?: string; address?: string; phone?: string; email?: string; gst_number?: string; description?: string; }, token: string) {
  return apiFetch<{ venue: Record<string, unknown>; join_qr_png_base64: string; menu_qr_png_base64: string }>(
    "/admin/venues",
    { method: "POST", body: JSON.stringify(data), token }
  );
}

export function listVenues(token: string) {
  return apiFetch<{ venues: Record<string, unknown>[] }>("/admin/venues", { token });
}

export function updateVenue(venueId: string, data: Record<string, unknown>, token: string) {
  return apiFetch<{ venue: Record<string, unknown> }>(`/admin/venues/${venueId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    token,
  });
}

export function deleteVenue(venueId: string, token: string) {
  return apiFetch<{ deleted: boolean }>(`/admin/venues/${venueId}`, {
    method: "DELETE",
    token,
  });
}

export function getVenueQr(venueId: string, token: string) {
  return apiFetch<{ join_qr_png_base64: string; menu_qr_png_base64: string; wifi_qr_png_base64?: string }>(
    `/admin/venues/${venueId}/qr`,
    { token }
  );
}
