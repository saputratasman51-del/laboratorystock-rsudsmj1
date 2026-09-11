import type { ButtonHTMLAttributes, ReactNode } from "react";
import { X, PackageSearch, type LucideIcon } from "lucide-react";
import { cn } from "../utils/cn";

/* ── Kartu ───────────────────────────────────────────────────────────────── */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl bg-surface-container-lowest p-4 shadow-card ring-1 ring-on-surface/[0.04] md:p-5", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-sans text-title-sm text-on-surface">{title}</h3>
        {desc && <p className="mt-0.5 font-sans text-body-sm text-on-surface-variant">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Tombol ──────────────────────────────────────────────────────────────── */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "soft" | "ghost" | "danger";
  icon?: LucideIcon;
};
const BTN_TONES = {
  primary: "bg-primary text-on-primary shadow-sm hover:bg-primary-container",
  soft: "bg-surface-container-high text-on-surface hover:bg-surface-container-highest",
  ghost: "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
  danger: "bg-error-container text-on-error-container hover:bg-error hover:text-on-error",
};
export function Btn({ tone = "primary", icon: Icon, className, children, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 font-sans text-title-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        BTN_TONES[tone],
        className
      )}
      {...rest}
    >
      {Icon && <Icon className="h-4 w-4" strokeWidth={2.1} />}
      {children}
    </button>
  );
}

/* ── Badge ───────────────────────────────────────────────────────────────── */
export type BadgeTone = "ok" | "warn" | "danger" | "neutral" | "info";
const BADGE_TONES: Record<BadgeTone, string> = {
  ok: "bg-primary-fixed text-on-primary-fixed",
  warn: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  danger: "bg-error-container text-on-error-container",
  neutral: "bg-surface-container-high text-on-surface-variant",
  info: "bg-secondary-container text-on-secondary-fixed-variant",
};
export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-sans text-badge-label", BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

/* ── Form ────────────────────────────────────────────────────────────────── */
export const inputCls =
  "h-9 w-full rounded-lg bg-surface-container-low px-3 font-sans text-body-md text-on-surface transition placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="font-sans text-caption font-semibold uppercase tracking-wide text-on-surface-variant">{label}</label>
      {children}
    </div>
  );
}

/* ── Statistik ───────────────────────────────────────────────────────────── */
export function Stat({
  icon: Icon, label, value, sub, tile = "bg-primary-fixed text-primary",
}: { icon: LucideIcon; label: string; value: string; sub?: ReactNode; tile?: string }) {
  return (
    <Card className="flex items-center gap-3.5 p-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tile)}>
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </div>
      <div className="min-w-0">
        <div className="font-sans text-caption font-semibold uppercase tracking-wide text-on-surface-variant">{label}</div>
        <div className="font-sans text-headline-md font-bold text-on-surface">{value}</div>
        {sub && <div className="mt-0.5 font-sans text-caption font-normal text-on-surface-variant">{sub}</div>}
      </div>
    </Card>
  );
}

/* ── Grafik garis mini ───────────────────────────────────────────────────── */
export function Spark({
  data, w = 140, h = 40, stroke = "#0f766e", fill = true,
}: { data: number[]; w?: number; h?: number; stroke?: string; fill?: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h }} className="overflow-visible" aria-hidden="true">
      {fill && <path d={`${line} L${w},${h} L0,${h} Z`} fill={stroke} opacity="0.12" />}
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={stroke} stroke="#fff" strokeWidth="1.2" />
    </svg>
  );
}

/* ── Grafik batang ───────────────────────────────────────────────────────── */
export function Bars({
  data, h = 120, color = "#0f766e",
}: { data: { label: string; value: number }[]; h?: number; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height: h + 24 }}>
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
          <span className="font-mono text-[10px] text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100">
            {d.value}
          </span>
          <div
            className="w-full max-w-9 rounded-t-md transition-all duration-500 group-hover:opacity-85"
            style={{ height: `${(d.value / max) * h}px`, backgroundColor: color }}
          />
          <span className="font-sans text-[10px] font-medium text-on-surface-variant">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center">
      <button aria-label="Tutup" className="absolute inset-0 cursor-default bg-on-background/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn("relative max-h-[88vh] w-full animate-toast-in overflow-y-auto rounded-xl bg-surface-container-lowest p-5 shadow-pop", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-sans text-headline-md text-on-surface">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface" type="button">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Status kosong ───────────────────────────────────────────────────────── */
export function Empty({ title, desc, icon: Icon = PackageSearch }: { title: string; desc?: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
      <Icon className="h-8 w-8 text-outline-variant" strokeWidth={1.5} />
      <span className="font-sans text-title-sm text-on-surface">{title}</span>
      {desc && <span className="max-w-xs font-sans text-caption font-normal text-on-surface-variant">{desc}</span>}
    </div>
  );
}

/* ── Tabel ───────────────────────────────────────────────────────────────── */
export const thCls = "px-3 py-2 text-left font-sans text-caption font-semibold uppercase tracking-wide text-on-surface-variant";
export const tdCls = "px-3 py-2.5 align-middle font-sans text-body-md text-on-surface";
export const tableCls = "w-full min-w-max text-left";
export const theadCls = "bg-surface-container-low";
export const trCls = "border-t border-surface-container transition-colors hover:bg-surface-container-low";

/* ── Konfirmasi hapus dua langkah (klik pertama mempersenjatai, klik kedua mengeksekusi) ── */
import { useRef, useState } from "react";
export function useArmable(timeout = 2800) {
  const [armed, setArmed] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const arm = (id: string) => {
    setArmed(id);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setArmed(null), timeout);
  };
  const disarm = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setArmed(null);
  };
  return { armed, arm, disarm };
}
