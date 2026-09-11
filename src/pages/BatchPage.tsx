import { useMemo, useState } from "react";
import { Search, Star, Trash2, CalendarDays, QrCode } from "lucide-react";
import { Card, Badge, Btn, Empty, inputCls, thCls, tdCls, tableCls, theadCls, trCls } from "../components/ui";
import { useStore, daysUntil, fmtDate, fmtIDR } from "../store/store";
import { useToast } from "../components/Toast";
import { cn } from "../utils/cn";

/** QR semu berbasis hash lot — identitas visual nomor batch */
function FauxQR({ seed }: { seed: string }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const N = 11;
  const bits = Array.from({ length: N * N }, (_, i) => {
    const x = i % N, y = (i / N) | 0;
    const finder = (x < 3 && y < 3) || (x > N - 4 && y < 3) || (x < 3 && y > N - 4);
    if (finder) return true;
    return ((h >> (i % 24)) ^ (h >> ((i * 7) % 24)) ^ (i * h)) & 1 ? true : false;
  });
  const s = 7;
  return (
    <svg viewBox={`0 0 ${N * s} ${N * s}`} className="h-24 w-24 rounded-lg ring-1 ring-surface-container" aria-hidden="true">
      <rect width={N * s} height={N * s} fill="#fff" />
      {bits.map((b, i) =>
        b ? <rect key={i} x={(i % N) * s} y={((i / N) | 0) * s} width={s - 0.6} height={s - 0.6} rx={1} fill="#0b1c30" /> : null
      )}
    </svg>
  );
}

export default function BatchPage() {
  const { state, itemOf, togglePriority, disposeBatch } = useStore();
  const push = useToast();
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return state.batches
      .filter((b) => {
        const item = itemOf(b.itemId);
        return !k || b.lot.toLowerCase().includes(k) || (item?.name.toLowerCase().includes(k) ?? false) || b.supplier.toLowerCase().includes(k);
      })
      .sort((a, b) => daysUntil(a.expired) - daysUntil(b.expired));
  }, [state.batches, q, itemOf]);

  const sel = rows.find((b) => b.id === selId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-outline" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari / pindai nomor lot, nama item, atau supplier..."
            className={cn(inputCls, "pl-9")}
          />
        </div>
        <p className="mt-2 flex items-center gap-1.5 font-sans text-caption font-normal text-on-surface-variant">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          Diurutkan FEFO — kedaluwarsa terdekat tampil paling atas untuk rotasi pemakaian.
        </p>
      </Card>

      {sel && (
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <FauxQR seed={sel.lot} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-headline-md font-bold text-tertiary">{sel.lot}</span>
              {sel.priority && <Badge tone="warn">Prioritas FEFO</Badge>}
              <Badge tone={daysUntil(sel.expired) <= 30 ? "danger" : daysUntil(sel.expired) <= 60 ? "warn" : "ok"}>
                {daysUntil(sel.expired)} hari lagi
              </Badge>
            </div>
            <div className="mt-1 font-sans text-title-sm text-on-surface">{itemOf(sel.itemId)?.name}</div>
            <div className="mt-1 font-sans text-body-sm text-on-surface-variant">
              {sel.qty} unit · {sel.supplier} · diterima {fmtDate(sel.receivedAt)} · exp {fmtDate(sel.expired)}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Btn
              tone="soft"
              icon={Star}
              onClick={() => {
                togglePriority(sel.id);
                push({ title: sel.priority ? "Prioritas dicabut" : "Ditandai prioritas FEFO", desc: `Lot ${sel.lot}`, tone: "info" });
              }}
            >
              {sel.priority ? "Cabut Prioritas" : "Prioritaskan"}
            </Btn>
            <Btn
              tone="danger"
              icon={Trash2}
              onClick={() => {
                disposeBatch(sel.id);
                setSelId(null);
                push({ title: "Pemusnahan dicatat", desc: `Lot ${sel.lot} dihapus dari stok aktif (BAP terlampir di audit).`, tone: "danger" });
              }}
            >
              Musnahkan
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto rounded-lg ring-1 ring-surface-container">
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Lot / Batch</th>
                <th className={thCls}>Item</th>
                <th className={thCls}>Qty</th>
                <th className={thCls}>Supplier</th>
                <th className={thCls}>Diterima</th>
                <th className={thCls}>Kedaluwarsa</th>
                <th className={thCls}>Sisa Waktu</th>
                <th className={thCls}>Nilai</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const d = daysUntil(b.expired);
                const item = itemOf(b.itemId);
                return (
                  <tr
                    key={b.id}
                    onClick={() => setSelId(b.id === selId ? null : b.id)}
                    className={cn(trCls, "cursor-pointer", selId === b.id && "bg-surface-container-low")}
                  >
                    <td className={tdCls}>
                      <span className="flex items-center gap-1.5">
                        <QrCode className="h-3.5 w-3.5 text-outline" />
                        <span className="font-mono text-data-mono-sm font-semibold text-tertiary">{b.lot}</span>
                        {b.priority && <Star className="h-3.5 w-3.5 fill-tertiary-fixed-dim text-tertiary" />}
                      </span>
                    </td>
                    <td className={cn(tdCls, "max-w-52 truncate")}>{item?.name}</td>
                    <td className={cn(tdCls, "font-mono text-data-mono-sm")}>{b.qty} {item?.unit}</td>
                    <td className={cn(tdCls, "max-w-44 truncate text-on-surface-variant")}>{b.supplier}</td>
                    <td className={cn(tdCls, "whitespace-nowrap text-on-surface-variant")}>{fmtDate(b.receivedAt)}</td>
                    <td className={cn(tdCls, "whitespace-nowrap")}>{fmtDate(b.expired)}</td>
                    <td className={tdCls}>
                      <Badge tone={d <= 30 ? "danger" : d <= 60 ? "warn" : "ok"}>{d} hari</Badge>
                    </td>
                    <td className={cn(tdCls, "whitespace-nowrap text-right font-mono text-data-mono-sm")}>
                      {fmtIDR((item?.price ?? 0) * b.qty)}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={8}><Empty title="Lot tidak ditemukan" desc="Periksa kembali nomor lot atau nama item." icon={QrCode} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
