"use client";

import { useState, useEffect } from "react";
import { updateVenue, listVenues } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ClipboardList, Save, MapPin, Wifi, Info, Image as ImageIcon, CreditCard } from "lucide-react";
import { getPaymentSettings, updatePaymentSettings } from "@/features/admin/api";

export default function SettingsPage() {
  const [venueId, setVenueId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
    logo_url: "",
    wifi_ssid: "",
    wifi_password: "",
    razorpay_key_id: "",
    razorpay_key_secret: "",
    razorpay_webhook_secret: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadVenue() {
      try {
        const token = localStorage.getItem("perch_admin_token") || "";
        const data = await listVenues(token);
        if (data.venues && data.venues.length > 0) {
          const v = data.venues[0] as any;
          setVenueId(v._id || v.id);
          
          let paymentSettings = { razorpay_key_id: "", razorpay_key_secret: "", razorpay_webhook_secret: "" };
          try {
            paymentSettings = await getPaymentSettings(token);
          } catch (e) {
            console.error("Failed to load payment settings", e);
          }
          
          setFormData({
            name: v.name || "",
            address: v.address || "",
            description: v.description || "",
            logo_url: v.logo_url || "",
            wifi_ssid: v.wifi_ssid || "",
            wifi_password: v.wifi_password ? "********" : "",
            razorpay_key_id: paymentSettings.razorpay_key_id || "",
            razorpay_key_secret: paymentSettings.razorpay_key_secret ? "********" : "",
            razorpay_webhook_secret: paymentSettings.razorpay_webhook_secret ? "********" : "",
          });
        }
      } catch (err) {
        console.error("Failed to load venue", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadVenue();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueId) return;

    setIsSaving(true);
    setMessage("");

    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      
      // Don't update password if it's the mask
      const payload: any = { ...formData };
      if (payload.wifi_password === "********") {
        delete payload.wifi_password;
      }

      await updateVenue(venueId, payload, token);
      
      const paymentPayload = {
        razorpay_key_id: formData.razorpay_key_id,
        razorpay_key_secret: formData.razorpay_key_secret,
        razorpay_webhook_secret: formData.razorpay_webhook_secret,
      };
      await updatePaymentSettings(paymentPayload, token);

      setMessage("Settings saved successfully!");
    } catch (err) {
      setMessage("Failed to save settings.");
      console.error(err);
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-black/10 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-black/10 rounded"></div>
              <div className="h-4 bg-black/10 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div
          className="p-3 rounded-2xl"
          style={{ background: "rgba(139, 94, 60, 0.1)" }}
        >
          <ClipboardList size={24} style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            Cafe Settings
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Update your public profile, location, and guest WiFi.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <div className="p-6 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Info size={18} /> Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Cafe Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Logo URL</label>
              <div className="relative">
                <ImageIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted)" }} />
                <input
                  type="url"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all resize-none"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
                placeholder="Welcome to our cozy cafe..."
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="p-6 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin size={18} /> Location
          </h2>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Coffee St, New York, NY"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
            />
          </div>
        </div>

        {/* WiFi */}
        <div className="p-6 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Wifi size={18} /> Guest WiFi
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-muted)" }}>
            Automatically connect your guests to the internet when they scan the table QR code.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Network Name (SSID)</label>
              <input
                type="text"
                name="wifi_ssid"
                value={formData.wifi_ssid}
                onChange={handleChange}
                placeholder="Cafe_Guest_Wifi"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Password</label>
              <input
                type="password"
                name="wifi_password"
                value={formData.wifi_password}
                onChange={handleChange}
                placeholder="Leave blank if no password"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
          </div>
        </div>

        {/* Payments */}
        <div className="p-6 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CreditCard size={18} /> Payment Configuration
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-muted)" }}>
            Connect your Razorpay account to accept UPI and Card payments. Money goes directly to your account.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Razorpay Key ID</label>
              <input
                type="text"
                name="razorpay_key_id"
                value={formData.razorpay_key_id}
                onChange={handleChange}
                placeholder="rzp_live_xxxxxxxxxxx"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Razorpay Key Secret</label>
              <input
                type="password"
                name="razorpay_key_secret"
                value={formData.razorpay_key_secret}
                onChange={handleChange}
                placeholder="Leave blank if unchanged"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Webhook Secret</label>
              <input
                type="password"
                name="razorpay_webhook_secret"
                value={formData.razorpay_webhook_secret}
                onChange={handleChange}
                placeholder="Leave blank if unchanged"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <p className="text-sm font-medium" style={{ color: message.includes("Failed") ? "var(--color-danger)" : "var(--color-success)" }}>
            {message}
          </p>
          <Button type="submit" variant="primary" isLoading={isSaving} className="gap-2 px-8">
            <Save size={16} /> Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
