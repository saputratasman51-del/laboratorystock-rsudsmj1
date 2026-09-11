import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CircleCheck, Info, Ban } from "lucide-react";
import { cn } from "../utils/cn";

export type ToastTone = "success" | "info" | "danger";
export type Toast = { id: number; title: string; desc?: string; tone: ToastTone };
type PushFn = (t: Omit<Toast, "id">) => void;

const ToastCtx = createContext<PushFn>(() => {});
export const useToast = () => useContext(ToastCtx);

const TONE_META: Record<ToastTone, { icon: typeof CircleCheck; tile: string; bar: string }> = {
  success: { icon: CircleCheck, tile: "bg-primary text-on-primary", bar: "bg-primary" },
  info: { icon: Info, tile: "bg-tertiary text-on-tertiary", bar: "bg-tertiary" },
  danger: { icon: Ban, tile: "bg-error text-on-error", bar: "bg-error" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<PushFn>((t) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex w-[min(92vw,370px)] flex-col gap-2">
        {toasts.map((t) => {
          const meta = TONE_META[t.tone];
          const Icon = meta.icon;
          return (
            <div
              key={t.id}
              className="pointer-events-auto relative flex animate-toast-in items-start gap-3 overflow-hidden rounded-lg bg-surface-container-lowest p-3.5 pr-4 shadow-pop ring-1 ring-on-surface/5"
              role="status"
            >
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.tile)}>
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <div className="flex min-w-0 flex-col gap-space-2xs">
                <span className="font-sans text-title-sm text-on-surface">{t.title}</span>
                {t.desc && (
                  <span className="font-sans text-caption font-normal text-on-surface-variant">{t.desc}</span>
                )}
              </div>
              <span
                className={cn("absolute bottom-0 left-0 h-[2.5px] animate-toastbar rounded-full opacity-70", meta.bar)}
              />
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
