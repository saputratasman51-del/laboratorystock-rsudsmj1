import { useState } from "react";
import { Send, ClipboardCheck, User, Trash2 } from "lucide-react";
import { Card, CardTitle, Badge, Btn, Field, inputCls, Empty, useArmable, thCls, tdCls, tableCls, theadCls, trCls } from "../components/ui";
import { useStore, UNITS, fmtDate, todayISO } from "../store/store";
import { useToast } from "../components/Toast";
import { cn } from "../utils/cn";

export default function PemakaianPage() {
  const { state, itemOf, addUsage, deleteUsage } = useStore();
  const push = useToast();
  const [form, setForm] = useState({ itemId: state.items[0]?.id ?? "", qty: 1, toUnit: UNITS[0] as string, note: "" });
  const { armed, arm, disarm } = useArmable();

  const item = itemOf(form.itemId);
  const todayCount = state.usages.filter((u) => u.date === todayISO()).length;

  const submit = () => {
    const r = addUsage(form.itemId, form.qty, form.toUnit, form.note || "Pemakaian rutin");
    if (r.ok) {
      push({ title: "Pemakaian tercatat", desc: `${item?.name} -${form.qty} ${item?.unit} ke ${form.toUnit}.`, tone: "success" });
      setForm({ ...form, qty: 1, note: "" });
    } else {
      push({ title: "Gagal mencatat", desc: r.error, tone: "danger" });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {/* Form */}
      <Card className="h-fit xl:sticky xl:top-20">
        <CardTitle title="Catat Barang Keluar" desc={`${todayCount} entri tercatat hari ini`} />
        <div className="flex flex-col gap-3">
          <Field label="Item">
            <select className={inputCls} value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
              {state.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — sisa {i.stock} {i.unit}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jumlah">
              <input
                type="number" min={1} className={inputCls} value={form.qty}
                onChange={(e) => setForm({ ...form, qty: Math.max(1, +e.target.value) })}
              />
            </Field>
            <Field label="Unit Tujuan (Internal)">
              <select className={inputCls} value={form.toUnit} onChange={(e) => setForm({ ...form, toUnit: e.target.value })}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Catatan">
            <input
              className={inputCls} value={form.note} placeholder="cth. Run pagi / distribusi rutin"
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </Field>
          {item && form.qty > item.stock && (
            <p className="rounded-lg bg-error-container px-3 py-2 font-sans text-body-sm text-on-error-container">
              Stok tidak cukup — tersisa {item.stock} {item.unit}.
            </p>
          )}
          <Btn icon={Send} onClick={submit} className="w-full">Simpan &amp; Potong Stok</Btn>
        </div>
      </Card>

      {/* Riwayat */}
      <Card className="xl:col-span-2">
        <CardTitle title="Riwayat Pemakaian" desc="Terbaru di atas — hapus entri akan mengembalikan stok" />
        <div className="overflow-x-auto rounded-lg ring-1 ring-surface-container">
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Tanggal</th>
                <th className={thCls}>Item</th>
                <th className={thCls}>Qty</th>
                <th className={thCls}>Unit Tujuan</th>
                <th className={thCls}>Petugas</th>
                <th className={thCls}>Catatan</th>
                <th className={cn(thCls, "text-right")}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {state.usages.slice(0, 12).map((u) => {
                const it = itemOf(u.itemId);
                const today = u.date === todayISO();
                const isArmed = armed === u.id;
                return (
                  <tr key={u.id} className={trCls}>
                    <td className={cn(tdCls, "whitespace-nowrap")}>
                      <span className="flex items-center gap-1.5">
                        {today && <Badge tone="info">Hari ini</Badge>}
                        <span className="text-on-surface-variant">{fmtDate(u.date)}</span>
                      </span>
                    </td>
                    <td className={cn(tdCls, "max-w-48 truncate font-medium")}>{it?.name ?? "-"}</td>
                    <td className={cn(tdCls, "font-mono text-data-mono-sm font-semibold")}>-{u.qty} {it?.unit}</td>
                    <td className={cn(tdCls, "whitespace-nowrap")}>{u.toUnit}</td>
                    <td className={cn(tdCls, "whitespace-nowrap text-on-surface-variant")}>
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{u.user.split(",")[0]}</span>
                    </td>
                    <td className={cn(tdCls, "max-w-40 truncate text-on-surface-variant")}>{u.note}</td>
                    <td className={cn(tdCls, "text-right")}>
                      <button
                        type="button"
                        title={isArmed ? "Klik lagi untuk konfirmasi hapus (stok kembali)" : "Hapus entri & kembalikan stok"}
                        onClick={() => {
                          if (isArmed) {
                            deleteUsage(u.id);
                            disarm();
                            push({ title: "Entri dihapus", desc: `Stok ${it?.name ?? ""} dikembalikan +${u.qty} unit.`, tone: "info" });
                          } else {
                            arm(u.id);
                          }
                        }}
                        className={cn(
                          "rounded-lg px-1.5 py-1.5 font-sans text-[11px] font-semibold transition-colors",
                          isArmed ? "bg-error text-on-error" : "text-outline hover:bg-error-container hover:text-on-error-container"
                        )}
                      >
                        {isArmed ? "Yakin?" : <Trash2 className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {state.usages.length === 0 && (
                <tr><td colSpan={7}><Empty title="Belum ada pemakaian" desc="Entri pertama akan muncul setelah formulir disimpan." icon={ClipboardCheck} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
