import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FlaskConical,
  QrCode,
  Syringe,
  ClipboardCheck,
  Inbox,
  Package,
  ShoppingBag,
  Building2,
  ChartColumn,
  CalendarX,
  ShieldCheck,
} from "lucide-react";

export type NavItem = { id: string; label: string; icon: LucideIcon };
export type NavSection = { title: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Menu Utama",
    items: [{ id: "dashboard-alert-center", label: "Dashboard & Alert Center", icon: LayoutDashboard }],
  },
  {
    title: "Manajemen Inventaris",
    items: [
      { id: "katalog-stok-reagensia", label: "Katalog Stok & Reagensia", icon: FlaskConical },
      { id: "pelacakan-batch-lot", label: "Pelacakan Batch & Lot", icon: QrCode },
      { id: "manajemen-bmhp-alkes", label: "Manajemen BMHP & Alkes", icon: Syringe },
    ],
  },
  {
    title: "Transaksi & Operasional",
    items: [
      { id: "pencatatan-pemakaian-harian", label: "Pencatatan Pemakaian Harian", icon: ClipboardCheck },
      { id: "permintaan-stok-internal", label: "Permintaan Stok Internal", icon: Inbox },
      { id: "penerimaan-barang", label: "Penerimaan Barang", icon: Package },
    ],
  },
  {
    title: "Pengadaan & Vendor",
    items: [
      { id: "purchase-order-e-katalog", label: "PO & E-Katalog", icon: ShoppingBag },
      { id: "daftar-vendor-supplier", label: "Daftar Vendor & Supplier", icon: Building2 },
    ],
  },
  {
    title: "Laporan & Kepatuhan",
    items: [
      { id: "laporan-mutasi-valuasi", label: "Laporan Mutasi & Valuasi", icon: ChartColumn },
      { id: "peringatan-fefo-expired", label: "Peringatan FEFO & Expired", icon: CalendarX },
      { id: "log-audit-kars-iso", label: "Log Audit (KARS & ISO)", icon: ShieldCheck },
    ],
  },
];

export const PAGE_META: Record<string, { title: string; desc: string }> = {
  "dashboard-alert-center": {
    title: "Dashboard & Alert Center",
    desc: "Ringkasan pencatatan internal laboratorium: stok, pengadaan, pemakaian, dan seluruh peringatan aktif.",
  },
  "katalog-stok-reagensia": {
    title: "Katalog Stok & Reagensia",
    desc: "Master data item laboratorium: stok terkini, lokasi rak, ambang minimum, dan valuasi — dapat diubah & dihapus.",
  },
  "pelacakan-batch-lot": {
    title: "Pelacakan Batch & Lot",
    desc: "Telusuri nomor lot/batch per item — diurutkan FEFO untuk rotasi stok sesuai standar KARS.",
  },
  "manajemen-bmhp-alkes": {
    title: "Manajemen BMHP & Alkes",
    desc: "Bahan medis habis pakai dan alat kesehatan — ambil stok cepat dan pantau ketersediaan.",
  },
  "pencatatan-pemakaian-harian": {
    title: "Pencatatan Pemakaian Harian",
    desc: "Catat barang keluar untuk Lab Patologi Klinik & UPD; stok terpotong otomatis dan tercatat di log audit.",
  },
  "permintaan-stok-internal": {
    title: "Permintaan Stok Internal",
    desc: "Persetujuan permintaan barang antar unit internal Lab Patologi Klinik & Unit Pelayanan Darah (UPD).",
  },
  "penerimaan-barang": {
    title: "Penerimaan Barang (Goods Receipt)",
    desc: "Verifikasi barang datang — jumlah, lot, dan kedaluwarsa dapat disesuaikan dengan kondisi aktual kiriman.",
  },
  "purchase-order-e-katalog": {
    title: "PO & E-Katalog",
    desc: "Kelola siklus Purchase Order: draft, pengajuan PPK, persetujuan, hingga pengiriman vendor.",
  },
  "daftar-vendor-supplier": {
    title: "Daftar Vendor & Supplier",
    desc: "Rekanan penyedia reagensia dan BMHP yang terverifikasi untuk pengadaan RSUD SMJ.",
  },
  "laporan-mutasi-valuasi": {
    title: "Laporan Mutasi & Valuasi",
    desc: "Rekapitulasi barang masuk-keluar dan nilai persediaan untuk pelaporan internal laboratorium.",
  },
  "peringatan-fefo-expired": {
    title: "Peringatan FEFO & Expired",
    desc: "Batch mendekati kedaluwarsa — tandai prioritas pemakaian atau catat pemusnahan.",
  },
  "log-audit-kars-iso": {
    title: "Log Audit (KARS & ISO)",
    desc: "Jejak digital seluruh aktivitas persediaan untuk bukti akreditasi KARS & ISO 15189.",
  },
};

export const LAB_UNITS = [
  { value: "pk", label: "Laboratorium Patologi Klinik" },
  { value: "upd", label: "Unit Pelayanan Darah (UPD)" },
];
