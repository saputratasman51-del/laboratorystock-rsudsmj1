import { useMemo, useState } from "react";
import { Search, Download, ShieldCheck, User, Clock } from "lucide-react";
import { Card, CardTitle, Badge, Btn, inputCls, Empty, thCls, tdCls, tableCls, theadCls, trCls } from "../components/ui";
import { useStore } from "../store/store";
import { useToast } from "../components/Toast";
import { cn } from "../utils/cn";

const MODULE_TONE: Record<string, "ok" | "info" | "warn" | "neutral" | "danger"> = {
  "Penerimaan": "ok", "Pengadaan": "info", "Pemakaian": "warn", "Inventaris": "neutral",
  "Permintaan": "warn", "Monitoring": "info", "Kepatuhan": "danger",
};

export default function AuditPage() {
  const { state } = useStore();
  const push = useToast();
  const [mod, setMod] = useState("Semua");
  const [q, setQ] = useState("");

  const modules = useMemo(() => ["Semua", ...Array.from(new Set(state.audit.map((a) => a.module)))], [state.audit]);

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return state.audit.filter(
      (a) =>
        (mod === "Semua" || a.module === mod) &&
        (!k || a.action.toLowerCase().includes(k) || a.detail.toLowerCase().includes(k) || a.actor.toLowerCase().includes(k))
    );
  }, [state.audit, mod, q]);

  const exportCSV = () => {
    const header = "Waktu;Petugas;Modul;Aksi;Detail\n";
    const body = rows.map((a) => `${a.at};${a.actor};${a.module};${a.action};"${a.detail.split('"').join('""')}"`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `log-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    el.click();
    URL.revokeObjectURL(url);
    push({ title: "Log audit diekspor", desc: `${rows.length} entri siap untuk asesor KARS / ISO 15189.`, tone: "success" });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-outline" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari aksi, detail, atau petugas..." className={cn(inputCls, "pl-9")} />
          </div>
          <select value={mod} onChange={(e) => setMod(e.target.value)} className={cn(inputCls, "md:w-48")}>
            {modules.map((m) => <option key={m}>{m}</option>)}
          </select>
          <Btn tone="soft" icon={Download} onClick={exportCSV}>Ekspor CSV</Btn>
        </div>
      </Card>

      <Card>
        <CardTitle
          title="Jejak Audit Terekam Otomatis"
          desc={`${rows.length} entri — tidak dapat diubah/dihapus (immutable)`}
          action={<Badge tone="ok"><ShieldCheck className="h-3 w-3" /> KARS & ISO 15189</Badge>}
        />
        <div className="overflow-x-auto rounded-lg ring-1 ring-surface-container">
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Waktu</th>
                <th className={thCls}>Petugas</th>
                <th className={thCls}>Modul</th>
                <th className={thCls}>Aksi</th>
                <th className={thCls}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className={trCls}>
                  <td className={cn(tdCls, "whitespace-nowrap")}>
                    <span className="flex items-center gap-1.5 font-mono text-data-mono-sm text-on-surface-variant">
                      <Clock className="h-3.5 w-3.5" />{a.at}
                    </span>
                  </td>
                  <td className={cn(tdCls, "whitespace-nowrap")}>
                    <span className="flex items-center gap-1.5 text-on-surface-variant">
                      <User className="h-3.5 w-3.5" />{a.actor}
                    </span>
                  </td>
                  <td className={tdCls}><Badge tone={MODULE_TONE[a.module] ?? "neutral"}>{a.module}</Badge></td>
                  <td className={cn(tdCls, "whitespace-nowrap font-medium")}>{a.action}</td>
                  <td className={cn(tdCls, "min-w-72 text-on-surface-variant")}>{a.detail}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5}><Empty title="Tidak ada entri" desc="Coba ubah kata kunci atau modul." icon={ShieldCheck} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
