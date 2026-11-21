import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShoppingCart, Plus, Minus, ArrowLeft, Store, Bike, CheckCircle2, Phone, MapPin, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Field, Input, Textarea, VegMark, EmptyState } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { computeTotals, formatMoney, timeAgo } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/status";
import type { MenuItem, Category, Restaurant, Order, OrderItem } from "@/types";

type OrderMode = "takeaway" | "delivery";

export function OnlineOrdering() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, { item: MenuItem; qty: number; note: string }>>({});
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<OrderMode>("takeaway");
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [instructions, setInstructions] = useState("");
  const [placing, setPlacing] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: rest } = await supabase.from("restaurants").select("*").eq("slug", slug).maybeSingle();
      if (!rest) { setLoading(false); return; }
      setRestaurant(rest as Restaurant);
      const rid = (rest as Restaurant).id;
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from("categories").select("*").eq("restaurant_id", rid).order("sort_order", { ascending: true }),
        supabase.from("menu_items").select("*").eq("restaurant_id", rid).order("sort_order", { ascending: true }),
      ]);
      setCategories((cats as Category[]) ?? []);
      setMenu((items as MenuItem[]) ?? []);
      setLoading(false);
    })();
  }, [slug]);

  const currency = restaurant?.currency ?? "₹";
  const filtered = menu.filter((m) => m.is_available && (catFilter === "all" || m.category_id === catFilter) && m.name.toLowerCase().includes(search.toLowerCase()));
  const subtotal = Object.values(cart).reduce((s, { item, qty }) => s + Number(item.price) * qty, 0);
  const totals = computeTotals(subtotal, restaurant?.gst_enabled ? restaurant.gst_percentage : 0, restaurant?.service_charge_percentage ?? 0);
  const totalItems = Object.values(cart).reduce((s, c) => s + c.qty, 0);

  function addToCart(item: MenuItem) { setCart((c) => { const ex = c[item.id]; return { ...c, [item.id]: { item, qty: (ex?.qty ?? 0) + 1, note: ex?.note ?? "" } }; }); }
  function changeQty(item: MenuItem, delta: number) {
    setCart((c) => { const ex = c[item.id]; if (!ex) return c; const qty = ex.qty + delta; if (qty <= 0) { const { [item.id]: _, ...rest } = c; return rest; } return { ...c, [item.id]: { ...ex, qty } }; });
  }
  function setNote(item: MenuItem, note: string) { setCart((c) => ({ ...c, [item.id]: { ...c[item.id], note } })); }

  async function placeOrder() {
    if (!restaurant || Object.keys(cart).length === 0) return;
    if (!customer.name.trim() || !customer.phone.trim()) { notify("Please enter your name and phone", "error"); return; }
    if (mode === "delivery" && !customer.address.trim()) { notify("Please enter your delivery address", "error"); return; }
    setPlacing(true);
    const { data: order, error } = await supabase.from("orders").insert({
      restaurant_id: restaurant.id, order_type: mode, order_channel: "online",
      status: "pending", customer_name: customer.name.trim(), customer_phone: customer.phone.trim(),
      customer_address: mode === "delivery" ? customer.address.trim() : null,
      special_instructions: instructions.trim() || null,
      subtotal: totals.subtotal, tax_amount: totals.tax_amount, service_charge: totals.service_charge,
      total: totals.total, item_count: totalItems, payment_status: "unpaid",
    }).select("id,access_token").single();
    if (error || !order) { setPlacing(false); notify(error?.message || "Failed to place order", "error"); return; }
    const newItems = Object.values(cart).map(({ item, qty, note }) => ({
      order_id: order.id, restaurant_id: restaurant.id, menu_item_id: item.id,
      name: item.name, price: Number(item.price), quantity: qty, is_veg: item.is_veg, emoji: item.emoji,
      special_instructions: note || null, status: "pending" as const,
    }));
    const { error: ie } = await supabase.from("order_items").insert(newItems);
    if (ie) { setPlacing(false); notify(ie.message, "error"); return; }
    setPlacing(false);
    setCheckoutOpen(false);
    navigate(`/track/${order.id}/${order.access_token}`);
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-stone-50"><p className="text-stone-400">Loading…</p></div>;
  if (!restaurant) return <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 gap-3"><EmptyState icon={<Store size={48} />} title="Restaurant not found" subtitle="This link may be invalid." /></div>;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div><h1 className="font-display text-xl font-bold text-stone-900">{restaurant.name}</h1><p className="text-xs text-stone-500">Online Ordering</p></div>
            <div className="flex rounded-xl border border-stone-200 p-1">
              <button onClick={() => setMode("takeaway")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${mode === "takeaway" ? "bg-emerald-600 text-white" : "text-stone-600"}`}><Store size={16} /> Takeaway</button>
              <button onClick={() => setMode("delivery")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${mode === "delivery" ? "bg-emerald-600 text-white" : "text-stone-600"}`}><Bike size={16} /> Delivery</button>
            </div>
          </div>
          <input placeholder="Search dishes…" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-3 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setCatFilter("all")} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${catFilter === "all" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>All</button>
            {categories.map((c) => <button key={c.id} onClick={() => setCatFilter(c.id)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${catFilter === c.id ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>{c.name}</button>)}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-3 px-4 py-5 pb-40">
        {filtered.length === 0 ? <EmptyState icon={<ShoppingCart size={40} />} title="No items found" /> : filtered.map((item) => {
          const inCart = cart[item.id];
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-100 text-3xl">
                {item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : item.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><VegMark isVeg={item.is_veg} /><p className="truncate font-medium text-stone-900">{item.name}</p></div>
                {item.description && <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{item.description}</p>}
                <p className="mt-1 text-sm font-semibold text-emerald-700">{formatMoney(item.price, currency)}</p>
                {inCart && <input value={inCart.note} onChange={(e) => setNote(item, e.target.value)} placeholder="Special instruction…" className="mt-1.5 w-full rounded-md border border-stone-200 px-2 py-1 text-xs outline-none focus:border-emerald-400" />}
              </div>
              {inCart ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => changeQty(item, -1)} className="rounded-lg bg-stone-100 px-2 py-1.5 text-stone-700 hover:bg-stone-200"><Minus size={16} /></button>
                  <span className="w-6 text-center text-sm font-bold">{inCart.qty}</span>
                  <button onClick={() => changeQty(item, 1)} className="rounded-lg bg-emerald-100 px-2 py-1.5 text-emerald-700 hover:bg-emerald-200"><Plus size={16} /></button>
                </div>
              ) : <Button size="sm" variant="outline" onClick={() => addToCart(item)}><Plus size={14} /> Add</Button>}
            </div>
          );
        })}
      </div>

      {totalItems > 0 && !checkoutOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white p-4 shadow-lg">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><ShoppingCart size={20} /></span>
              <div><p className="text-sm font-semibold text-stone-900">{totalItems} items · {formatMoney(totals.total, currency)}</p><p className="text-xs text-stone-500">{mode === "delivery" ? "Delivery" : "Takeaway"} · Incl. taxes</p></div>
            </div>
            <Button onClick={() => setCheckoutOpen(true)} size="lg">Checkout</Button>
          </div>
        </div>
      )}

      {/* Checkout overlay */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setCheckoutOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 font-display text-lg font-bold text-stone-900">Checkout · {mode === "delivery" ? "Delivery" : "Takeaway"}</h2>
            <div className="space-y-3">
              <Field label="Your name"><div className="relative"><User size={16} className="absolute left-3 top-3 text-stone-400" /><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="John Doe" className="pl-9" /></div></Field>
              <Field label="Phone number"><div className="relative"><Phone size={16} className="absolute left-3 top-3 text-stone-400" /><Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="9876543210" className="pl-9" /></div></Field>
              {mode === "delivery" && <Field label="Delivery address"><div className="relative"><MapPin size={16} className="absolute left-3 top-3 text-stone-400" /><Textarea value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} rows={2} placeholder="Flat, street, area, landmark" className="pl-9" /></div></Field>}
              <Field label="Order instructions (optional)"><Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} placeholder="e.g. Less spicy, call on arrival" /></Field>
            </div>
            <div className="mt-4 space-y-1 border-t border-stone-200 pt-3 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{formatMoney(totals.subtotal, currency)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Tax</span><span>{formatMoney(totals.tax_amount, currency)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Service</span><span>{formatMoney(totals.service_charge, currency)}</span></div>
              <div className="flex justify-between border-t border-stone-200 pt-1 font-bold text-stone-900"><span>Total</span><span>{formatMoney(totals.total, currency)}</span></div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setCheckoutOpen(false)} className="flex-1">Back</Button>
              <Button onClick={placeOrder} disabled={placing} className="flex-1">{placing ? "Placing…" : "Place Order"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
