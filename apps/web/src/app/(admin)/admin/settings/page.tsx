"use client";

import { useState, useEffect } from "react";
import { listVenues, updateVenue } from "@/features/venues/api";
import { getPaymentSettings, updatePaymentSettings } from "@/features/admin/api";
import { Button } from "@/components/ui/Button";
import { Store, Wifi, Save, CreditCard, Lock } from "lucide-react";

export default function AdminSettingsPage() {
  const [venueId, setVenueId] = useState<string | null>(null);
  const [allowCod, setAllowCod] = useState(true);
  const [allowOnlinePayment, setAllowOnlinePayment] = useState(true);
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
          
          let paymentSettings: any = { razorpay_key_id: "", razorpay_key_secret: "", razorpay_webhook_secret: "", allow_cod: true, allow_online_payment: true };
          try {
            paymentSettings = await getPaymentSettings(token);
            setAllowCod(paymentSettings.allow_cod !== false);
            setAllowOnlinePayment(paymentSettings.allow_online_payment !== false);
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
        allow_cod: allowCod,
        allow_online_payment: allowOnlinePayment,
      };
      await updatePaymentSettings(paymentPayload, token);

      setMessage("Settings saved successfully!");
    } catch (err) {
      setMessage("Failed to save settings.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-amber-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          Venue Settings
        </h1>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Manage your venue details, guest Wi-Fi credentials, and payment options.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile */}
        <div className="p-6 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Store size={18} /> Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Venue Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all resize-none"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Logo URL</label>
              <input
                type="url"
                name="logo_url"
                value={formData.logo_url}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
          </div>
        </div>

        {/* Guest WiFi */}
        <div className="p-6 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Wifi size={18} /> Guest Wi-Fi Credentials
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-muted)" }}>
            Checked-in guests can access Wi-Fi details safely. Password is encrypted (AES-256).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Network Name (SSID)</label>
              <input
                type="text"
                name="wifi_ssid"
                value={formData.wifi_ssid}
                onChange={handleChange}
                placeholder="CafeGuest_5G"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Wi-Fi Password</label>
              <input
                type="password"
                name="wifi_password"
                value={formData.wifi_password}
                onChange={handleChange}
                placeholder="Leave blank if unchanged"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
          </div>
        </div>

        {/* Payments */}
        <div className="p-6 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <CreditCard size={18} /> Payment Options & Gateway Configuration
          </h2>
          <p className="text-xs mb-6" style={{ color: "var(--color-muted)" }}>
            Toggle payment methods available to customers at checkout, or configure Razorpay credentials.
          </p>

          {/* Payment Method Toggles */}
          <div className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-900/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">Active Customer Payment Options</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cash on Delivery Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-gray-200 shadow-xs">
                <div>
                  <p className="text-sm font-bold text-gray-900">💵 Cash on Delivery (COD)</p>
                  <p className="text-xs text-gray-500">Allow patrons to pay in cash to staff</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowCod(!allowCod)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allowCod ? "bg-amber-800" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      allowCod ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Online Payment Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-gray-200 shadow-xs">
                <div>
                  <p className="text-sm font-bold text-gray-900">💳 Online Payment (Razorpay)</p>
                  <p className="text-xs text-gray-500">Allow UPI, Cards, and Net Banking</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowOnlinePayment(!allowOnlinePayment)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allowOnlinePayment ? "bg-amber-800" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      allowOnlinePayment ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

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
