import { useState } from "react";
import {
  UserCog, KeyRound, RotateCcw, Copy, CircleAlert, Eye, EyeOff,
  Save, ShieldCheck,
} from "lucide-react";
import { Modal, Btn, Field, inputCls, Badge, type BadgeTone } from "./ui";
import { useAuth, type RoleKey } from "../store/auth";
import { useStore } from "../store/store";
import { useToast } from "./Toast";
import { cn } from "../utils/cn";

const ROLE_TONE: Record<RoleKey, BadgeTone> = {
  superadmin: "ok", karu: "info", "pj-reagen": "warn", gudang: "neutral", analis: "neutral",
};

/* ── Ubah username / password milik sendiri ─────────────────────────────── */
export function AccountSettingsModal({ onClose }: { onClose: () => void }) {
  const { session, changeOwn } = useAuth();
  const { logEvent } = useStore();
  const push = useToast();

  const [uname, setUname] = useState(session?.username ?? "");
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [cf, setCf] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const unameChanged = uname.trim().toLowerCase() !== session?.username;
  const passChanged = nw.length > 0;

  const submit = () => {
    setErr(null);
    const newU = uname.trim().toLowerCase();
    if (!unameChanged && !passChanged) return setErr("Tidak ada perubahan untuk disimpan.");
    if (unameChanged && !/^[a-z0-9._-]{3,20}$/.test(newU))
      return setErr("Username 3–20 karakter (huruf kecil, angka, titik, minus, underscore).");
    if (passChanged) {
      if (nw.length < 6) return setErr("Password baru minimal 6 karakter.");
      if (nw !== cf) return setErr("Konfirmasi password baru tidak sama.");
    }
    const r = changeOwn(cur, {
      newUsername: unameChanged ? newU : undefined,
      newPassword: passChanged ? nw : undefined,
    });
    if (!r.ok) return setErr(r.error ?? "Gagal menyimpan perubahan.");

    logEvent(
      "Kepatuhan",
      unameChanged ? "Username akun diubah" : "Password akun diubah",
      `${session?.name} memperbarui kredensial @${unameChanged ? newU : session?.username}`
    );
    push({
      title: "Kredensial diperbarui",
      desc: unameChanged ? `Username baru Anda: @${newU}` : "Password baru langsung berlaku untuk login berikutnya.",
      tone: "success",
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Pengaturan Akun">
      <div className="mb-4 flex items-center gap-3 rounded-lg bg-surface-container-low p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-sans text-title-sm text-on-primary">
          {session?.initial}
        </div>
        <div className="min-w-0">
          <div className="truncate font-sans text-title-sm text-on-surface">{session?.name}</div>
          <div className="truncate font-sans text-caption font-normal text-on-surface-variant">{session?.role}</div>
        </div>
        <Badge tone={ROLE_TONE[session?.roleKey ?? "analis"]} className="ml-auto">{session?.role}</Badge>
      </div>

      <div className="flex flex-col gap-3">
        <Field label="Username Baru">
          <input className={cn(inputCls, "font-mono text-data-mono-md")} value={uname}
            onChange={(e) => setUname(e.target.value)} autoComplete="username" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Password Baru" className="col-span-2">
            <div className="relative">
              <input type={show ? "text" : "password"} className={cn(inputCls, "pr-10")} value={nw}
                onChange={(e) => setNw(e.target.value)} placeholder="Kosongkan bila tidak diganti"
                autoComplete="new-password" />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label="Tampilkan password"
                className="absolute right-1.5 top-1.5 rounded-lg p-1.5 text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Konfirmasi Password Baru" className="col-span-2">
            <input type={show ? "text" : "password"} className={inputCls} value={cf}
              onChange={(e) => setCf(e.target.value)} placeholder="Ulangi password baru" autoComplete="new-password" />
          </Field>
        </div>

        <Field label="Password Saat Ini (wajib untuk konfirmasi)">
          <input type="password" className={inputCls} value={cur} onChange={(e) => setCur(e.target.value)}
            placeholder="••••••••" autoComplete="current-password" />
        </Field>

        {err && (
          <div className="flex animate-toast-in items-start gap-2 rounded-lg bg-error-container px-3 py-2.5" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-on-error-container" strokeWidth={2.2} />
            <span className="font-sans text-body-sm text-on-error-container">{err}</span>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Btn tone="ghost" onClick={onClose}>Batal</Btn>
        <Btn icon={Save} onClick={submit}>Simpan Perubahan</Btn>
      </div>
    </Modal>
  );
}

/* ── Kelola akun petugas (khusus Super Admin) ───────────────────────────── */
export function AdminAccountsModal({ onClose }: { onClose: () => void }) {
  const { session, accounts, adminReset } = useAuth();
  const { logEvent } = useStore();
  const push = useToast();
  const [temps, setTemps] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  return (
    <Modal open onClose={onClose} title="Kelola Akun Petugas" wide>
      <p className="-mt-2 mb-4 font-sans text-body-sm text-on-surface-variant">
        Reset menerbitkan <span className="font-semibold text-on-surface">password sementara</span> — minta petugas
        segera menggantinya via menu Pengaturan Akun setelah login.
      </p>

      {err && (
        <div className="mb-3 flex animate-toast-in items-center gap-2 rounded-lg bg-error-container px-3 py-2.5" role="alert">
          <CircleAlert className="h-4 w-4 shrink-0 text-on-error-container" strokeWidth={2.2} />
          <span className="font-sans text-body-sm text-on-error-container">{err}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {accounts.map((a) => {
          const isSelf = a.id === session?.id;
          const temp = temps[a.id];
          return (
            <div
              key={a.id}
              className="flex flex-col gap-2.5 rounded-lg bg-surface-container-low p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-sans text-[12px] font-bold text-primary">
                  {a.initial}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-sans text-body-md font-medium text-on-surface">{a.name}</span>
                    <Badge tone={ROLE_TONE[a.roleKey]}>{a.role}</Badge>
                    {isSelf && <Badge tone="neutral">Anda</Badge>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-data-mono-sm text-on-surface-variant">
                    <UserCog className="h-3.5 w-3.5" />@{a.username}
                    <KeyRound className="ml-2 h-3.5 w-3.5" />••••••••
                  </div>
                </div>
              </div>

              {temp ? (
                <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-fixed px-2.5 py-1.5">
                  <span className="font-mono text-data-mono-sm font-bold text-on-primary-fixed">{temp}</span>
                  <button
                    type="button"
                    title="Salin password sementara"
                    onClick={() => {
                      navigator.clipboard?.writeText(temp);
                      push({ title: "Password sementara disalin", desc: `Untuk ${a.name}.`, tone: "info" });
                    }}
                    className="rounded-md p-1 text-primary transition-colors hover:bg-white/60"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <Btn
                  tone="soft"
                  icon={RotateCcw}
                  className="h-8 px-2.5"
                  disabled={isSelf}
                  title={isSelf ? "Gunakan Pengaturan Akun untuk akun sendiri" : "Reset password akun ini"}
                  onClick={() => {
                    setErr(null);
                    const r = adminReset(a.id);
                    if (!r.ok) return setErr(r.error ?? "Reset gagal.");
                    setTemps((t) => ({ ...t, [a.id]: r.temp! }));
                    logEvent("Kepatuhan", "Reset password akun", `${session?.name} menerbitkan password sementara untuk ${a.name} (@${a.username})`);
                    push({ title: "Password direset", desc: `Password sementara untuk ${a.name} telah diterbitkan.`, tone: "success" });
                  }}
                >
                  Reset
                </Btn>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-1.5 font-sans text-caption font-normal text-on-surface-variant">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Seluruh reset password tercatat di Log Audit KARS bersama nama petugas yang mengeksekusi.
      </p>
    </Modal>
  );
}
