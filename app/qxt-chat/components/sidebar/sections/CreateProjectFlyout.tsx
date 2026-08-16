import React from "react";
import { createPortal } from "react-dom";
import { FolderOpen } from "lucide-react";

type CreateProjectFlyoutProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  darkMode: boolean;
  value: string;
  setValue: (val: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  L: Record<string, string>;
};

export function CreateProjectFlyout({
  open,
  anchorRef,
  darkMode,
  value,
  setValue,
  onSubmit,
  onCancel,
  L,
}: CreateProjectFlyoutProps) {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!open || !anchorRef.current) {
      setVisible(false);
      const timeout = setTimeout(() => setPos(null), 140);
      return () => clearTimeout(timeout);
    }

    const rect = anchorRef.current.getBoundingClientRect();
    const flyoutWidth = 296;
    const gap = 10;

    let left = rect.right + gap;
    let top = rect.top;

    if (left + flyoutWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.left - flyoutWidth - gap);
    }

    setPos({ top, left });
    requestAnimationFrame(() => setVisible(true));
  }, [open, anchorRef]);

  if (!open || !pos || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[90]" onClick={onCancel} />

      <div
        className={[
          "fixed z-[100] w-[296px] rounded-2xl border backdrop-blur-xl px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition-all duration-150 ease-out",
          darkMode
            ? "border-amber-300/20 bg-amber-300/[0.09]"
            : "border-black/10 bg-white/95",
          visible
            ? "opacity-100 translate-x-0 scale-100"
            : "opacity-0 -translate-x-1 scale-95"
        ].join(" ")}
        style={{
          top: pos.top,
          left: pos.left,
          transformOrigin: "top left",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 bg-amber-300/[0.14] text-amber-200">
            <FolderOpen className="w-4 h-4" />
          </div>

          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
              if (e.key === "Escape") onCancel();
            }}
            placeholder={L.projectNamePlaceholder || "Project name"}
            className="
              min-w-0 flex-1 h-8 rounded-xl px-3
              border border-amber-300/20
              bg-amber-300/[0.08]
              text-[13px] text-white
              placeholder:text-white/35
              outline-none
              transition-colors duration-150
              focus:border-amber-300/35
              focus:bg-amber-300/[0.12]
            "
          />

          <button
            type="button"
            className="h-8 px-3 rounded-xl text-[11px] font-medium bg-amber-300 text-black hover:bg-amber-200 transition active:scale-[0.98] disabled:opacity-40"
            onClick={onSubmit}
            disabled={!value.trim()}
            title={L.create}
          >
            {L.create}
          </button>

          <button
            type="button"
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white/70"
            onClick={onCancel}
            title={L.cancel}
          >
            ×
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}