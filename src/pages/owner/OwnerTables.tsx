import { useState } from "react";
import { Plus, Pencil, Trash2, QrCode, Table2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRealtimeQuery } from "@/lib/useRealtime";
import { PageHeader } from "@/components/DashboardLayout";
import { Modal } from "@/components/Modal";
import { QrCard } from "@/components/QrCard";
import { Badge, Button, EmptyState, Field, Input } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { TABLE_STATUS_LABEL, TABLE_STATUS_COLOR } from "@/lib/status";
import type { RestaurantTable } from "@/types";

export function OwnerTables() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const { notify } = useToast();
  const { data: tables, refresh } = useRealtimeQuery<RestaurantTable>({
    table: "restaurant_tables", filterColumn: "restaurant_id", filterValue: rid,
    orderBy: { column: "name", ascending: true },
  });
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [qrTable, setQrTable] = useState<RestaurantTable | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function removeTable(t: RestaurantTable) {
    if (!confirm(`Delete table ${t.name}?`)) return;
    const { error } = await supabase.from("restaurant_tables").delete().eq("id", t.id);
    if (error) notify(error.message, "error"); else notify(`Table ${t.name} deleted`, "success");
  }

  return (
    <div>
      <PageHeader title="Tables & QR Codes" subtitle={`${tables.length} tables — each has a unique QR menu link`}
        actions={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Add Table</Button>} />
      {tables.length === 0 ? (
        <EmptyState icon={<Table2 size={40} />} title="No tables yet" subtitle="Add tables and generate QR codes for customer ordering." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((t) => (
            <div key={t.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div><p className="font-display text-xl font-bold text-stone-900">Table {t.name}</p><p className="text-xs text-stone-500">{t.seats} seats</p></div>
                <Badge color={TABLE_STATUS_COLOR[t.status]}>{TABLE_STATUS_LABEL[t.status]}</Badge>
              </div>
              <div className="mt-4 flex items-center gap-1.5">
                <button onClick={() => setQrTable(t)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"><QrCode size={14} /> View QR</button>
                <button onClick={() => { setEditing(t); setShowForm(true); }} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Pencil size={16} /></button>
                <button onClick={() => removeTable(t)} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && <TableForm table={editing} restaurantId={rid!} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refresh(); }} onNotify={notify} />}
      <Modal open={!!qrTable} onClose={() => setQrTable(null)} title={`Table ${qrTable?.name} — QR Menu`} maxWidth="max-w-sm">
        {qrTable && (
          <div className="flex flex-col items-center">
            <QrCard url={`${origin}/menu/${qrTable.qr_token}`} title={`Table ${qrTable.name}`} subtitle="Scan to view menu & order" />
            <p className="mt-4 break-all rounded-xl bg-stone-50 p-3 text-center text-xs text-stone-500">{origin}/menu/{qrTable.qr_token}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TableForm({ table, restaurantId, onClose, onSaved, onNotify }: {
  table: RestaurantTable | null; restaurantId: string; onClose: () => void; onSaved: () => void; onNotify: (m: string, t?: "success" | "error") => void;
}) {
  const [name, setName] = useState(table?.name ?? "");
  const [seats, setSeats] = useState(table ? String(table.seats) : "4");
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { onNotify("Table name is required", "error"); return; }
    setSaving(true);
    const payload = { restaurant_id: restaurantId, name: name.trim(), seats: Number(seats) || 4 };
    const { error } = table ? await supabase.from("restaurant_tables").update(payload).eq("id", table.id) : await supabase.from("restaurant_tables").insert(payload);
    setSaving(false);
    if (error) { onNotify(error.message, "error"); return; }
    onNotify(table ? "Table updated" : "Table added", "success"); onSaved();
  }
  return (
    <Modal open onClose={onClose} title={table ? "Edit table" : "Add table"}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Table name / number"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. T7" /></Field>
        <Field label="Seats"><Input type="number" min="1" value={seats} onChange={(e) => setSeats(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : table ? "Save" : "Add table"}</Button>
        </div>
      </form>
    </Modal>
  );
}
