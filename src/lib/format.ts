export function formatMoney(amount: number, currency = "₹"): string {
  const n = Number(amount || 0);
  const formatted = n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency}${formatted}`;
}

export function formatNumber(n: number): string {
  return (Number(n) || 0).toLocaleString("en-IN");
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs < 24) return rem ? `${hrs}h ${rem}m ago` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function elapsedMin(iso: string): number {
  const then = new Date(iso).getTime();
  return Math.floor((Date.now() - then) / 60000);
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isToday(iso: string): boolean {
  return new Date(iso).toISOString().slice(0, 10) === todayDate();
}

export function computeTotals(
  subtotal: number,
  gstPercentage: number,
  servicePercentage: number
) {
  const sub = Math.max(0, Number(subtotal) || 0);
  const tax = +((sub * (gstPercentage || 0)) / 100).toFixed(2);
  const service = +((sub * (servicePercentage || 0)) / 100).toFixed(2);
  const total = +(sub + tax + service).toFixed(2);
  return { subtotal: +sub.toFixed(2), tax_amount: tax, service_charge: service, total };
}
