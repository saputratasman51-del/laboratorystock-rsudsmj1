import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

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

/** Unit internal yang terhubung ke stok barang */
export const UNITS = ["Laboratorium Patologi Klinik", "Unit Pelayanan Darah (UPD)"] as const;

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
export type ReceiptLine = { itemId: string; qty: number; lot: string; expired: string };
/** Rincian penerimaan aktual per item — selisih dipesan vs diterima (catatan back-order) */
export type POReceipt = { itemId: string; ordered: number; received: number };
export type PO = {
  id: string; po: string; date: string; vendorId: string; method: string; status: POStatus;
  value: number; eta: string; lines: POLine[];
  receivedLines?: POReceipt[]; sj?: string;
};
export type Vendor = {
  id: string; name: string; category: string; pic: string; phone: string; email: string;
  ekatalog: boolean; rating: number;
};
export type AuditLog = { id: string; at: string; actor: string; module: string; action: string; detail: string };
export type TempLog = { id: string; at: string; device: string; value: number; by: string };

export type State = {
  items: Item[]; batches: Batch[]; usages: Usage[];
  requests: StockRequest[]; pos: PO[]; vendors: Vendor[]; audit: AuditLog[];
  temps: TempLog[];
  actor: string;
};

const ACTOR = "dr. Ratna Dewi, Sp.PK";
const U_PK = UNITS[0];
const U_UPD = UNITS[1];

/* ── Data awal ───────────────────────────────────────────────────────────── */
const SEED: State = {
  actor: ACTOR,
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
  usages: [
    { id: "U-01", date: daysFromNow(-6), itemId: "ITM-005", qty: 90, toUnit: U_UPD, user: ACTOR, note: "Distribusi skrining donor" },
    { id: "U-02", date: daysFromNow(-6), itemId: "ITM-001", qty: 2, toUnit: U_PK, user: ACTOR, note: "Run HbA1c pagi" },
    { id: "U-03", date: daysFromNow(-5), itemId: "ITM-006", qty: 60, toUnit: U_PK, user: ACTOR, note: "Pengambilan sampel rutin" },
    { id: "U-04", date: daysFromNow(-5), itemId: "ITM-002", qty: 1, toUnit: U_PK, user: ACTOR, note: "Maintenance XN-550" },
    { id: "U-05", date: daysFromNow(-4), itemId: "ITM-005", qty: 140, toUnit: U_PK, user: ACTOR, note: "Distribusi harian bangsal lab" },
    { id: "U-06", date: daysFromNow(-4), itemId: "ITM-003", qty: 1, toUnit: U_PK, user: ACTOR, note: "Panel glukosa" },
    { id: "U-07", date: daysFromNow(-3), itemId: "ITM-004", qty: 2, toUnit: U_PK, user: ACTOR, note: "QC harian hematologi" },
    { id: "U-08", date: daysFromNow(-3), itemId: "ITM-007", qty: 3, toUnit: U_UPD, user: ACTOR, note: "Pengolahan komponen darah" },
    { id: "U-09", date: daysFromNow(-2), itemId: "ITM-005", qty: 110, toUnit: U_UPD, user: ACTOR, note: "Distribusi skrining donor" },
    { id: "U-10", date: daysFromNow(-2), itemId: "ITM-008", qty: 25, toUnit: U_UPD, user: ACTOR, note: "Uji golongan donor" },
    { id: "U-11", date: daysFromNow(-1), itemId: "ITM-001", qty: 2, toUnit: U_PK, user: ACTOR, note: "Run HbA1c pagi" },
    { id: "U-12", date: daysFromNow(-1), itemId: "ITM-006", qty: 45, toUnit: U_PK, user: ACTOR, note: "Pengambilan sampel rutin" },
  ],
  requests: [
    { id: "REQ-001", date: daysFromNow(0), fromUnit: U_UPD, itemId: "ITM-005", qty: 200, status: "Menunggu", note: "Stok skrining donor menipis" },
    { id: "REQ-002", date: daysFromNow(-1), fromUnit: U_PK, itemId: "ITM-006", qty: 50, status: "Disetujui", note: "Jadwal pengambilan sampel mingguan" },
    { id: "REQ-003", date: daysFromNow(0), fromUnit: U_UPD, itemId: "ITM-007", qty: 5, status: "Menunggu", note: "Persiapan pengolahan komponen akhir pekan" },
  ],
  pos: [
    {
      id: "PO1", po: "PO/2025/03/PK-0142", date: daysFromNow(-3), vendorId: "V-01", method: "E-Katalog",
      status: "Dikirim", value: 50300000, eta: "Hari ini 09:15",
      lines: [{ itemId: "ITM-001", qty: 10 }, { itemId: "ITM-002", qty: 5 }],
    },
    { id: "PO2", po: "PO/2025/03/MB-0089", date: daysFromNow(-5), vendorId: "V-02", method: "E-Katalog", status: "Dikirim", value: 88600000, eta: "Besok", lines: [{ itemId: "ITM-004", qty: 8 }, { itemId: "ITM-007", qty: 20 }] },
    { id: "PO3", po: "PO/2025/03/BD-0045", date: daysFromNow(-2), vendorId: "V-03", method: "Tender RS", status: "Disetujui", value: 62150000, eta: "12 Mar", lines: [{ itemId: "ITM-008", qty: 400 }] },
    { id: "PO4", po: "PO/2025/03/PK-0149", date: daysFromNow(-1), vendorId: "V-04", method: "E-Katalog", status: "Diajukan", value: 115400000, eta: "14 Mar", lines: [{ itemId: "ITM-002", qty: 12 }, { itemId: "ITM-004", qty: 6 }] },
    { id: "PO5", po: "PO/2025/03/CITO-003", date: daysFromNow(-1), vendorId: "V-05", method: "Pengadaan Langsung", status: "Dikirim", value: 18500000, eta: "Hari ini (CITO)", lines: [{ itemId: "ITM-003", qty: 10 }] },
    { id: "PO6", po: "PO/2025/03/PK-0150", date: daysFromNow(0), vendorId: "V-01", method: "E-Katalog", status: "Draft", value: 19500000, eta: "-", lines: [{ itemId: "ITM-003", qty: 20 }] },
    {
      id: "PO7", po: "PO/2025/02/PK-0135", date: daysFromNow(-22), vendorId: "V-04", method: "E-Katalog",
      status: "Diterima", value: 37000000, eta: "Selesai", lines: [{ itemId: "ITM-004", qty: 20 }],
      sj: "SJ-PK0135-V04", receivedLines: [{ itemId: "ITM-004", ordered: 20, received: 16 }],
    },
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
    { id: "A-03", at: `${daysFromNow(0)} 07:05`, actor: ACTOR, module: "Pemakaian", action: "Pemakaian dicatat", detail: "Reagen HbA1c Direct -2 Kit → Laboratorium Patologi Klinik (Run pagi)" },
    { id: "A-04", at: `${daysFromNow(0)} 08:15`, actor: ACTOR, module: "Kepatuhan", action: "Ekspor log audit", detail: "Periode Februari 2025 untuk asesor KARS (PDF terenkripsi)" },
  ],
  temps: [
    { id: "TL-CHILLER-A-0", at: "00:00", device: "Chiller A",       value: 4.2, by: "Auto-Logger" },
    { id: "TL-CHILLER-A-1", at: "03:00", device: "Chiller A",       value: 3.9, by: "Auto-Logger" },
    { id: "TL-CHILLER-A-2", at: "06:00", device: "Chiller A",       value: 4.0, by: "Auto-Logger" },
    { id: "TL-CHILLER-A-3", at: "09:00", device: "Chiller A",       value: 3.8, by: "Auto-Logger" },
    { id: "TL-CHILLER-A-4", at: "12:00", device: "Chiller A",       value: 4.1, by: "Auto-Logger" },
    { id: "TL-CHILLER-A-5", at: "15:00", device: "Chiller A",       value: 3.9, by: "Auto-Logger" },
    { id: "TL-CHILLER-A-6", at: "18:00", device: "Chiller A",       value: 4.2, by: "Auto-Logger" },
    { id: "TL-CHILLER-A-7", at: "21:00", device: "Chiller A",       value: 4.0, by: "Auto-Logger" },
    { id: "TL-CHILLER-B-0", at: "00:00", device: "Chiller B",       value: 3.6, by: "Auto-Logger" },
    { id: "TL-CHILLER-B-1", at: "03:00", device: "Chiller B",       value: 3.4, by: "Auto-Logger" },
    { id: "TL-CHILLER-B-2", at: "06:00", device: "Chiller B",       value: 3.7, by: "Auto-Logger" },
    { id: "TL-CHILLER-B-3", at: "09:00", device: "Chiller B",       value: 3.5, by: "Auto-Logger" },
    { id: "TL-CHILLER-B-4", at: "12:00", device: "Chiller B",       value: 3.8, by: "Auto-Logger" },
    { id: "TL-CHILLER-B-5", at: "15:00", device: "Chiller B",       value: 3.6, by: "Auto-Logger" },
    { id: "TL-CHILLER-B-6", at: "18:00", device: "Chiller B",       value: 3.4, by: "Auto-Logger" },
    { id: "TL-CHILLER-B-7", at: "21:00", device: "Chiller B",       value: 3.7, by: "Auto-Logger" },
    { id: "TL-FREEZER-0",   at: "00:00", device: "Freezer -20°C",   value: -20.3, by: "Auto-Logger" },
    { id: "TL-FREEZER-1",   at: "03:00", device: "Freezer -20°C",   value: -20.1, by: "Auto-Logger" },
    { id: "TL-FREEZER-2",   at: "06:00", device: "Freezer -20°C",   value: -19.9, by: "Auto-Logger" },
    { id: "TL-FREEZER-3",   at: "09:00", device: "Freezer -20°C",   value: -20.0, by: "Auto-Logger" },
    { id: "TL-FREEZER-4",   at: "12:00", device: "Freezer -20°C",   value: -20.2, by: "Auto-Logger" },
    { id: "TL-FREEZER-5",   at: "15:00", device: "Freezer -20°C",   value: -20.1, by: "Auto-Logger" },
    { id: "TL-FREEZER-6",   at: "18:00", device: "Freezer -20°C",   value: -19.8, by: "Auto-Logger" },
    { id: "TL-FREEZER-7",   at: "21:00", device: "Freezer -20°C",   value: -20.0, by: "Auto-Logger" },
  ],
};

/* ── Persistensi data operasional (localStorage) ─────────────────────────── */
const DATA_KEY = "labstock-data-v2";

const initialState = (): State => {
  try {
    const raw = window.localStorage.getItem(DATA_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as State;
    if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.audit) || !Array.isArray(parsed.temps)) return SEED;
    return { ...SEED, ...parsed };
  } catch {
    return SEED;
  }
};

/* ── Reducer ─────────────────────────────────────────────────────────────── */
type Action =
  | { type: "SYNC_FROM_SUPABASE"; state: State }
  | { type: "CONFIRM_RECEIPT"; poId: string; sj: string; lines: ReceiptLine[] }
  | { type: "ADD_USAGE"; itemId: string; qty: number; toUnit: string; note: string }
  | { type: "DELETE_USAGE"; id: string }
  | { type: "ADD_ITEM"; item: Omit<Item, "id"> }
  | { type: "UPDATE_ITEM"; id: string; patch: Partial<Omit<Item, "id">> }
  | { type: "DELETE_ITEM"; id: string }
  | { type: "ADJUST_STOCK"; itemId: string; delta: number; reason: string }
  | { type: "UPDATE_BATCH"; id: string; patch: Partial<Pick<Batch, "lot" | "qty" | "expired" | "supplier">> }
  | { type: "TOGGLE_PRIORITY"; batchId: string }
  | { type: "DISPOSE_BATCH"; batchId: string }
  | { type: "ADD_REQUEST"; fromUnit: string; itemId: string; qty: number; note: string }
  | { type: "SET_REQUEST"; id: string; status: RequestStatus }
  | { type: "DELETE_REQUEST"; id: string }
  | { type: "ADD_PO"; vendorId: string; method: string; itemId: string; qty: number }
  | { type: "ADVANCE_PO"; id: string }
  | { type: "DELETE_PO"; id: string }
  | { type: "ADD_VENDOR"; vendor: Omit<Vendor, "id"> }
  | { type: "UPDATE_VENDOR"; id: string; patch: Omit<Vendor, "id"> }
  | { type: "DELETE_VENDOR"; id: string }
  | { type: "SET_ACTOR"; name: string }
  | { type: "ADD_TEMP"; device: string; value: number }
  | { type: "LOG"; module: string; action: string; detail: string };

const log = (s: State, module: string, action: string, detail: string): AuditLog[] =>
  [{ id: uid(), at: `${todayISO()} ${nowTime()}`, actor: s.actor, module, action, detail }, ...s.audit].slice(0, 150);

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "SYNC_FROM_SUPABASE":
      return { ...SEED, ...a.state };
    case "CONFIRM_RECEIPT": {
      const po = s.pos.find((p) => p.id === a.poId);
      if (!po || a.lines.length === 0) return s;
      const vendor = s.vendors.find((v) => v.id === po.vendorId);
      const items = s.items.map((it) => {
        const add = a.lines.filter((l) => l.itemId === it.id).reduce((n, l) => n + l.qty, 0);
        return add ? { ...it, stock: it.stock + add } : it;
      });
      const newBatches: Batch[] = a.lines.map((l) => ({
        id: uid(), itemId: l.itemId, lot: l.lot.trim(), qty: l.qty, expired: l.expired,
        supplier: vendor?.name ?? "-", receivedAt: todayISO(),
      }));
      /* Rekam penerimaan aktual per item — termasuk kekurangan belum diterima */
      const receivedLines: POReceipt[] = po.lines.map((o) => ({
        itemId: o.itemId,
        ordered: o.qty,
        received: a.lines.filter((l) => l.itemId === o.itemId).reduce((n, l) => n + l.qty, 0),
      }));
      a.lines
        .filter((l) => !po.lines.some((o) => o.itemId === l.itemId))
        .forEach((l) => {
          receivedLines.push({ itemId: l.itemId, ordered: 0, received: l.qty });
        });
      const missing = receivedLines.reduce((n, l) => n + Math.max(0, l.ordered - l.received), 0);
      const detail =
        a.lines
          .map((l) => {
            const item = s.items.find((i) => i.id === l.itemId);
            const ordered = po.lines.find((o) => o.itemId === l.itemId)?.qty ?? 0;
            const dev = ordered && l.qty !== ordered ? ` (pesan ${ordered}, terima ${l.qty})` : "";
            return `${item?.name} ${l.qty} ${item?.unit ?? ""} lot ${l.lot.trim()} exp ${l.expired}${dev}`;
          })
          .join("; ") + (missing > 0 ? ` · CATATAN: ${missing} unit belum diterima dari vendor` : "");
      return {
        ...s, items,
        batches: [...newBatches, ...s.batches],
        pos: s.pos.map((p) => (p.id === a.poId ? { ...p, status: "Diterima", receivedLines, sj: a.sj } : p)),
        audit: log(
          s, "Penerimaan",
          missing > 0 ? "Barang diterima sebagian" : "Barang diterima gudang",
          `${po.po} · SJ ${a.sj}: ${detail}`
        ),
      };
    }
    case "ADD_USAGE": {
      const it = s.items.find((i) => i.id === a.itemId);
      if (!it || it.stock < a.qty) return s;
      return {
        ...s,
        items: s.items.map((i) => (i.id === a.itemId ? { ...i, stock: i.stock - a.qty } : i)),
        usages: [{ id: uid(), date: todayISO(), itemId: a.itemId, qty: a.qty, toUnit: a.toUnit, user: s.actor, note: a.note }, ...s.usages],
        audit: log(s, "Pemakaian", "Pemakaian dicatat", `${it.name} -${a.qty} ${it.unit} → ${a.toUnit}`),
      };
    }
    case "DELETE_USAGE": {
      const u = s.usages.find((x) => x.id === a.id);
      if (!u) return s;
      const it = s.items.find((i) => i.id === u.itemId);
      return {
        ...s,
        usages: s.usages.filter((x) => x.id !== a.id),
        items: it ? s.items.map((i) => (i.id === u.itemId ? { ...i, stock: i.stock + u.qty } : i)) : s.items,
        audit: log(s, "Pemakaian", "Entri pemakaian dihapus", `${it?.name ?? u.itemId} +${u.qty} dikembalikan (entri ${u.toUnit}, ${u.date})`),
      };
    }
    case "ADD_ITEM":
      return {
        ...s,
        items: [...s.items, { ...a.item, id: `ITM-${String(s.items.length + 1).padStart(3, "0")}` }],
        audit: log(s, "Inventaris", "Item baru ditambahkan", `${a.item.name} (${a.item.sku}) — stok awal ${a.item.stock} ${a.item.unit}`),
      };
    case "UPDATE_ITEM": {
      const it = s.items.find((i) => i.id === a.id);
      if (!it) return s;
      const keys = Object.keys(a.patch).join(", ");
      return {
        ...s,
        items: s.items.map((i) => (i.id === a.id ? { ...i, ...a.patch } : i)),
        audit: log(s, "Inventaris", "Item diperbarui", `${it.name} — perubahan: ${keys || "-"}`),
      };
    }
    case "DELETE_ITEM": {
      const it = s.items.find((i) => i.id === a.id);
      if (!it) return s;
      const removedBatches = s.batches.filter((b) => b.itemId === a.id).length;
      return {
        ...s,
        items: s.items.filter((i) => i.id !== a.id),
        batches: s.batches.filter((b) => b.itemId !== a.id),
        audit: log(s, "Inventaris", "Item dihapus", `${it.name} (${it.sku}) beserta ${removedBatches} batch terkait`),
      };
    }
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
    case "UPDATE_BATCH": {
      const b = s.batches.find((x) => x.id === a.id);
      if (!b) return s;
      const next: Batch = { ...b, ...a.patch };
      const delta = (a.patch.qty ?? b.qty) - b.qty;
      return {
        ...s,
        batches: s.batches.map((x) => (x.id === a.id ? next : x)),
        items:
          delta !== 0
            ? s.items.map((i) => (i.id === b.itemId ? { ...i, stock: Math.max(0, i.stock + delta) } : i))
            : s.items,
        audit: log(s, "Inventaris", "Batch diperbarui", `Lot ${b.lot} → ${next.lot}${delta !== 0 ? ` · qty ${b.qty} → ${next.qty} (stok ${delta > 0 ? "+" : ""}${delta})` : ""} · exp ${next.expired}`),
      };
    }
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
            ? [{ id: uid(), date: todayISO(), itemId: req.itemId, qty: req.qty, toUnit: req.fromUnit, user: s.actor, note: `Permintaan ${req.id}` }, ...s.usages]
            : s.usages,
        audit: log(s, "Permintaan", `Permintaan ${a.status.toLowerCase()}`, `${req.id}: ${it?.name ?? ""} × ${req.qty} untuk ${req.fromUnit}`),
      };
    }
    case "DELETE_REQUEST": {
      const req = s.requests.find((r) => r.id === a.id);
      if (!req || req.status !== "Menunggu") return s;
      const it = s.items.find((i) => i.id === req.itemId);
      return {
        ...s,
        requests: s.requests.filter((r) => r.id !== a.id),
        audit: log(s, "Permintaan", "Permintaan dibatalkan", `${req.id}: ${it?.name ?? ""} × ${req.qty} (${req.fromUnit})`),
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
    case "DELETE_PO": {
      const po = s.pos.find((p) => p.id === a.id);
      if (!po) return s;
      return {
        ...s,
        pos: s.pos.filter((p) => p.id !== a.id),
        audit: log(s, "Pengadaan", "PO dihapus", `${po.po} (status ${po.status}) dihapus dari register`),
      };
    }
    case "ADD_VENDOR":
      return {
        ...s,
        vendors: [...s.vendors, { ...a.vendor, id: uid() }],
        audit: log(s, "Pengadaan", "Vendor terdaftar", `${a.vendor.name} — ${a.vendor.category}`),
      };
    case "UPDATE_VENDOR": {
      const v = s.vendors.find((x) => x.id === a.id);
      if (!v) return s;
      return {
        ...s,
        vendors: s.vendors.map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)),
        audit: log(s, "Pengadaan", "Data vendor diperbarui", `${a.patch.name || v.name}`),
      };
    }
    case "DELETE_VENDOR": {
      const v = s.vendors.find((x) => x.id === a.id);
      if (!v) return s;
      const poCount = s.pos.filter((p) => p.vendorId === a.id).length;
      return {
        ...s,
        vendors: s.vendors.filter((x) => x.id !== a.id),
        audit: log(s, "Pengadaan", "Vendor dihapus", `${v.name} dihapus dari rekanan (${poCount} PO historis tetap tersimpan)`),
      };
    }
    case "SET_ACTOR":
      return { ...s, actor: a.name };
    case "ADD_TEMP":
      return {
        ...s,
        temps: [
          { id: uid(), at: nowTime(), device: a.device, value: a.value, by: s.actor },
          ...s.temps,
        ].slice(0, 200),
      };
    case "LOG":
      return { ...s, audit: log(s, a.module, a.action, a.detail) };
    default:
      return s;
  }
}

/* ── Sinkronisasi Supabase ───────────────────────────────────────────────── */

type DbItem = { id: string; name: string; sku: string; category: string; unit: string; stock: number; min: number; price: number; location: string; cold: boolean };
type DbBatch = { id: string; item_id: string; lot: string; qty: number; expired: string; supplier: string; received_at: string; priority: boolean };
type DbUsage = { id: string; date: string; item_id: string; qty: number; to_unit: string; user: string; note: string };
type DbRequest = { id: string; date: string; from_unit: string; item_id: string; qty: number; status: string; note: string };
type DbVendor = { id: string; name: string; category: string; pic: string; phone: string; email: string; ekatalog: boolean; rating: number };
type DbPO = { id: string; po: string; date: string; vendor_id: string; method: string; status: string; value: number; eta: string; sj: string | null };
type DbPOLine = { po_id: string; item_id: string; qty: number };
type DbReceiptLine = { id: string; po_id: string; item_id: string; qty: number; lot: string; expired: string };
type DbAudit = { id: string; at: string; actor: string; module: string; action: string; detail: string };
type DbTempLog = { id: string; at: string; device: string; value: number; by: string };

const num = (v: unknown) => typeof v === "number" ? v : Number(v);
const bool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";

async function loadFromSupabase(): Promise<State | null> {
  try {
    const [
      itemsRes, batchesRes, usagesRes, requestsRes,
      posRes, poLinesRes, receiptLinesRes, vendorsRes, auditRes, tempsRes,
    ] = await Promise.all([
      supabase.table("items").select("*", { order: { column: "id", ascending: true } }),
      supabase.table("batches").select("*", { order: { column: "id", ascending: true } }),
      supabase.table("usages").select("*", { order: { column: "id", ascending: true } }),
      supabase.table("stock_requests").select("*", { order: { column: "id", ascending: true } }),
      supabase.table("purchase_orders").select("*", { order: { column: "id", ascending: true } }),
      supabase.table("po_lines").select("*"),
      supabase.table("receipt_lines").select("*"),
      supabase.table("vendors").select("*", { order: { column: "id", ascending: true } }),
      supabase.table("audit_logs").select("*", { order: { column: "at", ascending: false } }),
      supabase.table("temp_logs").select("*", { order: { column: "id", ascending: true } }),
    ]);

    if (itemsRes.error || batchesRes.error || vendorsRes.error) return null;

    const items: Item[] = (itemsRes.data ?? []).map((r: DbItem) => ({
      id: r.id, name: r.name, sku: r.sku, category: r.category as Category,
      unit: r.unit, stock: r.stock, min: r.min, price: num(r.price),
      location: r.location, cold: bool(r.cold),
    }));

    const batches: Batch[] = (batchesRes.data ?? []).map((r: DbBatch) => ({
      id: r.id, itemId: r.item_id, lot: r.lot, qty: r.qty,
      expired: r.expired, supplier: r.supplier, receivedAt: r.received_at,
      priority: bool(r.priority),
    }));

    const usages: Usage[] = (usagesRes.data ?? []).map((r: DbUsage) => ({
      id: r.id, date: r.date, itemId: r.item_id, qty: r.qty,
      toUnit: r.to_unit, user: r.user, note: r.note,
    }));

    const requests: StockRequest[] = (requestsRes.data ?? []).map((r: DbRequest) => ({
      id: r.id, date: r.date, fromUnit: r.from_unit, itemId: r.item_id,
      qty: r.qty, status: r.status as RequestStatus, note: r.note,
    }));

    const vendors: Vendor[] = (vendorsRes.data ?? []).map((r: DbVendor) => ({
      id: r.id, name: r.name, category: r.category, pic: r.pic,
      phone: r.phone, email: r.email, ekatalog: bool(r.ekatalog), rating: num(r.rating),
    }));

    const pos: PO[] = (posRes.data ?? []).map((po: DbPO) => {
      const poLines = (poLinesRes.data ?? []).filter((l: DbPOLine) => l.po_id === po.id);
      const receiptLines = (receiptLinesRes.data ?? []).filter((l: DbReceiptLine) => l.po_id === po.id);
      const receivedLines: POReceipt[] = poLines.map((o: DbPOLine) => {
        const ordered = o.qty;
        const received = receiptLines.filter((l: DbReceiptLine) => l.item_id === o.item_id).reduce((n, l) => n + l.qty, 0);
        return { itemId: o.item_id, ordered, received };
      });
      return {
        id: po.id, po: po.po, date: po.date, vendorId: po.vendor_id, method: po.method,
        status: po.status as POStatus, value: num(po.value), eta: po.eta,
        lines: poLines.map((o: DbPOLine) => ({ itemId: o.item_id, qty: o.qty })),
        receivedLines: receiptLines.length > 0 ? receivedLines : undefined,
        sj: po.sj ?? undefined,
      };
    });

    const audit: AuditLog[] = (auditRes.data ?? []).map((r: DbAudit) => ({
      id: r.id, at: r.at, actor: r.actor, module: r.module, action: r.action, detail: r.detail,
    }));

    const temps: TempLog[] = (tempsRes.data ?? []).map((r: DbTempLog) => ({
      id: r.id, at: r.at, device: r.device, value: num(r.value), by: r.by,
    }));

    const actor = audit.length > 0 ? audit[0].actor : ACTOR;

    return {
      items, batches, usages, requests, pos, vendors, audit, temps, actor,
    };
  } catch {
    return null;
  }
}

async function syncToSupabase(s: State) {
  try {
    const upsertOrDelete = async (
      table: string, rows: any[], idCol: string,
    ) => {
      if (rows.length) {
        const { error } = await supabase.table(table).upsert(rows, { onConflict: idCol });
        if (error) return false;
      }
      const { data: dbRows } = await supabase.table(table).select(idCol);
      const dbIds = (dbRows ?? []).map((r: any) => r[idCol]);
      const stateIds = rows.map((r) => r[idCol]);
      const toDelete = dbIds.filter((id: string) => !stateIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.table(table).delete({ in: [idCol, toDelete] });
      }
      return true;
    };

    await upsertOrDelete("items", s.items.map((i) => ({
      id: i.id, name: i.name, sku: i.sku, category: i.category,
      unit: i.unit, stock: i.stock, min: i.min, price: i.price,
      location: i.location, cold: i.cold,
    })), "id");

    await upsertOrDelete("batches", s.batches.map((b) => ({
      id: b.id, item_id: b.itemId, lot: b.lot, qty: b.qty,
      expired: b.expired, supplier: b.supplier, received_at: b.receivedAt,
      priority: b.priority ?? false,
    })), "id");

    await upsertOrDelete("usages", s.usages.map((u) => ({
      id: u.id, date: u.date, item_id: u.itemId, qty: u.qty,
      to_unit: u.toUnit, user: u.user, note: u.note,
    })), "id");

    await upsertOrDelete("stock_requests", s.requests.map((r) => ({
      id: r.id, date: r.date, from_unit: r.fromUnit, item_id: r.itemId,
      qty: r.qty, status: r.status, note: r.note,
    })), "id");

    await upsertOrDelete("vendors", s.vendors, "id");

    await upsertOrDelete("purchase_orders", s.pos.map((p) => ({
      id: p.id, po: p.po, date: p.date, vendor_id: p.vendorId, method: p.method,
      status: p.status, value: p.value, eta: p.eta, sj: p.sj ?? null,
    })), "id");

    /* po_lines (composite PK) — hapus semua lama, lalu upsert yang baru */
    await supabase.table("po_lines").delete();
    const statePoLines = s.pos.flatMap((p) =>
      p.lines.map((l) => ({ po_id: p.id, item_id: l.itemId, qty: l.qty }))
    );
    if (statePoLines.length) {
      await supabase.table("po_lines").upsert(statePoLines, { onConflict: "po_id,item_id" });
    }

    /* receipt_lines — hapus semua lama, lalu upsert yang baru dari receivedLines */
    await supabase.table("receipt_lines").delete();
    const stateReceipts = s.pos.flatMap((p) => {
      if (!p.receivedLines) return [];
      return p.receivedLines.map((rl) => ({
        id: `RC-${p.id}-${rl.itemId}`, po_id: p.id, item_id: rl.itemId,
        qty: rl.received, lot: "", expired: "",
      }));
    });
    if (stateReceipts.length) {
      await supabase.table("receipt_lines").upsert(stateReceipts, { onConflict: "id" });
    }

    await upsertOrDelete("audit_logs", s.audit, "id");

    await upsertOrDelete("temp_logs", s.temps.map((t) => ({
      id: t.id, at: t.at, device: t.device, value: t.value, by: t.by,
    })), "id");
  } catch {
    /* jaringan bermasalah — biarkan localStorage sebagai cadangan */
  }
}

/* ── Context & API ───────────────────────────────────────────────────────── */
type Result = { ok: boolean; error?: string };
type Store = {
  state: State;
  ready: boolean;
  confirmReceipt: (poId: string, sj: string, lines: ReceiptLine[]) => Result;
  addUsage: (itemId: string, qty: number, toUnit: string, note: string) => Result;
  deleteUsage: (id: string) => void;
  addItem: (item: Omit<Item, "id">) => void;
  updateItem: (id: string, patch: Partial<Omit<Item, "id">>) => void;
  deleteItem: (id: string) => void;
  adjustStock: (itemId: string, delta: number, reason: string) => void;
  updateBatch: (id: string, patch: Partial<Pick<Batch, "lot" | "qty" | "expired" | "supplier">>) => void;
  togglePriority: (batchId: string) => void;
  disposeBatch: (batchId: string) => void;
  addRequest: (fromUnit: string, itemId: string, qty: number, note: string) => void;
  setRequest: (id: string, status: RequestStatus) => Result;
  deleteRequest: (id: string) => Result;
  addPO: (vendorId: string, method: string, itemId: string, qty: number) => Result;
  advancePO: (id: string) => void;
  deletePO: (id: string) => void;
  addVendor: (v: Omit<Vendor, "id">) => void;
  updateVendor: (id: string, patch: Omit<Vendor, "id">) => void;
  deleteVendor: (id: string) => void;
   setActor: (name: string) => void;
  addTemp: (device: string, value: number) => void;
  logEvent: (module: string, action: string, detail: string) => void;
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
  const [state, dispatch] = useReducer(reducer, SEED, initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadFromSupabase().then((db) => {
      if (db) dispatch({ type: "SYNC_FROM_SUPABASE", state: db });
      setReady(true);
    });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DATA_KEY, JSON.stringify(state));
    } catch {
      /* penyimpanan penuh — abaikan */
    }
    if (ready) syncToSupabase(state);
  }, [state, ready]);

  const api = useMemo<Store>(() => {
    const it = (id: string) => state.items.find((i) => i.id === id);
    return {
      state,
      ready,
      itemOf: it,
      vendorOf: (id) => state.vendors.find((v) => v.id === id),
      addItem: (item) => dispatch({ type: "ADD_ITEM", item }),
      updateItem: (id, patch) => dispatch({ type: "UPDATE_ITEM", id, patch }),
      deleteItem: (id) => dispatch({ type: "DELETE_ITEM", id }),
      adjustStock: (itemId, delta, reason) => dispatch({ type: "ADJUST_STOCK", itemId, delta, reason }),
      updateBatch: (id, patch) => dispatch({ type: "UPDATE_BATCH", id, patch }),
      togglePriority: (batchId) => dispatch({ type: "TOGGLE_PRIORITY", batchId }),
      disposeBatch: (batchId) => dispatch({ type: "DISPOSE_BATCH", batchId }),
      addRequest: (fromUnit, itemId, qty, note) => dispatch({ type: "ADD_REQUEST", fromUnit, itemId, qty, note }),
      addVendor: (vendor) => dispatch({ type: "ADD_VENDOR", vendor }),
      updateVendor: (id, patch) => dispatch({ type: "UPDATE_VENDOR", id, patch }),
      deleteVendor: (id) => dispatch({ type: "DELETE_VENDOR", id }),
      advancePO: (id) => dispatch({ type: "ADVANCE_PO", id }),
      deletePO: (id) => dispatch({ type: "DELETE_PO", id }),
      deleteUsage: (id) => dispatch({ type: "DELETE_USAGE", id }),
      setActor: (name) => dispatch({ type: "SET_ACTOR", name }),
      addTemp: (device, value) => dispatch({ type: "ADD_TEMP", device, value }),
      logEvent: (module, action, detail) => dispatch({ type: "LOG", module, action, detail }),
      confirmReceipt: (poId, sj, lines) => {
        if (!lines.length) return { ok: false, error: "Belum ada item yang diterima." };
        for (const l of lines) {
          if (!it(l.itemId)) return { ok: false, error: "Ada baris item yang belum dipilih." };
          if (!l.lot.trim()) return { ok: false, error: "Nomor lot wajib diisi untuk semua baris." };
          if (l.qty <= 0) return { ok: false, error: "Jumlah diterima harus lebih dari 0." };
          if (!l.expired) return { ok: false, error: "Tanggal kedaluwarsa wajib diisi." };
        }
        dispatch({ type: "CONFIRM_RECEIPT", poId, sj: sj.trim() || "-", lines });
        return { ok: true };
      },
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
      deleteRequest: (id) => {
        const req = state.requests.find((r) => r.id === id);
        if (!req) return { ok: false, error: "Permintaan tidak ditemukan." };
        if (req.status !== "Menunggu") return { ok: false, error: "Hanya permintaan berstatus Menunggu yang dapat dihapus." };
        dispatch({ type: "DELETE_REQUEST", id });
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
  }, [state, ready]);

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
