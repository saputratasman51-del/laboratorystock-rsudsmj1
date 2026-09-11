import { useEffect, useMemo, useState } from "react";
import { Plus, Minus, Search, Snowflake, ClipboardPlus } from "lucide-react";
import { useHashParam } from "../router";
import {
  Card, CardTitle, Badge, Btn, Modal, Field, inputCls, Empty,
  thCls, tdCls, tableCls, theadCls, trCls,
} from "../components/ui";
import { useStore, fmtIDR, type Category } from "../store/store";
import { useToast } from "../components/Toast";
import { cn } from "../utils/cn";

const CATS = ["Semua", "Reagensia", "BMHP", "Alkes"];
const CAT_TONE: Record<string, "info" | "warn" | "neutral"> = { Reagensia: "info", BMHP: "warn", Alkes: "neutral" };

export default function KatalogPage() {
  const { state, addItem, adjustStock } = useStore();
  const push = useToast();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Semua");
  const [open, setOpen] = useState(false);

  /* Hasil pindai SKU dari pemindai kamera */
  const qParam = useHashParam("q");
  useEffect(() => {
    if (qParam) {
      setQ(qParam);
      setCat("Semua");
    }
  }, [qParam]);

  const [form, setForm] = useState({ name: "", sku: "", category: "Reagensia" as Category, unit: "Kit", stock: 0, min: 0, price: 0, location: "", cold: true });

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return state.items.filter(
      (i) => (cat === "Semua" || i.category === cat) && (!k || i.name.toLowerCase().includes(k) || i.sku.toLowerCase().includes(k))
    );
  }, [state.items, q, cat]);

  const totalValue = rows.reduce((n, i) => n + i.stock * i.price, 0);

  const submit = () => {
    if (!form.name.trim() || !form.sku.trim()) {
      push({ title: "Form belum lengkap", desc: "Nama item dan kode SKU wajib diisi.", tone: "danger" });
      return;
    }
    addItem({ ...form, location: form.location || "Gudang B" });
    setOpen(false);
    setForm({ name: "", sku: "", category: "Reagensia", unit: "Kit", stock: 0, min: 0, price: 0, location: "", cold: true });
    push({ title: "Item ditambahkan", desc: `${form.name} kini ada di katalog stok.`, tone: "success" });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-outline" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama item atau SKU..." className={cn(inputCls, "pl-9")} />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={cn(inputCls, "sm:w-44")}>
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Btn icon={Plus} onClick={() => setOpen(true)}>Tambah Item</Btn>
        </div>
      </Card>

      <Card>
        <CardTitle
          title="Daftar Item"
          desc={`${rows.length} item · total valuasi ${fmtIDR(totalValue)}`}
        />
        <div className="overflow-x-auto rounded-lg ring-1 ring-surface-container">
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Item &amp; SKU</th>
                <th className={thCls}>Kategori</th>
                <th className={thCls}>Lokasi</th>
                <th className={thCls}>Stok</th>
                <th className={thCls}>Min.</th>
                <th className={thCls}>Status</th>
                <th className={cn(thCls, "text-right")}>Nilai Stok</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const critical = i.stock <= i.min;
                return (
                  <tr key={i.id} className={trCls}>
                    <td className={tdCls}>
                      <div className="flex items-center gap-1.5 font-medium">
                        {i.name}
                        {i.cold && <Snowflake className="h-3.5 w-3.5 text-tertiary" />}
                      </div>
                      <div className="font-mono text-data-mono-sm text-on-surface-variant">{i.id} · {i.sku}</div>
                    </td>
                    <td className={tdCls}><Badge tone={CAT_TONE[i.category]}>{i.category}</Badge></td>
                    <td className={cn(tdCls, "whitespace-nowrap text-on-surface-variant")}>{i.location}</td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Kurangi stok"
                          onClick={() => {
                            if (i.stock > 0) {
                              adjustStock(i.id, -1, "Koreksi manual katalog");
                              push({ title: `${i.name} -1 ${i.unit}`, desc: `Stok kini ${i.stock - 1} ${i.unit}.`, tone: "info" });
                            }
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className={cn("min-w-10 text-center font-mono text-data-mono-md font-semibold", critical ? "text-error" : "text-on-surface")}>
                          {i.stock} <span className="text-caption font-sans font-normal text-on-surface-variant">{i.unit}</span>
                        </span>
                        <button
                          type="button"
                          aria-label="Tambah stok"
                          onClick={() => {
                            adjustStock(i.id, 1, "Koreksi manual katalog");
                            push({ title: `${i.name} +1 ${i.unit}`, desc: `Stok kini ${i.stock + 1} ${i.unit}.`, tone: "info" });
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className={cn(tdCls, "font-mono text-data-mono-sm text-on-surface-variant")}>{i.min}</td>
                    <td className={tdCls}>
                      <Badge tone={critical ? "danger" : "ok"}>{critical ? "Kritis" : "Aman"}</Badge>
                    </td>
                    <td className={cn(tdCls, "text-right font-mono text-data-mono-sm")}>{fmtIDR(i.stock * i.price)}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7}><Empty title="Tidak ada item" desc="Ubah kata kunci atau tambahkan item baru." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Item Katalog">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nama Item" className="col-span-2">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth. Reagen CRP Latex" />
          </Field>
          <Field label="Kode SKU">
            <input className={inputCls} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="RGN-CRP-LX" />
          </Field>
          <Field label="Kategori">
            <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
              <option>Reagensia</option><option>BMHP</option><option>Alkes</option>
            </select>
          </Field>
          <Field label="Satuan">
            <input className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Kit / Botol / Pcs" />
          </Field>
          <Field label="Lokasi Rak">
            <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Chiller A · Rak 4" />
          </Field>
          <Field label="Stok Awal">
            <input type="number" className={inputCls} value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} />
          </Field>
          <Field label="Stok Minimum">
            <input type="number" className={inputCls} value={form.min} onChange={(e) => setForm({ ...form, min: +e.target.value })} />
          </Field>
          <Field label="Harga Satuan (Rp)" className="col-span-2">
            <input type="number" className={inputCls} value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
          </Field>
          <label className="col-span-2 flex cursor-pointer items-center gap-2 font-sans text-body-md text-on-surface">
            <input type="checkbox" checked={form.cold} onChange={(e) => setForm({ ...form, cold: e.target.checked })} className="h-4 w-4 accent-primary" />
            Butuh penyimpanan rantai dingin (2–8°C)
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn tone="ghost" onClick={() => setOpen(false)}>Batal</Btn>
          <Btn icon={ClipboardPlus} onClick={submit}>Simpan Item</Btn>
        </div>
      </Modal>
    </div>
  );
}
