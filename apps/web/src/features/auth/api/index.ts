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
