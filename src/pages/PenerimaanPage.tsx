import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck, Boxes, Ban, CheckCheck, Truck, Package, Plus, X,
  PenLine, ScanLine, CircleAlert,
} from "lucide-react";
import {
  Card, CardTitle, Badge, Btn, Empty, Field, inputCls,
  thCls, tdCls, tableCls, theadCls, trCls,
} from "../components/ui";
import { useStore, daysFromNow, fmtIDR, type ReceiptLine } from "../store/store";
import { useToast } from "../components/Toast";
import QRScannerModal from "../components/QRScannerModal";
import type { ScanHit } from "../utils/scan";
import { cn } from "../utils/cn";

const CHECKS = [
  { id: "seal", title: "Integritas Fisik & Segel", desc: "Kemasan utuh, tidak bocor, segel pabrik valid." },
  { id: "fefo", title: "Kepatuhan FEFO > 18 Bulan", desc: "Masa simpan memenuhi standar akreditasi KARS." },
  { id: "coa", title: "CoA & MSDS Terlampir", desc: "Sertifikat analisis batch pabrikan otentik." },
  { id: "doc", title: "Dokumen Pengiriman Lengkap", desc: "Surat jalan & faktur sesuai dengan isi kiriman." },
];

type EditLine = ReceiptLine & { key: string; ordered: number };
const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

export default function PenerimaanPage() {
  const { state, itemOf, vendorOf, confirmReceipt } = useStore();
  const push = useToast();

  const incoming = useMemo(() => state.pos.filter((p) => p.status === "Dikirim"), [state.pos]);
  const [selId, setSelId] = useState<string>(incoming[0]?.id ?? "");
  const [checks, setChecks] = useState<Record<string, boolean>>(Object.fromEntries(CHECKS.map((c) => [c.id, true])));
  const [doneId, setDoneId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [sj, setSj] = useState("");
  const [lines, setLines] = useState<EditLine[]>([]);

  const activeId = doneId ? "" : incoming.find((p) => p.id === selId)?.id ?? incoming[0]?.id ?? "";
  const po = incoming.find((p) => p.id === activeId);
  const donePO = doneId ? state.pos.find((p) => p.id === doneId) : null;
  const vendor = po ? vendorOf(po.vendorId) : undefined;

  /* Inisialisasi baris editable setiap PO berganti */
  useEffect(() => {
    if (!po) {
      setLines([]);
      setSj("");
      return;
    }
    setSj(`SJ-${po.po.split("/").pop()}-${po.vendorId}`);
    setLines(
      po.lines.map((l) => ({
        key: uid(),
        itemId: l.itemId,
        ordered: l.qty,
        qty: l.qty,
        lot: "",
        expired: daysFromNow(540),
      }))
    );
    setChecks(Object.fromEntries(CHECKS.map((c) => [c.id, true])));
  }, [po?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const doneCount = CHECKS.filter((c) => checks[c.id]).length;
  const allChecked = doneCount === CHECKS.length;

  const setLine = (key: string, patch: Partial<EditLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addLine = () =>
    setLines((ls) => [
      ...ls,
      { key: uid(), itemId: state.items[0]?.id ?? "", ordered: 0, qty: 1, lot: "", expired: daysFromNow(540) },
    ]);

  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  const openScanHit = (hit: ScanHit) => {
    setScanOpen(false);
    const target = hit.kind === "po" && hit.refId ? state.pos.find((p) => p.id === hit.refId) : undefined;
    if (target && target.status === "Dikirim") {
      setDoneId(null);
      setSelId(target.id);
      push({ title: "Dokumen PO terpindai", desc: `${target.po} dibuka pada panel verifikasi.`, tone: "success" });
    } else {
      push({
        title: hit.title,
        desc: hit.kind === "po" ? "PO ini tidak berstatus Dikirim — belum bisa diverifikasi." : hit.desc,
        tone: "info",
      });
    }
  };

  const submit = () => {
    if (!po) return;
    const r = confirmReceipt(
      po.id,
      sj,
      lines.map(({ itemId, qty, lot, expired }) => ({ itemId, qty, lot, expired }))
    );
    if (!r.ok) {
      push({ title: "Verifikasi belum lengkap", desc: r.error, tone: "danger" });
      return;
    }
    setDoneId(po.id);
    const deviations = lines.filter((l) => l.ordered > 0 && l.qty !== l.ordered).length;
    push({
      title: "Penerimaan dikonfirmasi",
      desc:
        deviations > 0
          ? `${lines.length} item masuk stok aktif · ${deviations} item berbeda dari jumlah pesanan (tercatat di audit).`
          : `${lines.length} item masuk stok aktif sesuai pesanan · tercatat di Log Audit.`,
      tone: "success",
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {/* Antrian kedatangan */}
      <Card className="h-fit xl:sticky xl:top-20">
        <CardTitle
          title="Antrian Kedatangan"
          desc={`${incoming.length} pengiriman menunggu verifikasi`}
          action={
            <Btn tone="soft" icon={ScanLine} className="h-8 px-2.5" onClick={() => setScanOpen(true)}>
              Pindai
            </Btn>
          }
        />
        <div className="flex flex-col gap-2">
          {incoming.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setDoneId(null);
                setSelId(p.id);
              }}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                po?.id === p.id
                  ? "border-primary bg-primary-fixed/40"
                  : "border-surface-container-high bg-surface-container-low hover:bg-surface-container"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-data-mono-sm font-semibold text-primary">{p.po}</span>
                <span className="font-sans text-caption font-normal text-on-surface-variant">{p.eta}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-sans text-body-sm text-on-surface-variant">
                <Truck className="h-3.5 w-3.5" />
                {vendorOf(p.vendorId)?.name}
              </div>
            </button>
          ))}
          {incoming.length === 0 && (
            <Empty title="Tidak ada pengiriman" desc={'Ubah status PO menjadi "Dikirim" di menu PO & E-Katalog.'} icon={Package} />
          )}
        </div>
      </Card>

      {/* Panel verifikasi */}
      <div className="flex flex-col gap-4 xl:col-span-2">
        {donePO && (
          <Card className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <CheckCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="font-sans text-title-sm text-on-surface">{donePO.po} selesai diverifikasi</div>
              <p className="mt-1 font-sans text-body-sm text-on-surface-variant">
                Seluruh item telah masuk stok aktif dan tercatat di Log Audit KARS.
              </p>
            </div>
            <Btn
              tone="soft"
              icon={Package}
              disabled={incoming.length === 0}
              onClick={() => {
                setDoneId(null);
                setSelId(incoming[0]?.id ?? "");
              }}
            >
              Verifikasi Pengiriman Berikutnya ({incoming.length})
            </Btn>
          </Card>
        )}

        {po && (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans text-title-sm text-on-surface">Verifikasi {po.po}</span>
                    <Badge tone="info">Penerimaan Aktual</Badge>
                  </div>
                  <p className="mt-0.5 font-sans text-body-sm text-on-surface-variant">
                    {vendor?.name} · {po.method} · nilai pesanan {fmtIDR(po.value)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-surface-container-low px-2.5 py-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="font-sans text-caption font-normal text-on-surface-variant">Sesi Aktif</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-surface-container-low p-3">
              <Field label="Nomor Surat Jalan / Faktur Vendor (dapat diedit)">
                <input
                  className={cn(inputCls, "font-mono text-data-mono-md")}
                  value={sj}
                  onChange={(e) => setSj(e.target.value)}
                  placeholder="cth. SJ-2025/KFL/0981"
                />
              </Field>
            </div>

            {/* Checklist */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-sans text-title-sm text-on-surface">Pemeriksaan Kelayakan</span>
                <span className={cn("font-sans text-caption font-semibold", allChecked ? "text-primary" : "text-error")}>
                  {doneCount}/{CHECKS.length} terpenuhi
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CHECKS.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg p-2.5 transition-colors",
                      checks[c.id] ? "bg-surface-container-low hover:bg-surface-container" : "bg-error-container/40 hover:bg-error-container/60"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={!!checks[c.id]}
                      onChange={() => setChecks((s) => ({ ...s, [c.id]: !s[c.id] }))}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span>
                      <span className="block font-sans text-body-md font-medium text-on-surface">{c.title}</span>
                      <span className="block font-sans text-caption font-normal text-on-surface-variant">{c.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rincian item — dapat diedit */}
            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-sans text-title-sm text-on-surface">
                  <PenLine className="h-4 w-4 text-primary" />
                  Item Diterima — sesuaikan dengan kondisi aktual
                </span>
                <Btn tone="soft" icon={Plus} className="h-8 px-2.5" onClick={addLine}>
                  Tambah Item
                </Btn>
              </div>
              <div className="overflow-x-auto rounded-lg ring-1 ring-surface-container">
                <table className={tableCls}>
                  <thead className={theadCls}>
                    <tr>
                      <th className={thCls}>Item (dapat diganti)</th>
                      <th className={cn(thCls, "text-center")}>Dipesan</th>
                      <th className={cn(thCls, "text-center")}>Diterima</th>
                      <th className={thCls}>No. Lot / Batch</th>
                      <th className={thCls}>Kedaluwarsa</th>
                      <th className={thCls}>Selisih</th>
                      <th className={thCls} aria-label="Hapus" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => {
                      const item = itemOf(l.itemId);
                      const noOrderRef = l.ordered === 0;
                      const diff = noOrderRef ? 0 : l.qty - l.ordered;
                      return (
                        <tr key={l.key} className={trCls}>
                          <td className={cn(tdCls, "min-w-52")}>
                            <select
                              className={cn(inputCls, "h-8 text-body-sm")}
                              value={l.itemId}
                              onChange={(e) => {
                                const itemId = e.target.value;
                                const ordered = po.lines.find((o) => o.itemId === itemId)?.qty ?? 0;
                                setLine(l.key, { itemId, ordered });
                              }}
                            >
                              {state.items.map((i) => (
                                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                              ))}
                            </select>
                          </td>
                          <td className={cn(tdCls, "text-center font-mono text-data-mono-sm text-on-surface-variant")}>
                            {noOrderRef ? "—" : `${l.ordered} ${item?.unit ?? ""}`}
                          </td>
                          <td className={cn(tdCls, "w-24 text-center")}>
                            <input
                              type="number" min={1}
                              className={cn(inputCls, "h-8 w-20 text-center font-mono text-data-mono-sm")}
                              value={l.qty}
                              onChange={(e) => setLine(l.key, { qty: Math.max(1, +e.target.value || 1) })}
                            />
                          </td>
                          <td className={cn(tdCls, "min-w-36")}>
                            <input
                              className={cn(inputCls, "h-8 font-mono text-data-mono-sm", !l.lot.trim() && "ring-1 ring-error/50")}
                              value={l.lot}
                              onChange={(e) => setLine(l.key, { lot: e.target.value })}
                              placeholder="#LOT-XXXX"
                            />
                          </td>
                          <td className={cn(tdCls, "min-w-36")}>
                            <input
                              type="date"
                              className={cn(inputCls, "h-8 font-mono text-data-mono-sm")}
                              value={l.expired}
                              onChange={(e) => setLine(l.key, { expired: e.target.value })}
                            />
                          </td>
                          <td className={tdCls}>
                            {noOrderRef ? (
                              <Badge tone="neutral">Di luar PO</Badge>
                            ) : diff === 0 ? (
                              <Badge tone="ok">Sesuai</Badge>
                            ) : diff < 0 ? (
                              <Badge tone="danger">Kurang {Math.abs(diff)}</Badge>
                            ) : (
                              <Badge tone="warn">Lebih +{diff}</Badge>
                            )}
                          </td>
                          <td className={cn(tdCls, "text-right")}>
                            <button
                              type="button"
                              title="Hapus baris"
                              onClick={() => removeLine(l.key)}
                              className="rounded-lg p-1.5 text-outline transition-colors hover:bg-error-container hover:text-on-error-container"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {lines.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          <Empty title="Belum ada item" desc="Klik Tambah Item untuk mencatat reagen/BMHP yang datang." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 flex items-center gap-1.5 font-sans text-caption font-normal text-on-surface-variant">
                <CircleAlert className="h-3.5 w-3.5 text-tertiary" />
                Kiriman sering tidak sama jumlahnya dengan pesanan — kolom Diterima dapat diubah; selisih otomatis
                tercatat di berita acara audit.
              </p>
            </div>

            {/* CTA */}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Btn icon={Boxes} disabled={!allChecked || lines.length === 0} className="h-11 flex-1" onClick={submit}>
                Konfirmasi Penerimaan ({lines.length} item)
              </Btn>
              <Btn
                tone="danger"
                icon={Ban}
                className="h-11"
                onClick={() =>
                  push({ title: "Formulir retur dibuka", desc: `Pengembalian untuk ${vendor?.name} disiapkan.`, tone: "danger" })
                }
              >
                Retur / Tolak
              </Btn>
            </div>
            {!allChecked && (
              <p className="mt-2 text-center font-sans text-caption font-normal text-error">
                Lengkapi seluruh standar kelayakan sebelum rilis stok.
              </p>
            )}
          </Card>
        )}

        {/* Riwayat penerimaan */}
        <Card>
          <CardTitle title="PO Diterima" desc="Pengadaan yang sudah diverifikasi gudang" />
          <div className="flex flex-col divide-y divide-surface-container">
            {state.pos.filter((p) => p.status === "Diterima").map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="font-mono text-data-mono-sm font-semibold text-primary">{p.po}</div>
                  <div className="truncate font-sans text-caption font-normal text-on-surface-variant">{vendorOf(p.vendorId)?.name}</div>
                </div>
                <Badge tone="ok"><CheckCheck className="h-3 w-3" /> Diterima</Badge>
              </div>
            ))}
            {state.pos.filter((p) => p.status === "Diterima").length === 0 && (
              <p className="py-4 text-center font-sans text-body-sm text-on-surface-variant">Belum ada penerimaan pada periode ini.</p>
            )}
          </div>
        </Card>
      </div>

      {scanOpen && <QRScannerModal onClose={() => setScanOpen(false)} onOpen={openScanHit} />}
    </div>
  );
}
