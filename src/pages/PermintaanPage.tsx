import { useState } from "react";
import { Send, Check, X, Inbox, Trash2 } from "lucide-react";
import { Card, CardTitle, Badge, Btn, Field, inputCls, Empty, useArmable } from "../components/ui";
import { useStore, UNITS, fmtDate } from "../store/store";
import { useToast } from "../components/Toast";

export default function PermintaanPage() {
  const { state, itemOf, addRequest, setRequest, deleteRequest } = useStore();
  const push = useToast();
  const [form, setForm] = useState({ fromUnit: UNITS[0] as string, itemId: state.items[0]?.id ?? "", qty: 1, note: "" });
  const { armed, arm, disarm } = useArmable();

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
            <input className={inputCls} value={form.note} placeholder="cth. stok skrining donor menipis"
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <Btn icon={Send} onClick={submit} className="w-full">Kirim Permintaan</Btn>
        </div>
      </Card>

      {/* Daftar */}
      <div className="flex flex-col gap-3 xl:col-span-2">
        {state.requests.length === 0 && (
          <Card><Empty title="Belum ada permintaan" desc="Permintaan dari unit internal akan tampil di sini." icon={Inbox} /></Card>
        )}
        {state.requests.map((r) => {
          const it = itemOf(r.itemId);
          const waiting = r.status === "Menunggu";
          const insufficient = waiting && it && it.stock < r.qty;
          const isArmed = armed === r.id;
          return (
            <Card key={r.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-data-mono-sm font-semibold text-primary">{r.id}</span>
                  <Badge tone={r.status === "Menunggu" ? "warn" : r.status === "Disetujui" ? "ok" : "danger"}>{r.status}</Badge>
                  <span className="font-sans text-caption font-normal text-on-surface-variant">{fmtDate(r.date)}</span>
                </div>
                <div className="mt-1 font-sans text-title-sm text-on-surface">
                  {r.fromUnit} meminta {r.qty} {it?.unit} {it?.name ?? "(item terhapus)"}
                </div>
                <div className="mt-0.5 font-sans text-body-sm text-on-surface-variant">
                  {r.note} · stok gudang: {it?.stock ?? "-"} {it?.unit}
                  {insufficient && <span className="ml-1 font-semibold text-error">(tidak mencukupi)</span>}
                </div>
              </div>
              {waiting && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    title={isArmed ? "Klik lagi untuk konfirmasi hapus" : "Hapus / batalkan permintaan"}
                    onClick={() => {
                      if (isArmed) {
                        const res = deleteRequest(r.id);
                        disarm();
                        push(res.ok
                          ? { title: `Permintaan ${r.id} dihapus`, desc: "Tercatat di Log Audit.", tone: "info" }
                          : { title: "Gagal menghapus", desc: res.error, tone: "danger" });
                      } else {
                        arm(r.id);
                      }
                    }}
                    className={
                      isArmed
                        ? "inline-flex h-9 items-center rounded-lg bg-error px-3 font-sans text-[11px] font-semibold text-on-error transition-colors"
                        : "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 font-sans text-title-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                    }
                  >
                    {isArmed ? "Yakin hapus?" : <Trash2 className="h-4 w-4" />}
                  </button>
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
