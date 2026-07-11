import type {
  SidebarEnvironment,
} from "./sidebarEnvironment";

export function getSidebarStyles(
  darkMode: boolean,
  open: boolean,
  environment: SidebarEnvironment
) {
  // This product only ever ships a single (dark) theme — no light
  // mode toggle. Rather than touching every ternary using `darkMode`
  // across the many sidebar sub-components that call this function,
  // we force it here once so callers can keep passing whatever value
  // they already have without any effect.
  darkMode = true;

  const isWorkspace =
    environment === "workspace";

  const isAgent =
    environment === "agent";

  const cn = (
    ...a: Array<
      | string
      | false
      | null
      | undefined
    >
  ) => a.filter(Boolean).join(" ");

  // Matches the openqcore-web design system: Personal = amber,
  // Workspace = red. (Agent-scoped chats keep a distinct violet accent
  // since they're a third, separate context from Personal/Workspace.)
  const accentHover = isAgent
    ? "hover:bg-violet-400/[0.08]"
    : isWorkspace
      ? "hover:bg-red-400/[0.07]"
      : "hover:bg-amber-300/[0.06]";

  const accentActive = isAgent
    ? "bg-violet-400/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    : isWorkspace
      ? "bg-red-400/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
      : "bg-amber-300/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";

  const sectionLabelColor = darkMode
    ? isAgent
      ? "text-violet-300/60"
      : isWorkspace
        ? "text-red-300/55"
        : "text-white/[0.34]"
    : "text-slate-500";

  const containerBg = [
    "bg-[#0f1012]/94",
    "backdrop-blur-2xl",
  ].join(" ");

  return {
    /* =====================================================
       ROWS
    ===================================================== */

    rowBase: cn(
      "group relative w-full flex items-center gap-2.5",
      "px-3 py-2.5",
      "rounded-2xl",
      "transition-all duration-200 ease-out",
      "text-left",
      "select-none",
      "min-w-0"
    ),

    rowHover: accentHover,

    rowActive: accentActive,

    /* =====================================================
       CONTAINER
    ===================================================== */

    containerBg,

    /* =====================================================
       TEXT
    ===================================================== */

    textMain: darkMode
      ? "text-white/[0.92]"
      : "text-slate-900",

    textMuted: darkMode
      ? "text-white/[0.42]"
      : "text-slate-500",

    /* =====================================================
       SECTION SURFACES
    ===================================================== */

    sectionAccent: (k: string) => {
      if (darkMode) {
        if (k === "root") {
          if (isAgent) {
            return "bg-violet-400/[0.05]";
          }

          if (isWorkspace) {
            return "bg-cyan-400/[0.04]";
          }

          return "bg-white/[0.03]";
        }

        if (k === "projects") {
          return isAgent
            ? "bg-violet-400/[0.05]"
            : "bg-violet-400/[0.045]";
        }

        if (k === "library") {
          return isAgent
            ? "bg-indigo-400/[0.05]"
            : "bg-fuchsia-400/[0.045]";
        }

        if (k === "code") {
          return isAgent
            ? "bg-sky-400/[0.05]"
            : "bg-amber-400/[0.045]";
        }

        if (k === "vision") {
          return "bg-emerald-400/[0.045]";
        }

        return "bg-white/[0.03]";
      }

      return "bg-black/[0.03]";
    },

    /* =====================================================
       BADGES
    ===================================================== */

    folderBadge: (
      kind?: string
    ) => {
      const k = kind || "project";

      if (darkMode) {
        if (k === "project") {
          return [
            "bg-violet-400/[0.10]",
            "text-violet-100",
          ].join(" ");
        }

        if (k === "library") {
          return [
            "bg-fuchsia-400/[0.10]",
            "text-fuchsia-100",
          ].join(" ");
        }

        if (k === "code") {
          return [
            "bg-amber-400/[0.10]",
            "text-amber-100",
          ].join(" ");
        }

        if (k === "agent") {
          return [
            "bg-violet-400/[0.12]",
            "text-violet-100",
          ].join(" ");
        }

        return isAgent
          ? [
              "bg-violet-400/[0.10]",
              "text-violet-100",
            ].join(" ")
          : [
              "bg-emerald-400/[0.10]",
              "text-emerald-100",
            ].join(" ");
      }

      return "bg-black/[0.05] text-slate-700";
    },

    /* =====================================================
       MENUS
    ===================================================== */

    menuBox: darkMode
      ? [
          isAgent
            ? "bg-[#151022]/96"
            : "bg-[#10151F]/96",
          "backdrop-blur-2xl",
          "border border-white/[0.06]",
          "shadow-[0_10px_40px_rgba(0,0,0,0.45)]",
          "text-white",
        ].join(" ")
      : [
          "bg-white/95",
          "backdrop-blur-xl",
          "border border-black/[0.06]",
          "shadow-xl",
          "text-slate-900",
        ].join(" "),

    menuItem: cn(
      "w-full flex items-center gap-2",
      "px-3 py-2.5",
      "text-[12px]",
      "rounded-xl",
      "transition-all duration-150",
      darkMode
        ? isAgent
          ? "hover:bg-violet-400/[0.08]"
          : "hover:bg-white/[0.05]"
        : "hover:bg-black/[0.04]"
    ),

    /* =====================================================
       BUTTONS
    ===================================================== */

    miniIconBtn: cn(
      "h-7 w-7",
      "rounded-xl",
      "flex items-center justify-center",
      "transition-all duration-200",
      "active:scale-[0.96]"
    ),

    miniIconTheme: darkMode
      ? isAgent
        ? "text-violet-100/80 hover:bg-violet-400/[0.08]"
        : "text-white/[0.72] hover:bg-white/[0.05]"
      : "text-slate-700 hover:bg-black/[0.05]",

    iconBtn: cn(
      "h-9 w-9",
      "rounded-2xl",
      "flex items-center justify-center",
      "transition-all duration-200",
      "active:scale-[0.96]"
    ),

    iconTheme: darkMode
      ? isAgent
        ? "text-violet-100/85 hover:bg-violet-400/[0.08]"
        : "text-white/[0.82] hover:bg-white/[0.05]"
      : "text-slate-800 hover:bg-black/[0.05]",

    /* =====================================================
       SIDEBAR
    ===================================================== */

    sideShadow:
      "shadow-[0_10px_50px_rgba(0,0,0,0.45)]",

    widthClass: open
      ? "w-[280px]"
      : "w-[280px] md:w-[88px]",

    /* =====================================================
       LABELS
    ===================================================== */

    sectionLabel: cn(
      "px-2 mb-1 mt-3",
      "text-[10px]",
      "font-semibold",
      "uppercase tracking-[0.18em]",
      sectionLabelColor
    ),
  };
}