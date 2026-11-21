import { useState } from "react";
import { Plus, Pencil, Trash2, BookOpen, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRealtimeQuery } from "@/lib/useRealtime";
import { PageHeader } from "@/components/DashboardLayout";
import { Modal } from "@/components/Modal";
import { Badge, Button, EmptyState, Field, Input, Select, Textarea, VegMark } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { formatMoney } from "@/lib/format";
import { HALF_FULL_SIZES, hasMenuSizes, MENU_SIZES, menuSizeLabel } from "@/lib/menuPricing";
import type { Category, MenuItem, MenuSize, MenuSizeOption } from "@/types";

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
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-100 text-3xl">
                {item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : item.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><VegMark isVeg={item.is_veg} /><h3 className="truncate font-semibold text-stone-900">{item.name}</h3></div>
                {item.is_bestseller && <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Bestseller</span>}
                <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{item.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold text-emerald-700">
                    {item.size_option === "half_full" || item.half_price != null
                      ? `Half ${formatMoney(Number(item.half_price), currency)} · Full ${formatMoney(Number(item.full_price), currency)}`
                      : item.size_option === "small_medium_large" || item.small_price != null
                        ? `Small ${formatMoney(Number(item.small_price), currency)} · Medium ${formatMoney(Number(item.medium_price), currency)} · Large ${formatMoney(Number(item.large_price), currency)}`
                        : formatMoney(item.price, currency)}
                  </span>
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
  const [sizeOption, setSizeOption] = useState<MenuSizeOption>(
    item?.size_option ?? (item?.half_price != null ? "half_full" : item?.small_price != null ? "small_medium_large" : "none")
  );
  const [sizePrices, setSizePrices] = useState<Record<MenuSize, string>>({
    small: item?.small_price == null ? "" : String(item.small_price),
    medium: item?.medium_price == null ? "" : String(item.medium_price),
    large: item?.large_price == null ? "" : String(item.large_price),
    half: item?.half_price == null ? "" : String(item.half_price),
    full: item?.full_price == null ? "" : String(item.full_price),
  });
  const [categoryId, setCategoryId] = useState(item?.category_id ?? categories[0]?.id ?? "");
  const [isVeg, setIsVeg] = useState(item?.is_veg ?? true);
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true);
  const [isBestseller, setIsBestseller] = useState(item?.is_bestseller ?? false);
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
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
    if (!name.trim()) { onNotify("Dish name is required", "error"); return; }
    const requiredSizes = sizeOption === "small_medium_large" ? MENU_SIZES : sizeOption === "half_full" ? HALF_FULL_SIZES : [];
    const enteredPrices = sizeOption === "none" ? [price] : requiredSizes.map((size) => sizePrices[size]);
    if (enteredPrices.some((value) => value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0)) {
      onNotify(sizeOption === "none" ? "Enter a valid price" : "Enter valid prices for all selected sizes", "error");
      return;
    }
    const trimmedImageUrl = imageUrl.trim();
    if (trimmedImageUrl) {
      try {
        const parsedUrl = new URL(trimmedImageUrl);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") throw new Error();
      } catch {
        onNotify("Enter a valid HTTP or HTTPS image URL", "error");
        return;
      }
    }
    setSaving(true);
    const payload = {
      restaurant_id: restaurantId,
      category_id: categoryId || null,
      name: name.trim(),
      description: description.trim() || null,
      price: sizeOption === "small_medium_large" ? Number(sizePrices.small) : sizeOption === "half_full" ? Number(sizePrices.half) : Number(price),
      size_option: sizeOption,
      small_price: sizeOption === "small_medium_large" ? Number(sizePrices.small) : null,
      medium_price: sizeOption === "small_medium_large" ? Number(sizePrices.medium) : null,
      large_price: sizeOption === "small_medium_large" ? Number(sizePrices.large) : null,
      half_price: sizeOption === "half_full" ? Number(sizePrices.half) : null,
      full_price: sizeOption === "half_full" ? Number(sizePrices.full) : null,
      is_veg: isVeg,
      is_available: isAvailable,
      is_bestseller: isBestseller,
      image_url: trimmedImageUrl || null,
    };
    const { error } = item ? await supabase.from("menu_items").update(payload).eq("id", item.id) : await supabase.from("menu_items").insert(payload);
    setSaving(false);
    if (error) { onNotify(error.message, "error"); return; }
    onNotify(item ? "Item updated" : "Item added", "success"); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={item ? "Edit menu item" : "Add menu item"}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Dish name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Butter Paneer" /></Field>
        <Field label="Food image URL (optional)"><Input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/food-image.jpg" /></Field>
        <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Short description of the dish" /></Field>
        <Field label="Dish sizes">
          <div className="flex flex-wrap gap-5">
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" checked={sizeOption === "none"} onChange={() => setSizeOption("none")} className="accent-emerald-600" /> None (single price)</label>
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" checked={sizeOption === "small_medium_large"} onChange={() => setSizeOption("small_medium_large")} className="accent-emerald-600" /> Small, Medium, Large</label>
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" checked={sizeOption === "half_full"} onChange={() => setSizeOption("half_full")} className="accent-emerald-600" /> Half, Full</label>
          </div>
        </Field>
        <div className={sizeOption === "none" ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
          {sizeOption !== "none" ? (
            <div className={`grid gap-3 ${sizeOption === "half_full" ? "grid-cols-2" : "grid-cols-3"}`}>
              {(sizeOption === "half_full" ? HALF_FULL_SIZES : MENU_SIZES).map((size) => (
                <Field key={size} label={`${menuSizeLabel(size)} (${currency})`}>
                  <Input type="number" step="0.01" min="0" value={sizePrices[size]} onChange={(e) => setSizePrices((prices) => ({ ...prices, [size]: e.target.value }))} placeholder="0.00" />
                </Field>
              ))}
            </div>
          ) : (
            <Field label={`Price (${currency})`}><Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /></Field>
          )}
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
          <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={isBestseller} onChange={(e) => setIsBestseller(e.target.checked)} className="accent-amber-600" /> Bestseller</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : item ? "Save changes" : "Add item"}</Button>
        </div>
      </form>
    </Modal>
  );
}
