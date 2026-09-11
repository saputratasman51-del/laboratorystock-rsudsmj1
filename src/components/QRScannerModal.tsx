import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, SwitchCamera, ScanLine, CircleCheck, Camera, Keyboard, TriangleAlert, RotateCcw, ArrowRight } from "lucide-react";
import { useStore } from "../store/store";
import { resolveScan, type ScanHit } from "../utils/scan";

type Status = "starting" | "scanning" | "success" | "error";

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 920;
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
    osc.onended = () => void ctx.close();
  } catch {
    /* audio tidak tersedia */
  }
}

const mapCameraError = (e: unknown): string => {
  const name = (e as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError")
    return "Izin kamera ditolak. Aktifkan akses kamera pada pengaturan browser, lalu coba lagi.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError")
    return "Tidak ada kamera yang terdeteksi pada perangkat ini.";
  if (name === "NotReadableError" || name === "TrackStartError")
    return "Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.";
  if (name === "NotSupportedError" || window.location.protocol === "http:")
    return "Kamera butuh koneksi aman (HTTPS) atau localhost.";
  return "Kamera gagal diakses. Gunakan input manual di bawah.";
};

export default function QRScannerModal({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (hit: ScanHit) => void;
}) {
  const { state } = useStore();
  const [status, setStatus] = useState<Status>("starting");
  const [errMsg, setErrMsg] = useState("");
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [camId, setCamId] = useState<string | null>(null);
  const [hit, setHit] = useState<ScanHit | null>(null);
  const [rawCode, setRawCode] = useState("");
  const [manual, setManual] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lockedRef = useRef(false);

  /* Daftar kamera sekali */
  useEffect(() => {
    let alive = true;
    Html5Qrcode.getCameras()
      .then((cams) => {
        if (!alive || cams.length === 0) return;
        const back = cams.find((c) => /back|rear|environment|belakang/i.test(c.label));
        setCameras(cams);
        setCamId((prev) => prev ?? (back ?? cams[0]).id);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /* Jalankan/hentikan kamera saat camId berubah */
  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      setStatus((s) => (lockedRef.current ? s : "starting"));
      try {
        const scanner = new Html5Qrcode("qr-reader", { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          camId ?? { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (w, h) => {
              const size = Math.floor(Math.min(w, h) * 0.72);
              return { width: size, height: size };
            },
            aspectRatio: 1,
          },
          (decoded) => {
            if (!cancelled) handleDecoded(decoded);
          },
          () => {}
        );
        if (!cancelled && !lockedRef.current) setStatus("scanning");
      } catch (e) {
        if (!cancelled) {
          setErrMsg(mapCameraError(e));
          setStatus("error");
        }
      }
    };
    void start();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        void s.stop().catch(() => {}).then(() => s.clear());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camId]);

  const handleDecodedNow = (text: string) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    beep();
    navigator.vibrate?.(60);
    const h = resolveScan(text, state);
    setRawCode(text);
    setHit(h);
    setStatus("success");
    try {
      scannerRef.current?.pause(true);
    } catch {}
  };
  const handleDecoded = useCallback((text: string) => handleDecodedRef.current(text), []);
  const handleDecodedRef = useRef(handleDecodedNow);
  handleDecodedRef.current = handleDecodedNow;

  const rescan = () => {
    lockedRef.current = false;
    setHit(null);
    setRawCode("");
    try {
      scannerRef.current?.resume();
    } catch {}
    if (scannerRef.current) setStatus("scanning");
    else setStatus("starting");
  };

  const submitManual = () => {
    const t = manual.trim();
    if (!t) return;
    beep();
    navigator.vibrate?.(60);
    const h = resolveScan(t, state);
    setRawCode(t);
    setHit(h);
    setStatus("success");
    lockedRef.current = true;
    try {
      scannerRef.current?.pause(true);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-on-background/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative flex max-h-[96vh] w-full animate-toast-in flex-col overflow-y-auto rounded-t-2xl bg-surface-container-lowest shadow-pop ring-1 ring-on-surface/10 sm:max-w-md sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-primary px-4 py-3 text-on-primary">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            <div>
              <div className="font-sans text-title-sm">Pindai QR / Barcode</div>
              <div className="font-sans text-caption font-normal text-on-primary/75">Lot, SKU item, atau nomor PO/surat jalan</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pemindai"
            className="rounded-lg p-1.5 transition-colors hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport kamera */}
        <div className="p-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#0b1c30]">
            <div id="qr-reader" className="absolute inset-0" />

            {(status === "starting" || status === "scanning") && (
              <>
                {/* Bingkai sudut */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[72%] -translate-x-1/2 -translate-y-1/2">
                  <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-[#4cd7f6]" />
                  <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-[#4cd7f6]" />
                  <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-[#4cd7f6]" />
                  <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-[#4cd7f6]" />
                  {status === "scanning" && (
                    <span className="animate-qr-radar absolute left-2 right-2 h-0.5 rounded-full bg-[#4cd7f6] shadow-[0_0_14px_rgba(76,215,246,0.9)]" />
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-3 flex justify-center">
                  <span className="rounded-full bg-black/60 px-3 py-1 font-sans text-caption font-semibold text-white backdrop-blur-sm">
                    {status === "starting" ? "Menyalakan kamera..." : "Arahkan kode ke dalam bingkai"}
                  </span>
                </div>
              </>
            )}

            {status === "success" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-primary/90 p-6 text-center text-on-primary">
                <CircleCheck className="h-12 w-12" strokeWidth={1.6} />
                <div className="font-sans text-title-sm">Kode terbaca</div>
                <div className="max-w-full truncate rounded-lg bg-black/20 px-3 py-1 font-mono text-data-mono-md font-semibold">
                  {rawCode}
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                <Camera className="h-10 w-10 text-white/40" strokeWidth={1.5} />
                <span className="font-sans text-body-sm text-white/80">Kamera tidak aktif</span>
              </div>
            )}
          </div>

          {/* Kontrol kamera */}
          {cameras.length > 1 && status !== "success" && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  lockedRef.current = false;
                  const idx = cameras.findIndex((c) => c.id === camId);
                  setHit(null);
                  setRawCode("");
                  setCamId(cameras[(idx + 1) % cameras.length].id);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-1.5 font-sans text-caption font-semibold text-on-surface transition-colors hover:bg-surface-container-highest"
              >
                <SwitchCamera className="h-4 w-4" />
                Ganti Kamera ({cameras.length})
              </button>
            </div>
          )}

          {/* Error kamera */}
          {status === "error" && (
            <div className="mt-3 flex animate-toast-in items-start gap-2 rounded-lg bg-error-container px-3 py-2.5" role="alert">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-on-error-container" strokeWidth={2.2} />
              <span className="font-sans text-body-sm text-on-error-container">{errMsg}</span>
            </div>
          )}

          {/* Hasil identifikasi */}
          {status === "success" && hit && (
            <div className="mt-3 animate-toast-in rounded-xl bg-primary-fixed/60 p-3.5 ring-1 ring-primary/15">
              <div className="flex items-start gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-sans text-title-sm text-on-primary-fixed">{hit.title}</div>
                  <div className="mt-0.5 font-sans text-body-sm text-on-primary-fixed/80">{hit.desc}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onOpen(hit)}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary font-sans text-title-sm text-on-primary shadow-sm transition-colors hover:bg-primary-container"
                >
                  {hit.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={rescan}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3 font-sans text-title-sm text-on-surface ring-1 ring-on-surface/10 transition-colors hover:bg-surface-container-high"
                >
                  <RotateCcw className="h-4 w-4" />
                  Pindai Ulang
                </button>
              </div>
            </div>
          )}

          {/* Input manual */}
          <div className="mt-4 border-t border-surface-container pt-3">
            <div className="mb-1.5 flex items-center gap-1.5 font-sans text-caption font-semibold uppercase tracking-wide text-on-surface-variant">
              <Keyboard className="h-3.5 w-3.5" />
              Atau ketik kode manual
            </div>
            <div className="flex gap-2">
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitManual()}
                placeholder="cth. #HBA-2025-01 atau PO/2025/03/PK-0142"
                className="h-10 flex-1 rounded-lg bg-surface-container-low px-3 font-mono text-data-mono-md text-on-surface transition placeholder:font-sans placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={submitManual}
                className="h-10 rounded-lg bg-primary px-4 font-sans text-title-sm text-on-primary shadow-sm transition-colors hover:bg-primary-container"
              >
                Cek
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
