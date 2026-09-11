import {
  FlaskConical, TriangleAlert, CalendarX, Wallet, ShoppingBag,
  ArrowRight, Inbox, ClipboardCheck, ArrowUpFromLine,
} from "lucide-react";
import { Card, CardTitle, Stat, Bars, Badge, Btn } from "../components/ui";
import { useStore, useAlerts, daysFromNow, fmtIDRShort, fmtIDR, fmtDate, todayISO } from "../store/store";
import type { NavigateFn } from "../router";
import { cn } from "../utils/cn";

export default function DashboardPage({ navigate }: { navigate: NavigateFn }) {
  const { state } = useStore();
  const alerts = useAlerts();

  const critical = state.items.filter((i) => i.stock <= i.min).length;
  const stockValue = state.items.reduce((n, i) => n + i.stock * i.price, 0);
  const activePO = state.pos.filter((p) => p.status !== "Diterima").length;
  const expCount = state.batches.filter((b) => {
    const d = Math.ceil((new Date(b.expired).getTime() - Date.now()) / 86400000);
    return d <= 60;
  }).length;

  const last7 = Array.from({ length: 7 }, (_, i) => daysFromNow(i - 6));
  const usageBars = last7.map((d) => ({
    label: new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short" }),
    value: state.usages.filter((u) => u.date === d).reduce((n, u) => n + u.qty, 0),
  }));

  const TONE_TILE = {
    danger: "bg-error text-on-error",
    warn: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
    info: "bg-secondary-container text-on-secondary-fixed-variant",
  };
  const TONE_ICON = { danger: TriangleAlert, warn: CalendarX, info: Inbox };

  return (
    <div className="flex flex-col gap-4">
      {/* Statistik utama */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={FlaskConical} label="SKU Aktif" value={String(state.items.length)} sub="Reagensia, BMHP & Alkes" />
        <Stat icon={TriangleAlert} label="Stok Kritis" value={String(critical)}
          sub={critical ? "Segera ajukan pengadaan" : "Semua di atas minimum"}
          tile={critical ? "bg-error-container text-error" : "bg-primary-fixed text-primary"} />
        <Stat icon={CalendarX} label="Batch < 60 Hari" value={String(expCount)}
          sub="Butuh rotasi FEFO"
          tile={expCount ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-primary-fixed text-primary"} />
        <Stat icon={Wallet} label="Nilai Persediaan" value={fmtIDRShort(stockValue)} sub={`${activePO} PO masih berjalan`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Grafik pemakaian */}
        <Card className="xl:col-span-2">
          <CardTitle
            title="Barang Keluar — 7 Hari Terakhir"
            desc="Total unit terpakai Lab Patologi Klinik & UPD per hari"
            action={<Btn tone="ghost" icon={ClipboardCheck} onClick={() => navigate("pencatatan-pemakaian-harian")} className="h-8 px-2.5">Catat</Btn>}
          />
          <Bars data={usageBars} h={130} />
        </Card>

        {/* Peringatan */}
        <Card>
          <CardTitle title="Peringatan Aktif" desc={`${alerts.length} butuh tindakan`} />
          <div className="flex flex-col gap-1.5">
            {alerts.slice(0, 5).map((a) => {
              const Icon = TONE_ICON[a.tone];
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => navigate(a.path)}
                  className="flex items-start gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-surface-container-low"
                >
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", TONE_TILE[a.tone])}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-body-sm font-medium text-on-surface">{a.title}</span>
                    <span className="block truncate font-sans text-caption font-normal text-on-surface-variant">{a.desc}</span>
                  </span>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-outline" />
                </button>
              );
            })}
            {alerts.length === 0 && (
              <p className="py-6 text-center font-sans text-body-sm text-on-surface-variant">
                Semua indikator aman. Tidak ada peringatan.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Pemakaian terakhir */}
        <Card>
          <CardTitle
            title="Pemakaian Terakhir"
            desc="Barang keluar terbaru yang tercatat"
            action={<Btn tone="ghost" icon={ArrowUpFromLine} onClick={() => navigate("pencatatan-pemakaian-harian")} className="h-8 px-2.5">Detail</Btn>}
          />
          <div className="flex flex-col divide-y divide-surface-container">
            {state.usages.slice(0, 5).map((u) => {
              const it = state.items.find((i) => i.id === u.itemId);
              return (
                <div key={u.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-sans text-body-sm font-medium text-on-surface">{it?.name}</div>
                    <div className="truncate font-sans text-caption font-normal text-on-surface-variant">{u.toUnit}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-data-mono-sm font-semibold text-error">-{u.qty} {it?.unit}</div>
                    <div className="font-sans text-caption font-normal text-on-surface-variant">
                      {u.date === todayISO() ? "Hari ini" : fmtDate(u.date)}
                    </div>
                  </div>
                </div>
              );
            })}
            {state.usages.length === 0 && (
              <p className="py-6 text-center font-sans text-body-sm text-on-surface-variant">Belum ada pemakaian tercatat.</p>
            )}
          </div>
        </Card>

        {/* PO terbaru */}
        <Card className="xl:col-span-2">
          <CardTitle
            title="Purchase Order Berjalan"
            desc="Posisi pengadaan terkini"
            action={<Btn tone="ghost" icon={ShoppingBag} onClick={() => navigate("purchase-order-e-katalog")} className="h-8 px-2.5">Semua</Btn>}
          />
          <div className="flex flex-col divide-y divide-surface-container">
            {state.pos.filter((p) => p.status !== "Diterima").slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(p.status === "Dikirim" ? "penerimaan-barang" : "purchase-order-e-katalog")}
                className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface-container-low"
              >
                <div className="min-w-0">
                  <div className="font-mono text-data-mono-sm font-semibold text-primary">{p.po}</div>
                  <div className="truncate font-sans text-caption font-normal text-on-surface-variant">
                    {state.vendors.find((v) => v.id === p.vendorId)?.name} · {fmtDate(p.date)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-data-mono-sm text-on-surface">{fmtIDR(p.value)}</span>
                  <Badge tone={p.status === "Dikirim" ? "info" : p.status === "Draft" ? "neutral" : "ok"}>{p.status}</Badge>
                </div>
              </button>
            ))}
            {state.pos.filter((p) => p.status !== "Diterima").length === 0 && (
              <p className="py-6 text-center font-sans text-body-sm text-on-surface-variant">Tidak ada PO berjalan.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
