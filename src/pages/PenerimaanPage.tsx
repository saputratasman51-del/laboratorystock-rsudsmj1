import { useState } from "react";
import { BadgeCheck, Boxes, Ban, CheckCheck, Truck, ReceiptText, Thermometer, Package, Snowflake, ScanLine } from "lucide-react";
import { Card, CardTitle, Badge, Btn, Empty, thCls, tdCls, tableCls, theadCls, trCls } from "../components/ui";
import { useStore, daysFromNow, fmtDate, fmtIDR } from "../store/store";
import { useToast } from "../components/Toast";
import QRScannerModal from "../components/QRScannerModal";
import type { ScanHit } from "../utils/scan";
import { cn } from "../utils/cn";

const CHECKS = [
  { id: "seal", title: "Integritas Fisik & Segel", desc: "Kemasan utuh, tidak bocor, segel pabrik valid." },
  { id: "temp", title: "Suhu Kedatangan Sesuai (2–8°C)", desc: "Datalogger terverifikasi, ice gel masih dingin." },
  { id: "fefo", title: "Kepatuhan FEFO > 18 Bulan", desc: "Masa simpan memenuhi standar akreditasi KARS." },
  { id: "coa", title: "CoA & MSDS Terlampir", desc: "Sertifikat analisis batch pabrikan otentik." },
];

export default function PenerimaanPage() {
  const { state, itemOf, vendorOf, confirmReceipt } = useStore();
  const push = useToast();

  const incoming = state.pos.filter((p) => p.status === "Dikirim");
  const [selId, setSelId] = useState<string>(incoming[0]?.id ?? "");
  const [checks, setChecks] = useState<Record<string, boolean>>(Object.fromEntries(CHECKS.map((c) => [c.id, true])));
  const [doneId, setDoneId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

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

  const activeId = doneId ? "" : incoming.find((p) => p.id === selId)?.id ?? incoming[0]?.id ?? "";
  const po = incoming.find((p) => p.id === activeId);
  const donePO = doneId ? state.pos.find((p) => p.id === doneId) : null;
  const vendor = po ? vendorOf(po.vendorId) : undefined;
  const doneCount = CHECKS.filter((c) => checks[c.id]).length;
  const allChecked = doneCount === CHECKS.length;
  const hasLines = !!po?.receiptLines?.length;

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
                setSelId(p.id);
                setDoneId(null);
              }}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                (po?.id === p.id)
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
                Seluruh batch telah masuk stok aktif dan tercatat di Log Audit KARS.
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
                    <Badge tone="info">FEFO Gatekeeper</Badge>
                  </div>
                  <p className="mt-0.5 font-sans text-body-sm text-on-surface-variant">
                    {vendor?.name} · {po.method} · {fmtIDR(po.value)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-surface-container-low px-2.5 py-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="font-sans text-caption font-normal text-on-surface-variant">Sesi Aktif</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-surface-container-low p-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg bg-surface-container-lowest px-3 py-2">
                <ReceiptText className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="font-sans text-caption font-normal text-on-surface-variant">Surat Jalan</div>
                  <div className="truncate font-mono text-data-mono-sm font-semibold text-on-surface">
                    SJ-{po.po.split("/").pop()}-{po.vendorId}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-surface-container-lowest px-3 py-2">
                <Thermometer className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="font-sans text-caption font-normal text-on-surface-variant">Suhu Kedatangan</div>
                  <div className="flex items-center gap-1.5 font-mono text-data-mono-sm font-semibold text-primary">
                    4.5°C <Snowflake className="h-3 w-3" /> <span className="font-sans font-normal text-on-surface-variant">Stabil</span>
                  </div>
                </div>
              </div>
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

            {/* Rincian item */}
            <div className="mt-4">
              <div className="mb-2 font-sans text-title-sm text-on-surface">Rincian Item &amp; Lot</div>
              {hasLines ? (
                <div className="overflow-x-auto rounded-lg ring-1 ring-surface-container">
                  <table className={tableCls}>
                    <thead className={theadCls}>
                      <tr>
                        <th className={thCls}>Item</th>
                        <th className={thCls}>Qty Diterima</th>
                        <th className={thCls}>Lot / Batch</th>
                        <th className={thCls}>Est. Kedaluwarsa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.receiptLines!.map((l, i) => (
                        <tr key={i} className={trCls}>
                          <td className={cn(tdCls, "font-medium")}>{itemOf(l.itemId)?.name}</td>
                          <td className={cn(tdCls, "font-mono text-data-mono-sm")}>{l.qty} {itemOf(l.itemId)?.unit}</td>
                          <td className={tdCls}>
                            <span className="rounded-md bg-surface-container-low px-1.5 py-0.5 font-mono text-data-mono-sm font-semibold text-tertiary">{l.lot}</span>
                          </td>
                          <td className={cn(tdCls, "whitespace-nowrap")}>{fmtDate(daysFromNow(l.days))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg bg-surface-container-low p-3 font-sans text-body-sm text-on-surface-variant">
                  Rincian lot belum tersedia untuk PO ini ({po.lines.map((l) => `${itemOf(l.itemId)?.name} × ${l.qty}`).join(", ")}).
                  Minta vendor melengkapi dokumen CoA sebelum konfirmasi.
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Btn
                  icon={Boxes}
                  disabled={!allChecked || !hasLines}
                  className="h-11 flex-1"
                  onClick={() => {
                    confirmReceipt(po.id);
                    setDoneId(po.id);
                    push({
                      title: "Penerimaan dikonfirmasi",
                      desc: `${po.po}: ${po.receiptLines!.length} batch masuk stok aktif · tercatat di Log Audit.`,
                      tone: "success",
                    });
                  }}
                >
                  Konfirmasi &amp; Masukkan ke Stok
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
            {(!allChecked && hasLines) && (
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
