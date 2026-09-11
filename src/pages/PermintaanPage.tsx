import { useState } from "react";
import { Send, Check, X, Inbox } from "lucide-react";
import { Card, CardTitle, Badge, Btn, Field, inputCls, Empty } from "../components/ui";
import { useStore, fmtDate } from "../store/store";
import { useToast } from "../components/Toast";

const UNITS = ["IGD", "Rawat Inap", "Poli Umum", "Poli Penyakit Dalam", "Mikrobiologi", "Bank Darah"];

export default function PermintaanPage() {
  const { state, itemOf, addRequest, setRequest } = useStore();
  const push = useToast();
  const [form, setForm] = useState({ fromUnit: UNITS[0], itemId: state.items[0]?.id ?? "", qty: 1, note: "" });

  const pending = state.requests.filter((r) => r.status === "Menunggu").length;

  const submit = () => {
    addRequest(form.fromUnit, form.itemId, form.qty, form.note || "-");
    push({ title: "Permintaan terkirim", desc: `Menunggu persetujuan Kepala Lab.`, tone: "success" });
    setForm({ ...form, qty: 1, note: "" });
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {/* Form */}
      <Card className="h-fit xl:sticky xl:top-20">
        <CardTitle title="Buat Permintaan" desc={`${pending} permintaan menunggu persetujuan`} />
        <div className="flex flex-col gap-3">
          <Field label="Dari Unit">
            <select className={inputCls} value={form.fromUnit} onChange={(e) => setForm({ ...form, fromUnit: e.target.value })}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Item">
            <select className={inputCls} value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
              {state.items.map((i) => (
                <option key={i.id} value={i.id}>{i.name} — sisa {i.stock}</option>
              ))}
            </select>
          </Field>
          <Field label="Jumlah">
            <input type="number" min={1} className={inputCls} value={form.qty}
              onChange={(e) => setForm({ ...form, qty: Math.max(1, +e.target.value) })} />
          </Field>
          <Field label="Catatan Kebutuhan">
            <input className={inputCls} value={form.note} placeholder="cth. stok triase menipis"
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <Btn icon={Send} onClick={submit} className="w-full">Kirim Permintaan</Btn>
        </div>
      </Card>

      {/* Daftar */}
      <div className="flex flex-col gap-3 xl:col-span-2">
        {state.requests.length === 0 && (
          <Card><Empty title="Belum ada permintaan" desc="Permintaan dari unit layanan akan tampil di sini." icon={Inbox} /></Card>
        )}
        {state.requests.map((r) => {
          const it = itemOf(r.itemId);
          const waiting = r.status === "Menunggu";
          const insufficient = waiting && it && it.stock < r.qty;
          return (
            <Card key={r.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-data-mono-sm font-semibold text-primary">{r.id}</span>
                  <Badge tone={r.status === "Menunggu" ? "warn" : r.status === "Disetujui" ? "ok" : "danger"}>{r.status}</Badge>
                  <span className="font-sans text-caption font-normal text-on-surface-variant">{fmtDate(r.date)}</span>
                </div>
                <div className="mt-1 font-sans text-title-sm text-on-surface">
                  {r.fromUnit} meminta {r.qty} {it?.unit} {it?.name}
                </div>
                <div className="mt-0.5 font-sans text-body-sm text-on-surface-variant">
                  {r.note} · stok gudang: {it?.stock} {it?.unit}
                  {insufficient && <span className="ml-1 font-semibold text-error">(tidak mencukupi)</span>}
                </div>
              </div>
              {waiting && (
                <div className="flex shrink-0 gap-2">
                  <Btn
                    tone="soft"
                    icon={X}
                    onClick={() => {
                      const res = setRequest(r.id, "Ditolak");
                      push(res.ok
                        ? { title: `Permintaan ${r.id} ditolak`, desc: "Unit pemohon diberi notifikasi.", tone: "info" }
                        : { title: "Gagal memproses", desc: res.error, tone: "danger" });
                    }}
                  >
                    Tolak
                  </Btn>
                  <Btn
                    icon={Check}
                    disabled={!!insufficient}
                    onClick={() => {
                      const res = setRequest(r.id, "Disetujui");
                      push(res.ok
                        ? { title: `Permintaan ${r.id} disetujui`, desc: `${it?.name} -${r.qty} ${it?.unit} dikirim ke ${r.fromUnit}.`, tone: "success" }
                        : { title: "Tidak dapat disetujui", desc: res.error, tone: "danger" });
                    }}
                  >
                    Setujui
                  </Btn>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
