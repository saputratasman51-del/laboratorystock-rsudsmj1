import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type RoleKey = "superadmin" | "karu" | "pj-reagen" | "gudang" | "analis";

export type Account = {
  id: string; username: string; password: string;
  name: string; role: string; roleKey: RoleKey; initial: string;
};
export type SessionUser = Omit<Account, "password">;

/** Akun awal sistem — wajib ganti password setelah login pertama */
const BASE_USERS: Account[] = [
  {
    id: "u-admin", username: "admin", password: "labstock2025",
    name: "dr. Ratna Dewi, Sp.PK", role: "Kepala Lab / Super Admin", roleKey: "superadmin", initial: "RD",
  },
  {
    id: "u-karu", username: "karu.lab", password: "karu123",
    name: "Dra. Dina Prasetyawati, M.Kes", role: "Kepala Ruangan Laboratorium", roleKey: "karu", initial: "DP",
  },
  {
    id: "u-pjreagen", username: "pj.reagen", password: "reagen123",
    name: "Andi Kurniawan, S.Si", role: "PJ Reagen & BMHP", roleKey: "pj-reagen", initial: "AK",
  },
  {
    id: "u-gudang", username: "gudang", password: "gudang123",
    name: "Bambang Subagyo, A.Md.AK", role: "Petugas Gudang Farmasi", roleKey: "gudang", initial: "BS",
  },
  {
    id: "u-analis", username: "analis", password: "analis123",
    name: "Siti Nurhaliza, A.Md.AK", role: "Analis / ATLM", roleKey: "analis", initial: "SN",
  },
];

const SESSION_KEY = "labstock-session";
const CRED_KEY = "labstock-credentials";

type Override = { username?: string; password?: string; name?: string };
type CredMap = Record<string, Override>;

const loadCredMap = (): CredMap => {
  try {
    return JSON.parse(window.localStorage.getItem(CRED_KEY) ?? "{}") as CredMap;
  } catch {
    return {};
  }
};

/** Inisial avatar — abaikan gelar depan (dr., Dra., Ir., Prof., dll.) */
const initialsFor = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  let start = 0;
  if (words.length >= 3 && /^(dr|dra|ir|prof|drg|hj|h|rs)$/i.test(words[0].replace(/\.$/, ""))) start = 1;
  const a = words[start]?.[0] ?? "?";
  const b = words[start + 1]?.[0] ?? "";
  return (a + b).toUpperCase();
};

const mergeAccounts = (creds: CredMap): Account[] =>
  BASE_USERS.map((u) => {
    const name = creds[u.id]?.name?.trim() || u.name;
    return {
      ...u,
      name,
      username: creds[u.id]?.username ?? u.username,
      password: creds[u.id]?.password ?? u.password,
      initial: initialsFor(name),
    };
  });

type LoginResult = { ok: boolean; error?: string; user?: SessionUser };
type ResetResult = { ok: boolean; error?: string; temp?: string };

type Auth = {
  session: SessionUser | null;
  accounts: Account[];
  login: (username: string, password: string, remember: boolean) => LoginResult;
  logout: () => void;
  changeOwn: (
    currentPass: string,
    opts: { newUsername?: string; newPassword?: string; newName?: string }
  ) => { ok: boolean; error?: string };
  adminReset: (targetId: string) => ResetResult;
  adminRename: (targetId: string, newName: string) => { ok: boolean; error?: string };
};

const AuthCtx = createContext<Auth | null>(null);
export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth di luar AuthProvider");
  return ctx;
};

const toSession = (a: Account): SessionUser => {
  const { password: _p, ...s } = a;
  return s;
};

function readSession(accounts: Account[]): SessionUser | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY) ?? window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string; username?: string };
    const found = parsed.userId
      ? accounts.find((a) => a.id === parsed.userId)
      : accounts.find((a) => a.username === parsed.username);
    return found ? toSession(found) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [creds, setCreds] = useState<CredMap>(loadCredMap);
  const accounts = useMemo(() => mergeAccounts(creds), [creds]);
  const [session, setSession] = useState<SessionUser | null>(() => readSession(mergeAccounts(loadCredMap())));

  const persistSession = (userId: string) => {
    const target = window.localStorage.getItem(SESSION_KEY) ? window.localStorage : window.sessionStorage;
    target.setItem(SESSION_KEY, JSON.stringify({ userId }));
  };

  const saveCreds = useCallback((next: CredMap) => {
    setCreds(next);
    window.localStorage.setItem(CRED_KEY, JSON.stringify(next));
  }, []);

  /** Sinkronkan objek sesi bila akun berubah (mis. nama/username diganti) */
  const [sessionId, setSessionId] = useState<string | null>(() => readSession(mergeAccounts(loadCredMap()))?.id ?? null);
  const syncSession = useCallback(
    (accs: Account[]) => {
      setSession((prev) => {
        if (!prev) return prev;
        const found = accs.find((a) => a.id === prev.id);
        return found ? toSession(found) : null;
      });
    },
    [setSession]
  );

  const login = useCallback<Auth["login"]>(
    (username, password, remember) => {
      const uname = username.trim().toLowerCase();
      if (!uname || !password) return { ok: false, error: "Username dan password wajib diisi." };
      const found = accounts.find((a) => a.username === uname);
      if (!found || found.password !== password)
        return { ok: false, error: "Kredensial tidak valid — periksa kembali username & password Anda." };
      const storage = remember ? window.localStorage : window.sessionStorage;
      storage.setItem(SESSION_KEY, JSON.stringify({ userId: found.id }));
      if (!remember) window.localStorage.removeItem(SESSION_KEY);
      setSession(toSession(found));
      setSessionId(found.id);
      return { ok: true, user: toSession(found) };
    },
    [accounts]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setSessionId(null);
  }, []);

  const changeOwn = useCallback<Auth["changeOwn"]>(
    (currentPass, opts) => {
      const me = accounts.find((a) => a.id === sessionId);
      if (!me) return { ok: false, error: "Sesi tidak valid. Silakan login ulang." };
      if (me.password !== currentPass) return { ok: false, error: "Password saat ini salah." };

      const uname = opts.newUsername?.trim().toLowerCase();
      if (uname) {
        if (!/^[a-z0-9._-]{3,20}$/.test(uname))
          return { ok: false, error: "Username 3–20 karakter (huruf kecil, angka, titik, minus, underscore)." };
        if (accounts.some((a) => a.id !== me.id && a.username === uname))
          return { ok: false, error: `Username "${uname}" sudah dipakai petugas lain.` };
      }
      const nname = opts.newName?.trim();
      if (nname) {
        if (nname.length < 3 || nname.length > 60)
          return { ok: false, error: "Nama lengkap 3–60 karakter." };
        if (!/[a-zA-Z]/.test(nname))
          return { ok: false, error: "Nama tidak valid — harus mengandung huruf." };
      }
      if (opts.newPassword && opts.newPassword.length < 6)
        return { ok: false, error: "Password baru minimal 6 karakter." };
      if (!uname && !opts.newPassword && !nname)
        return { ok: false, error: "Tidak ada perubahan untuk disimpan." };

      const next: CredMap = {
        ...creds,
        [me.id]: {
          ...creds[me.id],
          ...(uname ? { username: uname } : {}),
          ...(opts.newPassword ? { password: opts.newPassword } : {}),
          ...(nname ? { name: nname } : {}),
        },
      };
      saveCreds(next);
      syncSession(mergeAccounts(next));
      persistSession(me.id);
      return { ok: true };
    },
    [accounts, creds, saveCreds, sessionId, syncSession]
  );

  const adminRename = useCallback<Auth["adminRename"]>(
    (targetId, newName) => {
      const me = accounts.find((a) => a.id === sessionId);
      if (!me || me.roleKey !== "superadmin")
        return { ok: false, error: "Hanya Super Admin yang dapat mengubah nama akun." };
      const target = accounts.find((a) => a.id === targetId);
      if (!target) return { ok: false, error: "Akun tidak ditemukan." };
      const nname = newName.trim();
      if (nname.length < 3 || nname.length > 60)
        return { ok: false, error: "Nama lengkap 3–60 karakter." };
      if (!/[a-zA-Z]/.test(nname))
        return { ok: false, error: "Nama tidak valid — harus mengandung huruf." };
      const next: CredMap = { ...creds, [targetId]: { ...creds[targetId], name: nname } };
      saveCreds(next);
      syncSession(mergeAccounts(next));
      return { ok: true };
    },
    [accounts, creds, saveCreds, sessionId, syncSession]
  );

  const adminReset = useCallback<Auth["adminReset"]>(
    (targetId) => {
      const me = accounts.find((a) => a.id === sessionId);
      if (!me || me.roleKey !== "superadmin")
        return { ok: false, error: "Hanya Super Admin yang dapat mereset password." };
      const target = accounts.find((a) => a.id === targetId);
      if (!target) return { ok: false, error: "Akun tidak ditemukan." };
      const temp = `SMJ-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const next: CredMap = { ...creds, [targetId]: { ...creds[targetId], password: temp } };
      saveCreds(next);
      return { ok: true, temp };
    },
    [accounts, creds, saveCreds, sessionId]
  );

  const value = useMemo(
    () => ({ session, accounts, login, logout, changeOwn, adminReset, adminRename }),
    [session, accounts, login, logout, changeOwn, adminReset, adminRename]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
