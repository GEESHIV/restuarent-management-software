import { useQrUrl } from "@/lib/qr";
import { Download } from "lucide-react";

export function QrCard({
  url,
  title,
  subtitle,
}: {
  url: string;
  title: string;
  subtitle?: string;
}) {
  const dataUrl = useQrUrl(url);
  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    a.click();
  }
  return (
    <div className="flex flex-col items-center rounded-2xl border border-stone-200 bg-white p-5 text-center shadow-sm">
      {dataUrl ? (
        <img src={dataUrl} alt={`QR for ${title}`} className="h-44 w-44 rounded-xl" />
      ) : (
        <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
          Generating…
        </div>
      )}
      <p className="mt-3 font-semibold text-stone-900">{title}</p>
      {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
      <button
        onClick={download}
        disabled={!dataUrl}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-200 disabled:opacity-50"
      >
        <Download size={14} />
        Download PNG
      </button>
    </div>
  );
}
