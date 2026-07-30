"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatRoom } from "@/features/chat/components/ChatRoom";
import { Loader } from "@/components/ui/Loader";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.venueId as string;

  const [chatToken, setChatToken] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [venueName, setVenueName] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Retrieve session data set during join
    const token = sessionStorage.getItem("perch_chat_token");
    const h = sessionStorage.getItem("perch_handle");
    const name = sessionStorage.getItem("perch_venue_name");

    if (!token || !h) {
      // No session — redirect to home
      router.push("/");
      return;
    }

    setChatToken(token);
    setHandle(h);
    setVenueName(name || "Venue");
    setReady(true);
  }, [router]);

  if (!ready || !chatToken || !handle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Connecting to room..." />
      </div>
    );
  }

  return (
    <ChatRoom
      venueId={venueId}
      venueName={venueName}
      chatToken={chatToken}
      handle={handle}
      onLeave={() => {
        sessionStorage.removeItem("perch_chat_token");
        sessionStorage.removeItem("perch_handle");
        sessionStorage.removeItem("perch_venue_name");
        router.push("/");
      }}
    />
  );
}
