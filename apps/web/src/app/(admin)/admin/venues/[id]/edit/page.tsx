"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { updateVenue } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";

export default function EditVenuePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [description, setDescription] = useState("");
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    const fetchVenue = async () => {
      const token = localStorage.getItem("perch_admin_token");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      try {
        const res = await fetch(`/api/admin/venues/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Venue not found");
        
        const data = await res.json();
        const venue = data.venue;
        
        setName(venue.name || "");
        setLat(venue.lat?.toString() || "");
        setLng(venue.lng?.toString() || "");
        setWifiSsid(venue.wifi_ssid || "");
        setAddress(venue.address || "");
        setPhone(venue.phone || "");
        setEmail(venue.email || "");
        setGstNumber(venue.gst_number || "");
        setDescription(venue.description || "");
        // We do not fetch the plaintext wifi password from the API for security reasons,
        // so the password field is intentionally left blank unless they want to update it.
      } catch (err) {
        setError("Failed to load venue details");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVenue();
  }, [id, router]);

  const handleDetectLocation = () => {
    setIsDetecting(true);
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setIsDetecting(false);
      },
      (err) => {
        console.error(err);
        if (err.code === err.TIMEOUT) {
          setError("Location request timed out. Please enter manually.");
        } else {
          setError("Unable to retrieve your location. Please ensure you have granted permission.");
        }
        setIsDetecting(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const token = localStorage.getItem("perch_admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        name,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address,
        phone,
        email,
        gst_number: gstNumber,
        description,
      };

      if (wifiSsid.trim()) {
        payload.wifi_ssid = wifiSsid;
      }
      
      // If wifi password is provided, or explicitly cleared by saving with empty string when SSID exists
      if (wifiPassword.trim() !== "") {
        payload.wifi_password = wifiPassword;
      }

      await updateVenue(id, payload, token);
      
      router.push("/admin/venues");
      router.refresh();
    } catch (err: any) {
      setError(err.detail || "Failed to update venue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    background: "var(--color-bg)",
    border: "1.5px solid var(--color-border)",
    color: "var(--color-text)",
  };

  if (isLoading) {
    return <div className="p-6">Loading venue...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-8">
      <Link href="/admin/venues" className="inline-flex items-center text-sm mb-6 hover:underline" style={{ color: "var(--color-primary)" }}>
        <ArrowLeft size={16} className="mr-1" /> Back to Venues
      </Link>
      
      <div className="rounded-xl p-6 lg:p-8" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-md)" }}>
        <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-heading)" }}>Edit Venue</h1>
        
        {error && <div className="p-3 rounded-lg mb-6 text-sm bg-red-50 text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Venue Name</label>
            <input 
              required 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Central Perk" 
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
             <label className="block text-sm font-medium">Location Coordinates</label>
             <Button type="button" variant="secondary" onClick={handleDetectLocation} disabled={isDetecting}>
                <MapPin size={14} className="mr-1" />
                {isDetecting ? "Detecting..." : "Auto-Detect"}
             </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-500">Latitude</label>
              <input 
                required 
                type="number" 
                step="any" 
                value={lat} 
                onChange={(e) => setLat(e.target.value)} 
                placeholder="40.7128" 
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-500">Longitude</label>
              <input 
                required 
                type="number" 
                step="any" 
                value={lng} 
                onChange={(e) => setLng(e.target.value)} 
                placeholder="-74.0060" 
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium mb-4 text-gray-600">Contact & Business Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Address</label>
                <textarea 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="e.g. 123 Cafe Street, City, State, ZIP" 
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none h-20"
                  style={inputStyle}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Number</label>
                  <input 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="e.g. +91 9876543210" 
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email Address</label>
                  <input 
                    type="email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="e.g. hello@centralperk.com" 
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">GST Number (Optional)</label>
                  <input 
                    value={gstNumber} 
                    onChange={(e) => setGstNumber(e.target.value)} 
                    placeholder="e.g. 22AAAAA0000A1Z5" 
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="A short description about this venue..." 
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none h-20"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium mb-4 text-gray-600">Guest WiFi (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Network Name (SSID)</label>
                <input 
                  value={wifiSsid} 
                  onChange={(e) => setWifiSsid(e.target.value)} 
                  placeholder="Cafe_Guest_5G" 
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input 
                  value={wifiPassword} 
                  onChange={(e) => setWifiPassword(e.target.value)} 
                  placeholder="Leave blank to keep unchanged" 
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
