import { useMemo, useState } from "react";
import { Plus, ArrowRight, Send, CheckCheck, Truck, Package, ShoppingBag } from "lucide-react";
import {
  Card, CardTitle, Badge, Btn, Modal, Field, inputCls, Empty,
  thCls, tdCls, tableCls, theadCls, trCls,
} from "../components/ui";
import { useStore, fmtDate, fmtIDR, type POStatus } from "../store/store";
import { useToast } from "../components/Toast";
import type { NavigateFn } from "../router";
import { cn } from "../utils/cn";

const TABS: ("Semua" | POStatus)[] = ["Semua", "Draft", "Diajukan", "Disetujui", "Dikirim", "Diterima"];
const STATUS_TONE: Record<POStatus, "neutral" | "warn" | "ok" | "info"> = {
  Draft: "neutral", Diajukan: "warn", Disetujui: "ok", Dikirim: "info", Diterima: "ok",
};
const NEXT_LABEL: Record<string, { label: string; icon: typeof Send }> = {
  Draft: { label: "Ajukan", icon: Send },
  Diajukan: { label: "Setujui", icon: CheckCheck },
  Disetujui: { label: "Kirim", icon: Truck },
  Dikirim: { label: "Ke Penerimaan", icon: Package },
};

export default function PoPage({ navigate }: { navigate: NavigateFn }) {
  const { state, itemOf, vendorOf, advancePO, addPO } = useStore();
  const push = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Semua");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vendorId: state.vendors[0]?.id ?? "", method: "E-Katalog", itemId: state.items[0]?.id ?? "", qty: 10 });

  const rows = useMemo(() => state.pos.filter((p) => tab === "Semua" || p.status === tab), [state.pos, tab]);
  const counts = useMemo(() => {
    const m: Record<string, number> = { Semua: state.pos.length };
    TABS.slice(1).forEach((t) => (m[t] = state.pos.filter((p) => p.status === t).length));
    return m;
  }, [state.pos]);

  const submitPO = () => {
    const r = addPO(form.vendorId, form.method, form.itemId, form.qty);
    if (r.ok) {
      setOpen(false);
      push({ title: "Draft PO dibuat", desc: "Ajukan ke PPK dari tabel PO.", tone: "success" });
    } else {
      push({ title: "Gagal membuat PO", desc: r.error, tone: "danger" });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-sans text-caption font-semibold transition-colors",
                  tab === t ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                )}
              >
                {t} · {counts[t]}
              </button>
            ))}
          </div>
          <Btn icon={Plus} onClick={() => setOpen(true)}>Buat PO</Btn>
        </div>
      </Card>

      <Card>
        <CardTitle title="Daftar Purchase Order" desc="Klik aksi untuk memajukan status pengadaan" />
        <div className="overflow-x-auto rounded-lg ring-1 ring-surface-container">
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Nomor PO</th>
                <th className={thCls}>Vendor &amp; Metode</th>
                <th className={thCls}>Rincian</th>
                <th className={cn(thCls, "text-right")}>Nilai</th>
                <th className={thCls}>Status</th>
                <th className={cn(thCls, "text-right")}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const next = NEXT_LABEL[p.status];
                const NextIcon = next?.icon ?? ArrowRight;
                return (
                  <tr key={p.id} className={trCls}>
                    <td className={tdCls}>
                      <div className="font-mono text-data-mono-sm font-semibold text-primary">{p.po}</div>
                      <div className="font-sans text-caption font-normal text-on-surface-variant">{fmtDate(p.date)} · ETA {p.eta}</div>
                    </td>
                    <td className={tdCls}>
                      <div className="max-w-48 truncate font-medium">{vendorOf(p.vendorId)?.name}</div>
                      <Badge tone="neutral">{p.method}</Badge>
                    </td>
                    <td className={cn(tdCls, "max-w-56")}>
                      <span className="block truncate font-sans text-body-sm text-on-surface-variant">
                        {p.lines.map((l) => `${itemOf(l.itemId)?.name} × ${l.qty}`).join("; ")}
                      </span>
                    </td>
                    <td className={cn(tdCls, "text-right font-mono text-data-mono-sm")}>{fmtIDR(p.value)}</td>
                    <td className={tdCls}><Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge></td>
                    <td className={cn(tdCls, "text-right")}>
                      {p.status === "Diterima" ? (
                        <Badge tone="ok"><CheckCheck className="h-3 w-3" /> Selesai</Badge>
                      ) : p.status === "Dikirim" ? (
                        <Btn tone="soft" icon={NextIcon} className="h-8 px-2.5" onClick={() => navigate("penerimaan-barang")}>
                          {next.label}
                        </Btn>
                      ) : (
                        <Btn
                          tone="soft" icon={NextIcon} className="h-8 px-2.5"
                          onClick={() => {
                            advancePO(p.id);
                            push({ title: `Status diperbarui`, desc: `${p.po} → ${next.label === "Ajukan" ? "Diajukan" : next.label === "Setujui" ? "Disetujui" : "Dikirim"}.`, tone: "success" });
                          }}
                        >
                          {next.label}
                        </Btn>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6}><Empty title="Tidak ada PO" desc={`Belum ada PO berstatus ${tab}.`} icon={ShoppingBag} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Buat Purchase Order">
        <div className="flex flex-col gap-3">
          <Field label="Vendor">
            <select className={inputCls} value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
              {state.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}{v.ekatalog ? " (E-Katalog)" : ""}</option>)}
            </select>
          </Field>
          <Field label="Metode Pengadaan">
            <select className={inputCls} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option>E-Katalog</option><option>Tender RS</option><option>Pengadaan Langsung</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Item" className="col-span-2 sm:col-span-1">
              <select className={inputCls} value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
                {state.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </Field>
            <Field label="Jumlah" className="col-span-2 sm:col-span-1">
              <input type="number" min={1} className={inputCls} value={form.qty}
                onChange={(e) => setForm({ ...form, qty: Math.max(1, +e.target.value) })} />
            </Field>
          </div>
          <div className="rounded-lg bg-surface-container-low px-3 py-2 font-sans text-body-sm text-on-surface-variant">
            Estimasi nilai: <span className="font-mono font-semibold text-on-surface">
              {fmtIDR((itemOf(form.itemId)?.price ?? 0) * form.qty)}
            </span>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn tone="ghost" onClick={() => setOpen(false)}>Batal</Btn>
          <Btn icon={Plus} onClick={submitPO}>Simpan Draft</Btn>
        </div>
      </Modal>
    </div>
  );
}
