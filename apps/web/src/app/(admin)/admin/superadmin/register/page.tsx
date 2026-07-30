"use client";

import { useState } from "react";
import { registerCafe } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Shield, Plus, Building } from "lucide-react";

export default function RegisterCafePage() {
  const [formData, setFormData] = useState({
    cafe_name: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [createdCafe, setCreatedCafe] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setCreatedCafe(null);

    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      const data = await registerCafe(formData, token);
      setCreatedCafe(data);
      setMessage("Cafe successfully registered!");
      setFormData({ cafe_name: "", password: "" });
    } catch (err: any) {
      setMessage(err.detail === "cafe_already_exists" ? "A cafe with this name already exists." : "Failed to register cafe.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div
          className="p-3 rounded-2xl"
          style={{ background: "rgba(139, 94, 60, 0.1)" }}
        >
          <Shield size={24} style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            Register New Cafe
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Provision a new workspace and owner account for a client.
          </p>
        </div>
      </div>

      <form onSubmit={handleRegister} className="p-6 rounded-2xl space-y-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Building size={18} /> Cafe Details
        </h2>
        
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Cafe Name</label>
          <input
            type="text"
            name="cafe_name"
            value={formData.cafe_name}
            onChange={handleChange}
            placeholder="e.g., The Roasted Bean"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
            required
          />
          <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
            This will generate the login ID based on the name (e.g., theroastedbean@perch.store)
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>Owner Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Secure password for the owner"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
            required
            minLength={6}
          />
        </div>

        {message && (
          <p className="text-sm font-medium" style={{ color: message.includes("Failed") || message.includes("exists") ? "var(--color-danger)" : "var(--color-success)" }}>
            {message}
          </p>
        )}

        {createdCafe && (
          <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-sm">
            <p className="font-bold text-green-800 mb-2">Cafe created successfully!</p>
            <p className="text-green-700"><strong>Owner Login ID:</strong> {createdCafe.cafe_id}</p>
            <p className="text-xs text-green-600 mt-2">Please securely provide this ID and the password to the cafe owner.</p>
          </div>
        )}

        <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2 w-full">
          <Plus size={16} /> Provision Cafe
        </Button>
      </form>
    </div>
  );
}
