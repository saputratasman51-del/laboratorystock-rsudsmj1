import { useState, type FormEvent } from "react";
import {
  User, Lock, Eye, EyeOff, LogIn, Loader2, ShieldCheck, CircleAlert,
  PackageCheck, ClipboardCheck, FileKey2,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { useStore } from "../store/store";
import { useToast } from "../components/Toast";
import LogoImg from "../components/Logo";
import { cn } from "../utils/cn";

const FEATURES = [
  { icon: ShieldCheck, text: "Jejak audit immutable sesuai standar KARS & ISO 15189" },
  { icon: PackageCheck, text: "Penerimaan barang dengan jumlah aktual yang dapat disesuaikan" },
  { icon: ClipboardCheck, text: "Pencatatan & pelaporan khusus internal Lab PK dan UPD" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { logEvent } = useStore();
  const push = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    window.setTimeout(async () => {
      const r = await login(username, password, remember);
      setBusy(false);
      if (r.ok && r.user) {
        logEvent("Kepatuhan", "Login berhasil", `${r.user.name} masuk ke sistem (${r.user.role})`);
        push({ title: `Selamat datang, ${r.user.name.split(",")[0]}`, desc: `Anda masuk sebagai ${r.user.role}.`, tone: "success" });
      } else {
        setAttempts((n) => n + 1);
        setError(r.error ?? "Login gagal.");
        logEvent("Kepatuhan", "Percobaan login gagal", `Username "${username.trim().toLowerCase() || "-"}" — kredensial tidak valid`);
      }
    }, 650);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Panel brand kiri */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex lg:w-[46%] xl:w-1/2"
        style={{ background: "linear-gradient(140deg,#005c55 0%,#0f766e 55%,#005a6a 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <LogoImg className="h-12 w-12 rounded-xl" />
          <div>
            <div className="font-sans text-title-sm text-white">Labstock RSUD SMJ</div>
            <div className="font-sans text-caption uppercase tracking-wider text-white/70">Logistik Internal Lab</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9cf2e8]" />
            <span className="font-sans text-caption font-semibold uppercase tracking-wider text-white">
              Pencatatan &amp; Pelaporan Internal
            </span>
          </div>
          <h1 className="font-sans text-[34px] font-bold leading-[1.15] tracking-tight text-white">
            Kontrol stok laboratorium yang aman &amp; tertelusur.
          </h1>
          <p className="mt-3 font-sans text-body-md text-white/75">
            Satu platform internal untuk katalog, batch, pengadaan E-Katalog, pemakaian,
            hingga bukti kepatuhan akreditasi Lab Patologi Klinik &amp; UPD.
          </p>
          <div className="mt-7 flex flex-col gap-3">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <f.icon className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
                <span className="font-sans text-body-sm text-white/85">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between font-sans text-caption text-white/70">
          <span>v2.4 · RSUD SMJ · Lab Patologi Klinik &amp; UPD</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Terakreditasi KARS &amp; ISO 15189
          </span>
        </div>
      </div>

      {/* Panel form kanan */}
      <div className="flex flex-1 items-center justify-center p-5 md:p-10">
        <div className="w-full max-w-md animate-rise">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <LogoImg className="h-11 w-11" />
            <div>
              <div className="font-sans text-title-sm text-on-surface">Labstock RSUD SMJ</div>
              <div className="font-sans text-caption uppercase tracking-wider text-on-surface-variant">Logistik Internal Lab</div>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-panel ring-1 ring-on-surface/[0.04] md:p-7">
            <div className="mb-1 flex items-center gap-2">
              <FileKey2 className="h-5 w-5 text-primary" strokeWidth={1.9} />
              <h2 className="font-sans text-headline-lg tracking-tight text-on-surface">Masuk ke Sistem</h2>
            </div>
            <p className="mb-6 font-sans text-body-sm text-on-surface-variant">
              Akses terbatas untuk petugas laboratorium terotorisasi. Gunakan akun yang diberikan administrator.
            </p>

            {error && (
              <div className="mb-4 flex animate-toast-in items-start gap-2.5 rounded-lg bg-error-container px-3.5 py-3" role="alert">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-on-error-container" strokeWidth={2.2} />
                <div className="font-sans text-body-sm text-on-error-container">
                  <span className="font-semibold">Login gagal.</span> {error}
                  {attempts > 0 && (
                    <span className="mt-0.5 block font-sans text-caption font-normal opacity-80">
                      Percobaan gagal: {attempts}x
                    </span>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-4" autoComplete="on">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-user" className="font-sans text-caption font-semibold uppercase tracking-wide text-on-surface-variant">
                  Username
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-3 h-[18px] w-[18px] text-outline" />
                  <input
                    id="login-user"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="h-11 w-full rounded-lg bg-surface-container-low pl-10 pr-3 font-sans text-body-md text-on-surface transition placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-pass" className="font-sans text-caption font-semibold uppercase tracking-wide text-on-surface-variant">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3 h-[18px] w-[18px] text-outline" />
                  <input
                    id="login-pass"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="h-11 w-full rounded-lg bg-surface-container-low pl-10 pr-11 font-sans text-body-md text-on-surface transition placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-2 rounded-lg p-1.5 text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
                  >
                    {showPass ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 font-sans text-body-md text-on-surface">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Ingat saya di perangkat ini
              </label>

              <button
                type="submit"
                disabled={busy}
                className={cn(
                  "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-sans text-title-sm text-on-primary shadow transition-all",
                  busy ? "cursor-wait opacity-80" : "hover:-translate-y-px hover:bg-primary-container"
                )}
              >
                {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <LogIn className="h-[18px] w-[18px]" />}
                {busy ? "Memverifikasi kredensial..." : "Masuk ke Labstock"}
              </button>
            </form>

            <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-surface-container-low px-3.5 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
              <p className="font-sans text-caption font-normal text-on-surface-variant">
                Kredensial diterbitkan oleh administrator laboratorium. Lupa password? Hubungi{" "}
                <span className="font-semibold text-on-surface">Super Admin</span> untuk reset, lalu ubah kembali
                di menu Pengaturan Akun.
              </p>
            </div>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center font-sans text-caption font-normal text-on-surface-variant">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Seluruh aktivitas login tercatat dalam Log Audit KARS &amp; ISO 15189.
          </p>
        </div>
      </div>
    </div>
  );
}
