import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";

/* ── Helper tanggal & format ─────────────────────────────────────────────── */
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const todayISO = () => iso(new Date());
export const nowTime = () =>
  new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":");
export const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
export const fmtIDR = (n: number) => "Rp " + n.toLocaleString("id-ID");
export const fmtIDRShort = (n: number) =>
  n >= 1e9
    ? `Rp ${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`
    : `Rp ${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Jt`;
export const daysUntil = (s: string) =>
  Math.ceil((new Date(s + "T00:00:00").getTime() - new Date(todayISO() + "T00:00:00").getTime()) / 86400000);
const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

/* ── Tipe ────────────────────────────────────────────────────────────────── */
export type Category = "Reagensia" | "BMHP" | "Alkes";
export type Item = {
  id: string; name: string; sku: string; category: Category; unit: string;
  stock: number; min: number; price: number; location: string; cold: boolean;
};
export type Batch = {
  id: string; itemId: string; lot: string; qty: number; expired: string;
  supplier: string; receivedAt: string; priority?: boolean;
};
export type TempLog = { id: string; at: string; device: string; value: number; by: string };
export type Usage = {
  id: string; date: string; itemId: string; qty: number; toUnit: string; user: string; note: string;
};
export type RequestStatus = "Menunggu" | "Disetujui" | "Ditolak";
export type StockRequest = {
  id: string; date: string; fromUnit: string; itemId: string; qty: number;
  status: RequestStatus; note: string;
};
export type POStatus = "Draft" | "Diajukan" | "Disetujui" | "Dikirim" | "Diterima";
export type POLine = { itemId: string; qty: number };
export type ReceiptLine = { itemId: string; qty: number; lot: string; days: number };
export type PO = {
  id: string; po: string; date: string; vendorId: string; method: string; status: POStatus;
  value: number; eta: string; lines: POLine[]; receiptLines?: ReceiptLine[];
};
export type Vendor = {
  id: string; name: string; category: string; pic: string; phone: string; email: string;
  ekatalog: boolean; rating: number;
};
export type AuditLog = { id: string; at: string; actor: string; module: string; action: string; detail: string };

export type State = {
  items: Item[]; batches: Batch[]; temps: TempLog[]; usages: Usage[];
  requests: StockRequest[]; pos: PO[]; vendors: Vendor[]; audit: AuditLog[];
};

const ACTOR = "dr. Ratna Dewi, Sp.PK";

/* ── Seed data ───────────────────────────────────────────────────────────── */
const tempHistory = (device: string, base: number, by: string): TempLog[] =>
  Array.from({ length: 8 }, (_, i) => ({
    id: `${device}-${i}`,
    at: `${String((i * 3) % 24).padStart(2, "0")}:00`,
    device,
    value: +(base + (Math.sin(i * 1.7) + 1) * 0.3).toFixed(1),
    by,
  }));

const SEED: State = {
  items: [
    { id: "ITM-001", name: "Reagen HbA1c Direct", sku: "RGN-HBA1C-DR", category: "Reagensia", unit: "Kit", stock: 14, min: 10, price: 4425000, location: "Chiller A · Rak 2", cold: true },
    { id: "ITM-002", name: "Cellclean Sysmex 50ml", sku: "RGN-CLN-SMX", category: "Reagensia", unit: "Botol", stock: 13, min: 6, price: 1210000, location: "Chiller A · Rak 3", cold: true },
    { id: "ITM-003", name: "Reagen Glukosa GOD-PAP", sku: "RGN-GLU-GOD", category: "Reagensia", unit: "Kit", stock: 8, min: 12, price: 975000, location: "Chiller B · Rak 1", cold: true },
    { id: "ITM-004", name: "Kontrol CBC 3-Part Level N", sku: "RGN-CTL-CBC", category: "Reagensia", unit: "Vial", stock: 15, min: 5, price: 1850000, location: "Chiller B · Rak 2", cold: true },
    { id: "ITM-005", name: "Vacutainer EDTA K2 3ml", sku: "BMHP-EDTA-3", category: "BMHP", unit: "Pcs", stock: 2400, min: 1000, price: 4200, location: "Gudang B · Rak 5", cold: false },
    { id: "ITM-006", name: "Jarum Vacutainer 22G", sku: "BMHP-JRM-22", category: "BMHP", unit: "Pcs", stock: 480, min: 500, price: 1950, location: "Gudang B · Rak 5", cold: false },
    { id: "ITM-007", name: "Tips Mikropipet 1000µL", sku: "BMHP-TPS-1K", category: "BMHP", unit: "Box", stock: 42, min: 20, price: 145000, location: "Gudang B · Rak 7", cold: false },
    { id: "ITM-008", name: "Strip Tes Golongan Darah", sku: "BMHP-ABD-ST", category: "BMHP", unit: "Strip", stock: 600, min: 200, price: 68500, location: "Gudang B · Rak 6", cold: false },
    { id: "ITM-009", name: "Termometer Infrared Non-Kontak", sku: "ALK-TRM-IR", category: "Alkes", unit: "Unit", stock: 4, min: 2, price: 735000, location: "Lemari Alkes · L2", cold: false },
    { id: "ITM-010", name: "Mikropipet Eppendorf 100–1000µL", sku: "ALK-PPT-1K", category: "Alkes", unit: "Unit", stock: 6, min: 3, price: 4850000, location: "Lemari Alkes · L1", cold: false },
  ],
  batches: [
    { id: "B-01", itemId: "ITM-001", lot: "#HBA-2024-12", qty: 14, expired: daysFromNow(55), supplier: "PT Kimia Farma Trading", receivedAt: daysFromNow(-120) },
    { id: "B-02", itemId: "ITM-002", lot: "#CLN-845", qty: 13, expired: daysFromNow(400), supplier: "PT Sysmex Indonesia", receivedAt: daysFromNow(-90) },
    { id: "B-03", itemId: "ITM-003", lot: "#GLU-776", qty: 8, expired: daysFromNow(21), supplier: "PT Enseval Putera Megatrading", receivedAt: daysFromNow(-200) },
    { id: "B-04", itemId: "ITM-004", lot: "#K3P-102", qty: 6, expired: daysFromNow(45), supplier: "PT Sysmex Indonesia", receivedAt: daysFromNow(-60) },
    { id: "B-05", itemId: "ITM-004", lot: "#K3P-099", qty: 9, expired: daysFromNow(120), supplier: "PT Sysmex Indonesia", receivedAt: daysFromNow(-30) },
    { id: "B-06", itemId: "ITM-005", lot: "#EDT-552", qty: 1200, expired: daysFromNow(300), supplier: "PT Anugerah Pharmindo", receivedAt: daysFromNow(-50) },
    { id: "B-07", itemId: "ITM-006", lot: "#JRM-221", qty: 480, expired: daysFromNow(540), supplier: "PT Anugerah Pharmindo", receivedAt: daysFromNow(-40) },
    { id: "B-08", itemId: "ITM-007", lot: "#T1K-088", qty: 42, expired: daysFromNow(365), supplier: "PT Enseval Putera Megatrading", receivedAt: daysFromNow(-25) },
    { id: "B-09", itemId: "ITM-005", lot: "#EDT-560", qty: 1200, expired: daysFromNow(430), supplier: "PT Anugerah Pharmindo", receivedAt: daysFromNow(-10) },
    { id: "B-10", itemId: "ITM-008", lot: "#ABD-330", qty: 600, expired: daysFromNow(210), supplier: "PT Bio Farma (Persero)", receivedAt: daysFromNow(-15) },
  ],
  temps: [
    ...tempHistory("Chiller A", 3.9, "Auto-Logger"),
    ...tempHistory("Chiller B", 3.5, "Auto-Logger"),
    ...tempHistory("Freezer -20°C", -20.1, "Auto-Logger"),
  ],
  usages: [
    { id: "U-01", date: daysFromNow(-6), itemId: "ITM-005", qty: 90, toUnit: "IGD", user: ACTOR, note: "Distribusi rutin" },
    { id: "U-02", date: daysFromNow(-6), itemId: "ITM-001", qty: 2, toUnit: "Lab — Kimia Klinik", user: ACTOR, note: "Run HbA1c pagi" },
    { id: "U-03", date: daysFromNow(-5), itemId: "ITM-006", qty: 60, toUnit: "Poli Penyakit Dalam", user: ACTOR, note: "Jadwal MCU" },
    { id: "U-04", date: daysFromNow(-5), itemId: "ITM-002", qty: 1, toUnit: "Lab — Hematologi", user: ACTOR, note: "Maintenance XN-550" },
    { id: "U-05", date: daysFromNow(-4), itemId: "ITM-005", qty: 140, toUnit: "Rawat Inap", user: ACTOR, note: "Round pagi" },
    { id: "U-06", date: daysFromNow(-4), itemId: "ITM-003", qty: 1, toUnit: "Lab — Kimia Klinik", user: ACTOR, note: "Panel glukosa" },
    { id: "U-07", date: daysFromNow(-3), itemId: "ITM-004", qty: 2, toUnit: "Lab — Hematologi", user: ACTOR, note: "QC harian" },
    { id: "U-08", date: daysFromNow(-3), itemId: "ITM-007", qty: 3, toUnit: "Mikrobiologi", user: ACTOR, note: "Kultur sampel" },
    { id: "U-09", date: daysFromNow(-2), itemId: "ITM-005", qty: 110, toUnit: "IGD", user: ACTOR, note: "Distribusi rutin" },
    { id: "U-10", date: daysFromNow(-2), itemId: "ITM-008", qty: 25, toUnit: "Bank Darah", user: ACTOR, note: "Skrining donor" },
    { id: "U-11", date: daysFromNow(-1), itemId: "ITM-001", qty: 2, toUnit: "Lab — Kimia Klinik", user: ACTOR, note: "Run HbA1c pagi" },
    { id: "U-12", date: daysFromNow(-1), itemId: "ITM-006", qty: 45, toUnit: "Poli Umum", user: ACTOR, note: "Antrian MCU" },
  ],
  requests: [
    { id: "REQ-001", date: daysFromNow(0), fromUnit: "IGD", itemId: "ITM-005", qty: 200, status: "Menunggu", note: "Stok triase menipis" },
    { id: "REQ-002", date: daysFromNow(-1), fromUnit: "Poli Penyakit Dalam", itemId: "ITM-006", qty: 50, status: "Disetujui", note: "Jadwal MCU mingguan" },
    { id: "REQ-003", date: daysFromNow(0), fromUnit: "Rawat Inap", itemId: "ITM-007", qty: 5, status: "Menunggu", note: "Persiapan panel akhir pekan" },
  ],
  pos: [
    {
      id: "PO1", po: "PO/2025/03/PK-0142", date: daysFromNow(-3), vendorId: "V-01", method: "E-Katalog",
      status: "Dikirim", value: 50300000, eta: "Hari ini 09:15",
      lines: [{ itemId: "ITM-001", qty: 10 }, { itemId: "ITM-002", qty: 5 }],
      receiptLines: [
        { itemId: "ITM-001", qty: 10, lot: "#HBA-2025-01", days: 630 },
        { itemId: "ITM-002", qty: 5, lot: "#CLN-881", days: 680 },
      ],
    },
    { id: "PO2", po: "PO/2025/03/MB-0089", date: daysFromNow(-5), vendorId: "V-02", method: "E-Katalog", status: "Dikirim", value: 88600000, eta: "Besok", lines: [{ itemId: "ITM-004", qty: 8 }, { itemId: "ITM-007", qty: 20 }] },
    { id: "PO3", po: "PO/2025/03/BD-0045", date: daysFromNow(-2), vendorId: "V-03", method: "Tender RS", status: "Disetujui", value: 62150000, eta: "12 Mar", lines: [{ itemId: "ITM-008", qty: 400 }] },
    { id: "PO4", po: "PO/2025/03/PK-0149", date: daysFromNow(-1), vendorId: "V-04", method: "E-Katalog", status: "Diajukan", value: 115400000, eta: "14 Mar", lines: [{ itemId: "ITM-002", qty: 12 }, { itemId: "ITM-004", qty: 6 }] },
    { id: "PO5", po: "PO/2025/03/CITO-003", date: daysFromNow(-1), vendorId: "V-05", method: "Pengadaan Langsung", status: "Dikirim", value: 18500000, eta: "Hari ini (CITO)", lines: [{ itemId: "ITM-003", qty: 10 }] },
    { id: "PO6", po: "PO/2025/03/PK-0150", date: daysFromNow(0), vendorId: "V-01", method: "E-Katalog", status: "Draft", value: 19500000, eta: "-", lines: [{ itemId: "ITM-003", qty: 20 }] },
  ],
  vendors: [
    { id: "V-01", name: "PT Kimia Farma Trading", category: "Reagensia & KPO", pic: "Rina Marlina", phone: "021-450-8899", email: "sales@kftd.co.id", ekatalog: true, rating: 4.8 },
    { id: "V-02", name: "PT Enseval Putera Megatrading", category: "Distribusi Farmasi", pic: "Hendro Wijaya", phone: "021-386-7722", email: "lab@enseval.co.id", ekatalog: true, rating: 4.6 },
    { id: "V-03", name: "PT Anugerah Pharmindo Lestari", category: "BMHP & Alkes", pic: "Dewi Anggraini", phone: "021-589-0112", email: "order@apl.co.id", ekatalog: false, rating: 4.4 },
    { id: "V-04", name: "PT Sysmex Indonesia", category: "Instrumen & Reagen", pic: "Andi Prasetyo", phone: "021-2903-4111", email: "support@sysmex.co.id", ekatalog: true, rating: 4.9 },
    { id: "V-05", name: "PT Bio Farma (Persero)", category: "BUMN Farmasi", pic: "Sari Kusuma", phone: "022-203-3755", email: "corporate@biofarma.co.id", ekatalog: false, rating: 4.7 },
  ],
  audit: [
    { id: "A-01", at: `${daysFromNow(-1)} 09:12`, actor: ACTOR, module: "Inventaris", action: "Penyesuaian stok", detail: "ITM-006 Jarum Vacutainer 22G -370 pcs (hasil stock opname)" },
    { id: "A-02", at: `${daysFromNow(-1)} 13:40`, actor: "Bambang S., A.Md.AK", module: "Pengadaan", action: "PO diajukan ke PPK", detail: "PO/2025/03/PK-0149 — Rp 115.400.000 (PT Sysmex Indonesia)" },
    { id: "A-03", at: `${daysFromNow(0)} 07:05`, actor: "Sistem", module: "Monitoring", action: "Suhu chiller tercatat", detail: "Chiller A 4.2°C · Chiller B 3.8°C · Freezer -19.8°C — dalam rentang aman" },
    { id: "A-04", at: `${daysFromNow(0)} 08:15`, actor: ACTOR, module: "Kepatuhan", action: "Ekspor log audit", detail: "Periode Februari 2025 untuk asesor KARS (PDF terenkripsi)" },
  ],
};

/* ── Reducer ─────────────────────────────────────────────────────────────── */
type Action =
  | { type: "CONFIRM_RECEIPT"; poId: string }
  | { type: "ADD_USAGE"; itemId: string; qty: number; toUnit: string; note: string }
  | { type: "ADD_ITEM"; item: Omit<Item, "id"> }
  | { type: "ADJUST_STOCK"; itemId: string; delta: number; reason: string }
  | { type: "ADD_REQUEST"; fromUnit: string; itemId: string; qty: number; note: string }
  | { type: "SET_REQUEST"; id: string; status: RequestStatus }
  | { type: "ADD_PO"; vendorId: string; method: string; itemId: string; qty: number }
  | { type: "ADVANCE_PO"; id: string }
  | { type: "ADD_VENDOR"; vendor: Omit<Vendor, "id"> }
  | { type: "ADD_TEMP"; device: string; value: number }
  | { type: "TOGGLE_PRIORITY"; batchId: string }
  | { type: "DISPOSE_BATCH"; batchId: string };

const log = (s: State, module: string, action: string, detail: string): AuditLog[] =>
  [{ id: uid(), at: `${todayISO()} ${nowTime()}`, actor: ACTOR, module, action, detail }, ...s.audit].slice(0, 150);

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "CONFIRM_RECEIPT": {
      const po = s.pos.find((p) => p.id === a.poId);
      if (!po || !po.receiptLines) return s;
      const items = s.items.map((it) => {
        const add = po.receiptLines!.filter((l) => l.itemId === it.id).reduce((n, l) => n + l.qty, 0);
        return add ? { ...it, stock: it.stock + add } : it;
      });
      const vendor = s.vendors.find((v) => v.id === po.vendorId);
      const newBatches: Batch[] = po.receiptLines.map((l) => ({
        id: uid(), itemId: l.itemId, lot: l.lot, qty: l.qty,
        expired: daysFromNow(l.days), supplier: vendor?.name ?? "-", receivedAt: todayISO(),
      }));
      const detail = po.receiptLines
        .map((l) => `${s.items.find((i) => i.id === l.itemId)?.name} ${l.qty} unit (${l.lot})`)
        .join("; ");
      return {
        ...s, items,
        batches: [...newBatches, ...s.batches],
        pos: s.pos.map((p) => (p.id === a.poId ? { ...p, status: "Diterima" } : p)),
        audit: log(s, "Penerimaan", "Barang diterima gudang", `${po.po}: ${detail}`),
      };
    }
    case "ADD_USAGE": {
      const it = s.items.find((i) => i.id === a.itemId);
      if (!it || it.stock < a.qty) return s;
      return {
        ...s,
        items: s.items.map((i) => (i.id === a.itemId ? { ...i, stock: i.stock - a.qty } : i)),
        usages: [{ id: uid(), date: todayISO(), itemId: a.itemId, qty: a.qty, toUnit: a.toUnit, user: ACTOR, note: a.note }, ...s.usages],
        audit: log(s, "Pemakaian", "Pemakaian dicatat", `${it.name} -${a.qty} ${it.unit} → ${a.toUnit}`),
      };
    }
    case "ADD_ITEM":
      return {
        ...s,
        items: [...s.items, { ...a.item, id: `ITM-${String(s.items.length + 1).padStart(3, "0")}` }],
        audit: log(s, "Inventaris", "Item baru ditambahkan", `${a.item.name} (${a.item.sku}) — stok awal ${a.item.stock} ${a.item.unit}`),
      };
    case "ADJUST_STOCK": {
      const it = s.items.find((i) => i.id === a.itemId);
      if (!it) return s;
      const next = Math.max(0, it.stock + a.delta);
      return {
        ...s,
        items: s.items.map((i) => (i.id === a.itemId ? { ...i, stock: next } : i)),
        audit: log(s, "Inventaris", "Penyesuaian stok", `${it.name} ${a.delta >= 0 ? "+" : ""}${a.delta} ${it.unit} → ${next} ${it.unit} (${a.reason})`),
      };
    }
    case "ADD_REQUEST": {
      const it = s.items.find((i) => i.id === a.itemId);
      return {
        ...s,
        requests: [{ id: `REQ-${uid().slice(0, 4)}`, date: todayISO(), fromUnit: a.fromUnit, itemId: a.itemId, qty: a.qty, status: "Menunggu", note: a.note }, ...s.requests],
        audit: log(s, "Permintaan", "Permintaan stok baru", `${a.fromUnit}: ${it?.name ?? a.itemId} × ${a.qty}`),
      };
    }
    case "SET_REQUEST": {
      const req = s.requests.find((r) => r.id === a.id);
      if (!req) return s;
      const it = s.items.find((i) => i.id === req.itemId);
      if (a.status === "Disetujui" && it && it.stock < req.qty) return s;
      return {
        ...s,
        requests: s.requests.map((r) => (r.id === a.id ? { ...r, status: a.status } : r)),
        items:
          a.status === "Disetujui"
            ? s.items.map((i) => (i.id === req.itemId ? { ...i, stock: i.stock - req.qty } : i))
            : s.items,
        usages:
          a.status === "Disetujui" && it
            ? [{ id: uid(), date: todayISO(), itemId: req.itemId, qty: req.qty, toUnit: req.fromUnit, user: ACTOR, note: `Permintaan ${req.id}` }, ...s.usages]
            : s.usages,
        audit: log(s, "Permintaan", `Permintaan ${a.status.toLowerCase()}`, `${req.id}: ${it?.name ?? ""} × ${req.qty} untuk ${req.fromUnit}`),
      };
    }
    case "ADD_PO": {
      const it = s.items.find((i) => i.id === a.itemId);
      const vendor = s.vendors.find((v) => v.id === a.vendorId);
      if (!it || !vendor) return s;
      const po: PO = {
        id: uid(), po: `PO/2025/${String(new Date().getMonth() + 1).padStart(2, "0")}/PK-${String(150 + s.pos.length).padStart(4, "0")}`,
        date: todayISO(), vendorId: a.vendorId, method: a.method, status: "Draft",
        value: it.price * a.qty, eta: "-", lines: [{ itemId: a.itemId, qty: a.qty }],
      };
      return {
        ...s, pos: [po, ...s.pos],
        audit: log(s, "Pengadaan", "Draft PO dibuat", `${po.po}: ${it.name} × ${a.qty} untuk ${vendor.name}`),
      };
    }
    case "ADVANCE_PO": {
      const NEXT: Record<string, POStatus> = { Draft: "Diajukan", Diajukan: "Disetujui", Disetujui: "Dikirim" };
      const po = s.pos.find((p) => p.id === a.id);
      if (!po || !NEXT[po.status]) return s;
      return {
        ...s,
        pos: s.pos.map((p) => (p.id === a.id ? { ...p, status: NEXT[po.status] } : p)),
        audit: log(s, "Pengadaan", `Status PO → ${NEXT[po.status]}`, po.po),
      };
    }
    case "ADD_VENDOR":
      return {
        ...s,
        vendors: [...s.vendors, { ...a.vendor, id: uid() }],
        audit: log(s, "Pengadaan", "Vendor terdaftar", `${a.vendor.name} — ${a.vendor.category}`),
      };
    case "ADD_TEMP":
      return {
        ...s,
        temps: [{ id: uid(), at: nowTime(), device: a.device, value: a.value, by: ACTOR }, ...s.temps].slice(0, 60),
        audit: log(s, "Monitoring", "Pembacaan suhu manual", `${a.device}: ${a.value.toFixed(1)}°C`),
      };
    case "TOGGLE_PRIORITY": {
      const b = s.batches.find((x) => x.id === a.batchId);
      return {
        ...s,
        batches: s.batches.map((x) => (x.id === a.batchId ? { ...x, priority: !x.priority } : x)),
        audit: log(s, "Kepatuhan", b?.priority ? "Prioritas FEFO dicabut" : "Prioritas FEFO ditandai", `Lot ${b?.lot}`),
      };
    }
    case "DISPOSE_BATCH": {
      const b = s.batches.find((x) => x.id === a.batchId);
      if (!b) return s;
      const it = s.items.find((i) => i.id === b.itemId);
      return {
        ...s,
        batches: s.batches.filter((x) => x.id !== a.batchId),
        items: s.items.map((i) => (i.id === b.itemId ? { ...i, stock: Math.max(0, i.stock - b.qty) } : i)),
        audit: log(s, "Kepatuhan", "Pemusnahan dicatat", `Lot ${b.lot} (${it?.name}) ${b.qty} unit dimusnahkan sesuai BAP`),
      };
    }
    default:
      return s;
  }
}

/* ── Context & API ───────────────────────────────────────────────────────── */
type Result = { ok: boolean; error?: string };
type Store = {
  state: State;
  confirmReceipt: (poId: string) => void;
  addUsage: (itemId: string, qty: number, toUnit: string, note: string) => Result;
  addItem: (item: Omit<Item, "id">) => void;
  adjustStock: (itemId: string, delta: number, reason: string) => void;
  addRequest: (fromUnit: string, itemId: string, qty: number, note: string) => void;
  setRequest: (id: string, status: RequestStatus) => Result;
  addPO: (vendorId: string, method: string, itemId: string, qty: number) => Result;
  advancePO: (id: string) => void;
  addVendor: (v: Omit<Vendor, "id">) => void;
  addTemp: (device: string, value: number) => void;
  togglePriority: (batchId: string) => void;
  disposeBatch: (batchId: string) => void;
  itemOf: (id: string) => Item | undefined;
  vendorOf: (id: string) => Vendor | undefined;
};

const StoreCtx = createContext<Store | null>(null);
export const useStore = () => {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore di luar StoreProvider");
  return ctx;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, SEED);

  const api = useMemo<Store>(() => {
    const it = (id: string) => state.items.find((i) => i.id === id);
    return {
      state,
      itemOf: it,
      vendorOf: (id) => state.vendors.find((v) => v.id === id),
      confirmReceipt: (poId) => dispatch({ type: "CONFIRM_RECEIPT", poId }),
      addItem: (item) => dispatch({ type: "ADD_ITEM", item }),
      adjustStock: (itemId, delta, reason) => dispatch({ type: "ADJUST_STOCK", itemId, delta, reason }),
      addRequest: (fromUnit, itemId, qty, note) => dispatch({ type: "ADD_REQUEST", fromUnit, itemId, qty, note }),
      addVendor: (vendor) => dispatch({ type: "ADD_VENDOR", vendor }),
      addTemp: (device, value) => dispatch({ type: "ADD_TEMP", device, value }),
      togglePriority: (batchId) => dispatch({ type: "TOGGLE_PRIORITY", batchId }),
      disposeBatch: (batchId) => dispatch({ type: "DISPOSE_BATCH", batchId }),
      advancePO: (id) => dispatch({ type: "ADVANCE_PO", id }),
      addUsage: (itemId, qty, toUnit, note) => {
        const item = it(itemId);
        if (!item) return { ok: false, error: "Item tidak ditemukan." };
        if (qty <= 0) return { ok: false, error: "Jumlah harus lebih dari 0." };
        if (item.stock < qty) return { ok: false, error: `Stok tidak cukup — tersisa ${item.stock} ${item.unit}.` };
        dispatch({ type: "ADD_USAGE", itemId, qty, toUnit, note });
        return { ok: true };
      },
      setRequest: (id, status) => {
        const req = state.requests.find((r) => r.id === id);
        if (!req) return { ok: false, error: "Permintaan tidak ditemukan." };
        if (status === "Disetujui") {
          const item = it(req.itemId);
          if (item && item.stock < req.qty)
            return { ok: false, error: `Stok ${item.name} tidak cukup (sisa ${item.stock}).` };
        }
        dispatch({ type: "SET_REQUEST", id, status });
        return { ok: true };
      },
      addPO: (vendorId, method, itemId, qty) => {
        const item = it(itemId);
        if (!item) return { ok: false, error: "Item tidak ditemukan." };
        if (qty <= 0) return { ok: false, error: "Jumlah harus lebih dari 0." };
        dispatch({ type: "ADD_PO", vendorId, method, itemId, qty });
        return { ok: true };
      },
    };
  }, [state]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

/* ── Peringatan terpadu (dipakai TopBar & Dashboard) ─────────────────────── */
export type AppAlert = { id: string; tone: "danger" | "warn" | "info"; title: string; desc: string; path: string };

export function useAlerts(): AppAlert[] {
  const { state } = useStore();
  return useMemo(() => {
    const alerts: AppAlert[] = [];
    state.items
      .filter((i) => i.stock <= i.min)
      .forEach((i) =>
        alerts.push({
          id: "stk-" + i.id, tone: "danger", title: `Stok kritis: ${i.name}`,
          desc: `Sisa ${i.stock} ${i.unit} (min. ${i.min}) — ${i.location}`, path: "katalog-stok-reagensia",
        })
      );
    state.batches
      .filter((b) => daysUntil(b.expired) <= 60)
      .sort((a, b) => daysUntil(a.expired) - daysUntil(b.expired))
      .forEach((b) => {
        const d = daysUntil(b.expired);
        alerts.push({
          id: "exp-" + b.id, tone: d <= 30 ? "danger" : "warn",
          title: `FEFO: Lot ${b.lot} — ${d} hari lagi`,
          desc: `${state.items.find((i) => i.id === b.itemId)?.name ?? ""} · ${b.qty} unit`, path: "peringatan-fefo-expired",
        });
      });
    const pending = state.requests.filter((r) => r.status === "Menunggu").length;
    if (pending)
      alerts.push({
        id: "req", tone: "info", title: `${pending} permintaan stok menunggu`,
        desc: "Butuh persetujuan Kepala Lab.", path: "permintaan-stok-internal",
      });
    return alerts;
  }, [state]);
}

export const itemNameOf = (s: State, id: string) => s.items.find((i) => i.id === id)?.name ?? "-";
