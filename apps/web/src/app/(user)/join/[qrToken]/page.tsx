"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVenueByQr, joinRoom } from "@/lib/api";
import { NameEntryForm } from "@/features/chat/components/NameEntryForm";
import { Loader } from "@/components/ui/Loader";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const qrToken = params.qrToken as string;

  const [venue, setVenue] = useState<{
    id: string;
    name: string;
    wifi_ssid: string | null;
    wifi_password: string | null;
  } | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!qrToken) return;
    getVenueByQr(qrToken)
      .then((data) => {
        setVenue(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError("Invalid or expired QR code.");
        setIsLoading(false);
      });
  }, [qrToken]);

  const handleSubmit = async (displayName: string, isAnonymous: boolean) => {
    setIsJoining(true);
    try {
      const data = await joinRoom({
        qr_token: qrToken,
        display_name: displayName || undefined,
        is_anonymous: isAnonymous,
      });

      // Store chat token and handle in sessionStorage for the room page
      sessionStorage.setItem("perch_chat_token", data.chat_token);
      sessionStorage.setItem("perch_handle", data.handle);
      sessionStorage.setItem("perch_venue_name", data.venue_name);

      router.push(`/venue/${data.venue_id}/chat`);
    } catch {
      setError("Failed to join. Please try again.");
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Loading venue..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <p className="text-4xl mb-4">😕</p>
          <p className="text-lg font-medium mb-2" style={{ color: "var(--color-text)" }}>
            {error}
          </p>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Try scanning the QR code again.
          </p>
        </div>
      </div>
    );
  }

  if (!venue) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <NameEntryForm
        venueName={venue.name}
        wifiSsid={venue.wifi_ssid}
        wifiPassword={venue.wifi_password}
        onSubmit={handleSubmit}
        isLoading={isJoining}
      />
    </div>
  );
}
