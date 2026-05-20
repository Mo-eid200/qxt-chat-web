// components/visionTheme.ts
export type VisionTheme = {
  root: string;
  text: string;
  muted: string;
  border: string;

  glass: string;
  glassSoft: string;

  aurora: string;
  grainOpacity: string;

  btn: string;
  btnGhost: string;

  input: string;

  pill: string;

  sidebarBg: string;
  sidebarShadow: string;

  activeRow: string;
  rowHover: string;

  ring: string;

  headerBar: string;
  headerLine: string;

  headerAura: string;
  irisGlow: string;
  logoRing: string;
};

export function getVisionTheme(darkMode: boolean): VisionTheme {
  // ============== LIGHT (Clean Enterprise) ==============
  if (!darkMode) {
    return {
      root: "bg-[#F6F8FC]",

      text: "text-slate-900",
      muted: "text-slate-600",

      border: "border-slate-900/10",

      glass: "bg-white/80",
      glassSoft: "bg-white/70",

      // quiet, single-family aurora (blue only)
      aurora:
        "bg-[radial-gradient(1100px_circle_at_18%_10%,rgba(77,163,255,0.12),transparent_60%),radial-gradient(900px_circle_at_82%_18%,rgba(12,74,110,0.06),transparent_62%),radial-gradient(900px_circle_at_50%_96%,rgba(77,163,255,0.06),transparent_64%)]",
      grainOpacity: "opacity-[0.04]",

      btn: "bg-white hover:bg-white/95 border-slate-900/10 text-slate-900",
      btnGhost: "bg-transparent hover:bg-slate-900/[0.04] border-slate-900/10 text-slate-900",

      input:
        "bg-white/90 border-slate-900/10 focus:border-sky-500/35 focus:ring-sky-500/10 text-slate-900 placeholder:text-slate-500",

      pill: "bg-white/75 border-slate-900/10 text-slate-900",

      sidebarBg: "bg-white/75",
      sidebarShadow: "shadow-[18px_0_70px_rgba(15,23,42,0.10)]",

      activeRow: "bg-sky-500/[0.08]",
      rowHover: "hover:bg-slate-900/[0.03]",
      ring: "ring-1 ring-slate-900/10",

      headerBar: "bg-white/78",
      headerLine:
        "bg-[linear-gradient(90deg,transparent,rgba(77,163,255,0.55),rgba(77,163,255,0.22),transparent)]",
      headerAura:
        "bg-[radial-gradient(900px_circle_at_22%_0%,rgba(77,163,255,0.10),transparent_58%)]",

      irisGlow:
        "bg-[radial-gradient(60px_circle_at_50%_50%,rgba(77,163,255,0.45),transparent_70%)]",
      logoRing:
        "bg-[linear-gradient(135deg,rgba(77,163,255,0.50),rgba(15,23,42,0.08),rgba(77,163,255,0.16))]",
    };
  }

  // ============== DARK (Monochrome Intelligence) ==============
  return {
    root: "bg-[#0B0E14]",

    text: "text-zinc-100",
    muted: "text-zinc-400/80",

    border: "border-white/10",

    glass: "bg-white/[0.035]",
    glassSoft: "bg-white/[0.028]",

    // quiet, single-family aurora
    aurora:
      "bg-[radial-gradient(1100px_circle_at_18%_10%,rgba(77,163,255,0.16),transparent_62%),radial-gradient(900px_circle_at_82%_18%,rgba(77,163,255,0.10),transparent_64%),radial-gradient(900px_circle_at_50%_96%,rgba(2,132,199,0.08),transparent_70%)]",
    grainOpacity: "opacity-[0.10]",

    btn: "bg-white/[0.05] hover:bg-white/[0.08] border-white/10 text-white",
    btnGhost: "bg-transparent hover:bg-white/[0.06] border-white/10 text-white",

    input:
      "bg-black/25 border-white/10 focus:border-sky-400/40 focus:ring-sky-400/15 text-white placeholder:text-white/45",

    pill: "bg-white/[0.05] border-white/10 text-white",

    sidebarBg: "bg-[#0D111B]/75",
    sidebarShadow: "shadow-[18px_0_80px_rgba(0,0,0,0.60)]",

    activeRow: "bg-white/[0.06]",
    rowHover: "hover:bg-white/[0.05]",
    ring: "ring-1 ring-white/10",

    headerBar: "bg-[#0E1422]/55",
    headerLine:
      "bg-[linear-gradient(90deg,transparent,rgba(77,163,255,0.60),rgba(77,163,255,0.22),transparent)]",
    headerAura:
      "bg-[radial-gradient(900px_circle_at_18%_0%,rgba(77,163,255,0.14),transparent_60%)]",

    irisGlow:
      "bg-[radial-gradient(60px_circle_at_50%_50%,rgba(77,163,255,0.55),transparent_72%)]",
    logoRing:
      "bg-[linear-gradient(135deg,rgba(77,163,255,0.55),rgba(255,255,255,0.06),rgba(77,163,255,0.18))]",
  };
}
