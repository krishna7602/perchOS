"use client";

import { useState, useEffect } from "react";
import { listVenues, listMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Plus, Edit2, Trash2, Tag, DollarSign, UtensilsCrossed } from "lucide-react";

export default function MenuPage() {
  const [venueId, setVenueId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    is_veg: true,
    available: true
  });

  const loadData = async () => {
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      const vData = await listVenues(token);
      if (vData.venues && vData.venues.length > 0) {
        const v = vData.venues[0] as any;
        const vid = v._id || v.id;
        setVenueId(vid);
        
        const mData = await listMenuItems(vid, token);
        setItems(mData.items || []);
      }
    } catch (err) {
      console.error("Failed to load menu", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "", price: "", category: "", description: "", is_veg: true, available: true
    });
    setIsEditing(false);
    setEditingId("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueId) return;

    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      const payload = {
        ...formData,
        price: parseFloat(formData.price as string) || 0
      };

      if (isEditing) {
        await updateMenuItem(editingId, payload, token);
      } else {
        await createMenuItem(venueId, payload, token);
      }
      
      resetForm();
      loadData();
    } catch (err) {
      console.error("Failed to save item", err);
    }
  };

  const handleEdit = (item: any) => {
    setFormData({
      name: item.name,
      price: item.price.toString(),
      category: item.category,
      description: item.description || "",
      is_veg: item.is_veg ?? true,
      available: item.available ?? true
    });
    setEditingId(item._id || item.id);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      await deleteMenuItem(id, token);
      loadData();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  if (isLoading) return <div className="p-8">Loading menu...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
      {/* Left Column: Menu List */}
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl" style={{ background: "rgba(139, 94, 60, 0.1)" }}>
            <UtensilsCrossed size={24} style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>Menu Manager</h1>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>Manage your items, pricing, and availability.</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-2xl" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>No menu items found. Add your first item!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item._id || item.id} className="p-4 rounded-xl flex items-center justify-between transition-all hover:-translate-y-0.5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                    <h3 className="font-bold">{item.name}</h3>
                    {!item.available && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/10 text-black/60">Unavailable</span>
                    )}
                  </div>
                  <p className="text-xs mb-2" style={{ color: "var(--color-muted)" }}>{item.description}</p>
                  <div className="flex gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1"><DollarSign size={12}/> {item.price.toFixed(2)}</span>
                    <span className="flex items-center gap-1 text-black/40"><Tag size={12}/> {item.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(item)} className="p-2 rounded-lg hover:bg-black/5" style={{ color: "var(--color-primary)" }}><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(item._id || item.id)} className="p-2 rounded-lg hover:bg-black/5" style={{ color: "var(--color-danger)" }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Editor Form */}
      <div className="sticky top-8">
        <form onSubmit={handleSave} className="p-6 rounded-2xl space-y-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-bold mb-4">{isEditing ? "Edit Item" : "Add New Item"}</h2>
          
          <div>
            <label className="block text-xs font-medium mb-1.5">Item Name</label>
            <input required type="text" name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-xl text-sm outline-none border" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">Price</label>
              <input required type="number" step="0.01" name="price" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2 rounded-xl text-sm outline-none border" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Category</label>
              <select required name="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 rounded-xl text-sm outline-none border appearance-none" style={{ background: "var(--color-bg)" }}>
                <option value="" disabled>Select category...</option>
                <option value="Beverages">Beverages</option>
                <option value="Starters">Starters</option>
                <option value="Main Course">Main Course</option>
                <option value="Fast Food">Fast Food</option>
                <option value="Desserts">Desserts</option>
                <option value="Sides">Sides</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Description</label>
            <textarea name="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} className="w-full px-4 py-2 rounded-xl text-sm outline-none border resize-none" />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formData.is_veg} onChange={e => setFormData({...formData, is_veg: e.target.checked})} />
              Vegetarian
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formData.available} onChange={e => setFormData({...formData, available: e.target.checked})} />
              Available
            </label>
          </div>

          <div className="pt-4 flex gap-2">
            <Button type="submit" variant="primary" className="flex-1">
              {isEditing ? "Update Item" : "Add Item"}
            </Button>
            {isEditing && (
              <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
