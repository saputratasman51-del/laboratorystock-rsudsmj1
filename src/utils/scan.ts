import type { State } from "../store/store";

export type ScanKind = "batch" | "item" | "po" | "unknown";
export type ScanHit = {
  kind: ScanKind;
  title: string;
  desc: string;
  path: string;
  query: string;
  refId?: string;
  actionLabel: string;
};

/** Cocokkan teks hasil pindai ke data lot/batch, PO, atau item katalog. */
export function resolveScan(raw: string, s: State): ScanHit {
  const t = raw.trim();
  const low = t.toLowerCase();

  // 1) Lot / batch
  const batch =
    s.batches.find((b) => b.lot.toLowerCase() === low) ??
    s.batches.find((b) => low.length >= 4 && (b.lot.toLowerCase().includes(low) || low.includes(b.lot.toLowerCase())));
  if (batch) {
    const item = s.items.find((i) => i.id === batch.itemId);
    return {
      kind: "batch",
      title: `Lot ${batch.lot} teridentifikasi`,
      desc: `${item?.name ?? "-"} · ${batch.qty} ${item?.unit ?? "unit"} · exp ${batch.expired}`,
      path: "pelacakan-batch-lot",
      query: batch.lot,
      refId: batch.id,
      actionLabel: "Buka Pelacakan Batch",
    };
  }

  // 2) Nomor PO / surat jalan yang memuat nomor PO
  const po = s.pos.find((p) => {
    const full = p.po.toLowerCase();
    return low === full || (low.length >= 6 && (low.includes(full) || full.includes(low)));
  });
  if (po) {
    const vendor = s.vendors.find((v) => v.id === po.vendorId);
    const toReceipt = po.status === "Dikirim";
    return {
      kind: "po",
      title: `Dokumen ${po.po} teridentifikasi`,
      desc: `${vendor?.name ?? "-"} · status ${po.status}`,
      path: toReceipt ? "penerimaan-barang" : "purchase-order-e-katalog",
      query: po.po,
      refId: po.id,
      actionLabel: toReceipt ? "Buka Form Penerimaan" : "Buka Daftar PO",
    };
  }

  // 3) SKU / nama item
  const item =
    s.items.find((i) => i.sku.toLowerCase() === low) ??
    s.items.find((i) => low.length >= 4 && i.name.toLowerCase().includes(low));
  if (item) {
    return {
      kind: "item",
      title: `Item ${item.name}`,
      desc: `SKU ${item.sku} · stok ${item.stock} ${item.unit} · ${item.location}`,
      path: "katalog-stok-reagensia",
      query: item.sku,
      refId: item.id,
      actionLabel: "Buka Katalog Stok",
    };
  }

  return {
    kind: "unknown",
    title: "Kode terbaca",
    desc: `${t} — tidak cocok dengan data mana pun, diteruskan ke pencarian lot.`,
    path: "pelacakan-batch-lot",
    query: t,
    actionLabel: "Cari di Pelacakan Batch",
  };
}
