import { apiFetch } from "@/lib/apiClient";

export function createOrder(data: {
  venue_id: string;
  customer_handle: string;
  customer_name?: string;
  customer_email?: string;
  table_number: string;
  items: { menu_item_id: string; name: string; price: number; quantity: number }[];
  payment_method: string;
}) {
  return apiFetch<{ order: Record<string, unknown>; access_token?: string }>("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getOrder(orderId: string, accessToken?: string) {
  const query = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : "";
  return apiFetch<{ order: Record<string, unknown> }>(`/orders/${orderId}${query}`);
}

export function listVenueOrders(venueId: string, token: string) {
  return apiFetch<{ orders: Record<string, unknown>[] }>(`/admin/orders/${venueId}`, { token });
}

export function updateOrderStatus(orderId: string, orderStatus: string, token: string) {
  return apiFetch<{ order: Record<string, unknown> }>(`/admin/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ order_status: orderStatus }),
    token,
  });
}

export const verifyPayment = async (
  orderId: string, 
  paymentData: { razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string }
) => {
  const res = await apiFetch(`/orders/${orderId}/verify-payment`, {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
  return res;
};

export function acceptOrder(orderId: string, token: string) {
  return apiFetch<{ status: string; order: Record<string, unknown> }>(`/admin/orders/${orderId}/accept`, {
    method: "POST",
    token,
  });
}

export function rejectOrder(orderId: string, token: string) {
  return apiFetch<{ status: string; message: string }>(`/admin/orders/${orderId}/reject`, {
    method: "POST",
    token,
  });
}

export function waiterAcceptPickup(orderId: string, token: string) {
  return apiFetch<{ status: string; order: Record<string, unknown> }>(`/admin/orders/${orderId}/waiter-accept`, {
    method: "POST",
    token,
  });
}

export function waiterRejectPickup(orderId: string, token: string) {
  return apiFetch<{ status: string; message: string }>(`/admin/orders/${orderId}/waiter-reject`, {
    method: "POST",
    token,
  });
}

export function getBranchKitchenAnalytics(venueId: string, token: string) {
  return apiFetch<{ status: string; data: { hours_logged: number; orders_prepared: number; avg_prep_time_mins: number } }>(
    `/admin/orders/${venueId}/analytics`,
    { token }
  );
}

export function selfPickupOrder(orderId: string) {
  return apiFetch<{ status: string; order: Record<string, unknown> }>(`/orders/${orderId}/self-pickup`, {
    method: "POST",
  });
}

export function assignWaiter(orderId: string, token: string) {
  return apiFetch<{ status: string; order: Record<string, unknown> }>(`/admin/orders/${orderId}/assign-waiter`, {
    method: "POST",
    token,
  });
}

export function getPaymentMethods(venueId?: string) {
  const query = venueId ? `?venue_id=${encodeURIComponent(venueId)}` : "";
  return apiFetch<{ id: string; label: string; description: string; enabled?: boolean }[]>(`/config/payment-methods${query}`);
}

export function markCashCollected(orderId: string, token: string) {
  return apiFetch<Record<string, unknown>>(`/admin/orders/${orderId}/cash-collected`, {
    method: "PATCH",
    token,
  });
}

