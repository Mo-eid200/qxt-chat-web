"use client";

import React from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  Menu,
  Share2,
  MoreHorizontal,
  Link as LinkIcon,
  Pencil,
  Trash2,
  Check,
  ChevronDown,
  Cpu,
  Clock,
  Layers,
} from "lucide-react";

import { useModels } from "../../context/ModelsContext";

export type SessionKind =
  | "chat"
  | "rag"
  | "design"
  | "code"
  | "business"
  | "support"
  | "other";

interface ChatHeaderProps {
  conversationId?: string | number | null;
  sessionTitle?: string | null;
  sessionKind?: SessionKind;

  // API version (v1) optional – shown as small badge (not in engine line)
  apiVersion?: string;

  lang: "en" | "ar";
  sidebarOpen: boolean;
  darkMode: boolean;

  onToggleSidebar: () => void;

  onCopyLink?: () => void;
  onNativeShare?: () => void;

  onRenameSession?: () => void;
  onDeleteSession?: () => void;

  onShareClick?: () => void;
  onOptionsClick?: () => void;
}

/* =========================
   Helpers
========================= */

function shortId(id: string | number | null | undefined) {
  if (!id) return null;
  const s = String(id);
  if (s.includes("-")) return s.slice(-8);
  return s.length > 10 ? s.slice(-8) : s;
}

function getKindLabel(kind: SessionKind | undefined, lang: "en" | "ar") {
  const isAr = lang === "ar";
  const map: Record<SessionKind, { ar: string; en: string }> = {
    chat: { ar: "محادثة", en: "Chat" },
    rag: { ar: "بحث", en: "Research" },
    design: { ar: "تصميم", en: "Design" },
    code: { ar: "برمجة", en: "Coding" },
    business: { ar: "بيزنس", en: "Business" },
    support: { ar: "دعم", en: "Support" },
    other: { ar: "جلسة", en: "Session" },
  };
  const k: SessionKind = kind ?? "chat";
  return isAr ? map[k].ar : map[k].en;
}

// gen + minor -> "G1.0" (uses backend gen_minor/minor when available)
function formatGen(gen: number | null | undefined, minor?: number | null) {
  const g = typeof gen === "number" && Number.isFinite(gen) ? gen : 1;
  const m = typeof minor === "number" && Number.isFinite(minor) ? minor : 0;
  return `G-${g}.${m}`;
}


type ProductKey = "chat" | "research" | "vision" | "code" | "library";

const PRODUCT_CATALOG: Array<{
  key: ProductKey;
  title: string;
  sub: string;
  icon: string;
  href: string;
}> = [
  { key: "chat", title: "ChatQXT", sub: "Pulse Engine", icon: "/chatqxt0.png", href: "/qxt-chat" },
  { key: "research", title: "ResearchQXT", sub: "Atlas Engine", icon: "/QXT-Research.png", href: "/qxt-research" },
  { key: "vision", title: "VisionQXT", sub: "Iris Engine", icon: "/QXT-Vision.png", href: "/qxt-vision" },
  { key: "code", title: "CodeQXT", sub: "Forge Engine", icon: "/QXT-Code.png", href: "/qxt-code" },
  { key: "library", title: "LibraryQXT", sub: "Archive Engine", icon: "/QXT-Library.png", href: "/qxt-library" },
];

export function ChatHeader({
  conversationId,
  sessionTitle,
  sessionKind = "chat",
  apiVersion = "v1",
  lang,
  sidebarOpen,
  darkMode,
  onToggleSidebar,
  onCopyLink,
  onNativeShare,
  onRenameSession,
  onDeleteSession,
  onShareClick,
  onOptionsClick,
}: ChatHeaderProps) {
  const isAr = lang === "ar";

  /* =========================
     Models Context (Backend-bound)
  ========================= */
  const { loading, error, modelsByProduct, selected, selectModel } = useModels();

  // for ChatQXT: only chat product
  const chatModels = (modelsByProduct?.["chat"] || []) as any[];

  // latest generation per engine id
  const engineFamilies = React.useMemo(() => {
    const byId = new Map<string, any>();
    for (const m of chatModels) {
      const prev = byId.get(m.id);
      const mg = typeof m.gen === "number" ? m.gen : 1;
      const pg = typeof prev?.gen === "number" ? prev.gen : 1;
      if (!prev || mg > pg) byId.set(m.id, m);
    }
    return Array.from(byId.values()).sort((a, b) => (b.gen ?? 1) - (a.gen ?? 1));
  }, [chatModels]);

  // current engine object
  const currentEngine = React.useMemo(() => {
    if (!chatModels.length) return null;

    if (selected?.id) {
      return (
        chatModels.find((m) => m.id === selected.id && m.gen === selected.gen) ??
        chatModels.find((m) => m.id === selected.id) ??
        engineFamilies.find((m) => m.id === selected.id) ??
        engineFamilies[0] ??
        chatModels[0]
      );
    }

    return engineFamilies[0] ?? chatModels[0];
  }, [chatModels, engineFamilies, selected?.id, selected?.gen]);

  const currentGen = selected?.gen ?? (currentEngine?.gen ?? 1);
  const currentMinor =
    (selected as any)?.minor ??
    (selected as any)?.gen_minor ??
    (currentEngine as any)?.minor ??
    (currentEngine as any)?.gen_minor ??
    0;

  const engineName = currentEngine?.public_name ?? "Pulse";

  // Previous versions (same engine id, lower gen)
  const previousVersions = React.useMemo(() => {
    if (!currentEngine?.id) return [];
    const all = chatModels
      .filter((m) => m.id === currentEngine.id)
      .sort((a, b) => (b.gen ?? 1) - (a.gen ?? 1));
    return all.filter((m) => (m.gen ?? 1) < currentGen).slice(0, 10);
  }, [chatModels, currentEngine?.id, currentGen]);

  const shownModelLine = `${engineName} · ${formatGen(currentGen, currentMinor)}`;

  /* =========================
     3 Menus: share | options | model
  ========================= */
  type MenuRoot = null | "share" | "options" | "model";
  const [menuOpen, setMenuOpen] = React.useState<MenuRoot>(null);
  const [copied, setCopied] = React.useState(false);
  const [showOlder, setShowOlder] = React.useState(false);

  const pickVersion = (m: any) => {
    selectModel(m.id, m.gen ?? 1);
    setMenuOpen(null);
    setShowOlder(false);
  };

  const shareBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const optionsBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const modelBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const getActiveAnchorEl = React.useCallback(() => {
    if (menuOpen === "share") return shareBtnRef.current;
    if (menuOpen === "options") return optionsBtnRef.current;
    return modelBtnRef.current;
  }, [menuOpen]);

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  const computeMenuPosition = React.useCallback(() => {
    const anchor = getActiveAnchorEl();
    if (!anchor) return;

    const r = anchor.getBoundingClientRect();
    const MENU_W = 380;
    const GAP = 10;

    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;

    const top = r.bottom + GAP;
    let left = isAr ? r.left : r.right - MENU_W;

    const maxLeft = Math.max(8, vw - MENU_W - 8);
    left = clamp(left, 8, maxLeft);

    const approxH = menuOpen === "model" ? 640 : 220;
    let finalTop = top;
    if (finalTop + approxH > vh - 8) {
      finalTop = Math.max(8, r.top - GAP - approxH);
    }

    setMenuPos({ top: finalTop, left });
  }, [getActiveAnchorEl, isAr, menuOpen]);

  React.useEffect(() => {
    if (!menuOpen) return;

    computeMenuPosition();

    function onDown(e: MouseEvent) {
      const t = e.target as Node;

      const inside =
        menuRef.current?.contains(t) ||
        shareBtnRef.current?.contains(t) ||
        optionsBtnRef.current?.contains(t) ||
        modelBtnRef.current?.contains(t);

      if (!inside) {
        setMenuOpen(null);
        setShowOlder(false);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(null);
        setShowOlder(false);
      }
    }

    function onReflow() {
      computeMenuPosition();
    }

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [menuOpen, computeMenuPosition]);

  async function doCopyLink() {
    try {
      if (!onCopyLink) return;
      onCopyLink();
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {}
  }

  /* =========================
     Styles
  ========================= */
  const headerBG = darkMode ? "bg-[#020712]/92" : "bg-[#052536]/92";
  const headerBorder = darkMode ? "border-b border-emerald-900/60" : "border-b border-cyan-900/60";
  const headerShadow = darkMode
    ? "shadow-[0_10px_35px_rgba(0,0,0,0.75)]"
    : "shadow-[0_10px_35px_rgba(0,0,0,0.65)]";

  const textMain = darkMode ? "text-emerald-100" : "text-cyan-50";
  const textSub = darkMode ? "text-emerald-300/75" : "text-cyan-200/80";

  const badgeBorder = darkMode ? "border-emerald-900/70" : "border-cyan-700/70";
  const badgeBG = darkMode ? "bg-black/60" : "bg-[#031821]/90";
  const badgeText = darkMode ? "text-emerald-100" : "text-cyan-50";

  const logoFrameBorder = darkMode ? "border-emerald-400/80" : "border-cyan-300/80";
  const logoFrameBG = darkMode
    ? "bg-gradient-to-br from-emerald-500/40 via-cyan-500/30 to-emerald-700/40"
    : "bg-gradient-to-br from-cyan-400/40 via-sky-500/30 to-emerald-500/40";
  const logoShadow = darkMode
    ? "shadow-[0_0_28px_rgba(16,185,129,0.95)]"
    : "shadow-[0_0_22px_rgba(34,211,238,0.9)]";

  const kindLabel = getKindLabel(sessionKind, lang);
  const sid = shortId(conversationId);

  const centerLabel =
    sessionTitle?.trim()
      ? sessionTitle.trim()
      : conversationId
      ? `${kindLabel} · #${sid ?? ""}`.trim()
      : isAr
      ? "محادثة جديدة"
      : "New chat";

  const menuBase = darkMode
    ? "bg-[#061018]/95 border-emerald-900/60 text-emerald-50"
    : "bg-[#052536]/95 border-cyan-800/60 text-cyan-50";

  const menuItem =
    "w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-white/5 transition rounded-lg";
  const menuIcon = "w-4 h-4";

  const chipBtn = `
    hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px]
    ${
      darkMode
        ? "border-emerald-700/70 bg-black/50 text-emerald-100 hover:bg-black/80"
        : "border-cyan-700/70 bg-[#031821]/90 text-cyan-100 hover:bg-[#041d28]"
    }
    transition
  `;

  const modelChip = `
    hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl border
    ${
      darkMode
        ? "border-emerald-700/70 bg-black/55 hover:bg-black/80 text-emerald-100"
        : "border-cyan-700/70 bg-[#031821]/90 hover:bg-[#041d28] text-cyan-100"
    }
    transition
  `;

  /* =========================
     Menus (Portal)
  ========================= */

  const ShareMenu = (
    <div className="space-y-1">
      <button type="button" className={menuItem} onClick={doCopyLink}>
        {copied ? <Check className={menuIcon} /> : <LinkIcon className={menuIcon} />}
        <span>{isAr ? "نسخ رابط الجلسة" : "Copy session link"}</span>
      </button>

      <button
        type="button"
        className={menuItem}
        onClick={() => {
          onNativeShare?.();
          setMenuOpen(null);
        }}
      >
        <Share2 className={menuIcon} />
        <span>{isAr ? "مشاركة…" : "Share…"}</span>
      </button>
    </div>
  );

  const OptionsMenu = (
    <div className="space-y-1">
      <button
        type="button"
        className={menuItem}
        onClick={() => {
          onRenameSession?.();
          setMenuOpen(null);
        }}
      >
        <Pencil className={menuIcon} />
        <span>{isAr ? "إعادة تسمية" : "Rename"}</span>
      </button>

      <button
        type="button"
        className={`${menuItem} text-red-200 hover:bg-red-500/10`}
        onClick={() => {
          onDeleteSession?.();
          setMenuOpen(null);
        }}
      >
        <Trash2 className={menuIcon} />
        <span>{isAr ? "حذف الجلسة" : "Delete session"}</span>
      </button>
    </div>
  );

  const ModelMenu = (
    <div className="space-y-3">
      {/* Header */}
      <div className="px-2 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate">ChatQXT</div>
            <div className="text-[11px] opacity-75 truncate">
              <span className="opacity-90">{engineName} Engine</span>
              <span className="opacity-60"> · </span>
              <span className="opacity-90">{formatGen(currentGen, currentMinor)}</span>
              <span className="opacity-60"> · </span>
              <span className="opacity-85">
                {isAr ? "Quarc response engine" : "Quarc response engine"}
              </span>
            </div>
          </div>

          {/* G chip */}
          <div
            className={`shrink-0 px-2 py-1 rounded-full border text-[11px] font-semibold ${
              darkMode
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                : "border-cyan-300/40 bg-cyan-400/10 text-cyan-50"
            }`}
            title="Generation"
          >
            {formatGen(currentGen, currentMinor)}
          </div>
        </div>
      </div>

      <div className="h-px bg-white/10 mx-2" />

      {/* Versions */}
      <div className="px-2">
        <div className="text-[11px] opacity-70 mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 opacity-70" />
          {isAr ? "إصدارات المحرك" : "Engine versions"}
        </div>

        <div className="space-y-1">
          {/* Current */}
          <div
            className={`
              w-full flex items-center justify-between gap-2
              px-3 py-2 rounded-xl border text-[12px]
              ${darkMode ? "border-emerald-900/60 bg-black/45" : "border-cyan-800/60 bg-[#031821]/75"}
            `}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Cpu className="w-4 h-4 opacity-80" />
              <span className="font-semibold truncate">{engineName}</span>
              <span className="opacity-70">· {formatGen(currentGen, currentMinor)}</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] opacity-80">
              <Check className="w-4 h-4" />
              {isAr ? "نشط" : "Active"}
            </span>
          </div>

          {/* Older toggle */}
          {previousVersions.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setShowOlder((v) => !v)}
                className={`
                  w-full flex items-center justify-between gap-2
                  px-3 py-2 rounded-xl border text-[12px]
                  ${
                    darkMode
                      ? "border-emerald-900/40 bg-black/15 hover:bg-white/5"
                      : "border-cyan-800/40 bg-[#031821]/30 hover:bg-white/5"
                  }
                  transition
                `}
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 opacity-70" />
                  <span className="font-semibold">{isAr ? "إصدارات أقدم" : "Previous versions"}</span>
                </span>
                <span className="text-[11px] opacity-70">
                  {showOlder ? (isAr ? "إخفاء" : "Hide") : (isAr ? "عرض" : "Show")}
                </span>
              </button>

              {showOlder ? (
                <div className="space-y-1">
                  {previousVersions.map((m: any) => (
                    <button
                      key={`prev:${m.id}:${m.gen}`}
                      type="button"
                      onClick={() => pickVersion(m)}
                      className={`
                        w-full flex items-center justify-between gap-2
                        px-3 py-2 rounded-xl border text-[12px]
                        ${
                          darkMode
                            ? "border-emerald-900/30 bg-black/10 hover:bg-white/5"
                            : "border-cyan-800/30 bg-[#031821]/20 hover:bg-white/5"
                        }
                        transition
                      `}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Clock className="w-4 h-4 opacity-60" />
                        <span className="font-semibold truncate">{m.public_name ?? engineName}</span>
                      </span>
                      <span className="text-[11px] opacity-70">
                        {formatGen(m.gen ?? 1, (m as any)?.gen_minor ?? (m as any)?.minor ?? 0)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="px-3 py-2 text-[12px] opacity-60">
              {isAr ? "لا يوجد إصدارات أخرى" : "No other versions"}
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-white/10 mx-2" />

      {/* Products */}
      <div className="px-2 pb-1">
        <div className="text-[11px] opacity-70 mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 opacity-70" />
          {isAr ? "منتجات QXT" : "QXT Products"}
        </div>

        <div className="space-y-1">
          {PRODUCT_CATALOG.map((p) => (
            <a
              key={p.key}
              href={p.href}
              className={`
                w-full flex items-center justify-between gap-3
                px-3 py-2 rounded-xl border text-[12px]
                ${
                  darkMode
                    ? "border-emerald-900/50 bg-black/35 hover:bg-white/5"
                    : "border-cyan-800/50 bg-[#031821]/65 hover:bg-white/5"
                }
                transition
              `}
              onClick={() => setMenuOpen(null)}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="relative h-9 w-9 rounded-xl overflow-hidden border border-white/10 bg-black/40 shrink-0">
                  <Image src={p.icon} alt={p.title} fill sizes="36px" className="object-cover" />
                </span>

                <span className="min-w-0">
                  <div className="font-semibold truncate">{p.title}</div>
                  <div className="text-[10px] opacity-70 truncate">{p.sub}</div>
                </span>
              </span>

              <span className="inline-flex items-center gap-1 text-[10px] opacity-70">
                {isAr ? "فتح" : "Open"} <span className="opacity-60">→</span>
              </span>
            </a>
          ))}
        </div>

        <div className="mt-3 px-1 text-[10px] opacity-60 flex items-center justify-between">
          <span>
            {isAr ? "النوع" : "Kind"}: {getKindLabel(sessionKind, lang)}
          </span>
          <span>
            {isAr ? "الموديل" : "Model"}: {shownModelLine}
          </span>
        </div>
      </div>
    </div>
  );

  const MenuPanel = (
    <div
      ref={menuRef}
      className={`
        fixed w-[380px] rounded-2xl border
        shadow-[0_18px_60px_rgba(0,0,0,0.55)]
        ${menuBase} p-2 z-[9999]
      `}
      style={{ top: menuPos.top, left: menuPos.left }}
    >
      <div className="px-2 py-1.5 text-[11px] opacity-70 flex items-center justify-between">
        <span>{isAr ? "Menu" : "Menu"}</span>
        <span className="text-[10px] opacity-70">OpenQCore</span>
      </div>

      {menuOpen === "share" ? ShareMenu : null}
      {menuOpen === "options" ? OptionsMenu : null}
      {menuOpen === "model" ? ModelMenu : null}
    </div>
  );

  /* =========================
     Render
  ========================= */
  return (
    <header
      className={`
        relative flex items-center justify-between
        px-4 py-3 backdrop-blur-2xl
        ${headerBG} ${headerBorder} ${headerShadow}
        transition-all duration-300
      `}
    >
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`
            md:hidden p-1.5 rounded-full border text-xs
            ${
              darkMode
                ? "border-emerald-500/60 bg-black/70 text-emerald-200"
                : "border-cyan-400/70 bg-[#031821]/90 text-cyan-100"
            }
          `}
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`
              relative h-12 w-12 rounded-2xl overflow-hidden shrink-0
              border ${logoFrameBorder} ${logoFrameBG} ${logoShadow}
              flex items-center justify-center
            `}
          >
            <div className="absolute inset-[2px] rounded-2xl bg-black/60 border border-black/50" />
            <Image
              src="/chatqxt.png"
              alt="Chat-QXT"
              fill
              sizes="48px"
              className="object-contain relative z-10 scale-[1.08]"
            />
          </div>

          <div className="flex flex-col min-w-0">
            <div className={`text-sm font-semibold tracking-wide ${textMain}`}>ChatQXT</div>

            {/* ✅ Engine line (G driven by backend selection) */}
<div className={`text-[11px] ${textSub} truncate flex items-center gap-1.5`}>
  <span className="opacity-80">{engineName} Engine</span>
  <span className="opacity-60">·</span>
  <span className="text-[12px] font-semibold">{formatGen(currentGen, currentMinor)}</span>
  <span className="opacity-60">·</span>
  <span className="opacity-80">{isAr ? "Quarc response engine" : "Quarc response engine"}</span>

            </div>

            {/* Powered by OpenQCore */}
            <div
              className={`
                mt-1 inline-flex items-center gap-1.5 px-2 py-[3px]
                rounded-full border ${badgeBorder} ${badgeBG}
                w-fit
              `}
            >
              <span
                className={`
                  relative h-5 w-5 rounded-full overflow-hidden bg-black/85
                  ${
                    darkMode
                      ? "border border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.7)]"
                      : "border border-cyan-300/80 shadow-[0_0_12px_rgba(34,211,238,0.75)]"
                  }
                `}
              >
                <Image src="/OpenQCore.png" alt="OpenQCore" fill className="object-contain p-[1px]" />
              </span>
              <span className={`text-[10px] leading-none ${badgeText}`}>
                {isAr ? "مدعوم من OpenQCore" : "Powered by OpenQCore"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex justify-center px-3">
        <div
          className={`
            max-w-[520px] w-full sm:w-auto
            px-3 py-1.5 rounded-full border text-[11px] font-medium
            shadow-[0_0_18px_rgba(6,95,70,0.45)]
            truncate
            ${
              darkMode
                ? "bg-black/60 border-emerald-800/70 text-emerald-200"
                : "bg-[#02141f]/90 border-cyan-800/70 text-cyan-100"
            }
          `}
          title={conversationId ? String(conversationId) : undefined}
        >
          {centerLabel}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 relative">
        {/* Model menu (versions + products) */}
        <button
          ref={modelBtnRef}
          type="button"
          onClick={() => {
            setMenuOpen((v) => (v === "model" ? null : "model"));
            setShowOlder(false);
          }}
          className={modelChip}
          aria-label="Model menu"
          title={isAr ? "الإصدارات والمنتجات" : "Versions & products"}
        >
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[12px] font-semibold">ChatQXT</span>
            <span className="text-[10px] opacity-75">{shownModelLine}</span>
          </span>
          <ChevronDown className="w-4 h-4 opacity-70" />
        </button>

        {/* Share menu */}
        <button
          ref={shareBtnRef}
          type="button"
          onClick={() => {
            onShareClick?.();
            setMenuOpen((v) => (v === "share" ? null : "share"));
            setShowOlder(false);
          }}
          className={chipBtn}
          aria-label="Share"
        >
          <Share2 className="w-3 h-3" />
          {isAr ? "مشاركة" : "Share"}
        </button>

        {/* Options menu (rename/delete only) */}
        <button
          ref={optionsBtnRef}
          type="button"
          onClick={() => {
            onOptionsClick?.();
            setMenuOpen((v) => (v === "options" ? null : "options"));
            setShowOlder(false);
          }}
          className={`
            flex items-center justify-center w-8 h-8 rounded-full border
            ${
              darkMode
                ? "border-emerald-700/70 bg-black/60 text-emerald-100 hover:bg-black/85"
                : "border-cyan-700/70 bg-[#031821]/90 text-cyan-100 hover:bg-[#041d28]"
            }
            transition
          `}
          aria-label="Options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {mounted && menuOpen ? createPortal(MenuPanel, document.body) : null}
      </div>
    </header>
  );
}
