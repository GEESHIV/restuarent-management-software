import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShoppingCart, Plus, Minus, ArrowLeft, CheckCircle2, ChefHat, Flame, Utensils, Clock, Home, Receipt } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, VegMark, EmptyState } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { computeTotals, formatMoney, timeAgo } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/status";
import type { MenuItem, Category, Restaurant, RestaurantTable, Order, OrderItem } from "@/types";

export function CustomerMenu() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, { item: MenuItem; qty: number; note: string }>>({});
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    (async () => {
      // Fetch table by its public QR token
      const { data: tbl } = await supabase.from("restaurant_tables").select("*").eq("qr_token", tableId).maybeSingle();
      if (!tbl) { setLoading(false); return; }
      setTable(tbl as RestaurantTable);
      const rid = (tbl as RestaurantTable).restaurant_id;
      const [{ data: rest }, { data: cats }, { data: items }] = await Promise.all([
        supabase.from("restaurants").select("*").eq("id", rid).maybeSingle(),
        supabase.from("categories").select("*").eq("restaurant_id", rid).order("sort_order", { ascending: true }),
        supabase.from("menu_items").select("*").eq("restaurant_id", rid).order("sort_order", { ascending: true }),
      ]);
      setRestaurant(rest as Restaurant);
      setCategories((cats as Category[]) ?? []);
      setMenu((items as MenuItem[]) ?? []);
      setLoading(false);
    })();
  }, [tableId]);

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
    if (!table || !restaurant || Object.keys(cart).length === 0) return;
    setPlacing(true);
    const { data: order, error } = await supabase.from("orders").insert({
      restaurant_id: restaurant.id, table_id: table.id, order_type: "dine_in", order_channel: "qr",
      status: "pending", subtotal: totals.subtotal, tax_amount: totals.tax_amount, service_charge: totals.service_charge,
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
    await supabase.from("restaurant_tables").update({ status: "occupied" }).eq("id", table.id);
    setPlacing(false);
    navigate(`/track/${order.id}/${order.access_token}`);
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-stone-50"><p className="text-stone-400">Loading menu…</p></div>;
  if (!table || !restaurant) return <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 gap-3"><EmptyState icon={<Receipt size={48} />} title="Table not found" subtitle="This QR code may be invalid." /></div>;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-stone-900">{restaurant.name}</h1>
              <p className="text-xs text-stone-500">Table {table.name} · Scan & Order</p>
            </div>
            <span className="text-3xl">🍽️</span>
          </div>
          <input placeholder="Search dishes…" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-3 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setCatFilter("all")} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${catFilter === "all" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>All</button>
            {categories.map((c) => <button key={c.id} onClick={() => setCatFilter(c.id)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${catFilter === c.id ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>{c.name}</button>)}
          </div>
        </div>
      </div>

      {/* Menu */}
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

      {/* Cart bar */}
      {totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white p-4 shadow-lg">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><ShoppingCart size={20} /></span>
              <div><p className="text-sm font-semibold text-stone-900">{totalItems} items · {formatMoney(totals.total, currency)}</p><p className="text-xs text-stone-500">Incl. taxes & charges</p></div>
            </div>
            <Button onClick={placeOrder} disabled={placing} size="lg">{placing ? "Placing…" : "Place Order"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrderTracking() {
  const { orderId, token } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !token) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_order_for_customer", { p_order_id: orderId, p_token: token });
      if (error || !data || data.length === 0) { setLoading(false); return; }
      setOrder(data[0]);
      // order_items are not readable by anon; try anyway then fall back to empty
      const { data: its } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      setItems((its as OrderItem[]) ?? []);
      setLoading(false);
    })();
  }, [orderId, token]);

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order:${orderId}:${token}`, { config: { private: true } })
      .on("broadcast", { event: "order_status" }, ({ payload }) => {
        const status = payload.status;
        if (typeof status !== "string" || !Object.prototype.hasOwnProperty.call(ORDER_STATUS_LABEL, status)) return;
        setOrder((current: typeof order) => current ? { ...current, status } : current);
      })
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          supabase.rpc("get_order_for_customer", { p_order_id: orderId, p_token: token }).then(({ data, error: refreshError }) => {
            if (refreshError) {
              console.error("Failed to refresh customer order status", refreshError);
              return;
            }
            if (data?.[0]) setOrder(data[0]);
          });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Customer order status realtime subscription failed", error);
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [orderId, token]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-stone-50"><p className="text-stone-400">Loading your order…</p></div>;
  if (!order) return <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 gap-4"><EmptyState icon={<Receipt size={48} />} title="Order not found" subtitle="This order may have been removed." /><Button onClick={() => navigate("/")}>Go home</Button></div>;

  const currency = "₹";
  const steps = ["pending", "accepted", "preparing", "ready", "served"];
  const currentIdx = steps.indexOf(order.status);
  const stepIcons = [<Clock size={18} key="0" />, <CheckCircle2 size={18} key="1" />, <Flame size={18} key="2" />, <Utensils size={18} key="3" />, <ChefHat size={18} key="4" />];

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">🍽️</div>
          <h1 className="font-display text-2xl font-bold text-stone-900">{order.restaurant_name}</h1>
          <p className="text-sm text-stone-500">Order #{String(order.id).slice(0, 6)} · {timeAgo(order.created_at)}</p>
        </div>

        {/* Status tracker */}
        <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-center font-display text-lg font-bold text-stone-900">{ORDER_STATUS_LABEL[order.status as keyof typeof ORDER_STATUS_LABEL] ?? order.status}</h2>
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full transition ${i <= currentIdx ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-400"}`}>
                  {stepIcons[i]}
                </div>
                <span className={`mt-1.5 text-[10px] font-medium ${i <= currentIdx ? "text-emerald-700" : "text-stone-400"}`}>{ORDER_STATUS_LABEL[s as keyof typeof ORDER_STATUS_LABEL]}</span>
                {i < steps.length - 1 && <div className={`absolute h-0.5 ${i < currentIdx ? "bg-emerald-500" : "bg-stone-200"}`} style={{ width: "18%", marginLeft: "52%", marginTop: "20px" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-stone-900">Your Order</h2>
            <div className="divide-y divide-stone-100">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-2"><span className="text-lg">{it.emoji}</span><span className="text-stone-900">{it.quantity}× {it.name}</span></div>
                  <span className="font-medium text-stone-700">{formatMoney(it.price * it.quantity, currency)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{formatMoney(order.subtotal, currency)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Tax</span><span>{formatMoney(order.tax_amount, currency)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Service</span><span>{formatMoney(order.service_charge, currency)}</span></div>
              <div className="flex justify-between border-t border-stone-200 pt-1 font-bold text-stone-900"><span>Total</span><span>{formatMoney(order.total, currency)}</span></div>
            </div>
          </div>
        )}

        <div className="text-center">
          <Button variant="outline" onClick={() => navigate(`/menu/${orderId}`)}><ArrowLeft size={16} /> Back to menu</Button>
        </div>
      </div>
    </div>
  );
}
