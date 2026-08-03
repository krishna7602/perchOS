import { apiFetch } from "@/lib/apiClient";

export function loginAdmin(email: string, password: string) {
  return apiFetch<{ token: string; name: string }>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function googleLoginAdmin(idToken: string) {
  return apiFetch<{ token: string; name: string }>("/auth/admin/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
}

export function getMe(token: string) {
  return apiFetch<{ id: string; name: string; email: string; role: string; status: string }>("/auth/me", { token });
}

export function customerLogin(provider: string, credential: string, venueQrToken?: string) {
  return apiFetch<{
    token: string;
    name: string;
    username: string;
    onboarding_completed: boolean;
    profile_photo: string | null;
    venue_id: string | null;
    venue_name: string | null;
  }>("/auth/customer/login", {
    method: "POST",
    body: JSON.stringify({ provider, credential, venue_qr_token: venueQrToken }),
  });
}

export function customerOnboarding(token: string, data: {
  headline?: string;
  company?: string;
  college?: string;
  interests?: string[];
  professional_tags?: string[];
  networking_mode?: string;
  social_links?: {
    linkedin?: string;
    instagram?: string;
    github?: string;
    portfolio?: string;
    website?: string;
  };
}) {
  return apiFetch<{ status: string; profile: any }>("/auth/customer/onboarding", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

