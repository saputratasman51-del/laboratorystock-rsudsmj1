import { useCallback, useEffect, useState } from "react";

const getPath = () =>
  typeof window === "undefined"
    ? "dashboard-alert-center"
    : window.location.hash.replace(/^#\/?/, "") || "dashboard-alert-center";

/** Router hash sederhana: #/<page-id> */
export function useHashRoute(): [string, (p: string) => void] {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const onChange = () => setPath(getPath());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((p: string) => {
    window.location.hash = "/" + p;
    window.scrollTo({ top: 0 });
  }, []);

  return [path, navigate];
}
