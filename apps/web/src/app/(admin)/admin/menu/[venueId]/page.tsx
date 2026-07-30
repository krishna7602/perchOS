"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { listMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowLeft, Plus, Pencil, Trash2, X, Leaf } from "lucide-react";

interface MenuItemData {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  is_veg: boolean;
  available: boolean;
}

export default function MenuManagePage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.venueId as string;
  const token = typeof window !== "undefined" ? localStorage.getItem("perch_admin_token") || "" : "";

  const [items, setItems] = useState<MenuItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "beverages",
    is_veg: true,
  });

  const fetchItems = async () => {
    try {
      const data = await listMenuItems(venueId, token);
      setItems(data.items as unknown as MenuItemData[]);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    if (token) fetchItems();
  }, [venueId, token]);

  const resetForm = () => {
    setForm({ name: "", description: "", price: "", category: "beverages", is_veg: true });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price),
      category: form.category,
      is_veg: form.is_veg,
    };

    try {
      if (editingItem) {
        await updateMenuItem(editingItem._id, data, token);
      } else {
        await createMenuItem(venueId, data, token);
      }
      resetForm();
      fetchItems();
    } catch {}
  };

  const handleEdit = (item: MenuItemData) => {
    setForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      category: item.category,
      is_veg: item.is_veg,
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await deleteMenuItem(itemId, token);
      fetchItems();
    } catch {}
  };

  const inputStyle = {
    background: "var(--color-bg)",
    border: "1.5px solid var(--color-border)",
    color: "var(--color-text)",
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin/venues")} className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer">
              <ArrowLeft size={18} style={{ color: "var(--color-muted)" }} />
            </button>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
              Menu Management
            </h1>
          </div>
          <Button variant="primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={16} />
            Add Item
          </Button>
        </div>

        {/* Add/Edit form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl p-5 mb-6 animate-slide-up"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {editingItem ? "Edit Item" : "New Item"}
              </h3>
              <button onClick={resetForm} className="p-1 rounded cursor-pointer hover:bg-black/5">
                <X size={16} style={{ color: "var(--color-muted)" }} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" required className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price (₹)" required className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="px-3 py-2 rounded-lg text-sm outline-none sm:col-span-2" style={inputStyle} />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer" style={inputStyle}>
                <option value="beverages">Beverages</option>
                <option value="starters">Starters</option>
                <option value="mains">Mains</option>
                <option value="desserts">Desserts</option>
                <option value="snacks">Snacks</option>
                <option value="misc">Misc</option>
              </select>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--color-text)" }}>
                <input type="checkbox" checked={form.is_veg} onChange={(e) => setForm({ ...form, is_veg: e.target.checked })} className="cursor-pointer" />
                Vegetarian
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <Button type="submit" variant="primary">
                {editingItem ? "Update" : "Add Item"}
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        )}

        {/* Items list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🍽️</p>
            <p className="text-lg font-medium mb-2" style={{ color: "var(--color-text)" }}>No menu items yet</p>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>Add items to build your menu.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm text-xs border" style={{ borderColor: item.is_veg ? "#22c55e" : "#ef4444", color: item.is_veg ? "#22c55e" : "#ef4444" }}>
                  {item.is_veg ? <Leaf size={12} /> : "●"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>{item.name}</p>
                  <p className="text-xs" style={{ color: "var(--color-muted)" }}>{item.category} · ₹{item.price.toFixed(2)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${item.available ? "status-ready" : "status-received"}`}>
                  {item.available ? "Available" : "Unavailable"}
                </span>
                <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer">
                  <Pencil size={14} style={{ color: "var(--color-muted)" }} />
                </button>
                <button onClick={() => handleDelete(item._id)} className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer">
                  <Trash2 size={14} style={{ color: "var(--color-danger)" }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
