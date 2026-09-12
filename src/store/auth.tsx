import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

export type RoleKey = "superadmin" | "karu" | "pj-reagen" | "gudang" | "analis";

export type Account = {
  id: string; username: string; password: string;
  name: string; defaultName: string; role: string; roleKey: RoleKey; initial: string;
};
export type SessionUser = Omit<Account, "password">;

type DbProfile = {
  id: string; username: string; password: string; name: string;
  default_name: string; role: string; role_key: RoleKey; initial: string;
};

const toAccount = (row: DbProfile): Account => ({
  id: row.id,
  username: row.username,
  password: row.password,
  name: row.name,
  defaultName: row.default_name,
  role: row.role,
  roleKey: row.role_key,
  initial: row.initial,
});

const toSession = (a: Account): SessionUser => {
  const { password: _p, ...s } = a;
  return s;
};

/* ── Fallback akun default (dipakai bila Supabase tidak tersedia) ──────────── */
const FALLBACK_ACCOUNTS: Account[] = [
  { id: "acct-admin",      username: "admin",      password: "labstock2025", name: "dr. Ratna Dewi, Sp.PK",        defaultName: "dr. Ratna Dewi, Sp.PK",        role: "Kepala Lab / Super Admin",        roleKey: "superadmin",  initial: "RD" },
  { id: "acct-karu",       username: "karu.lab",   password: "karu123",      name: "Dra. Dina Prasetyawati, M.Kes", defaultName: "Dra. Dina Prasetyawati, M.Kes", role: "Kepala Ruangan Laboratorium",       roleKey: "karu",        initial: "DP" },
  { id: "acct-pjreagen",   username: "pj.reagen",  password: "reagen123",    name: "Andi Kurniawan, S.Si",          defaultName: "Andi Kurniawan, S.Si",          role: "PJ Reagen & BMHP",                 roleKey: "pj-reagen",   initial: "AK" },
  { id: "acct-gudang",     username: "gudang",     password: "gudang123",    name: "Bambang Subagyo, A.Md.AK",      defaultName: "Bambang Subagyo, A.Md.AK",      role: "Petugas Gudang Farmasi",            roleKey: "gudang",      initial: "BS" },
  { id: "acct-analis",     username: "analis",     password: "analis123",    name: "Siti Nurhaliza, A.Md.AK",       defaultName: "Siti Nurhaliza, A.Md.AK",       role: "Analis / ATLM",                    roleKey: "analis",      initial: "SN" },
];

const SESSION_KEY = "labstock-session";
type LoginResult = { ok: boolean; error?: string; user?: SessionUser };
type ResetResult = { ok: boolean; error?: string; temp?: string };
type NameResult = { ok: boolean; error?: string };

type Auth = {
  session: SessionUser | null;
  accounts: Account[];
  loading: boolean;
  ready: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<LoginResult>;
  logout: () => void;
  changeOwn: (
    currentPass: string,
    opts: { newUsername?: string; newPassword?: string; newName?: string }
  ) => Promise<NameResult>;
  adminReset: (targetId: string) => Promise<ResetResult>;
  adminSetName: (targetId: string, newName: string) => Promise<NameResult>;
  adminResetName: (targetId: string) => Promise<NameResult & { defaultName?: string }>;
  refreshAccounts: () => Promise<void>;
};

const AuthCtx = createContext<Auth | null>(null);
export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth di luar AuthProvider");
  return ctx;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const loadProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .table("profiles")
      .select("*", { order: { column: "role_key", ascending: true } });

    const profiles: DbProfile[] = (!error && data && data.length > 0)
      ? data
      : FALLBACK_ACCOUNTS;

    setAccounts(profiles.map(toAccount));

    const raw =
      window.localStorage.getItem(SESSION_KEY) ??
      window.sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { userId?: string };
      const found = profiles.find((a) => a.id === parsed.userId);
      if (found) setSession(toSession(toAccount(found)));
    }
    setLoading(false);
    setReady(true);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const refreshAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .table("profiles")
      .select("*", { order: { column: "role_key", ascending: true } });

    const profiles: DbProfile[] = (!error && data)
      ? data
      : FALLBACK_ACCOUNTS;

    setAccounts(profiles.map(toAccount));
    setSession((prev) => {
      if (!prev) return prev;
      const found = profiles.find((a) => a.id === prev.id);
      return found ? toSession(toAccount(found)) : null;
    });
  }, []);

  const persistSession = (userId: string) => {
    const target = window.localStorage.getItem(SESSION_KEY) ? window.localStorage : window.sessionStorage;
    target.setItem(SESSION_KEY, JSON.stringify({ userId }));
  };

  const login = useCallback<Auth["login"]>(
    async (username, password, remember) => {
      const uname = username.trim().toLowerCase();
      if (!uname || !password)
        return { ok: false, error: "Username dan password wajib diisi." };

      const found = accounts.find((a) => a.username === uname);
      if (!found || found.password !== password)
        return { ok: false, error: "Kredensial tidak valid — periksa kembali username & password Anda." };

      const storage = remember ? window.localStorage : window.sessionStorage;
      storage.setItem(SESSION_KEY, JSON.stringify({ userId: found.id }));
      if (!remember) window.localStorage.removeItem(SESSION_KEY);

      setSession(toSession(found));
      return { ok: true, user: toSession(found) };
    },
    [accounts]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  const changeOwn = useCallback<Auth["changeOwn"]>(
    async (currentPass, opts) => {
      const me = accounts.find((a) => a.id === session?.id);
      if (!me) return { ok: false, error: "Sesi tidak valid. Silakan login ulang." };
      if (me.password !== currentPass) return { ok: false, error: "Password saat ini salah." };

      const uname = opts.newUsername?.trim().toLowerCase();
      if (uname) {
        if (!/^[a-z0-9._-]{3,20}$/.test(uname))
          return { ok: false, error: "Username 3–20 karakter (huruf kecil, angka, titik, minus, underscore)." };
        if (accounts.some((a) => a.id !== me.id && a.username === uname))
          return { ok: false, error: `Username "${uname}" sudah dipakai petugas lain.` };
      }
      if (opts.newPassword && opts.newPassword.length < 6)
        return { ok: false, error: "Password baru minimal 6 karakter." };
      if (!uname && !opts.newPassword && !opts.newName)
        return { ok: false, error: "Tidak ada perubahan untuk disimpan." };
      if (opts.newName !== undefined) {
        const trimmed = opts.newName.trim();
        if (trimmed.length < 2) return { ok: false, error: "Nama minimal 2 karakter." };
        if (trimmed.length > 80) return { ok: false, error: "Nama maksimal 80 karakter." };
      }

      const patch: Record<string, unknown> = {};
      if (uname) patch.username = uname;
      if (opts.newPassword) patch.password = opts.newPassword;
      if (opts.newName !== undefined) patch.name = opts.newName.trim();

      const { error } = await supabase
        .table("profiles")
        .update(patch, "id", me.id);

      if (error) return { ok: false, error: `Gagal menyimpan ke database: ${error.message}` };

      await refreshAccounts();
      persistSession(me.id);
      return { ok: true };
    },
    [accounts, session, refreshAccounts]
  );

  const adminReset = useCallback<Auth["adminReset"]>(
    async (targetId) => {
      const me = accounts.find((a) => a.id === session?.id);
      if (!me || me.roleKey !== "superadmin")
        return { ok: false, error: "Hanya Super Admin yang dapat mereset password." };
      const target = accounts.find((a) => a.id === targetId);
      if (!target) return { ok: false, error: "Akun tidak ditemukan." };
      const temp = `SMJ-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const { error } = await supabase
        .table("profiles")
        .update({ password: temp }, "id", targetId);

      if (error) return { ok: false, error: `Gagal mereset di database: ${error.message}` };

      await refreshAccounts();
      return { ok: true, temp };
    },
    [accounts, session, refreshAccounts]
  );

  const adminSetName = useCallback<Auth["adminSetName"]>(
    async (targetId, newName) => {
      const me = accounts.find((a) => a.id === session?.id);
      if (!me || me.roleKey !== "superadmin")
        return { ok: false, error: "Hanya Super Admin yang dapat mengubah nama." };
      const target = accounts.find((a) => a.id === targetId);
      if (!target) return { ok: false, error: "Akun tidak ditemukan." };

      const trimmed = newName.trim();
      if (trimmed.length < 2) return { ok: false, error: "Nama minimal 2 karakter." };
      if (trimmed.length > 80) return { ok: false, error: "Nama maksimal 80 karakter." };

      const { error } = await supabase
        .table("profiles")
        .update({ name: trimmed }, "id", targetId);

      if (error) return { ok: false, error: `Gagal memperbarui nama di database: ${error.message}` };

      await refreshAccounts();
      return { ok: true };
    },
    [accounts, session, refreshAccounts]
  );

  const adminResetName = useCallback<Auth["adminResetName"]>(
    async (targetId) => {
      const me = accounts.find((a) => a.id === session?.id);
      if (!me || me.roleKey !== "superadmin")
        return { ok: false, error: "Hanya Super Admin yang dapat mereset nama." };
      const target = accounts.find((a) => a.id === targetId);
      if (!target) return { ok: false, error: "Akun tidak ditemukan." };

      const defaultName = target.defaultName;
      const { error } = await supabase
        .table("profiles")
        .update({ name: defaultName }, "id", targetId);

      if (error) return { ok: false, error: `Gagal mereset nama: ${error.message}` };

      await refreshAccounts();
      return { ok: true, defaultName };
    },
    [accounts, session, refreshAccounts]
  );

  const value = useMemo(
    () => ({ session, accounts, loading, ready, login, logout, changeOwn, adminReset, adminSetName, adminResetName, refreshAccounts }),
    [session, accounts, loading, ready, login, logout, changeOwn, adminReset, adminSetName, adminResetName, refreshAccounts]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
