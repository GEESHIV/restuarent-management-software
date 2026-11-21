import { useEffect, useState } from "react";
import { Receipt, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRealtimeQuery } from "@/lib/useRealtime";
import { PageHeader } from "@/components/DashboardLayout";
import { Modal } from "@/components/Modal";
import { Badge, EmptyState, Select } from "@/components/ui";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_COLOR,
} from "@/lib/status";
import { formatMoney, timeAgo, elapsedMin } from "@/lib/format";
import type { Order, OrderItem } from "@/types";

export function OrdersList({ title = "Orders" }: { title?: string }) {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const currency = restaurant?.currency ?? "₹";
  const { data: orders } = useRealtimeQuery<Order>({
    table: "orders",
    filterColumn: "restaurant_id",
    filterValue: rid,
    select: "*, table:restaurant_tables(id,name)",
    orderBy: { column: "created_at", ascending: false },
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Order | null>(null);

  const filtered = orders.filter(
    (o) =>
      (statusFilter === "all" || o.status === statusFilter) &&
      (typeFilter === "all" || o.order_type === typeFilter)
  );

  return (
    <div>
      <PageHeader title={title} subtitle={`${filtered.length} orders`} />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3">
        <Filter size={16} className="text-stone-400" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="served">Served</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-auto">
          <option value="all">All types</option>
          <option value="dine_in">Dine-in</option>
          <option value="takeaway">Takeaway</option>
          <option value="delivery">Delivery</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Receipt size={40} />} title="No orders found" subtitle="Try changing the filters." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o)}
              className="text-left rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-stone-900">
                    {o.table ? `Table ${o.table?.name}` : o.order_type === "delivery" ? "Delivery" : "Takeaway"}
                  </p>
                  <p className="text-xs text-stone-500">
                    {o.order_channel} · {timeAgo(o.created_at)} · {elapsedMin(o.created_at)}m
                  </p>
                </div>
                <Badge color={ORDER_STATUS_COLOR[o.status] as any}>{ORDER_STATUS_LABEL[o.status]}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-stone-600">{o.item_count} items</span>
                <span className="font-semibold text-stone-900">{formatMoney(o.total, currency)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge color={o.payment_status === "paid" ? "green" : "amber"}>{o.payment_status}</Badge>
                {o.payment_method && <Badge color="stone">{o.payment_method}</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Order details">
        {selected && <OrderDetail order={selected} currency={currency} />}
      </Modal>
    </div>
  );
}

export function OrderDetail({ order, currency }: { order: Order; currency: string }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setItems((data as OrderItem[]) ?? []);
        setLoading(false);
      });
  }, [order.id]);

  if (loading) return <p className="text-sm text-stone-400">Loading items…</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-4 text-sm">
        <div>
          <p className="text-stone-500">Type</p>
          <p className="font-medium capitalize text-stone-900">{order.order_type.replace("_", "-")}</p>
        </div>
        <div>
          <p className="text-stone-500">Channel</p>
          <p className="font-medium capitalize text-stone-900">{order.order_channel}</p>
        </div>
        {order.table && (
          <div>
            <p className="text-stone-500">Table</p>
            <p className="font-medium text-stone-900">{(order.table as any)?.name ?? "—"}</p>
          </div>
        )}
        {order.customer_name && (
          <div>
            <p className="text-stone-500">Customer</p>
            <p className="font-medium text-stone-900">{order.customer_name}</p>
          </div>
        )}
        {order.customer_phone && (
          <div>
            <p className="text-stone-500">Phone</p>
            <p className="font-medium text-stone-900">{order.customer_phone}</p>
          </div>
        )}
        {order.customer_address && (
          <div className="col-span-2">
            <p className="text-stone-500">Address</p>
            <p className="font-medium text-stone-900">{order.customer_address}</p>
          </div>
        )}
      </div>

      {order.special_instructions && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <span className="font-semibold">Note: </span>{order.special_instructions}
        </div>
      )}

      <div className="divide-y divide-stone-100 rounded-xl border border-stone-200">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{it.emoji}</span>
              <div>
                <p className="font-medium text-stone-900">{it.name}</p>
                <p className="text-xs text-stone-500">
                  {it.quantity} × {formatMoney(it.price, currency)}
                  {it.special_instructions ? ` · ${it.special_instructions}` : ""}
                </p>
              </div>
            </div>
            <span className="font-medium text-stone-900">{formatMoney(it.price * it.quantity, currency)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 rounded-xl bg-stone-50 p-4 text-sm">
        <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{formatMoney(order.subtotal, currency)}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Tax</span><span>{formatMoney(order.tax_amount, currency)}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Service</span><span>{formatMoney(order.service_charge, currency)}</span></div>
        <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold text-stone-900">
          <span>Total</span><span>{formatMoney(order.total, currency)}</span>
        </div>
      </div>
    </div>
  );
}
