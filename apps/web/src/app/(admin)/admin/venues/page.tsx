"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listVenues, deleteVenue } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Plus, MapPin, QrCode, UtensilsCrossed, ClipboardList, Pencil, Trash2 } from "lucide-react";

export default function VenuesPage() {
  const [venues, setVenues] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVenues = () => {
    const token = localStorage.getItem("perch_admin_token");
    if (!token) return;

    listVenues(token)
      .then((d) => {
        setVenues(d.venues);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleDelete = async (venueId: string) => {
    if (!confirm("Are you sure you want to delete this venue? This cannot be undone.")) return;
    const token = localStorage.getItem("perch_admin_token");
    if (!token) return;

    try {
      await deleteVenue(venueId, token);
      fetchVenues();
    } catch (err) {
      alert("Failed to delete venue");
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
          >
            Venues
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Manage your cafes and restaurants
          </p>
        </div>
        <Link href="/admin/venues/new">
          <Button variant="primary">
            <Plus size={16} />
            Add Venue
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : venues.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🏪</p>
          <p className="text-lg font-medium mb-2" style={{ color: "var(--color-text)" }}>
            No venues yet
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>
            Create your first venue to get started.
          </p>
          <Link href="/admin/venues/new">
            <Button variant="primary">
              <Plus size={16} />
              Create Venue
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((venue) => (
            <div
              key={venue.id as string}
              className="rounded-xl p-5 transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
                >
                  {venue.name as string}
                </h3>
                <div className="flex gap-2">
                  <Link href={`/admin/venues/${venue.id}/edit`}>
                    <button className="text-gray-400 hover:text-blue-500 transition-colors" title="Edit Venue">
                      <Pencil size={16} />
                    </button>
                  </Link>
                  <button 
                    onClick={() => handleDelete(venue.id as string)}
                    className="text-gray-400 hover:text-red-500 transition-colors" 
                    title="Delete Venue"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {(venue.wifi_ssid as string) && (
                <p className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>
                  📶 {venue.wifi_ssid as string}
                </p>
              )}

              {venue.lat != null && venue.lng != null && (
                <div className="flex items-center gap-1 text-xs mb-4" style={{ color: "var(--color-muted)" }}>
                  <MapPin size={12} />
                  <span>
                    {(venue.lat as number).toFixed(4)}, {(venue.lng as number).toFixed(4)}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/venues/${venue.id}/qr`}>
                  <Button variant="secondary" className="text-xs px-3 py-1.5">
                    <QrCode size={12} />
                    QR Codes
                  </Button>
                </Link>
                <Link href={`/admin/menu/${venue.id}`}>
                  <Button variant="secondary" className="text-xs px-3 py-1.5">
                    <UtensilsCrossed size={12} />
                    Menu
                  </Button>
                </Link>
                <Link href={`/admin/orders/${venue.id}`}>
                  <Button variant="secondary" className="text-xs px-3 py-1.5">
                    <ClipboardList size={12} />
                    Orders
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
