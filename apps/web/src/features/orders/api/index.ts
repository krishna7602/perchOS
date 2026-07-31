import { apiFetch } from "@/lib/apiClient";

export function createOrder(data: {
  venue_id: string;
  customer_handle: string;
  items: { menu_item_id: string; name: string; price: number; quantity: number }[];
  payment_method: string;
}) {
  return apiFetch<{ order: Record<string, unknown> }>("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getOrder(orderId: string) {
  return apiFetch<{ order: Record<string, unknown> }>(`/orders/${orderId}`);
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
