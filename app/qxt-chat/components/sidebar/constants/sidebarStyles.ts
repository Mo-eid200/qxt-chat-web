import type {
    SidebarEnvironment,
} from "./sidebarEnvironment";

export function getSidebarStyles(
    darkMode: boolean,
    open: boolean,
    environment: SidebarEnvironment
) {
    const isWorkspace =
        environment === "workspace";

    const cn = (
        ...a: Array<
            | string
            | false
            | null
            | undefined
        >
    ) => a.filter(Boolean).join(" ");

    return {
        /* =====================================================
           ROWS
        ===================================================== */

        rowBase: cn(
            "group relative w-full flex items-center gap-2.5",
            "px-2.5 py-2",
            "rounded-2xl",
            "transition-all duration-200 ease-out",
            "text-left",
            "select-none"
        ),

        rowHover: isWorkspace
            ? "hover:bg-cyan-400/[0.07]"
            : "hover:bg-white/[0.045]",

        rowActive: isWorkspace
            ? "bg-cyan-400/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            : "bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",

        /* =====================================================
           CONTAINER
        ===================================================== */

        containerBg: darkMode
            ? isWorkspace
                ? [
                    "bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_30%)]",
                    "bg-[#0B1020]/92",
                    "backdrop-blur-2xl",
                ].join(" ")
                : [
                    "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.07),transparent_28%)]",
                    "bg-[#0B0F14]/92",
                    "backdrop-blur-2xl",
                ].join(" ")
            : [
                "bg-white/90",
                "backdrop-blur-2xl",
            ].join(" "),

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
                    return isWorkspace
                        ? "bg-cyan-400/[0.04]"
                        : "bg-white/[0.03]";
                }

                if (k === "projects") {
                    return "bg-violet-400/[0.045]";
                }

                if (k === "library") {
                    return "bg-fuchsia-400/[0.045]";
                }

                return "bg-amber-400/[0.045]";
            }

            return "bg-black/[0.03]";
        },

        /* =====================================================
           BADGES
        ===================================================== */

        folderBadge: (
            kind?: string
        ) => {
            const k =
                kind || "project";

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

                return [
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
                "bg-[#10151F]/96",
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
                ? "hover:bg-white/[0.05]"
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
            ? "text-white/[0.72] hover:bg-white/[0.05]"
            : "text-slate-700 hover:bg-black/[0.05]",

        iconBtn: cn(
            "h-9 w-9",
            "rounded-2xl",
            "flex items-center justify-center",
            "transition-all duration-200",
            "active:scale-[0.96]"
        ),

        iconTheme: darkMode
            ? "text-white/[0.82] hover:bg-white/[0.05]"
            : "text-slate-800 hover:bg-black/[0.05]",

        /* =====================================================
           SIDEBAR
        ===================================================== */

        sideShadow:
            "shadow-[0_10px_50px_rgba(0,0,0,0.45)]",

        widthClass: open
            ? "w-[290px]"
            : "w-[290px] md:w-[92px]",

        /* =====================================================
           LABELS
        ===================================================== */

        sectionLabel: cn(
            "px-2 mb-1 mt-3",
            "text-[10px]",
            "font-semibold",
            "uppercase tracking-[0.18em]",
            darkMode
                ? isWorkspace
                    ? "text-cyan-300/55"
                    : "text-white/[0.34]"
                : "text-slate-500"
        ),
    };
}