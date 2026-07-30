"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createVenue } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, MapPin } from "lucide-react";

export default function NewVenuePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    lat: "",
    lng: "",
    wifi_ssid: "",
    wifi_password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setIsDetecting(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString(),
        }));
        setIsDetecting(false);
      },
      () => {
        setError("Failed to get location. Please ensure location permissions are granted.");
        setIsDetecting(false);
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("perch_admin_token");
    if (!token) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await createVenue(
        {
          name: form.name,
          lat: parseFloat(form.lat) || 0,
          lng: parseFloat(form.lng) || 0,
          wifi_ssid: form.wifi_ssid || undefined,
          wifi_password: form.wifi_password || undefined,
        },
        token
      );

      const venue = result.venue as Record<string, unknown>;
      router.push(`/admin/venues/${venue.id}/qr`);
    } catch {
      setError("Failed to create venue.");
      setIsLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--color-bg)",
    border: "1.5px solid var(--color-border)",
    color: "var(--color-text)",
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <ArrowLeft size={18} style={{ color: "var(--color-muted)" }} />
          </button>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
          >
            New Venue
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-md)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
              Venue Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="The Coffee House"
              required
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Location
            </h3>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetecting}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "white",
              }}
            >
              <MapPin size={14} />
              {isDetecting ? "Detecting..." : "Auto-Detect"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
                Latitude *
              </label>
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                placeholder="12.9716"
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
                Longitude *
              </label>
              <input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                placeholder="77.5946"
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <hr style={{ borderColor: "var(--color-border)" }} />

          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            WiFi credentials (optional) — displayed on the join page so users can connect.
          </p>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
              WiFi Network Name
            </label>
            <input
              type="text"
              value={form.wifi_ssid}
              onChange={(e) => setForm({ ...form, wifi_ssid: e.target.value })}
              placeholder="CoffeeHouse-WiFi"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
              WiFi Password
            </label>
            <input
              type="text"
              value={form.wifi_password}
              onChange={(e) => setForm({ ...form, wifi_password: e.target.value })}
              placeholder="password123"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Create Venue
          </Button>
        </form>
      </div>
    </div>
  );
}
