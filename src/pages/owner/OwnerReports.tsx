import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Receipt, Wallet, ArrowDownRight, ArrowUpRight, Plus, Trash2, Boxes, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRealtimeQuery } from "@/lib/useRealtime";
import { PageHeader, StatCard } from "@/components/DashboardLayout";
import { Modal } from "@/components/Modal";
import { Badge, Button, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { formatMoney, isToday, todayDate } from "@/lib/format";
import type { Expense, InventoryItem, Order, Payment } from "@/types";

export function OwnerReports() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const currency = restaurant?.currency ?? "₹";
  const { data: orders } = useRealtimeQuery<Order>({ table: "orders", filterColumn: "restaurant_id", filterValue: rid, orderBy: { column: "created_at", ascending: false } });
  const { data: payments } = useRealtimeQuery<Payment>({ table: "payments", filterColumn: "restaurant_id", filterValue: rid, orderBy: { column: "created_at", ascending: false } });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const { notify } = useToast();
  const [showExpense, setShowExpense] = useState(false);

  useEffect(() => {
    if (!rid) return;
    supabase.from("expenses").select("*").eq("restaurant_id", rid).order("date", { ascending: false }).then(({ data }) => setExpenses((data as Expense[]) ?? []));
  }, [rid]);

  const todaysOrders = orders.filter((o) => isToday(o.created_at));
  const todaysRevenue = todaysOrders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total), 0);
  const todaysExpense = expenses.filter((e) => isToday(e.created_at)).reduce((s, e) => s + Number(e.amount), 0);
  const totalRevenue = orders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const methodBreakdown = useMemo(() => {
    const map: Record<string, number> = { cash: 0, upi: 0, card: 0 };
    payments.filter((p) => isToday(p.created_at)).forEach((p) => { map[p.method] = (map[p.method] ?? 0) + Number(p.amount); });
    return map;
  }, [payments]);

  const last7 = useMemo(() => {
    const days: { label: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const rev = orders.filter((o) => o.payment_status === "paid" && o.created_at.slice(0, 10) === key).reduce((s, o) => s + Number(o.total), 0);
      days.push({ label: d.toLocaleDateString("en-IN", { weekday: "short" }), revenue: rev });
    }
    return days;
  }, [orders]);
  const maxRev = Math.max(1, ...last7.map((d) => d.revenue));

  async function removeExpense(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) notify(error.message, "error"); else { notify("Expense deleted", "success"); setExpenses((e) => e.filter((x) => x.id !== id)); }
  }

  return (
    <div>
      <PageHeader title="Reports & Expenses" subtitle="Sales performance, payments and expense tracking"
        actions={<Button onClick={() => setShowExpense(true)}><Plus size={16} /> Add Expense</Button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's Revenue" value={formatMoney(todaysRevenue, currency)} icon={<TrendingUp size={18} />} accent="emerald" />
        <StatCard label="Today's Expenses" value={formatMoney(todaysExpense, currency)} icon={<ArrowDownRight size={18} />} accent="red" />
        <StatCard label="Total Revenue" value={formatMoney(totalRevenue, currency)} icon={<ArrowUpRight size={18} />} accent="sky" />
        <StatCard label="Net Profit" value={formatMoney(totalRevenue - totalExpense, currency)} icon={<Wallet size={18} />} accent="amber" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-bold text-stone-900">Revenue — last 7 days</h2>
          <div className="flex h-48 items-end justify-between gap-2">
            {last7.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all" style={{ height: `${(d.revenue / maxRev) * 100}%`, minHeight: d.revenue > 0 ? "4px" : "0" }} title={formatMoney(d.revenue, currency)} />
                </div>
                <span className="text-xs text-stone-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-bold text-stone-900">Payment methods (today)</h2>
          <div className="space-y-3">
            {Object.entries(methodBreakdown).map(([m, amt]) => {
              const total = Object.values(methodBreakdown).reduce((s, x) => s + x, 0);
              const pct = total > 0 ? (amt / total) * 100 : 0;
              return (
                <div key={m}>
                  <div className="flex justify-between text-sm"><span className="capitalize text-stone-600">{m}</span><span className="font-medium text-stone-900">{formatMoney(amt, currency)}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${m === "cash" ? "bg-emerald-500" : m === "upi" ? "bg-sky-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-stone-900">Recent Expenses</h2>
        {expenses.length === 0 ? <EmptyState icon={<Wallet size={40} />} title="No expenses recorded" subtitle="Track your spending to see profit." /> : (
          <div className="divide-y divide-stone-100">
            {expenses.slice(0, 10).map((e) => (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div><p className="font-medium text-stone-900">{e.category}</p><p className="text-xs text-stone-500">{e.description ?? "—"} · {e.date}</p></div>
                <div className="flex items-center gap-3"><span className="font-semibold text-red-600">−{formatMoney(e.amount, currency)}</span><button onClick={() => removeExpense(e.id)} className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showExpense && <ExpenseForm restaurantId={rid!} onClose={() => setShowExpense(false)} onSaved={(exp) => { setExpenses((e) => [exp, ...e]); setShowExpense(false); notify("Expense added", "success"); }} onNotify={notify} />}
    </div>
  );
}

function ExpenseForm({ restaurantId, onClose, onSaved, onNotify }: {
  restaurantId: string; onClose: () => void; onSaved: (e: Expense) => void; onNotify: (m: string, t?: "success" | "error") => void;
}) {
  const [category, setCategory] = useState("Groceries");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayDate());
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { onNotify("Enter a valid amount", "error"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("expenses").insert({ restaurant_id: restaurantId, category, amount: Number(amount), description: description.trim() || null, date }).select("*").single();
    setSaving(false);
    if (error) { onNotify(error.message, "error"); return; }
    onSaved(data as Expense);
  }
  return (
    <Modal open onClose={onClose} title="Add expense">
      <form onSubmit={save} className="space-y-4">
        <Field label="Category"><Select value={category} onChange={(e) => setCategory(e.target.value)}><option>Groceries</option><option>Utilities</option><option>Salaries</option><option>Rent</option><option>Maintenance</option><option>Marketing</option><option>Other</option></Select></Field>
        <Field label="Amount"><Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></Field>
        <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional notes" /></Field>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add expense"}</Button></div>
      </form>
    </Modal>
  );
}

export function OwnerInventory() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const currency = restaurant?.currency ?? "₹";
  const { notify } = useToast();
  const { data: items, refresh } = useRealtimeQuery<InventoryItem>({ table: "inventory", filterColumn: "restaurant_id", filterValue: rid, orderBy: { column: "name", ascending: true } });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const lowStock = items.filter((i) => i.quantity <= i.min_quantity);

  async function quickUpdate(item: InventoryItem, delta: number) {
    const newQty = Math.max(0, Number(item.quantity) + delta);
    const { error } = await supabase.from("inventory").update({ quantity: newQty }).eq("id", item.id);
    if (error) notify(error.message, "error");
  }

  return (
    <div>
      <PageHeader title="Inventory" subtitle={`${items.length} items · ${lowStock.length} low stock`}
        actions={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Add Item</Button>} />
      {lowStock.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle size={20} className="text-amber-600" />
          <p className="text-sm text-amber-800"><span className="font-semibold">{lowStock.length} items</span> are at or below their minimum stock level.</p>
        </div>
      )}
      {items.length === 0 ? <EmptyState icon={<Boxes size={40} />} title="No inventory items" subtitle="Track ingredients and supplies." /> : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
              <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Min</th><th className="px-4 py-3">Cost/unit</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((i) => {
                const low = i.quantity <= i.min_quantity;
                return (
                  <tr key={i.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-900">{i.name}</td>
                    <td className="px-4 py-3 text-stone-700">{i.quantity} {i.unit}</td>
                    <td className="px-4 py-3 text-stone-500">{i.min_quantity} {i.unit}</td>
                    <td className="px-4 py-3 text-stone-700">{formatMoney(i.cost_per_unit, currency)}</td>
                    <td className="px-4 py-3 text-stone-700">{formatMoney(i.quantity * i.cost_per_unit, currency)}</td>
                    <td className="px-4 py-3">{low ? <Badge color="red">Low</Badge> : <Badge color="green">OK</Badge>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => quickUpdate(i, -1)} className="rounded-lg bg-stone-100 px-2 py-1 text-stone-600 hover:bg-stone-200">−</button>
                        <button onClick={() => quickUpdate(i, 1)} className="rounded-lg bg-stone-100 px-2 py-1 text-stone-600 hover:bg-stone-200">+</button>
                        <button onClick={() => { setEditing(i); setShowForm(true); }} className="ml-1 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Receipt size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showForm && <InventoryForm item={editing} restaurantId={rid!} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refresh(); }} onNotify={notify} />}
    </div>
  );
}

function InventoryForm({ item, restaurantId, onClose, onSaved, onNotify }: {
  item: InventoryItem | null; restaurantId: string; onClose: () => void; onSaved: () => void; onNotify: (m: string, t?: "success" | "error") => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "pcs");
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : "0");
  const [minQty, setMinQty] = useState(item ? String(item.min_quantity) : "0");
  const [cost, setCost] = useState(item ? String(item.cost_per_unit) : "0");
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { onNotify("Name required", "error"); return; }
    setSaving(true);
    const payload = { restaurant_id: restaurantId, name: name.trim(), unit, quantity: Number(quantity) || 0, min_quantity: Number(minQty) || 0, cost_per_unit: Number(cost) || 0 };
    const { error } = item ? await supabase.from("inventory").update(payload).eq("id", item.id) : await supabase.from("inventory").insert(payload);
    setSaving(false);
    if (error) { onNotify(error.message, "error"); return; }
    onNotify(item ? "Item updated" : "Item added", "success"); onSaved();
  }
  return (
    <Modal open onClose={onClose} title={item ? "Edit inventory item" : "Add inventory item"}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Item name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Basmati Rice" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit"><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, ltr, pcs" /></Field>
          <Field label="Cost per unit"><Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity"><Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
          <Field label="Min quantity"><Input type="number" step="0.01" value={minQty} onChange={(e) => setMinQty(e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : item ? "Save" : "Add"}</Button></div>
      </form>
    </Modal>
  );
}
