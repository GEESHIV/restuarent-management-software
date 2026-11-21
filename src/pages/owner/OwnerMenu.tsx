import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, BookOpen, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRealtimeQuery } from "@/lib/useRealtime";
import { PageHeader } from "@/components/DashboardLayout";
import { Modal } from "@/components/Modal";
import { Badge, Button, EmptyState, Field, Input, Select, Textarea, VegMark } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { formatMoney } from "@/lib/format";
import type { Category, MenuItem } from "@/types";

export function OwnerMenu() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const currency = restaurant?.currency ?? "₹";
  const { notify } = useToast();
  const { data: items, refresh } = useRealtimeQuery<MenuItem>({
    table: "menu_items", filterColumn: "restaurant_id", filterValue: rid,
    select: "*, category:categories(id, name)", orderBy: { column: "sort_order", ascending: true },
  });
  const { data: categories } = useRealtimeQuery<Category>({
    table: "categories", filterColumn: "restaurant_id", filterValue: rid,
    orderBy: { column: "sort_order", ascending: true },
  });
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [catFilter, setCatFilter] = useState<string>("all");
  const filtered = items.filter((i) => catFilter === "all" || i.category_id === catFilter);

  async function toggleAvailability(item: MenuItem) {
    const { error } = await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    if (error) notify(error.message, "error"); else notify(`"${item.name}" ${!item.is_available ? "available" : "unavailable"}`);
  }
  async function removeItem(item: MenuItem) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", item.id);
    if (error) notify(error.message, "error"); else notify(`Deleted "${item.name}"`, "success");
  }

  return (
    <div>
      <PageHeader title="Menu Management" subtitle={`${items.length} items across ${categories.length} categories`}
        actions={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Add Item</Button>} />
      <div className="mb-5 flex flex-wrap gap-2">
        <button onClick={() => setCatFilter("all")} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${catFilter === "all" ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"}`}>All ({items.length})</button>
        {categories.map((c) => {
          const count = items.filter((i) => i.category_id === c.id).length;
          return <button key={c.id} onClick={() => setCatFilter(c.id)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${catFilter === c.id ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"}`}>{c.name} ({count})</button>;
        })}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<BookOpen size={40} />} title="No menu items yet" subtitle="Add your first dish to start taking orders." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div key={item.id} className={`flex gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${item.is_available ? "border-stone-200" : "border-stone-200 opacity-60"}`}>
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 text-3xl">{item.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><VegMark isVeg={item.is_veg} /><h3 className="truncate font-semibold text-stone-900">{item.name}</h3></div>
                <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{item.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold text-emerald-700">{formatMoney(item.price, currency)}</span>
                  <Badge color={item.is_available ? "green" : "stone"}>{item.is_available ? "Available" : "Off"}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <button onClick={() => toggleAvailability(item)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700" title="Toggle availability">{item.is_available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button>
                  <button onClick={() => { setEditing(item); setShowForm(true); }} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Pencil size={16} /></button>
                  <button onClick={() => removeItem(item)} className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && <MenuItemForm item={editing} categories={categories} restaurantId={rid!} currency={currency} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refresh(); }} onNotify={notify} />}
    </div>
  );
}

function MenuItemForm({ item, categories, restaurantId, currency, onClose, onSaved, onNotify }: {
  item: MenuItem | null; categories: Category[]; restaurantId: string; currency: string;
  onClose: () => void; onSaved: () => void; onNotify: (m: string, t?: "success" | "error") => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [categoryId, setCategoryId] = useState(item?.category_id ?? categories[0]?.id ?? "");
  const [isVeg, setIsVeg] = useState(item?.is_veg ?? true);
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true);
  const [emoji, setEmoji] = useState(item?.emoji ?? "🍽️");
  const [saving, setSaving] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCat, setNewCat] = useState("");

  async function saveCategory() {
    if (!newCat.trim()) return;
    const { data, error } = await supabase.from("categories").insert({ restaurant_id: restaurantId, name: newCat.trim(), sort_order: 99 }).select("id, name").single();
    if (error) { onNotify(error.message, "error"); return; }
    setCategoryId(data.id); setNewCat(""); setShowCatForm(false); onNotify("Category added", "success");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) { onNotify("Name and price are required", "error"); return; }
    setSaving(true);
    const payload = { restaurant_id: restaurantId, category_id: categoryId || null, name: name.trim(), description: description.trim() || null, price: Number(price), is_veg: isVeg, is_available: isAvailable, emoji: emoji || "🍽️" };
    const { error } = item ? await supabase.from("menu_items").update(payload).eq("id", item.id) : await supabase.from("menu_items").insert(payload);
    setSaving(false);
    if (error) { onNotify(error.message, "error"); return; }
    onNotify(item ? "Item updated" : "Item added", "success"); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={item ? "Edit menu item" : "Add menu item"}>
      <form onSubmit={save} className="space-y-4">
        <div className="flex gap-3">
          <div className="w-20"><Field label="Icon"><Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} className="text-center text-2xl" /></Field></div>
          <div className="flex-1"><Field label="Dish name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Butter Paneer" /></Field></div>
        </div>
        <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Short description of the dish" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Price (${currency})`}><Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Category">
            <div className="flex gap-2">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex-1">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
              <Button type="button" variant="outline" size="md" onClick={() => setShowCatForm((s) => !s)}><Plus size={16} /></Button>
            </div>
          </Field>
        </div>
        {showCatForm && (
          <div className="flex gap-2 rounded-xl bg-stone-50 p-3">
            <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name" />
            <Button type="button" variant="secondary" size="md" onClick={saveCategory}>Add</Button>
          </div>
        )}
        <div className="flex gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" checked={isVeg} onChange={() => setIsVeg(true)} className="accent-emerald-600" /><VegMark isVeg /> Veg</label>
          <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" checked={!isVeg} onChange={() => setIsVeg(false)} className="accent-red-600" /><VegMark isVeg={false} /> Non-veg</label>
          <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="accent-emerald-600" /> Available</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : item ? "Save changes" : "Add item"}</Button>
        </div>
      </form>
    </Modal>
  );
}
