import { useEffect, useState } from "react";
import { Bell, CalendarX, Inbox, Menu, ScanBarcode, Thermometer, TriangleAlert, User } from "lucide-react";
import { PAGE_META } from "../data/labstock";
import { useAlerts } from "../store/store";
import { useToast } from "./Toast";
import { cn } from "../utils/cn";

const TONE_ICON = { danger: TriangleAlert, warn: CalendarX, info: Inbox };
const TONE_TILE = {
  danger: "bg-error text-on-error",
  warn: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  info: "bg-secondary-container text-on-secondary-fixed-variant",
};

export default function TopBar({
  onMenu, path, navigate,
}: { onMenu: () => void; path: string; navigate: (p: string) => void }) {
  const push = useToast();
  const alerts = useAlerts();
  const [notifOpen, setNotifOpen] = useState(false);
  const [read, setRead] = useState(false);
  const [temp, setTemp] = useState(4.2);

  useEffect(() => {
    const t = window.setInterval(() => setTemp(+(4 + Math.random() * 0.5).toFixed(1)), 4000);
    return () => window.clearInterval(t);
  }, []);

  const unread = read ? 0 : alerts.length;
  const meta = PAGE_META[path];

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between gap-3 bg-surface-container-lowest/90 px-4 shadow-card backdrop-blur-md lg:left-64 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenu}
          className="shrink-0 rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface lg:hidden"
          aria-label="Buka menu navigasi"
          type="button"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden min-w-0 flex-col md:flex">
          <span className="truncate font-sans text-title-sm text-on-surface">{meta?.title ?? "Labstock"}</span>
          <span className="font-sans text-caption font-normal text-on-surface-variant">RSUD SMJ 1 · Gudang Farmasi-Lab</span>
        </div>
        <div className="ml-2 hidden shrink-0 items-center gap-2 rounded-full bg-surface-container-low px-2.5 py-1 xl:flex">
          <Thermometer className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />
          <span className="font-mono text-data-mono-sm font-semibold text-primary">{temp.toFixed(1)}°C</span>
          <span className="font-sans text-caption font-normal text-on-surface-variant">Cold-chain aman</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          title="Pindai Barcode/QR — ke Pelacakan Batch"
          onClick={() => {
            navigate("pelacakan-batch-lot");
            push({ title: "Mode pindai aktif", desc: "Masukkan atau pindai nomor lot pada kolom pencarian.", tone: "info" });
          }}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 font-sans text-title-sm text-on-primary shadow-sm transition-colors hover:bg-primary-container"
        >
          <ScanBarcode className="h-4 w-4" />
          <span className="hidden sm:inline">Pindai QR</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((v) => !v);
              setRead(false);
            }}
            title="Peringatan aktif"
            className={cn(
              "relative rounded-lg p-2 transition-colors",
              notifOpen ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            )}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-error font-sans text-badge-label text-on-error">
                {unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <button aria-label="Tutup notifikasi" className="fixed inset-0 z-40 cursor-default" onClick={() => setNotifOpen(false)} type="button" />
              <div className="absolute right-0 top-11 z-50 w-[min(92vw,340px)] animate-toast-in overflow-hidden rounded-xl bg-surface-container-lowest shadow-pop ring-1 ring-on-surface/5">
                <div className="flex items-center justify-between bg-surface-container-low px-4 py-2.5">
                  <span className="font-sans text-title-sm text-on-surface">Peringatan Aktif</span>
                  <span className="rounded-full bg-error px-1.5 py-0.5 font-sans text-badge-label text-on-error">
                    {alerts.length}
                  </span>
                </div>
                <div className="flex max-h-80 flex-col divide-y divide-surface-container overflow-y-auto">
                  {alerts.map((a) => {
                    const Icon = TONE_ICON[a.tone];
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate(a.path);
                        }}
                        className="flex items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-container-low"
                      >
                        <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", TONE_TILE[a.tone])}>
                          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </span>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="font-sans text-body-sm font-medium text-on-surface">{a.title}</span>
                          <span className="font-sans text-caption font-normal text-on-surface-variant">{a.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                  {alerts.length === 0 && (
                    <div className="px-4 py-6 text-center font-sans text-body-sm text-on-surface-variant">
                      Tidak ada peringatan. Semua indikator aman.
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRead(true);
                    setNotifOpen(false);
                  }}
                  className="w-full bg-surface-container-lowest py-2 font-sans text-caption font-semibold text-primary transition-colors hover:bg-surface-container-low"
                >
                  Tandai Semua Dibaca
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 pl-1">
          <div className="hidden min-w-0 flex-col items-end md:flex">
            <span className="truncate font-sans text-title-sm leading-tight text-on-surface">dr. Ratna Dewi, Sp.PK</span>
            <span className="truncate font-sans text-caption text-on-surface-variant">Kepala Lab / Super Admin</span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-sm">
            <User className="h-[18px] w-[18px] text-on-primary" />
          </div>
        </div>
      </div>
    </header>
  );
}
