import { useMemo, useState } from "react";
import { Star, Trash2, CalendarX, ShieldAlert } from "lucide-react";
import { Card, CardTitle, Badge, Stat, Empty, thCls, tdCls, tableCls, theadCls, trCls } from "../components/ui";
import { useStore, daysUntil, fmtDate, fmtIDR } from "../store/store";
import { useToast } from "../components/Toast";
import { cn } from "../utils/cn";

const WINDOWS = [
  { id: "all", label: "Semua", max: Infinity },
  { id: "30", label: "≤ 30 Hari", max: 30 },
  { id: "60", label: "≤ 60 Hari", max: 60 },
  { id: "90", label: "≤ 90 Hari", max: 90 },
];

export default function FefoPage() {
  const { state, itemOf, togglePriority, disposeBatch } = useStore();
  const push = useToast();
  const [win, setWin] = useState("all");

  const max = WINDOWS.find((w) => w.id === win)!.max;
  const rows = useMemo(
    () =>
      state.batches
        .filter((b) => daysUntil(b.expired) <= max)
        .sort((a, b) => daysUntil(a.expired) - daysUntil(b.expired)),
    [state.batches, max]
  );

  const valueAtRisk = rows.reduce((n, b) => n + (itemOf(b.itemId)?.price ?? 0) * b.qty, 0);
  const critical = state.batches.filter((b) => daysUntil(b.expired) <= 30).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={CalendarX} label="Batch ≤ 30 Hari" value={String(critical)} sub="Prioritas pemakaian tertinggi"
          tile={critical ? "bg-error-container text-error" : "bg-primary-fixed text-primary"} />
        <Stat icon={ShieldAlert} label="Nilai Terdampak" value={fmtIDR(valueAtRisk)} sub="Pada jendela waktu terpilih"
          tile="bg-tertiary-fixed text-on-tertiary-fixed-variant" />
        <Card className="col-span-2 flex flex-col justify-center gap-1.5 p-4">
          <span className="font-sans text-caption font-semibold uppercase tracking-wide text-on-surface-variant">Jendela Kedaluwarsa</span>
          <div className="flex flex-wrap gap-1.5">
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWin(w.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-sans text-caption font-semibold transition-colors",
                  win === w.id ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle title="Batch Mendekati Kedaluwarsa" desc={`${rows.length} batch pada jendela ini — diurutkan FEFO`} />
        <div className="overflow-x-auto rounded-lg ring-1 ring-surface-container">
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Prioritas</th>
                <th className={thCls}>Lot / Batch</th>
                <th className={thCls}>Item</th>
                <th className={thCls}>Qty</th>
                <th className={thCls}>Kedaluwarsa</th>
                <th className={thCls}>Sisa Waktu</th>
                <th className={cn(thCls, "text-right")}>Nilai Terdampak</th>
                <th className={cn(thCls, "text-right")}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const d = daysUntil(b.expired);
                const item = itemOf(b.itemId);
                return (
                  <tr key={b.id} className={trCls}>
                    <td className={tdCls}>
                      <button
                        type="button"
                        onClick={() => {
                          togglePriority(b.id);
                          push({ title: b.priority ? "Prioritas dicabut" : "Ditandai prioritas", desc: `Lot ${b.lot}`, tone: "info" });
                        }}
                        className={cn(
                          "rounded-lg p-1.5 transition-colors",
                          b.priority ? "text-tertiary bg-tertiary-fixed/50" : "text-outline hover:bg-surface-container-high hover:text-on-surface"
                        )}
                        title={b.priority ? "Cabut prioritas" : "Tandai prioritas FEFO"}
                      >
                        <Star className={cn("h-4 w-4", b.priority && "fill-tertiary-fixed-dim")} />
                      </button>
                    </td>
                    <td className={cn(tdCls, "font-mono text-data-mono-sm font-semibold text-tertiary")}>{b.lot}</td>
                    <td className={cn(tdCls, "max-w-52 truncate")}>{item?.name}</td>
                    <td className={cn(tdCls, "font-mono text-data-mono-sm")}>{b.qty} {item?.unit}</td>
                    <td className={cn(tdCls, "whitespace-nowrap")}>{fmtDate(b.expired)}</td>
                    <td className={tdCls}>
                      <Badge tone={d <= 30 ? "danger" : d <= 60 ? "warn" : "ok"}>{d} hari</Badge>
                    </td>
                    <td className={cn(tdCls, "text-right font-mono text-data-mono-sm")}>{fmtIDR((item?.price ?? 0) * b.qty)}</td>
                    <td className={cn(tdCls, "text-right")}>
                      <button
                        type="button"
                        title="Catat pemusnahan (BAP)"
                        onClick={() => {
                          disposeBatch(b.id);
                          push({ title: "Pemusnahan dicatat", desc: `Lot ${b.lot} — BAP tersimpan di Log Audit.`, tone: "danger" });
                        }}
                        className="rounded-lg p-1.5 text-outline transition-colors hover:bg-error-container hover:text-on-error-container"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={8}><Empty title="Tidak ada batch" desc="Tidak ada batch mendekati kedaluwarsa pada jendela ini." icon={CalendarX} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
