import { useMemo, useState } from "react";
import { Plus, Search, Star, Phone, Mail, Building2, BadgeCheck, PenLine, Trash2 } from "lucide-react";
import { Card, Badge, Btn, Modal, Field, inputCls, Empty, useArmable } from "../components/ui";
import { useStore, type Vendor } from "../store/store";
import { useToast } from "../components/Toast";
import { cn } from "../utils/cn";

type FormState = Omit<Vendor, "id">;
const EMPTY_FORM: FormState = { name: "", category: "", pic: "", phone: "", email: "", ekatalog: true, rating: 4.5 };

export default function VendorPage() {
  const { state, addVendor, updateVendor, deleteVendor } = useStore();
  const push = useToast();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const { armed, arm, disarm } = useArmable();

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return state.vendors.filter((v) => !k || v.name.toLowerCase().includes(k) || v.category.toLowerCase().includes(k) || v.pic.toLowerCase().includes(k));
  }, [state.vendors, q]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };
  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm({ name: v.name, category: v.category, pic: v.pic, phone: v.phone, email: v.email, ekatalog: v.ekatalog, rating: v.rating });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim() || !form.category.trim()) {
      push({ title: "Form belum lengkap", desc: "Nama vendor dan kategori wajib diisi.", tone: "danger" });
      return;
    }
    if (editing) {
      updateVendor(editing.id, form);
      push({ title: "Vendor diperbarui", desc: `${form.name} berhasil disimpan.`, tone: "success" });
    } else {
      addVendor(form);
      push({ title: "Vendor terdaftar", desc: `${form.name} masuk daftar rekanan terverifikasi.`, tone: "success" });
    }
    setOpen(false);
    setForm(EMPTY_FORM);
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-outline" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari vendor, kategori, atau PIC..." className={cn(inputCls, "pl-9")} />
          </div>
          <Btn icon={Plus} onClick={openAdd}>Tambah Vendor</Btn>
        </div>
      </Card>

      {rows.length === 0 && <Card><Empty title="Vendor tidak ditemukan" desc="Coba kata kunci lain." icon={Building2} /></Card>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((v) => {
          const poCount = state.pos.filter((p) => p.vendorId === v.id).length;
          const isArmed = armed === v.id;
          return (
            <Card key={v.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-fixed-variant">
                    <Building2 className="h-4.5 w-4.5" strokeWidth={1.9} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-sans text-title-sm text-on-surface">{v.name}</div>
                    <div className="font-sans text-caption font-normal text-on-surface-variant">{v.category}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {v.ekatalog && <Badge tone="info">E-Katalog</Badge>}
                  <button
                    type="button" title="Edit vendor"
                    onClick={() => openEdit(v)}
                    className="rounded-lg p-1.5 text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
                  >
                    <PenLine className="h-4 w-4" />
                  </button>
                  <button
                    type="button" title={isArmed ? "Klik lagi untuk konfirmasi hapus" : "Hapus vendor"}
                    onClick={() => {
                      if (isArmed) {
                        deleteVendor(v.id);
                        disarm();
                        push({ title: "Vendor dihapus", desc: `${v.name} dihapus dari daftar rekanan.`, tone: "danger" });
                      } else {
                        arm(v.id);
                      }
                    }}
                    className={cn(
                      "rounded-lg px-1.5 py-1.5 font-sans text-[11px] font-semibold transition-colors",
                      isArmed ? "bg-error text-on-error" : "text-outline hover:bg-error-container hover:text-on-error-container"
                    )}
                  >
                    {isArmed ? "Yakin?" : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1 font-sans text-body-sm text-on-surface-variant">
                <span className="flex items-center gap-2">
                  <BadgeCheck className="h-3.5 w-3.5 text-primary" /> PIC: {v.pic}
                </span>
                <a href={`tel:${v.phone}`} className="flex items-center gap-2 transition-colors hover:text-primary">
                  <Phone className="h-3.5 w-3.5 text-tertiary" /> {v.phone}
                </a>
                <a href={`mailto:${v.email}`} className="flex items-center gap-2 truncate transition-colors hover:text-primary">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-tertiary" /> {v.email}
                </a>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-surface-container pt-3">
                <span className="flex items-center gap-1 font-sans text-body-sm font-semibold text-on-surface">
                  <Star className="h-4 w-4 fill-tertiary-fixed-dim text-tertiary" />
                  {v.rating.toFixed(1)}
                  <span className="font-normal text-on-surface-variant">/ 5.0 kinerja</span>
                </span>
                <span className="font-sans text-caption font-normal text-on-surface-variant">{poCount} PO tercatat</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Vendor Rekanan" : "Tambah Vendor Rekanan"}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nama Vendor" className="col-span-2">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="PT Contoh Medika" />
          </Field>
          <Field label="Kategori Produk">
            <input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Reagensia & KPO" />
          </Field>
          <Field label="Nama PIC">
            <input className={inputCls} value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} />
          </Field>
          <Field label="Telepon">
            <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="021-xxx-xxxx" />
          </Field>
          <Field label="Email">
            <input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="sales@vendor.co.id" />
          </Field>
          <Field label="Rating Kinerja (0–5)" className="col-span-2">
            <input type="number" min={0} max={5} step={0.1} className={inputCls} value={form.rating}
              onChange={(e) => setForm({ ...form, rating: Math.min(5, Math.max(0, +e.target.value)) })} />
          </Field>
          <label className="col-span-2 flex cursor-pointer items-center gap-2 font-sans text-body-md text-on-surface">
            <input type="checkbox" checked={form.ekatalog} onChange={(e) => setForm({ ...form, ekatalog: e.target.checked })} className="h-4 w-4 accent-primary" />
            Terdaftar di E-Katalog LKPP
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn tone="ghost" onClick={() => setOpen(false)}>Batal</Btn>
          <Btn icon={Plus} onClick={submit}>{editing ? "Simpan Perubahan" : "Simpan Vendor"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
