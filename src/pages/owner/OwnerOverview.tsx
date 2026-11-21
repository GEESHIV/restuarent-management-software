import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Receipt, Users, Wallet, Clock, AlertTriangle, ChefHat } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRealtimeQuery } from "@/lib/useRealtime";
import { PageHeader, StatCard } from "@/components/DashboardLayout";
import { Badge, EmptyState } from "@/components/ui";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/status";
import { formatMoney, timeAgo, isToday } from "@/lib/format";
import type { Expense, Order, Payment } from "@/types";

export function OwnerOverview() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const currency = restaurant?.currency ?? "₹";
  const { data: orders } = useRealtimeQuery<Order>({
    table: "orders",
    filterColumn: "restaurant_id",
    filterValue: rid,
    select: "*, table:restaurant_tables(name)",
    orderBy: { column: "created_at", ascending: false },
  });
  const { data: payments } = useRealtimeQuery<Payment>({
    table: "payments",
    filterColumn: "restaurant_id",
    filterValue: rid,
    orderBy: { column: "created_at", ascending: false },
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (!rid) return;
    supabase.from("expenses").select("*").eq("restaurant_id", rid).order("date", { ascending: false })
      .then(({ data }) => setExpenses((data as Expense[]) ?? []));
  }, [rid]);

  const todaysOrders = useMemo(() => orders.filter((o) => isToday(o.created_at)), [orders]);
  const todaysRevenue = useMemo(
    () => todaysOrders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total), 0),
    [todaysOrders]
  );
  const todaysExpense = useMemo(
    () => expenses.filter((e) => isToday(e.created_at)).reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  );
  const activeOrders = useMemo(
    () => orders.filter((o) => ["pending", "accepted", "preparing", "ready"].includes(o.status)),
    [orders]
  );
  const avgOrder = todaysOrders.length ? todaysOrders.reduce((s, o) => s + Number(o.total), 0) / todaysOrders.length : 0;
  const recentOrders = orders.slice(0, 6);

  return (
    <div>
      <PageHeader title="Overview" subtitle={`Today's performance for ${restaurant?.name}`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's Revenue" value={formatMoney(todaysRevenue, currency)} icon={<TrendingUp size={18} />} accent="emerald" hint={`${todaysOrders.filter((o) => o.payment_status === "paid").length} paid orders`} />
        <StatCard label="Today's Orders" value={String(todaysOrders.length)} icon={<Receipt size={18} />} accent="sky" hint={`Avg ${formatMoney(avgOrder, currency)}`} />
        <StatCard label="Active Orders" value={String(activeOrders.length)} icon={<ChefHat size={18} />} accent="amber" hint="In the kitchen now" />
        <StatCard label="Today's Expenses" value={formatMoney(todaysExpense, currency)} icon={<Wallet size={18} />} accent="red" hint={`Net ${formatMoney(todaysRevenue - todaysExpense, currency)}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-stone-900"><Clock size={18} className="text-stone-400" />Recent Orders</h2>
            {recentOrders.length === 0 ? (
              <EmptyState icon={<Receipt size={40} />} title="No orders yet" subtitle="Orders will appear here in real time." />
            ) : (
              <div className="divide-y divide-stone-100">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-900">{o.table ? `Table ${o.table?.name}` : o.order_type === "delivery" ? "Delivery" : "Takeaway"}</span>
                        <Badge color={ORDER_STATUS_COLOR[o.status] as any}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                      </div>
                      <p className="text-xs text-stone-500">{o.item_count} items · {timeAgo(o.created_at)}{o.customer_name ? ` · ${o.customer_name}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-stone-900">{formatMoney(o.total, currency)}</p>
                      <Badge color={o.payment_status === "paid" ? "green" : "amber"}>{o.payment_status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-stone-900"><AlertTriangle size={18} className="text-amber-500" />Kitchen Live</h2>
            {activeOrders.length === 0 ? <p className="text-sm text-stone-400">Kitchen is all caught up.</p> : (
              <div className="space-y-2">
                {activeOrders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                    <span className="text-sm font-medium text-stone-700">{o.table ? `Table ${o.table?.name}` : o.customer_name ?? "Online"}</span>
                    <Badge color={ORDER_STATUS_COLOR[o.status] as any}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-stone-900"><Users size={18} className="text-sky-500" />Payments Today</h2>
            {payments.filter((p) => isToday(p.created_at)).length === 0 ? <p className="text-sm text-stone-400">No payments recorded today.</p> : (
              <div className="space-y-2">
                {payments.filter((p) => isToday(p.created_at)).slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-stone-600">{p.method}</span>
                    <span className="font-medium text-stone-900">{formatMoney(p.amount, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
