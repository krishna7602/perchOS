"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVenueQr } from "@/lib/api";
import { QrDisplay } from "@/features/venues/components/QrDisplay";
import { Loader } from "@/components/ui/Loader";
import { ArrowLeft } from "lucide-react";

export default function VenueQrPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.id as string;

  const [qrData, setQrData] = useState<{
    join_qr_png_base64: string;
    menu_qr_png_base64: string;
    wifi_qr_png_base64?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("perch_admin_token");
    if (!token) return;

    getVenueQr(venueId, token)
      .then((d) => {
        setQrData(d);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [venueId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader label="Loading QR codes..." />
      </div>
    );
  }

  if (!qrData) {
    return (
      <div className="p-6">
        <p style={{ color: "var(--color-danger)" }}>Failed to load QR codes.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push("/admin/venues")}
            className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <ArrowLeft size={18} style={{ color: "var(--color-muted)" }} />
          </button>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
          >
            QR Codes
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QrDisplay
            label="Chat Join QR"
            base64Png={qrData.join_qr_png_base64}
            description="Scan to enter the venue chat room"
          />
          <QrDisplay
            label="Menu QR"
            base64Png={qrData.menu_qr_png_base64}
            description="Scan to browse the menu and order"
          />
          {qrData.wifi_qr_png_base64 && (
            <QrDisplay
              label="WiFi QR"
              base64Png={qrData.wifi_qr_png_base64}
              description="Scan to auto-join the WiFi network (OS native)"
            />
          )}
        </div>

        <div
          className="mt-6 rounded-xl p-4 text-xs"
          style={{
            background: "rgba(124, 148, 115, 0.1)",
            border: "1px solid rgba(124, 148, 115, 0.2)",
            color: "var(--color-text)",
          }}
        >
          <p className="font-medium mb-1" style={{ color: "var(--color-accent)" }}>💡 Tip</p>
          <p>
            Print these QR codes and place them at tables or the counter.
            The Chat Join QR opens a web page (not WiFi auto-join). For WiFi auto-join,
            print the WiFi QR separately — it uses the OS-native format that triggers
            the &quot;Join Network?&quot; prompt on phones.
          </p>
        </div>
      </div>
    </div>
  );
}
