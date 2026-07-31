"use client";

import { useState, useEffect } from "react";
import { listVenues, listMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Plus, Edit2, Trash2, Tag, UtensilsCrossed, ChevronDown, ChevronRight, Clock, Ban } from "lucide-react";

export default function MenuPage() {
  const [venueId, setVenueId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [variants, setVariants] = useState<{name: string; price: string}[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    description: "",
    is_veg: true,
    available: true,
    is_coming_soon: false
  });

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

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
      name: "", price: "", category: "", description: "", is_veg: true, available: true, is_coming_soon: false
    });
    setVariants([]);
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
        price: formData.price ? parseFloat(formData.price as string) : null,
        variants: variants.map(v => ({ name: v.name, price: parseFloat(v.price) || 0 }))
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
      price: item.price ? item.price.toString() : "",
      category: item.category,
      description: item.description || "",
      is_veg: item.is_veg ?? true,
      available: item.available ?? true,
      is_coming_soon: item.is_coming_soon ?? false
    });
    setVariants(item.variants?.map((v: any) => ({ name: v.name, price: v.price.toString() })) || []);
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

  const toggleStatus = async (id: string, updates: any) => {
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      await updateMenuItem(id, updates, token);
      loadData();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const categories = items.reduce<Record<string, any[]>>((acc, item) => {
    const cat = item.category || "misc";
    (acc[cat] = acc[cat] || []).push(item);
    return acc;
  }, {});

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

        {Object.keys(categories).length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-2xl" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>No menu items found. Add your first item!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(categories).map(([category, catItems]) => {
              const isExpanded = expandedCategories[category] !== undefined ? expandedCategories[category] : false;
              return (
                <div key={category} className="rounded-2xl overflow-hidden transition-all duration-200" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
                  <button onClick={() => setExpandedCategories(prev => ({...prev, [category]: !isExpanded}))} className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold capitalize" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>{category}</h2>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}>{catItems.length}</span>
                    </div>
                    <div style={{ color: "var(--color-muted)" }}>
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-3 pt-0 space-y-2">
                      {catItems.map((item) => (
                        <div key={item._id || item.id} className={`p-4 rounded-xl flex items-center justify-between transition-all hover:-translate-y-0.5 ${(!item.available || item.is_coming_soon) ? "opacity-60 grayscale-[0.2]" : ""}`} style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                              <h3 className="font-bold">{item.name}</h3>
                              {!item.available && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold border border-red-200">🚫 Temporarily Unavailable</span>
                              )}
                              {item.is_coming_soon && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-semibold border border-blue-200">🕒 Coming Soon</span>
                              )}
                            </div>
                            <p className="text-xs mb-2" style={{ color: "var(--color-muted)" }}>{item.description}</p>
                            <div className="flex flex-col gap-1 text-xs font-medium">
                              {item.variants && item.variants.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {item.variants.map((v: any, i: number) => (
                                    <span key={i} className="flex items-center gap-1 bg-black/5 px-2 py-1 rounded-md border">
                                      {v.name}: ₹{v.price.toFixed(2)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="flex items-center gap-1">₹{item.price?.toFixed(2) || "0.00"}</span>
                              )}
                            </div>
                            
                            <div className="mt-3 flex items-center gap-2">
                              <button onClick={() => toggleStatus(item._id || item.id, { available: !item.available })} className={`text-[10px] px-2 py-1 flex items-center gap-1 rounded border transition-colors ${!item.available ? "bg-red-500 text-white border-red-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                                <Ban size={10} /> Temp. Unavailable
                              </button>
                              <button onClick={() => toggleStatus(item._id || item.id, { is_coming_soon: !item.is_coming_soon })} className={`text-[10px] px-2 py-1 flex items-center gap-1 rounded border transition-colors ${item.is_coming_soon ? "bg-blue-500 text-white border-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                                <Clock size={10} /> Coming Soon
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-center gap-2">
                            <button onClick={() => handleEdit(item)} className="p-2 rounded-lg hover:bg-black/5" style={{ color: "var(--color-primary)" }}><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(item._id || item.id)} className="p-2 rounded-lg hover:bg-black/5" style={{ color: "var(--color-danger)" }}><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
              <label className="block text-xs font-medium mb-1.5 text-gray-500">Base Price (Optional if variants added)</label>
              <input type="number" step="0.01" name="price" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2 rounded-xl text-sm outline-none border" placeholder="0.00" disabled={variants.length > 0} />
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

          <div className="bg-black/5 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Variants (e.g. Half, Full)</label>
              <button type="button" onClick={() => setVariants([...variants, {name: "", price: ""}])} className="text-[10px] bg-white border px-2 py-1 rounded shadow-sm flex items-center gap-1 hover:bg-gray-50"><Plus size={12}/> Add</button>
            </div>
            {variants.map((v, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="text" placeholder="Name (e.g. Half)" value={v.name} onChange={e => { const newV = [...variants]; newV[i].name = e.target.value; setVariants(newV); }} className="flex-1 px-3 py-1.5 rounded-lg text-sm border outline-none" required />
                <input type="number" step="0.01" placeholder="Price" value={v.price} onChange={e => { const newV = [...variants]; newV[i].price = e.target.value; setVariants(newV); }} className="w-24 px-3 py-1.5 rounded-lg text-sm border outline-none" required />
                <button type="button" onClick={() => setVariants(variants.filter((_, idx) => idx !== i))} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md"><Trash2 size={14}/></button>
              </div>
            ))}
            {variants.length === 0 && <p className="text-xs text-black/40">No variants. Base price will be used.</p>}
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
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formData.is_coming_soon} onChange={e => setFormData({...formData, is_coming_soon: e.target.checked})} />
              Coming Soon
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
