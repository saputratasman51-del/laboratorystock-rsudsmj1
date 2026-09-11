import { useMemo, useState } from "react";
import { Minus, Snowflake, TriangleAlert, Package } from "lucide-react";
import { Card, CardTitle, Badge, Btn, Stat, Empty } from "../components/ui";
import { useStore } from "../store/store";
import { useToast } from "../components/Toast";
import { cn } from "../utils/cn";

const TABS = ["Semua", "BMHP", "Alkes"] as const;

export default function BmhpPage() {
  const { state, addUsage } = useStore();
  const push = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Semua");

  const consumables = useMemo(
    () => state.items.filter((i) => (tab === "Semua" ? i.category !== "Reagensia" : i.category === tab)),
    [state.items, tab]
  );
  const critical = consumables.filter((i) => i.stock <= i.min).length;
  const takenToday = state.usages
    .filter((u) => u.date === new Date().toISOString().slice(0, 10))
    .reduce((n, u) => n + u.qty, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Package} label="Item Habis Pakai" value={String(consumables.length)} sub="BMHP & Alkes aktif" />
        <Stat icon={TriangleAlert} label="Kritis" value={String(critical)}
          sub="Di bawah stok minimum"
          tile={critical ? "bg-error-container text-error" : "bg-primary-fixed text-primary"} />
        <Stat icon={Minus} label="Diambil Hari Ini" value={String(takenToday)} sub="Unit keluar semua unit" />
        <Card className="flex flex-col justify-center gap-1 p-4">
          <span className="font-sans text-caption font-semibold uppercase tracking-wide text-on-surface-variant">Tampilkan</span>
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-sans text-caption font-semibold transition-colors",
                  tab === t ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {consumables.length === 0 && <Card><Empty title="Tidak ada item" desc="Belum ada BMHP/Alkes pada kategori ini." /></Card>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {consumables.map((i) => {
          const pct = Math.min(100, Math.round((i.stock / (i.min * 3 || 1)) * 100));
          const critical = i.stock <= i.min;
          return (
            <Card key={i.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-sans text-title-sm text-on-surface">{i.name}</span>
                    {i.cold && <Snowflake className="h-3.5 w-3.5 shrink-0 text-tertiary" />}
                  </div>
                  <div className="mt-0.5 font-mono text-data-mono-sm text-on-surface-variant">{i.sku} · {i.location}</div>
                </div>
                <Badge tone={critical ? "danger" : "ok"}>{critical ? "Kritis" : "Aman"}</Badge>
              </div>

              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className={cn("font-mono text-headline-md font-bold", critical ? "text-error" : "text-on-surface")}>
                    {i.stock} <span className="font-sans text-caption font-normal text-on-surface-variant">{i.unit}</span>
                  </span>
                  <span className="font-sans text-caption font-normal text-on-surface-variant">min. {i.min}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", critical ? "bg-error" : "bg-primary")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <Btn
                tone="soft"
                icon={Minus}
                disabled={i.stock === 0}
                onClick={() => {
                  const r = addUsage(i.id, 1, "Laboratorium Patologi Klinik", "Pengambilan cepat via BMHP");
                  push(
                    r.ok
                      ? { title: `${i.name} diambil 1 ${i.unit}`, desc: `Stok tersisa ${i.stock - 1} ${i.unit}. Tercatat di audit.`, tone: "success" }
                      : { title: "Gagal mengambil stok", desc: r.error, tone: "danger" }
                  );
                }}
                className="w-full"
              >
                Ambil 1 {i.unit}
              </Btn>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardTitle title="Catatan Operasional" />
        <p className="font-sans text-body-sm text-on-surface-variant">
          Pengambilan cepat otomatis memotong stok dan tercatat sebagai pemakaian Laboratorium Patologi Klinik.
          Untuk unit lainnya (termasuk UPD) gunakan menu Pencatatan Pemakaian Harian.
        </p>
      </Card>
    </div>
  );
}
