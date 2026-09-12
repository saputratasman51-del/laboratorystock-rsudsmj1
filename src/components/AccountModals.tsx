import { useState } from "react";
import {
  UserCog, KeyRound, RotateCcw, Copy, CircleAlert, Eye, EyeOff,
  Save, ShieldCheck, Edit3, RefreshCw,
} from "lucide-react";
import { Modal, Btn, Field, inputCls, Badge, type BadgeTone } from "./ui";
import { useAuth, type RoleKey } from "../store/auth";
import { useStore } from "../store/store";
import { useToast } from "./Toast";
import { cn } from "../utils/cn";

const ROLE_TONE: Record<RoleKey, BadgeTone> = {
  superadmin: "ok", karu: "info", "pj-reagen": "warn", gudang: "neutral", analis: "neutral",
};

/* ── Ubah username / password / nama milik sendiri ────────────────────────── */
export function AccountSettingsModal({ onClose }: { onClose: () => void }) {
  const { session, changeOwn } = useAuth();
  const { logEvent } = useStore();
  const push = useToast();

  const [name, setName] = useState(session?.name ?? "");
  const [uname, setUname] = useState(session?.username ?? "");
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [cf, setCf] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nameChanged = name.trim() !== (session?.name ?? "");
  const unameChanged = uname.trim().toLowerCase() !== session?.username;
  const passChanged = nw.length > 0;

  const submit = async () => {
    setErr(null);
    if (!nameChanged && !unameChanged && !passChanged)
      return setErr("Tidak ada perubahan untuk disimpan.");

    const newU = uname.trim().toLowerCase();
    if (unameChanged && !/^[a-z0-9._-]{3,20}$/.test(newU))
      return setErr("Username 3–20 karakter (huruf kecil, angka, titik, minus, underscore).");
    if (passChanged) {
      if (nw.length < 6) return setErr("Password baru minimal 6 karakter.");
      if (nw !== cf) return setErr("Konfirmasi password baru tidak sama.");
    }

    setBusy(true);
    const r = await changeOwn(cur, {
      newUsername: unameChanged ? newU : undefined,
      newPassword: passChanged ? nw : undefined,
      newName: nameChanged ? name.trim() : undefined,
    });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Gagal menyimpan perubahan.");

    const actors: string[] = [];
    if (nameChanged) actors.push("Nama diubah");
    if (unameChanged) actors.push("Username diubah");
    if (passChanged) actors.push("Password diubah");

    logEvent(
      "Kepatuhan",
      `Akun diperbarui (${actors.join(", ")})`,
      `${nameChanged ? name.trim() : session?.name} memperbarui kredensial @${unameChanged ? newU : session?.username}`
    );
    push({
      title: "Akun diperbarui",
      desc: nameChanged
        ? `Nama, username, dan password Anda telah diperbarui.`
        : `Username/password baru langsung berlaku untuk login berikutnya.`,
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
        <Field label="Nama Tampilan">
          <input className={inputCls} value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama lengkap sebagaimana kartu nama"
            autoComplete="name"
            disabled={busy} />
        </Field>

        <Field label="Username Baru">
          <input className={cn(inputCls, "font-mono text-data-mono-md")} value={uname}
            onChange={(e) => setUname(e.target.value)} autoComplete="username" disabled={busy} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Password Baru" className="col-span-2">
            <div className="relative">
              <input type={show ? "text" : "password"} className={cn(inputCls, "pr-10")} value={nw}
                onChange={(e) => setNw(e.target.value)} placeholder="Kosongkan bila tidak diganti"
                autoComplete="new-password" disabled={busy} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label="Tampilkan password"
                className="absolute right-1.5 top-1.5 rounded-lg p-1.5 text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Konfirmasi Password Baru" className="col-span-2">
            <input type={show ? "text" : "password"} className={inputCls} value={cf}
              onChange={(e) => setCf(e.target.value)} placeholder="Ulangi password baru" autoComplete="new-password" disabled={busy} />
          </Field>
        </div>

        <Field label="Password Saat Ini (wajib untuk konfirmasi)">
          <input type="password" className={inputCls} value={cur} onChange={(e) => setCur(e.target.value)}
            placeholder="••••••••" autoComplete="current-password" disabled={busy} />
        </Field>

        {err && (
          <div className="flex animate-toast-in items-start gap-2 rounded-lg bg-error-container px-3 py-2.5" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-on-error-container" strokeWidth={2.2} />
            <span className="font-sans text-body-sm text-on-error-container">{err}</span>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Btn tone="ghost" onClick={onClose} disabled={busy}>Batal</Btn>
        <Btn icon={Save} onClick={submit} disabled={busy}>Simpan Perubahan</Btn>
      </div>
    </Modal>
  );
}

/* ── Kelola akun petugas (khusus Super Admin) ─────────────────────────────── */
export function AdminAccountsModal({ onClose }: { onClose: () => void }) {
  const { session, accounts, adminReset, adminSetName, adminResetName } = useAuth();
  const { logEvent } = useStore();
  const push = useToast();
  const [temps, setTemps] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setErr(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveName = async (id: string) => {
    const trimmed = editName.trim();
    if (trimmed.length < 2) return setErr("Nama minimal 2 karakter.");
    if (trimmed.length > 80) return setErr("Nama maksimal 80 karakter.");
    setErr(null);
    setBusyId(id);
    const r = await adminSetName(id, trimmed);
    setBusyId(null);
    if (!r.ok) return setErr(r.error ?? "Gagal memperbarui nama.");

    const a = accounts.find((x) => x.id === id);
    logEvent("Kepatuhan", "Nama akun diubah", `${session?.name} mengganti nama ${a?.name} (@${a?.username})`);
    push({ title: "Nama diperbarui", desc: `Nama petugas ${a?.name} telah diubah.`, tone: "success" });
    cancelEdit();
  };

  const resetName = async (id: string) => {
    setErr(null);
    setBusyId(id);
    const r = await adminResetName(id);
    setBusyId(null);
    if (!r.ok) return setErr(r.error ?? "Gagal mereset nama.");
    const a = accounts.find((x) => x.id === id);
    logEvent("Kepatuhan", "Nama akun direset", `${session?.name} me-reset nama ${a?.name} (@${a?.username})`);
    push({ title: "Nama direset", desc: `Nama ${a?.name} kembali ke nilai semula (${r.defaultName}).`, tone: "success" });
  };

  const resetPassword = async (id: string) => {
    setErr(null);
    setBusyId(id);
    const r = await adminReset(id);
    setBusyId(null);
    if (!r.ok) return setErr(r.error ?? "Reset gagal.");
    setTemps((t) => ({ ...t, [id]: r.temp! }));
    const a = accounts.find((x) => x.id === id);
    logEvent("Kepatuhan", "Reset password akun", `${session?.name} menerbitkan password sementara untuk ${a?.name} (@${a?.username})`);
    push({ title: "Password direset", desc: `Password sementara untuk ${a?.name} telah diterbitkan.`, tone: "success" });
  };

  return (
    <Modal open onClose={onClose} title="Kelola Akun Petugas" wide>
      <p className="-mt-2 mb-4 font-sans text-body-sm text-on-surface-variant">
        Kelola nama tampilan, username, dan password petugas. Reset password menerbitkan
        <span className="font-semibold text-on-surface"> password sementara</span> — minta
        petugas segera menggantinya via menu Pengaturan Akun setelah login.
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
          const isEditing = editingId === a.id;
          const isBusy = busyId === a.id;

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
                  {isEditing ? (
                    <input
                      className={cn(inputCls, "h-8")}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={isBusy}
                    />
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-sans text-body-md font-medium text-on-surface">{a.name}</span>
                      <Badge tone={ROLE_TONE[a.roleKey]}>{a.role}</Badge>
                      {isSelf && <Badge tone="neutral">Anda</Badge>}
                    </div>
                  )}
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-data-mono-sm text-on-surface-variant">
                    <UserCog className="h-3.5 w-3.5" />@{a.username}
                    <KeyRound className="ml-2 h-3.5 w-3.5" />••••••••
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-row items-center gap-1">
                {isEditing ? (
                  <>
                    <Btn tone="ghost" onClick={cancelEdit} disabled={isBusy}>Batal</Btn>
                    <Btn tone="soft" icon={Save} onClick={() => saveName(a.id)} disabled={isBusy}>Simpan</Btn>
                  </>
                ) : temp ? (
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
                  <>
                    <Btn tone="ghost" icon={Edit3} title="Edit nama" onClick={() => startEdit(a.id, a.name)} disabled={isBusy}>
                      <span className="sr-only">Edit nama</span>
                    </Btn>
                    <Btn tone="ghost" icon={RefreshCw} title="Reset nama ke semula" onClick={() => resetName(a.id)} disabled={isBusy || isSelf}>
                      <span className="sr-only">Reset nama</span>
                    </Btn>
                    <Btn
                      tone="soft"
                      icon={RotateCcw}
                      className="h-8 px-2.5"
                      disabled={isSelf || isBusy}
                      title={isSelf ? "Gunakan Pengaturan Akun untuk akun sendiri" : "Reset password akun ini"}
                      onClick={() => resetPassword(a.id)}
                    >
                      Reset
                    </Btn>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-1.5 font-sans text-caption font-normal text-on-surface-variant">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Seluruh reset password dan perubahan nama tercatat di Log Audit KARS bersama nama petugas yang mengeksekusi.
      </p>
    </Modal>
  );
}
