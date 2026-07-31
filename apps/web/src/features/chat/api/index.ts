import { apiFetch, API_URL } from "@/lib/apiClient";

export function joinRoom(data: { qr_token: string; display_name?: string; is_anonymous: boolean }) {
  let deviceId = "";
  if (typeof window !== "undefined") {
    deviceId = localStorage.getItem("perch_device_id") || "";
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("perch_device_id", deviceId);
    }
  }

  // Handle anonymous fallback
  const name = data.display_name || (data.is_anonymous ? `Guest_${Math.floor(Math.random() * 10000)}` : "Guest");

  return apiFetch<{ venue_id: string; venue_name: string; chat_token: string; handle: string }>(
    "/sessions/join",
    { 
      method: "POST", 
      body: JSON.stringify({
        qr_token: data.qr_token,
        device_id: deviceId,
        name: name,
        mode: "Networking",
        is_visible: true,
        interests: [],
        skills: [],
        professional_tags: []
      }) 
    }
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
