import { useState } from "react";
import { Plus, UserCheck, UserX, Trash2, Users } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRealtimeQuery } from "@/lib/useRealtime";
import { PageHeader } from "@/components/DashboardLayout";
import { Modal } from "@/components/Modal";
import { Badge, Button, EmptyState, Field, Input, Select } from "@/components/ui";
import { useToast } from "@/components/Toast";
import type { Role, Staff } from "@/types";

const ROLE_BADGE: Record<Role, "green" | "blue" | "amber"> = { owner: "green", waiter: "blue", kitchen: "amber" };

export function OwnerStaff() {
  const { restaurant, staff: currentUser } = useAuth();
  const rid = restaurant?.id;
  const { notify } = useToast();
  const { data: staff, error, refresh } = useRealtimeQuery<Staff>({
    table: "staff", filterColumn: "restaurant_id", filterValue: rid,
    orderBy: { column: "created_at", ascending: true },
  });
  const [showForm, setShowForm] = useState(false);

  async function toggleActive(s: Staff) {
    const { error } = await supabase.from("staff").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) notify(error.message, "error"); else notify(`${s.full_name} ${!s.is_active ? "activated" : "deactivated"}`);
  }
  async function removeStaff(s: Staff) {
    if (s.role === "owner") { notify("Cannot delete an owner account", "error"); return; }
    if (!confirm(`Remove ${s.full_name}? Their login will be deactivated.`)) return;
    const { error } = await supabase.from("staff").delete().eq("id", s.id);
    if (error) notify(error.message, "error"); else notify(`${s.full_name} removed`, "success");
  }

  const counts = { owner: staff.filter((s) => s.role === "owner").length, waiter: staff.filter((s) => s.role === "waiter").length, kitchen: staff.filter((s) => s.role === "kitchen").length };

  return (
    <div>
      <PageHeader title="Staff Management" subtitle={`${staff.length} accounts · ${counts.owner} owner, ${counts.waiter} waiters, ${counts.kitchen} kitchen`}
        actions={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Staff</Button>} />
      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load staff: {error}
        </div>
      ) : staff.length === 0 ? (
        <EmptyState icon={<Users size={40} />} title="No staff yet" subtitle="Add waiter and kitchen accounts." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => (
            <div key={s.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold text-white ${s.role === "owner" ? "bg-emerald-600" : s.role === "waiter" ? "bg-sky-600" : "bg-amber-600"}`}>{s.full_name.charAt(0)}</div>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold text-stone-900">{s.full_name}</p><p className="truncate text-xs text-stone-500">{s.email}</p></div>
                <Badge color={ROLE_BADGE[s.role]}>{s.role}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-1">
                <button onClick={() => toggleActive(s)} disabled={s.id === currentUser?.id} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50" title={s.id === currentUser?.id ? "You can't deactivate yourself" : ""}>
                  {s.is_active ? <UserCheck size={14} /> : <UserX size={14} />}{s.is_active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => removeStaff(s)} disabled={s.role === "owner"} className="ml-auto rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" title={s.role === "owner" ? "Owner accounts can't be removed" : ""}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && <StaffForm restaurantId={rid!} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refresh(); }} onNotify={notify} />}
    </div>
  );
}

function StaffForm({ restaurantId, onClose, onSaved, onNotify }: {
  restaurantId: string; onClose: () => void; onSaved: () => void; onNotify: (m: string, t?: "success" | "error") => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("waiter");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) { onNotify("All fields are required", "error"); return; }
    if (password.length < 8) { onNotify("Password must be at least 8 characters", "error"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ error?: string }>("create-staff", {
        body: {
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim(),
          role,
          restaurant_id: restaurantId,
        },
      });
      if (error) {
        let message = error.message;
        if (error instanceof FunctionsHttpError) {
          const response = await error.context.json();
          if (typeof response?.error === "string") message = response.error;
        }
        onNotify(message, "error");
        return;
      }
      if (data?.error) { onNotify(data.error, "error"); return; }
      onNotify(`${role} account created for ${fullName}`, "success"); onSaved();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to create account", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add staff account">
      <form onSubmit={save} className="space-y-4">
        <Field label="Full name"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Rahul Kumar" /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rahul@restaurant.com" /></Field>
        <Field label="Password (min 8 chars)"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="waiter">Waiter — tables, orders, bills</option>
            <option value="kitchen">Kitchen — view & update orders</option>
            <option value="owner">Owner — full access</option>
          </Select>
        </Field>
        <p className="rounded-xl bg-stone-50 p-3 text-xs text-stone-500">The staff member can sign in with this email and password. Share these credentials with them.</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create account"}</Button>
        </div>
      </form>
    </Modal>
  );
}
