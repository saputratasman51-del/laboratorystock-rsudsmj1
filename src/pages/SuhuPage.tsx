import { useMemo, useState } from "react";
import { Plus, Thermometer, Snowflake } from "lucide-react";
import { Card, CardTitle, Badge, Btn, Spark, Field, inputCls, thCls, tdCls, tableCls, theadCls, trCls, Empty } from "../components/ui";
import { useStore } from "../store/store";
import { useToast } from "../components/Toast";
import { cn } from "../utils/cn";

const DEVICES = [
  { name: "Chiller A", base: 4.2, range: "2 – 8°C", ok: (t: number) => t >= 2 && t <= 8 },
  { name: "Chiller B", base: 3.8, range: "2 – 8°C", ok: (t: number) => t >= 2 && t <= 8 },
  { name: "Freezer -20°C", base: -19.8, range: "-25 – -15°C", ok: (t: number) => t >= -25 && t <= -15 },
];

export default function SuhuPage() {
  const { state, addTemp } = useStore();
  const push = useToast();
  const [filter, setFilter] = useState("Semua");

  const logs = useMemo(
    () => state.temps.filter((t) => filter === "Semua" || t.device === filter).slice(0, 12),
    [state.temps, filter]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {DEVICES.map((d) => {
          const deviceLogs = state.temps.filter((t) => t.device === d.name);
          const last = deviceLogs[0];
          const safe = last ? d.ok(last.value) : true;
          const vals = [...deviceLogs].slice(0, 12).reverse().map((t) => t.value);
          return (
            <Card key={d.name} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", safe ? "bg-primary-fixed text-primary" : "bg-error-container text-error")}>
                    {d.name.startsWith("Freezer") ? <Snowflake className="h-4 w-4" /> : <Thermometer className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-sans text-title-sm text-on-surface">{d.name}</div>
                    <div className="font-sans text-caption font-normal text-on-surface-variant">Rentang {d.range}</div>
                  </div>
                </div>
                <Badge tone={safe ? "ok" : "danger"}>{safe ? "Aman" : "Di Luar Rentang"}</Badge>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <span className={cn("font-mono text-[28px] font-bold leading-none", safe ? "text-on-surface" : "text-error")}>
                    {last?.value.toFixed(1)}°C
                  </span>
                  <div className="mt-1 font-sans text-caption font-normal text-on-surface-variant">
                    Update {last?.at} · {deviceLogs.length} log
                  </div>
                </div>
                <Spark data={vals.length > 1 ? vals : [0, 0]} w={110} h={40} stroke={safe ? "#0f766e" : "#ba1a1a"} />
              </div>
              <Btn
                tone="soft"
                icon={Plus}
                onClick={() => {
                  const v = +(d.base + (Math.random() - 0.4) * 0.6).toFixed(1);
                  addTemp(d.name, v);
                  push(
                    d.ok(v)
                      ? { title: `${d.name}: ${v.toFixed(1)}°C tercatat`, desc: "Pembacaan manual masuk log audit.", tone: "success" }
                      : { title: `Peringatan suhu ${d.name}!`, desc: `${v.toFixed(1)}°C di luar rentang aman — cek unit segera.`, tone: "danger" }
                  );
                }}
                className="w-full"
              >
                Catat Pembacaan
              </Btn>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardTitle
          title="Riwayat Pembacaan"
          desc="Log suhu tersimpan otomatis untuk audit cold-chain"
          action={
            <Field label="" className="gap-0">
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className={cn(inputCls, "h-8 w-44")}>
                <option>Semua</option>
                {DEVICES.map((d) => <option key={d.name}>{d.name}</option>)}
              </select>
            </Field>
          }
        />
        <div className="overflow-x-auto rounded-lg ring-1 ring-surface-container">
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Waktu</th>
                <th className={thCls}>Perangkat</th>
                <th className={thCls}>Suhu</th>
                <th className={thCls}>Dicatat Oleh</th>
                <th className={thCls}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((t) => {
                const dev = DEVICES.find((d) => d.name === t.device);
                const safe = dev ? dev.ok(t.value) : true;
                return (
                  <tr key={t.id} className={trCls}>
                    <td className={cn(tdCls, "font-mono text-data-mono-sm")}>{t.at}</td>
                    <td className={tdCls}>{t.device}</td>
                    <td className={cn(tdCls, "font-mono text-data-mono-sm font-semibold", safe ? "text-primary" : "text-error")}>
                      {t.value.toFixed(1)}°C
                    </td>
                    <td className={cn(tdCls, "text-on-surface-variant")}>{t.by}</td>
                    <td className={tdCls}><Badge tone={safe ? "ok" : "danger"}>{safe ? "Normal" : "Deviasi"}</Badge></td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr><td colSpan={5}><Empty title="Belum ada log" desc="Catat pembacaan pertama dari kartu perangkat." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
