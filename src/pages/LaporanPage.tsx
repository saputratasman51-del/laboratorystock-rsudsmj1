import { useMemo, useState } from "react";
import { Download, Wallet, ArrowDownToLine, ArrowUpFromLine, ShoppingBag } from "lucide-react";
import { Card, CardTitle, Badge, Btn, Stat, Bars, inputCls, thCls, tdCls, tableCls, theadCls, trCls, Empty } from "../components/ui";
import { useStore, fmtDate, fmtIDR, fmtIDRShort } from "../store/store";
import { useToast } from "../components/Toast";
import { cn } from "../utils/cn";

const FILTERS = ["Semua", "Masuk", "Keluar"];

export default function LaporanPage() {
  const { state } = useStore();
  const push = useToast();
  const [filter, setFilter] = useState("Semua");

  const mutations = useMemo(() => {
    const masuk = state.batches.map((b) => {
      const it = state.items.find((i) => i.id === b.itemId);
      return { id: "in-" + b.id, date: b.receivedAt, type: "Masuk" as const, ref: b.lot, item: it?.name ?? "-", qty: b.qty, unit: it?.unit ?? "", value: (it?.price ?? 0) * b.qty };
    });
    const keluar = state.usages.map((u) => {
      const it = state.items.find((i) => i.id === u.itemId);
      return { id: "out-" + u.id, date: u.date, type: "Keluar" as const, ref: u.toUnit, item: it?.name ?? "-", qty: u.qty, unit: it?.unit ?? "", value: (it?.price ?? 0) * u.qty };
    });
    return [...masuk, ...keluar]
      .filter((m) => filter === "Semua" || m.type === filter)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 15);
  }, [state.batches, state.usages, state.items, filter]);

  const totalIn = state.batches.reduce((n, b) => n + (state.items.find((i) => i.id === b.itemId)?.price ?? 0) * b.qty, 0);
  const totalOut = state.usages.reduce((n, u) => n + (state.items.find((i) => i.id === u.itemId)?.price ?? 0) * u.qty, 0);
  const stockValue = state.items.reduce((n, i) => n + i.stock * i.price, 0);
  const poActive = state.pos.filter((p) => p.status !== "Diterima").reduce((n, p) => n + p.value, 0);

  const exportCSV = () => {
    const header = "Tanggal;Tipe;Referensi;Item;Qty;Satuan;Nilai (Rp)\n";
    const body = mutations.map((m) => `${m.date};${m.type};${m.ref};${m.item};${m.type === "Keluar" ? "-" : "+"}${m.qty};${m.unit};${m.value}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mutasi-valuasi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    push({ title: "CSV diekspor", desc: `${mutations.length} baris mutasi siap dibuka di spreadsheet.`, tone: "success" });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={Wallet} label="Nilai Persediaan" value={fmtIDRShort(stockValue)} sub="Aktiva lancar farmasi-lab" />
        <Stat icon={ArrowDownToLine} label="Mutasi Masuk" value={fmtIDRShort(totalIn)} sub="Akumulasi penerimaan" tile="bg-primary-fixed text-primary" />
        <Stat icon={ArrowUpFromLine} label="Mutasi Keluar" value={fmtIDRShort(totalOut)} sub="Akumulasi pemakaian" tile="bg-tertiary-fixed text-on-tertiary-fixed-variant" />
        <Stat icon={ShoppingBag} label="PO Berjalan" value={fmtIDRShort(poActive)} sub="Komitmen pengadaan" tile="bg-secondary-container text-on-secondary-fixed-variant" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitle title="Barang Masuk — 6 Bulan" desc="Penerimaan per bulan (Rp Juta)" />
          <Bars h={120} data={[
            { label: "Okt", value: 182 }, { label: "Nov", value: 240 }, { label: "Des", value: 196 },
            { label: "Jan", value: 310 }, { label: "Feb", value: 264 }, { label: "Mar", value: Math.round(totalIn / 1e6) },
          ]} />
        </Card>
        <Card>
          <CardTitle title="Barang Keluar — 6 Bulan" desc="Pemakaian per bulan (Rp Juta)" />
          <Bars h={120} color="#005a6a" data={[
            { label: "Okt", value: 160 }, { label: "Nov", value: 198 }, { label: "Des", value: 188 },
            { label: "Jan", value: 274 }, { label: "Feb", value: 238 }, { label: "Mar", value: Math.max(1, Math.round(totalOut / 1e6)) },
          ]} />
        </Card>
      </div>

      <Card>
        <CardTitle
          title="Jurnal Mutasi"
          desc={`${mutations.length} transaksi terakhir`}
          action={
            <div className="flex items-center gap-2">
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className={cn(inputCls, "h-8 w-32")}>
                {FILTERS.map((f) => <option key={f}>{f}</option>)}
              </select>
              <Btn tone="soft" icon={Download} className="h-8 px-2.5" onClick={exportCSV}>CSV</Btn>
            </div>
          }
        />
        <div className="overflow-x-auto rounded-lg ring-1 ring-surface-container">
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Tanggal</th>
                <th className={thCls}>Tipe</th>
                <th className={thCls}>Referensi</th>
                <th className={thCls}>Item</th>
                <th className={cn(thCls, "text-right")}>Qty</th>
                <th className={cn(thCls, "text-right")}>Nilai</th>
              </tr>
            </thead>
            <tbody>
              {mutations.map((m) => (
                <tr key={m.id} className={trCls}>
                  <td className={cn(tdCls, "whitespace-nowrap text-on-surface-variant")}>{fmtDate(m.date)}</td>
                  <td className={tdCls}><Badge tone={m.type === "Masuk" ? "ok" : "info"}>{m.type}</Badge></td>
                  <td className={cn(tdCls, "font-mono text-data-mono-sm text-on-surface-variant")}>{m.ref}</td>
                  <td className={cn(tdCls, "max-w-56 truncate font-medium")}>{m.item}</td>
                  <td className={cn(tdCls, "text-right font-mono text-data-mono-sm font-semibold", m.type === "Masuk" ? "text-primary" : "text-error")}>
                    {m.type === "Masuk" ? "+" : "-"}{m.qty} {m.unit}
                  </td>
                  <td className={cn(tdCls, "text-right font-mono text-data-mono-sm")}>{fmtIDR(m.value)}</td>
                </tr>
              ))}
              {mutations.length === 0 && (
                <tr><td colSpan={6}><Empty title="Tidak ada mutasi" desc="Belum ada transaksi pada filter ini." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
