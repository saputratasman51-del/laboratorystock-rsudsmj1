import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { NAV_SECTIONS, LAB_UNITS } from "../data/labstock";
import { useStore, daysUntil } from "../store/store";
import { useToast } from "./Toast";
import type { NavigateFn } from "../router";
import { cn } from "../utils/cn";

function LogoMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="lg-mark" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f766e" />
          <stop offset="1" stopColor="#005c55" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="9" fill="url(#lg-mark)" />
      <path
        d="M15.5 7h9v4.2h-2.4v5l5.9 10.6A5.4 5.4 0 0 1 23.2 35h-6.4a5.4 5.4 0 0 1-4.8-8.2l5.9-10.6v-5h-2.4V7Z"
        fill="#ffffff"
        opacity="0.95"
      />
      <path d="M13.4 26.5h13.2l1.9 3.4A3.4 3.4 0 0 1 25.4 33H14.6a3.4 3.4 0 0 1-3.1-3.1l1.9-3.4Z" fill="#9cf2e8" />
      <circle cx="30.5" cy="9.5" r="5.5" fill="#ffffff" />
      <path d="M30.5 7v5M28 9.5h5" stroke="#005c55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Sidebar({
  open, onClose, path, navigate,
}: { open: boolean; onClose: () => void; path: string; navigate: NavigateFn }) {
  const [unit, setUnit] = useState("pk");
  const push = useToast();
  const { state } = useStore();

  const fefoCount = state.batches.filter((b) => daysUntil(b.expired) <= 60).length;

  return (
    <>
      <button
        aria-label="Tutup navigasi"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-on-background/35 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col justify-between overflow-y-auto bg-surface-container-lowest shadow-card transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col">
          <div className="flex h-16 items-center gap-2.5 px-4">
            <LogoMark />
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-sans text-title-sm leading-tight text-on-surface">Labstock RSUD SMJ</span>
              <span className="font-sans text-caption uppercase tracking-wider text-on-surface-variant">
                Katalog &amp; Logistik
              </span>
            </div>
            <button
              onClick={onClose}
              className="ml-auto rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-high lg:hidden"
              aria-label="Tutup menu"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex flex-col gap-space-2xs px-2 py-1">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col gap-space-2xs">
                <div className="px-2.5 pb-1 pt-3 font-sans text-caption font-semibold uppercase tracking-wider text-secondary">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.id === path;
                  const showFefo = item.id === "peringatan-fefo-expired" && fefoCount > 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        navigate(item.id);
                        onClose();
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left font-sans text-body-md transition-colors",
                        active
                          ? "bg-primary-container font-medium text-on-primary shadow-sm"
                          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                      <span className="truncate">{item.label}</span>
                      {showFefo && (
                        <span
                          className={cn(
                            "ml-auto flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 font-sans text-[10px] font-bold",
                            active ? "bg-on-primary/20 text-on-primary" : "bg-error text-on-error"
                          )}
                        >
                          {fefoCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 p-4">
          <label htmlFor="unit-lab" className="font-sans text-caption font-semibold uppercase text-on-surface-variant">
            Unit Laboratorium
          </label>
          <div className="relative">
            <select
              id="unit-lab"
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                const label = LAB_UNITS.find((u) => u.value === e.target.value)?.label;
                push({ title: "Unit kerja diubah", desc: `Konteks data kini: ${label}.`, tone: "info" });
              }}
              className="h-8 w-full appearance-none rounded-lg bg-surface-container-low px-2.5 pr-6 font-sans text-body-sm text-on-surface transition-shadow focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {LAB_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-on-surface-variant" />
          </div>
          <div className="flex items-center justify-between pt-1 text-on-surface-variant">
            <span className="font-mono text-data-mono-sm">v2.4 RSUD SMJ</span>
            <span className="flex items-center gap-1 font-sans text-caption text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Tersinkron
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
