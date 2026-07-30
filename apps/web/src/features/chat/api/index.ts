import { apiFetch, API_URL } from "@/lib/apiClient";

export function joinRoom(data: { qr_token: string; display_name?: string; is_anonymous: boolean }) {
  return apiFetch<{ venue_id: string; venue_name: string; chat_token: string; handle: string }>(
    "/sessions/join",
    { method: "POST", body: JSON.stringify(data) }
  );
}

export function getWsUrl(venueId: string, chatToken: string): string {
  const wsBase = API_URL.replace(/^http/, "ws");
  return `${wsBase}/ws/room/${venueId}?token=${encodeURIComponent(chatToken)}`;
}

export function getTeamChannels(branchId: string, token: string) {
  return apiFetch<{ channels: Record<string, any>[] }>(`/admin/chat/channels?branch_id=${branchId}`, { token });
}

export function getTeamMessages(channelId: string, token: string) {
  return apiFetch<{ messages: Record<string, any>[] }>(`/admin/chat/${channelId}/messages`, { token });
}

export function sendTeamMessage(channelId: string, content: string, token: string) {
  return apiFetch<{ status: string; message_id: string }>(`/admin/chat/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
    token,
  });
}

export function createTeamChannel(
  branchId: string,
  name: string,
  isPublic: boolean,
  members: string[],
  token: string,
  description?: string
) {
  return apiFetch<{ status: string; channel_id: string }>(`/admin/chat/channels?branch_id=${branchId}`, {
    method: "POST",
    body: JSON.stringify({ name, description, is_public: isPublic, members }),
    token,
  });
}
