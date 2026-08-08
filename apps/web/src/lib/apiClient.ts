export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://perchos.onrender.com";

export interface FetchOptions extends RequestInit {
  token?: string;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    headers,
    ...rest,
  });

  if (!res.ok) {
    let detail = "request_failed";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }

  return res.json();
}
