import { useEffect, useMemo, useState } from "react";
import { ChefHat, Clock, CheckCircle2, UtensilsCrossed, Bell, ArrowRight, Flame, Timer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRealtimeQuery } from "@/lib/useRealtime";
import { PageHeader, StatCard } from "@/components/DashboardLayout";
import { Badge, Button, EmptyState } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, ITEM_STATUS_LABEL } from "@/lib/status";
import { formatMoney, elapsedMin, timeAgo } from "@/lib/format";
import type { Order, OrderItem, ItemStatus } from "@/types";

export function KitchenDashboard() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const currency = restaurant?.currency ?? "₹";
  const { notify } = useToast();
  const { data: orders } = useRealtimeQuery<Order>({
    table: "orders", filterColumn: "restaurant_id", filterValue: rid,
    select: "*, table:restaurant_tables(id,name)", orderBy: { column: "created_at", ascending: true },
  });
  const [itemsMap, setItemsMap] = useState<Record<string, OrderItem[]>>({});
  const [bumpOrder, setBumpOrder] = useState<string | null>(null);

  const activeOrders = useMemo(
    () => orders.filter((o) => ["pending", "accepted", "preparing", "ready"].includes(o.status)),
    [orders]
  );
  const pending = activeOrders.filter((o) => o.status === "pending");
  const preparing = activeOrders.filter((o) => o.status === "accepted" || o.status === "preparing");
  const ready = activeOrders.filter((o) => o.status === "ready");
  const activeOrderIds = activeOrders.map((o) => o.id).join(",");

  useEffect(() => {
    const ids = activeOrderIds ? activeOrderIds.split(",") : [];
    async function refreshItems() {
      if (ids.length === 0) { setItemsMap({}); return; }
      const { data, error } = await supabase.from("order_items").select("*").in("order_id", ids).order("created_at", { ascending: true });
      if (error) { notify(error.message, "error"); return; }
      const map: Record<string, OrderItem[]> = {};
      (data as OrderItem[] ?? []).forEach((it) => {
        if (!map[it.order_id]) map[it.order_id] = [];
        map[it.order_id].push(it);
      });
      setItemsMap(map);
    }

    refreshItems();
    if (!rid) return;
    const channel = supabase
      .channel(`kitchen_order_items_${rid}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "order_items",
        filter: `restaurant_id=eq.${rid}`,
      }, refreshItems)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeOrderIds, notify, rid]);

  async function advanceOrder(order: Order) {
    const next: Record<string, string> = { pending: "accepted", accepted: "preparing", preparing: "ready", ready: "served" };
    const ns = next[order.status];
    if (!ns) return;
    const patch: Record<string, any> = { status: ns, updated_at: new Date().toISOString() };
    if (ns === "accepted") patch.accepted_at = new Date().toISOString();
    if (ns === "ready") patch.ready_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(patch).eq("id", order.id);
    if (error) notify(error.message, "error");
    else if (ns === "ready") { setBumpOrder(order.id); notify(`Order #${order.id.slice(0, 6)} ready for pickup`, "success"); }
  }

  async function advanceItem(orderId: string, item: OrderItem) {
    const next: Record<ItemStatus, ItemStatus> = { pending: "accepted", accepted: "preparing", preparing: "ready", ready: "served", served: "served" };
    const ns = next[item.status];
    if (ns === item.status) return;
    const { error } = await supabase.from("order_items").update({ status: ns }).eq("id", item.id);
    if (error) notify(error.message, "error");
  }

  return (
    <div>
      <PageHeader title="Kitchen" subtitle={`${activeOrders.length} active tickets · ${pending.length} new, ${preparing.length} cooking, ${ready.length} ready`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New orders" value={String(pending.length)} icon={<Bell size={18} />} accent="amber" />
        <StatCard label="Cooking" value={String(preparing.length)} icon={<Flame size={18} />} accent="red" />
        <StatCard label="Ready" value={String(ready.length)} icon={<CheckCircle2 size={18} />} accent="emerald" />
        <StatCard label="Oldest ticket" value={`${pending[0] ? elapsedMin(pending[0].created_at) : preparing[0] ? elapsedMin(preparing[0].created_at) : 0}m`} icon={<Timer size={18} />} accent="sky" />
      </div>

      {activeOrders.length === 0 ? (
        <EmptyState icon={<ChefHat size={48} />} title="No active tickets" subtitle="New orders will appear here in real-time." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Pending column */}
          <KanbanColumn title="New" icon={<Bell size={16} />} accent="amber" count={pending.length}>
            {pending.map((o) => <TicketCard key={o.id} order={o} items={itemsMap[o.id] ?? []} currency={currency} onAdvance={() => advanceOrder(o)} onItem={(it) => advanceItem(o.id, it)} bumped={bumpOrder === o.id} />)}
          </KanbanColumn>
          {/* Preparing column */}
          <KanbanColumn title="Cooking" icon={<Flame size={16} />} accent="red" count={preparing.length}>
            {preparing.map((o) => <TicketCard key={o.id} order={o} items={itemsMap[o.id] ?? []} currency={currency} onAdvance={() => advanceOrder(o)} onItem={(it) => advanceItem(o.id, it)} bumped={bumpOrder === o.id} />)}
          </KanbanColumn>
          {/* Ready column */}
          <KanbanColumn title="Ready" icon={<CheckCircle2 size={16} />} accent="emerald" count={ready.length}>
            {ready.map((o) => <TicketCard key={o.id} order={o} items={itemsMap[o.id] ?? []} currency={currency} onAdvance={() => advanceOrder(o)} onItem={(it) => advanceItem(o.id, it)} bumped={bumpOrder === o.id} />)}
          </KanbanColumn>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ title, icon, accent, count, children }: {
  title: string; icon: React.ReactNode; accent: string; count: number; children: React.ReactNode;
}) {
  const accents: Record<string, string> = { amber: "border-t-amber-400", red: "border-t-red-400", emerald: "border-t-emerald-400" };
  return (
    <div className={`rounded-2xl border border-stone-200 border-t-4 bg-white p-4 shadow-sm ${accents[accent]}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-stone-900">{icon} {title}</h2>
        <Badge color={accent as any}>{count}</Badge>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TicketCard({ order, items, currency, onAdvance, onItem, bumped }: {
  order: Order; items: OrderItem[]; currency: string; onAdvance: () => void; onItem: (it: OrderItem) => void; bumped: boolean;
}) {
  const mins = elapsedMin(order.created_at);
  const waitColor = mins > 15 ? "text-red-600" : mins > 8 ? "text-amber-600" : "text-stone-500";
  const allItemsReady = items.length > 0 && items.every((it) => it.status === "ready" || it.status === "served");
  const nextLabel: Record<string, string> = { pending: "Accept", accepted: "Start cooking", preparing: allItemsReady ? "Mark ready" : "Mark ready", ready: "Mark served" };

  return (
    <div className={`rounded-xl border border-stone-200 bg-stone-50 p-4 transition ${bumped ? "animate-pulse ring-2 ring-emerald-400" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-base font-bold text-stone-900">{order.table ? `Table ${order.table?.name}` : order.order_type === "delivery" ? "Delivery" : "Takeaway"}</p>
          <p className="text-xs text-stone-500">#{order.id.slice(0, 6)} · {order.order_channel}</p>
        </div>
        <div className="text-right">
          <span className={`flex items-center gap-1 text-xs font-semibold ${waitColor}`}><Clock size={12} /> {mins}m</span>
          <Badge color={ORDER_STATUS_COLOR[order.status] as any}>{ORDER_STATUS_LABEL[order.status]}</Badge>
        </div>
      </div>

      {order.special_instructions && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">Note: {order.special_instructions}</p>
      )}

      <div className="mt-3 space-y-1.5">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-sm">
            <span className="text-lg">{it.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-stone-900"><span className="font-semibold">{it.quantity}×</span> {it.name}</p>
              {it.special_instructions && <p className="text-xs text-amber-600">⚠ {it.special_instructions}</p>}
            </div>
            <button onClick={() => onItem(it)} className="shrink-0 rounded-md px-2 py-1 text-xs font-medium transition hover:bg-stone-100">
              <span className={`inline-flex items-center gap-1 ${it.status === "ready" || it.status === "served" ? "text-emerald-600" : "text-stone-500"}`}>
                {ITEM_STATUS_LABEL[it.status]} <ArrowRight size={10} />
              </span>
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-stone-400">Loading items…</p>}
      </div>

      <Button onClick={onAdvance} size="sm" className="mt-3 w-full" variant={order.status === "ready" ? "primary" : "outline"}>
        {order.status === "ready" ? <UtensilsCrossed size={14} /> : <ArrowRight size={14} />}
        {nextLabel[order.status]}
      </Button>
    </div>
  );
}
