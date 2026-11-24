import { useEffect, useMemo, useState } from "react";
import { Table2, Plus, Receipt, Send, Wallet, Share2, Clock, CheckCircle2, ShoppingCart, Minus, ChefHat, Bell, PhoneCall } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRealtimeQuery } from "@/lib/useRealtime";
import { PageHeader } from "@/components/DashboardLayout";
import { Modal } from "@/components/Modal";
import { QrCard } from "@/components/QrCard";
import { AlertSoundButton } from "@/components/AlertSoundButton";
import { Badge, Button, EmptyState, Field, Textarea, VegMark, Select } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { TABLE_STATUS_LABEL, TABLE_STATUS_COLOR, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/status";
import { formatMoney, computeTotals, timeAgo, elapsedMin } from "@/lib/format";
import { getMenuItemPrice, getMenuSizes, hasMenuSizes, menuSizeLabel } from "@/lib/menuPricing";
import { useRealtimeAlerts } from "@/lib/useRealtimeAlerts";
import type { MenuItem, MenuSize, Order, OrderItem, Restaurant, RestaurantTable, WaiterCall } from "@/types";

export function WaiterTables() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const currency = restaurant?.currency ?? "₹";
  const { notify } = useToast();
  const { data: tables } = useRealtimeQuery<RestaurantTable>({ table: "restaurant_tables", filterColumn: "restaurant_id", filterValue: rid, orderBy: { column: "name", ascending: true } });
  const { data: orders, loading: ordersLoading } = useRealtimeQuery<Order>({ table: "orders", filterColumn: "restaurant_id", filterValue: rid, select: "*, table:restaurant_tables(id,name)", orderBy: { column: "created_at", ascending: false } });
  const { data: calls, loading: callsLoading } = useRealtimeQuery<WaiterCall>({ table: "waiter_calls", filterColumn: "restaurant_id", filterValue: rid, enabled: Boolean(rid), select: "*, table:restaurant_tables(id,name)", orderBy: { column: "created_at", ascending: false } });
  const { data: menu } = useRealtimeQuery<MenuItem>({ table: "menu_items", filterColumn: "restaurant_id", filterValue: rid, select: "*, category:categories(id,name)", orderBy: { column: "sort_order", ascending: true } });

  const [orderTable, setOrderTable] = useState<RestaurantTable | null>(null);
  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const pendingCalls = calls.filter((call) => call.status === "pending");
  const alertEvents = useMemo(() => [
    ...orders.filter((order) => order.status === "pending").map((order) => ({
      id: `order-${order.id}`,
      message: `New order received${order.table ? ` from Table ${order.table.name}` : ""}`,
    })),
    ...pendingCalls.map((call) => ({
      id: `call-${call.id}`,
      message: `Table ${call.table?.name ?? "unknown"} is calling for a waiter`,
    })),
  ], [orders, pendingCalls]);
  const { soundEnabled, turnSoundOn } = useRealtimeAlerts(alertEvents, ordersLoading || callsLoading);

  const activeOrderByTable = useMemo(() => {
    const map: Record<string, Order> = {};
    orders.forEach((o) => { if (o.table_id && ["pending", "accepted", "preparing", "ready", "served"].includes(o.status)) { if (!map[o.table_id]) map[o.table_id] = o; } });
    return map;
  }, [orders]);

  const counts = { available: tables.filter((t) => t.status === "available").length, occupied: tables.filter((t) => t.status === "occupied").length, bill_pending: tables.filter((t) => t.status === "bill_pending").length };

  async function acknowledgeCall(call: WaiterCall) {
    const { error } = await supabase.from("waiter_calls").update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
    }).eq("id", call.id);
    if (error) notify(error.message, "error");
  }

  return (
    <div>
      <PageHeader title="Tables" subtitle={`${tables.length} tables · ${counts.available} available, ${counts.occupied} occupied, ${counts.bill_pending} bill pending`} />
      <div className="mb-4 flex justify-end"><AlertSoundButton enabled={soundEnabled} onEnable={turnSoundOn} /></div>
      {pendingCalls.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-amber-900"><Bell size={18} /> Customers calling for a waiter</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pendingCalls.map((call) => (
              <div key={call.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold text-stone-900"><PhoneCall size={15} className="text-amber-600" /> Table {call.table?.name ?? "—"}</p>
                  <p className="text-xs text-stone-500">{timeAgo(call.created_at)}</p>
                </div>
                <Button size="sm" onClick={() => acknowledgeCall(call)}>Acknowledge</Button>
              </div>
            ))}
          </div>
        </div>
      )}
      {tables.length === 0 ? <EmptyState icon={<Table2 size={40} />} title="No tables" subtitle="Ask the owner to add tables." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((t) => {
            const activeOrder = activeOrderByTable[t.id];
            return (
              <div key={t.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${t.status === "available" ? "border-emerald-200" : t.status === "occupied" ? "border-red-200" : "border-amber-200"}`}>
                <div className="flex items-start justify-between">
                  <div><p className="font-display text-2xl font-bold text-stone-900">{t.name}</p><p className="text-xs text-stone-500">{t.seats} seats</p></div>
                  <Badge color={TABLE_STATUS_COLOR[t.status]}>{TABLE_STATUS_LABEL[t.status]}</Badge>
                </div>
                {activeOrder && (
                  <div className="mt-3 rounded-xl bg-stone-50 p-3 text-xs">
                    <div className="flex items-center justify-between"><span className="text-stone-500">Order</span><Badge color={ORDER_STATUS_COLOR[activeOrder.status] as any}>{ORDER_STATUS_LABEL[activeOrder.status]}</Badge></div>
                    <p className="mt-1 text-stone-700">{activeOrder.item_count} items · {formatMoney(activeOrder.total, currency)}</p>
                    <p className="mt-0.5 text-stone-400">{elapsedMin(activeOrder.created_at)}m · {timeAgo(activeOrder.created_at)}</p>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setOrderTable(t)}><Plus size={14} /> {activeOrder ? "Add items" : "New order"}</Button>
                  {activeOrder && <Button size="sm" variant="outline" onClick={() => setBillOrder(activeOrder)}><Receipt size={14} /> Bill</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {orderTable && <TakeOrderModal table={orderTable} restaurantId={rid!} currency={currency} gstPercentage={restaurant?.gst_percentage ?? 0} servicePercentage={restaurant?.service_charge_percentage ?? 0} menu={menu} existingOrder={activeOrderByTable[orderTable.id] ?? null} onClose={() => setOrderTable(null)} onSent={() => { setOrderTable(null); notify("Order sent to kitchen", "success"); }} />}
      {billOrder && <BillModal order={billOrder} restaurantId={rid!} currency={currency} restaurant={restaurant!} onClose={() => setBillOrder(null)} onPaid={() => notify("Payment recorded", "success")} />}
    </div>
  );
}

function TakeOrderModal({ table, restaurantId, currency, gstPercentage, servicePercentage, menu, existingOrder, onClose, onSent }: {
  table: RestaurantTable; restaurantId: string; currency: string; gstPercentage: number; servicePercentage: number; menu: MenuItem[]; existingOrder: Order | null; onClose: () => void; onSent: () => void;
}) {
  const { notify } = useToast();
  const [cart, setCart] = useState<Record<string, { item: MenuItem; qty: number; note: string; size: MenuSize | null }>>({});
  const [selectedSizes, setSelectedSizes] = useState<Record<string, MenuSize>>({});
  const [instructions, setInstructions] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [existingItems, setExistingItems] = useState<OrderItem[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (existingOrder) { supabase.from("order_items").select("*").eq("order_id", existingOrder.id).then(({ data }) => setExistingItems((data as OrderItem[]) ?? [])); }
  }, [existingOrder]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>(); menu.forEach((m) => { if (m.category && !seen.has(m.category.id)) seen.set(m.category.id, m.category.name); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [menu]);

  const filteredMenu = menu.filter((m) => m.is_available && (catFilter === "all" || m.category_id === catFilter) && m.name.toLowerCase().includes(search.toLowerCase()));
  const subtotal = Object.values(cart).reduce((s, { item, qty, size }) => s + getMenuItemPrice(item, size) * qty, 0);
  const totals = computeTotals(subtotal, gstPercentage, servicePercentage);
  const totalItems = Object.values(cart).reduce((s, c) => s + c.qty, 0);

  function addToCart(item: MenuItem) {
    const availableSizes = getMenuSizes(item);
    const size = availableSizes.length > 0 ? selectedSizes[item.id] ?? availableSizes[0] : null;
    setCart((c) => { const ex = c[item.id]; return { ...c, [item.id]: { item, qty: (ex?.qty ?? 0) + 1, note: ex?.note ?? "", size } }; });
  }
  function changeSize(item: MenuItem, size: MenuSize) {
    setSelectedSizes((sizes) => ({ ...sizes, [item.id]: size }));
    setCart((c) => c[item.id] ? { ...c, [item.id]: { ...c[item.id], size } } : c);
  }
  function changeQty(item: MenuItem, delta: number) {
    setCart((c) => { const ex = c[item.id]; if (!ex) return c; const qty = ex.qty + delta; if (qty <= 0) { const { [item.id]: _, ...rest } = c; return rest; } return { ...c, [item.id]: { ...ex, qty } }; });
  }
  function setNote(item: MenuItem, note: string) { setCart((c) => ({ ...c, [item.id]: { ...c[item.id], note } })); }

  async function sendToKitchen() {
    if (Object.keys(cart).length === 0) { notify("Add at least one item", "error"); return; }
    setSending(true);
    try {
      let orderId: string;
      if (existingOrder) {
        orderId = existingOrder.id;
        const newItems = Object.values(cart).map(({ item, qty, note, size }) => ({ order_id: orderId, restaurant_id: restaurantId, menu_item_id: item.id, name: size ? `${item.name} (${menuSizeLabel(size)})` : item.name, price: getMenuItemPrice(item, size), item_size: size, quantity: qty, is_veg: item.is_veg, emoji: item.emoji, special_instructions: note || null, status: "pending" as const }));
        const { error: itemErr } = await supabase.from("order_items").insert(newItems);
        if (itemErr) throw itemErr;
        const { data: allItems } = await supabase.from("order_items").select("price, quantity").eq("order_id", orderId);
        const sub = (allItems ?? []).reduce((s, it: any) => s + Number(it.price) * it.quantity, 0);
        const t = computeTotals(sub, gstPercentage, servicePercentage);
        const { error: ordErr } = await supabase.from("orders").update({ subtotal: t.subtotal, tax_amount: t.tax_amount, service_charge: t.service_charge, total: t.total, item_count: (allItems ?? []).reduce((s: number, it: any) => s + it.quantity, 0), status: existingOrder.status === "pending" ? "accepted" : existingOrder.status }).eq("id", orderId);
        if (ordErr) throw ordErr;
      } else {
        const { data: newOrder, error: ordErr } = await supabase.from("orders").insert({ restaurant_id: restaurantId, table_id: table.id, order_type: "dine_in", order_channel: "waiter", status: "pending", special_instructions: instructions.trim() || null, subtotal: totals.subtotal, tax_amount: totals.tax_amount, service_charge: totals.service_charge, total: totals.total, item_count: totalItems, payment_status: "unpaid" }).select("id").single();
        if (ordErr) throw ordErr;
        orderId = newOrder.id;
        const newItems = Object.values(cart).map(({ item, qty, note, size }) => ({ order_id: orderId, restaurant_id: restaurantId, menu_item_id: item.id, name: size ? `${item.name} (${menuSizeLabel(size)})` : item.name, price: getMenuItemPrice(item, size), item_size: size, quantity: qty, is_veg: item.is_veg, emoji: item.emoji, special_instructions: note || null, status: "pending" as const }));
        const { error: itemErr } = await supabase.from("order_items").insert(newItems);
        if (itemErr) throw itemErr;
        await supabase.from("restaurant_tables").update({ status: "occupied" }).eq("id", table.id);
      }
      onSent();
    } catch (err: any) { notify(err.message || "Failed to send order", "error"); } finally { setSending(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Table ${table.name} — Take Order`} maxWidth="max-w-4xl">
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <input placeholder="Search dishes…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setCatFilter("all")} className={`rounded-full px-3 py-1 text-xs font-medium ${catFilter === "all" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>All</button>
            {categories.map((c) => <button key={c.id} onClick={() => setCatFilter(c.id)} className={`rounded-full px-3 py-1 text-xs font-medium ${catFilter === c.id ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>{c.name}</button>)}
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {filteredMenu.map((item) => {
              const inCart = cart[item.id];
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><VegMark isVeg={item.is_veg} /><p className="truncate text-sm font-medium text-stone-900">{item.name}</p></div>
                    <p className="text-xs text-stone-500">{formatMoney(getMenuItemPrice(item, inCart?.size ?? (hasMenuSizes(item) ? selectedSizes[item.id] ?? getMenuSizes(item)[0] : null)), currency)}</p>
                    {hasMenuSizes(item) && (
                      <Select
                        value={inCart?.size ?? selectedSizes[item.id] ?? getMenuSizes(item)[0]}
                        onChange={(e) => changeSize(item, e.target.value as MenuSize)}
                        className="mt-1 py-1 text-xs"
                        aria-label={`Choose size for ${item.name}`}
                      >
                        {getMenuSizes(item).map((size) => (
                          <option key={size} value={size}>{menuSizeLabel(size)} — {formatMoney(getMenuItemPrice(item, size), currency)}</option>
                        ))}
                      </Select>
                    )}
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(item, -1)} className="rounded-lg bg-stone-100 px-2 py-1 text-stone-700 hover:bg-stone-200"><Minus size={14} /></button>
                      <span className="w-6 text-center text-sm font-semibold">{inCart.qty}</span>
                      <button onClick={() => changeQty(item, 1)} className="rounded-lg bg-emerald-100 px-2 py-1 text-emerald-700 hover:bg-emerald-200"><Plus size={14} /></button>
                    </div>
                  ) : <Button size="sm" variant="outline" onClick={() => addToCart(item)}><Plus size={14} /> Add</Button>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-stone-900"><ShoppingCart size={16} /> Cart ({totalItems})</h3>
            {Object.values(cart).length === 0 && existingItems.length === 0 ? <p className="py-6 text-center text-sm text-stone-400">Cart is empty</p> : (
              <div className="max-h-[260px] space-y-2 overflow-y-auto">
                {existingItems.length > 0 && <p className="text-xs font-semibold uppercase text-stone-400">Already on this order</p>}
                {existingItems.map((it) => <div key={it.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs"><span className="text-stone-700">{it.emoji} {it.name} × {it.quantity}</span><span className="text-stone-500">{formatMoney(it.price * it.quantity, currency)}</span></div>)}
                {Object.values(cart).map(({ item, qty, note, size }) => (
                  <div key={item.id} className="rounded-lg bg-white px-3 py-2">
                    <div className="flex items-center justify-between text-sm"><span className="text-stone-900">{item.emoji} {item.name}{size ? ` (${menuSizeLabel(size)})` : ""} × {qty}</span><span className="font-medium text-stone-900">{formatMoney(getMenuItemPrice(item, size) * qty, currency)}</span></div>
                    <input value={note} onChange={(e) => setNote(item, e.target.value)} placeholder="Special instruction…" className="mt-1.5 w-full rounded-md border border-stone-200 px-2 py-1 text-xs outline-none focus:border-emerald-400" />
                  </div>
                ))}
              </div>
            )}
            <Field label="Order note (whole order)"><Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} placeholder="e.g. Make it less spicy" className="mt-2" /></Field>
            <div className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{formatMoney(totals.subtotal, currency)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Tax ({gstPercentage}%)</span><span>{formatMoney(totals.tax_amount, currency)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Service ({servicePercentage}%)</span><span>{formatMoney(totals.service_charge, currency)}</span></div>
              <div className="flex justify-between border-t border-stone-200 pt-1 font-bold text-stone-900"><span>Total</span><span>{formatMoney(totals.total, currency)}</span></div>
            </div>
            <Button onClick={sendToKitchen} disabled={sending || Object.keys(cart).length === 0} className="mt-3 w-full"><Send size={16} /> {sending ? "Sending…" : "Send to Kitchen"}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function BillModal({ order, restaurantId, currency, restaurant, onClose, onPaid }: {
  order: Order; restaurantId: string; currency: string; restaurant: Restaurant; onClose: () => void; onPaid: () => void;
}) {
  const { notify } = useToast();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<"cash" | "upi" | "card">("cash");
  const [paying, setPaying] = useState(false);
  const [paymentRecorded, setPaymentRecorded] = useState(false);
  const upiId = restaurant.upi_id?.trim() ?? "";
  const upiName = restaurant.upi_name?.trim() ?? "";
  const upiUri = upiId && upiName
    ? `upi://pay?${new URLSearchParams({
        pa: upiId,
        pn: upiName,
        am: Number(order.total).toFixed(2),
        cu: "INR",
        tn: `Bill ${order.table?.name ? `Table ${order.table.name}` : order.id}`,
      }).toString()}`
    : "";

  useEffect(() => {
    supabase.from("order_items").select("*").eq("order_id", order.id).order("created_at", { ascending: true }).then(({ data }) => { setItems((data as OrderItem[]) ?? []); setLoading(false); });
  }, [order.id]);

  async function recordPayment() {
    setPaying(true);
    const { error: payErr } = await supabase.from("payments").insert({ order_id: order.id, restaurant_id: restaurantId, amount: order.total, method });
    if (payErr) { setPaying(false); notify(payErr.message, "error"); return; }
    const { error: ordErr } = await supabase.from("orders").update({ payment_status: "paid", payment_method: method, status: "completed" }).eq("id", order.id);
    if (ordErr) { setPaying(false); notify(ordErr.message, "error"); return; }
    if (order.table_id) await supabase.from("restaurant_tables").update({ status: "available" }).eq("id", order.table_id);
    setPaying(false); setPaymentRecorded(true); onPaid();
  }

  function shareWhatsApp() {
    const lines = items.map((it) => `• ${it.emoji} ${it.name} ×${it.quantity} = ${formatMoney(it.price * it.quantity, currency)}`);
    const msg = `*Bill — Table ${order.table?.name ?? ""}*\n\n${lines.join("\n")}\n\nSubtotal: ${formatMoney(order.subtotal, currency)}\nTax: ${formatMoney(order.tax_amount, currency)}\nService: ${formatMoney(order.service_charge, currency)}\n*Total: ${formatMoney(order.total, currency)}*\n\nThank you for dining with us! 🍽️`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const canRecordPayment = method !== "upi" || Boolean(upiUri);

  if (loading) return <Modal open onClose={onClose} title="Bill"><p className="text-sm text-stone-400">Loading…</p></Modal>;

  return (
    <Modal open onClose={onClose} title={`Bill — Table ${order.table?.name ?? "Order"}`} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-dashed border-stone-300 p-4">
          <div className="mb-3 text-center"><p className="font-display text-lg font-bold text-stone-900">{restaurant.name}</p><p className="text-xs text-stone-500">Table {order.table?.name} · {new Date(order.created_at).toLocaleString("en-IN")}</p></div>
          <div className="divide-y divide-stone-100">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2"><span>{it.emoji}</span><div><p className="text-stone-900">{it.name}</p><p className="text-xs text-stone-500">{it.quantity} × {formatMoney(it.price, currency)}</p></div></div>
                <span className="font-medium text-stone-900">{formatMoney(it.price * it.quantity, currency)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-stone-300 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{formatMoney(order.subtotal, currency)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">GST</span><span>{formatMoney(order.tax_amount, currency)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Service</span><span>{formatMoney(order.service_charge, currency)}</span></div>
            <div className="flex justify-between border-t border-stone-300 pt-1 text-base font-bold text-stone-900"><span>Total</span><span>{formatMoney(order.total, currency)}</span></div>
          </div>
        </div>
        {order.payment_status === "paid" || paymentRecorded ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-emerald-700"><CheckCircle2 size={20} /> Paid via {order.payment_method ?? method}</div>
            {restaurant.google_review_url?.trim() ? (
              <QrCard url={restaurant.google_review_url.trim()} title="Enjoyed your visit?" subtitle="Scan to leave us a Google review" />
            ) : (
              <p className="rounded-xl bg-stone-50 p-3 text-center text-sm text-stone-500">Add a Google review URL in Owner Settings to show a review QR code here.</p>
            )}
          </div>
        ) : (
          <>
            <Field label="Payment method">
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "upi", "card"] as const).map((m) => (
                  <button key={m} onClick={() => setMethod(m)} className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition ${method === m ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}>{m}</button>
                ))}
              </div>
            </Field>
            {method === "upi" && (
              upiUri ? (
                <div className="space-y-2">
                  <QrCard url={upiUri} title={upiName} subtitle={`${upiId} · ${formatMoney(order.total, currency)}`} />
                  <p className="text-center text-xs text-amber-700">Ask the customer to complete payment, then verify it in the owner’s UPI app before marking this bill paid.</p>
                </div>
              ) : (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Add both the UPI ID and account name in Owner Settings to generate a payment QR code.</p>
              )
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={shareWhatsApp} className="flex-1"><Share2 size={16} /> WhatsApp</Button>
              <Button onClick={recordPayment} disabled={paying || !canRecordPayment} className="flex-1"><Wallet size={16} /> {paying ? "Recording…" : method === "upi" ? "Mark as paid" : "Record Payment"}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export function WaiterBills() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const currency = restaurant?.currency ?? "₹";
  const { notify } = useToast();
  const { data: orders } = useRealtimeQuery<Order>({ table: "orders", filterColumn: "restaurant_id", filterValue: rid, select: "*, table:restaurant_tables(id,name)", orderBy: { column: "created_at", ascending: false } });
  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const unpaid = orders.filter((o) => o.payment_status === "unpaid" && o.status !== "cancelled");
  const paid = orders.filter((o) => o.payment_status === "paid");

  return (
    <div>
      <PageHeader title="Bills & Payments" subtitle={`${unpaid.length} pending, ${paid.length} paid`} />
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-stone-900"><Clock size={18} className="text-amber-500" /> Pending Bills</h2>
      {unpaid.length === 0 ? <EmptyState icon={<Receipt size={40} />} title="No pending bills" subtitle="All bills are settled." /> : (
        <div className="mb-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {unpaid.map((o) => (
            <button key={o.id} onClick={() => setBillOrder(o)} className="text-left rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between"><p className="font-semibold text-stone-900">{o.table ? `Table ${o.table?.name}` : o.order_type}</p><Badge color={ORDER_STATUS_COLOR[o.status] as any}>{ORDER_STATUS_LABEL[o.status]}</Badge></div>
              <p className="mt-1 text-xs text-stone-500">{o.item_count} items · {timeAgo(o.created_at)}</p>
              <p className="mt-2 font-display text-xl font-bold text-stone-900">{formatMoney(o.total, currency)}</p>
            </button>
          ))}
        </div>
      )}
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-stone-900"><CheckCircle2 size={18} className="text-emerald-500" /> Paid Bills</h2>
      {paid.length === 0 ? <EmptyState icon={<CheckCircle2 size={40} />} title="No paid bills yet" /> : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {paid.slice(0, 12).map((o) => (
            <button key={o.id} onClick={() => setBillOrder(o)} className="text-left rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between"><p className="font-semibold text-stone-900">{o.table ? `Table ${o.table?.name}` : o.order_type}</p><Badge color="green">Paid · {o.payment_method}</Badge></div>
              <p className="mt-1 text-xs text-stone-500">{o.item_count} items · {timeAgo(o.created_at)}</p>
              <p className="mt-2 font-display text-xl font-bold text-stone-900">{formatMoney(o.total, currency)}</p>
            </button>
          ))}
        </div>
      )}
      {billOrder && <BillModal order={billOrder} restaurantId={rid!} currency={currency} restaurant={restaurant!} onClose={() => setBillOrder(null)} onPaid={() => notify("Payment recorded", "success")} />}
    </div>
  );
}
