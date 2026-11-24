import { useEffect, useState } from "react";
import { Save, Store, Globe, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/DashboardLayout";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/Toast";
import type { Restaurant } from "@/types";

export function OwnerSettings() {
  const { restaurant } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState<Restaurant | null>(restaurant);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { setForm(restaurant); }, [restaurant]);
  if (!form) return null;
  const f = form;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const onlineLink = `${origin}/order/${f.slug}`;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("restaurants").update({
      name: f.name, address: f.address, phone: f.phone,
      upi_id: f.upi_id?.trim() || null, upi_name: f.upi_name?.trim() || null,
      google_review_url: f.google_review_url?.trim() || null,
      gst_enabled: f.gst_enabled, gst_percentage: Number(f.gst_percentage) || 0,
      service_charge_percentage: Number(f.service_charge_percentage) || 0, currency: f.currency || "₹",
    }).eq("id", f.id);
    setSaving(false);
    if (error) notify(error.message, "error"); else notify("Settings saved", "success");
  }
  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text); setCopied(key);
    setTimeout(() => setCopied(null), 2000); notify("Copied to clipboard", "success");
  }

  return (
    <div>
      <PageHeader title="Restaurant Settings" subtitle="Manage your restaurant profile, tax and ordering links" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={save} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3"><Store size={20} className="text-emerald-600" /><h2 className="font-display text-lg font-bold text-stone-900">Restaurant Profile</h2></div>
            <Field label="Restaurant name"><Input value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} /></Field>
            <Field label="Address"><Textarea value={f.address ?? ""} onChange={(e) => setForm({ ...f, address: e.target.value })} rows={2} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone"><Input value={f.phone ?? ""} onChange={(e) => setForm({ ...f, phone: e.target.value })} /></Field>
              <Field label="Currency symbol"><Input value={f.currency} onChange={(e) => setForm({ ...f, currency: e.target.value })} maxLength={3} /></Field>
            </div>
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3 pt-2"><h2 className="font-display text-lg font-bold text-stone-900">UPI Payments</h2></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="UPI ID"><Input value={f.upi_id ?? ""} onChange={(e) => setForm({ ...f, upi_id: e.target.value })} placeholder="name@bank" autoComplete="off" /></Field>
              <Field label="UPI account name"><Input value={f.upi_name ?? ""} onChange={(e) => setForm({ ...f, upi_name: e.target.value })} placeholder="Name shown to customer" /></Field>
            </div>
            <p className="-mt-3 text-xs text-stone-500">Waiters can show customers an order-specific UPI QR code from the bill screen.</p>
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3 pt-2"><h2 className="font-display text-lg font-bold text-stone-900">Google Reviews</h2></div>
            <Field label="Google review URL">
              <Input type="url" value={f.google_review_url ?? ""} onChange={(e) => setForm({ ...f, google_review_url: e.target.value })} placeholder="https://g.page/r/…/review" />
            </Field>
            <p className="-mt-3 text-xs text-stone-500">After payment, the waiter can show this review QR code on the bill screen.</p>
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3 pt-2"><h2 className="font-display text-lg font-bold text-stone-900">Tax & Charges</h2></div>
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={f.gst_enabled} onChange={(e) => setForm({ ...f, gst_enabled: e.target.checked })} className="h-5 w-5 accent-emerald-600" />
              <span className="text-sm font-medium text-stone-700">Enable GST / tax on bills</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="GST / tax percentage (%)"><Input type="number" step="0.01" min="0" max="100" value={f.gst_percentage} onChange={(e) => setForm({ ...f, gst_percentage: Number(e.target.value) })} disabled={!f.gst_enabled} /></Field>
              <Field label="Service charge percentage (%)"><Input type="number" step="0.01" min="0" max="100" value={f.service_charge_percentage} onChange={(e) => setForm({ ...f, service_charge_percentage: Number(e.target.value) })} /></Field>
            </div>
            <div className="flex justify-end pt-2"><Button type="submit" disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save changes"}</Button></div>
          </form>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2"><Globe size={18} className="text-sky-600" /><h2 className="font-display text-base font-bold text-stone-900">Online Ordering Link</h2></div>
            <p className="mb-3 text-xs text-stone-500">Share this link for customers to place takeaway or delivery orders without an app.</p>
            <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-3">
              <span className="flex-1 truncate text-xs text-stone-600">{onlineLink}</span>
              <button onClick={() => copy(onlineLink, "online")} className="rounded-lg bg-white p-1.5 text-stone-500 hover:text-emerald-600">{copied === "online" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}</button>
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 font-display text-base font-bold text-stone-900">Slug</h2>
            <p className="text-xs text-stone-500">Used in your online ordering URL. Changing it breaks existing links.</p>
            <p className="mt-2 rounded-xl bg-stone-50 p-3 font-mono text-sm text-stone-700">{f.slug}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
