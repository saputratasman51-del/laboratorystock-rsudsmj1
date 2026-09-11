import { useCallback, useEffect, useState } from "react";

const getPath = () => {
  if (typeof window === "undefined") return "dashboard-alert-center";
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return raw || "dashboard-alert-center";
};

export type NavigateFn = (p: string, params?: Record<string, string>) => void;

/** Router hash sederhana: #/<page-id>?q=... */
export function useHashRoute(): [string, NavigateFn] {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const onChange = () => setPath(getPath());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((p: string, params?: Record<string, string>) => {
    window.location.hash = "/" + p + (params ? "?" + new URLSearchParams(params).toString() : "");
    window.scrollTo({ top: 0 });
  }, []);

  return [path, navigate];
}

/** Baca satu query param dari hash secara reaktif. */
export function useHashParam(name: string): string | null {
  const read = useCallback(() => {
    const i = window.location.hash.indexOf("?");
    if (i < 0) return null;
    return new URLSearchParams(window.location.hash.slice(i + 1)).get(name);
  }, []);

  const [val, setVal] = useState<string | null>(read);
  useEffect(() => {
    const onChange = () => setVal(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [read]);
  return val;
}
