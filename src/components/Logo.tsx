import logoUrl from "../assets/logo.jpg";
import { cn } from "../utils/cn";

/** Logo resmi Labstock RSUD SMJ — ganti file src/assets/logo.jpg untuk mengubahnya. */
export default function LogoImg({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Logo RSUD SMJ"
      className={cn("shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-on-surface/10", className)}
    />
  );
}
