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

export function sendVenueMessage(venueId: string, content: string, token: string) {
  return apiFetch<{ status: string; message_id: string }>(`/chat/${venueId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
    token,
  });
}

export function getVenueMessages(venueId: string, token: string, limit: number = 50) {
  return apiFetch<{
    messages: {
      id: string;
      sender_id: string;
      display_name: string;
      username: string;
      show_username_suffix: boolean;
      profile_photo: string | null;
      status_emoji: string;
      content: string;
      created_at: string;
      edited: boolean;
      reactions: any[];
      replies: any[];
    }[];
  }>(`/chat/${venueId}/messages?limit=${limit}`, { token });
}

export function getDiscoveryProfiles(token: string, page: number = 1, size: number = 20) {
  return apiFetch<{ profiles: any[]; total: number }>(`/discovery/?page=${page}&size=${size}`, { token });
}

export function sendWave(receiverId: string, token: string) {
  return apiFetch<{ status: string; wave_id?: string }>("/connections/wave", {
    method: "POST",
    body: JSON.stringify({ receiver_id: receiverId }),
    token,
  });
}

export function acceptWave(waveId: string, token: string) {
  return apiFetch<{ status: string; connection_id?: string }>(`/connections/wave/${waveId}/accept`, {
    method: "POST",
    token,
  });
}

export function ignoreWave(waveId: string, token: string) {
  return apiFetch<{ status: string }>(`/connections/wave/${waveId}/ignore`, {
    method: "POST",
    token,
  });
}

export function getPendingWaves(token: string) {
  return apiFetch<{ wave_id: string; sender_id: string; sender_name: string; sender_photo: string | null; created_at: string }[]>("/connections/pending", { token });
}

export function getMyConnections(token: string) {
  return apiFetch<any[]>("/connections/", { token });
}

export function getPublicProfile(idOrUsername: string, token: string) {
  return apiFetch<any>(`/profile/${idOrUsername}`, { token });
}

export function getDirectMessages(connectionId: string, token: string, page: number = 1, size: number = 50) {
  return apiFetch<{ messages: any[] }>(`/direct/${connectionId}/messages?page=${page}&size=${size}`, { token });
}

export function sendDirectMessage(connectionId: string, content: string, token: string) {
  return apiFetch<any>(`/direct/${connectionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
    token,
  });
}

export function getVenuePolls(venueId: string, token: string) {
  return apiFetch<{
    polls: {
      id: string;
      question: str;
      creator_handle: string;
      created_at: string;
      total_votes: number;
      options: { id: string; text: string; votes: number; percentage: number }[];
      voted_option_id: string | null;
    }[];
  }>(`/polls/${venueId}`, { token });
}

export function createVenuePoll(venueId: string, question: string, options: string[], token: string) {
  return apiFetch<{ status: string; poll_id: string }>(`/polls/${venueId}`, {
    method: "POST",
    body: JSON.stringify({ question, options }),
    token,
  });
}

export function voteVenuePoll(venueId: string, pollId: string, optionId: string, token: string) {
  return apiFetch<{ status: string }>(`/polls/${venueId}/${pollId}/vote`, {
    method: "POST",
    body: JSON.stringify({ option_id: optionId }),
    token,
  });
}





