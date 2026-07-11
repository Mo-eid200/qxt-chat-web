"use client";

import React from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  Menu,
  Share2,
  Link as LinkIcon,
  Pencil,
  Trash2,
  Check,
  ChevronDown,
  Cpu,
  Clock,
  Layers,
  Paperclip,
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
  apiVersion?: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onCopyLink?: () => void;
  onNativeShare?: () => void;
  onRenameSession?: () => void;
  onDeleteSession?: () => void;
  onShareClick?: () => void;
  onOptionsClick?: () => void;
  // The default "responder" persona is Quarc. When a Personal/Workspace
  // agent is active for this session (see AgentRuntimeContext), pass
  // its name here so the header reflects who's actually answering.
  activeAgentName?: string | null;
  // Optional — number of attachments (uploaded or generated) in this
  // session. Omit or 0 hides the paperclip icon.
  attachmentsCount?: number;
  onAttachmentsClick?: () => void;
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

function getKindLabel(kind: SessionKind | undefined) {
  const map: Record<SessionKind, string> = {
    chat: "Chat",
    rag: "Research",
    design: "Design",
    code: "Coding",
    business: "Business",
    support: "Support",
    other: "Session",
  };
  return map[kind ?? "chat"];
}

// gen + minor -> "G-1.0"
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
  onToggleSidebar,
  onCopyLink,
  onNativeShare,
  onRenameSession,
  onDeleteSession,
  onShareClick,
  activeAgentName,
  attachmentsCount = 0,
  onAttachmentsClick,
}: ChatHeaderProps) {
  /* =========================
     Models Context (Backend-bound)
  ========================= */
  const { modelsByProduct, selected, selectModel } = useModels();
  const chatModels = (modelsByProduct?.["chat"] || []) as any[];

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

  // Model's actual public name (not the internal "engine" codename).
  const modelName = currentEngine?.public_name ?? "Pulse";

  // Quarc is the default responder persona; an active agent takes over
  // as "the responder" instead, when one is running for this session.
  const responderName = activeAgentName?.trim() || "Quarc";

  const previousVersions = React.useMemo(() => {
    if (!currentEngine?.id) return [];
    const all = chatModels
      .filter((m) => m.id === currentEngine.id)
      .sort((a, b) => (b.gen ?? 1) - (a.gen ?? 1));
    return all.filter((m) => (m.gen ?? 1) < currentGen).slice(0, 10);
  }, [chatModels, currentEngine?.id, currentGen]);

  const shownModelLine = `${modelName} · ${formatGen(currentGen, currentMinor)}`;

  const sid = shortId(conversationId);
  const centerLabel =
    sessionTitle?.trim()
      ? sessionTitle.trim()
      : conversationId
      ? `${getKindLabel(sessionKind)} · #${sid ?? ""}`.trim()
      : "New chat";

  /* =========================
     4 Menus: title | share | model  (options menu retired — its two
     actions, Rename/Delete, now live under the title menu instead,
     since that was the only thing it ever did.)
  ========================= */
  type MenuRoot = null | "title" | "share" | "model";
  const [menuOpen, setMenuOpen] = React.useState<MenuRoot>(null);
  const [copied, setCopied] = React.useState(false);
  const [showOlder, setShowOlder] = React.useState(false);

  const pickVersion = (m: any) => {
    selectModel(m.id, m.gen ?? 1);
    setMenuOpen(null);
    setShowOlder(false);
  };

  const titleBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const shareBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const modelBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const getActiveAnchorEl = React.useCallback(() => {
    if (menuOpen === "title") return titleBtnRef.current;
    if (menuOpen === "share") return shareBtnRef.current;
    return modelBtnRef.current;
  }, [menuOpen]);

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  const computeMenuPosition = React.useCallback(() => {
    const anchor = getActiveAnchorEl();
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const MENU_W = menuOpen === "title" ? 240 : 380;
    const GAP = 8;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const top = r.bottom + GAP;
    let left = r.left;
    if (menuOpen !== "title") left = r.right - MENU_W;
    const maxLeft = Math.max(8, vw - MENU_W - 8);
    left = clamp(left, 8, maxLeft);
    const approxH = menuOpen === "model" ? 640 : 140;
    let finalTop = top;
    if (finalTop + approxH > vh - 8) {
      finalTop = Math.max(8, r.top - GAP - approxH);
    }
    setMenuPos({ top: finalTop, left });
  }, [getActiveAnchorEl, menuOpen]);

  React.useEffect(() => {
    if (!menuOpen) {
      setMenuVisible(false);
      return;
    }
    computeMenuPosition();
    requestAnimationFrame(() => setMenuVisible(true));

    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      const inside =
        menuRef.current?.contains(t) ||
        titleBtnRef.current?.contains(t) ||
        shareBtnRef.current?.contains(t) ||
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
     Shared styles — single dark theme, amber/red comes from
     var(--accent) (set on <html data-scope> by the sidebar's
     Personal/Workspace toggle), matching the site-wide system.
  ========================= */
  const menuItem =
    "w-full flex items-center gap-2 px-3 py-2 text-[12px] text-white/75 hover:bg-white/[0.06] hover:text-white transition rounded-lg";
  const menuIcon = "w-4 h-4";
  const menuPanelClass =
    "fixed rounded-2xl border border-white/[0.08] bg-[#0f1012]/95 backdrop-blur-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)] z-[9999] transition-all duration-150 ease-out";

  /* =========================
     Menus (Portal)
  ========================= */

  const TitleMenu = (
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
        <span>Rename</span>
      </button>
      <div className="my-1 border-t border-white/[0.08]" />
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-300 hover:bg-red-500/[0.10] hover:text-red-200 transition rounded-lg"
        onClick={() => {
          onDeleteSession?.();
          setMenuOpen(null);
        }}
      >
        <Trash2 className={menuIcon} />
        <span>Delete</span>
      </button>
    </div>
  );

  const ShareMenu = (
    <div className="space-y-1">
      <button type="button" className={menuItem} onClick={doCopyLink}>
        {copied ? <Check className={menuIcon} /> : <LinkIcon className={menuIcon} />}
        <span>Copy session link</span>
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
        <span>Share…</span>
      </button>
    </div>
  );

  const ModelMenu = (
    <div className="space-y-3">
      <div className="px-2 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-white truncate">{modelName}</div>
            <div className="text-[11px] text-white/50 truncate">
              <span>{formatGen(currentGen, currentMinor)}</span>
              <span className="opacity-60"> · </span>
              <span>{responderName} responder</span>
            </div>
          </div>
          <div
            className="shrink-0 px-2 py-1 rounded-full border text-[11px] font-semibold border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 text-[color:var(--accent-text)]"
            title="Generation"
          >
            {formatGen(currentGen, currentMinor)}
          </div>
        </div>
      </div>

      <div className="h-px bg-white/[0.08] mx-2" />

      <div className="px-2">
        <div className="text-[11px] text-white/45 mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 opacity-70" />
          Model versions
        </div>
        <div className="space-y-1">
          <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[12px] text-white/85">
            <span className="flex items-center gap-2 min-w-0">
              <Cpu className="w-4 h-4 opacity-80" />
              <span className="font-semibold truncate">{modelName}</span>
              <span className="opacity-60">· {formatGen(currentGen, currentMinor)}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--accent-text)]">
              <Check className="w-4 h-4" />
              Active
            </span>
          </div>

          {previousVersions.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setShowOlder((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-[12px] text-white/70 transition"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 opacity-70" />
                  <span className="font-semibold">Previous versions</span>
                </span>
                <span className="text-[11px] opacity-70">{showOlder ? "Hide" : "Show"}</span>
              </button>
              {showOlder ? (
                <div className="space-y-1">
                  {previousVersions.map((m: any) => (
                    <button
                      key={`prev:${m.id}:${m.gen}`}
                      type="button"
                      onClick={() => pickVersion(m)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.05] text-[12px] text-white/60 transition"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Clock className="w-4 h-4 opacity-60" />
                        <span className="font-semibold truncate">{m.public_name ?? modelName}</span>
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
            <div className="px-3 py-2 text-[12px] text-white/40">No other versions</div>
          )}
        </div>
      </div>

      <div className="h-px bg-white/[0.08] mx-2" />

      <div className="px-2 pb-1">
        <div className="text-[11px] text-white/45 mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 opacity-70" />
          QXT Products
        </div>
        <div className="space-y-1">
          {PRODUCT_CATALOG.map((p) => (
            <a
              key={p.key}
              href={p.href}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-[12px] text-white/75 transition"
              onClick={() => setMenuOpen(null)}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="relative h-9 w-9 rounded-xl overflow-hidden border border-white/[0.08] bg-black/40 shrink-0">
                  <Image src={p.icon} alt={p.title} fill sizes="36px" className="object-cover" />
                </span>
                <span className="min-w-0">
                  <div className="font-semibold text-white truncate">{p.title}</div>
                  <div className="text-[10px] text-white/45 truncate">{p.sub}</div>
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-white/45">
                Open <span className="opacity-60">→</span>
              </span>
            </a>
          ))}
        </div>
        <div className="mt-3 px-1 text-[10px] text-white/35 flex items-center justify-between">
          <span>Kind: {getKindLabel(sessionKind)}</span>
          <span>Model: {shownModelLine}</span>
        </div>
      </div>
    </div>
  );

  const MenuPanel = (
    <div
      ref={menuRef}
      className={`${menuPanelClass} ${menuOpen === "title" ? "w-[240px]" : "w-[380px]"} ${
        menuVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      style={{ top: menuPos.top, left: menuPos.left, transformOrigin: "top" }}
    >
      {menuOpen === "title" ? TitleMenu : null}
      {menuOpen === "share" ? ShareMenu : null}
      {menuOpen === "model" ? ModelMenu : null}
    </div>
  );

  /* =========================
     Render — compact, single row, matches SidebarHeader's height.
     The old large left-side logo block + "Powered by" badge were
     redundant (same branding already lives in the sidebar) and have
     been removed entirely, along with the separate "..." options
     button (Rename/Delete moved to the title itself).
  ========================= */
  return (
    <header className="relative flex items-center justify-between gap-3 px-4 py-2 border-b border-white/[0.06] bg-[#0f1012]/92 backdrop-blur-2xl">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Center: chat title — click to Rename/Delete */}
      <div className="flex-1 flex justify-center px-3 min-w-0">
        <button
          ref={titleBtnRef}
          type="button"
          onClick={() => setMenuOpen((v) => (v === "title" ? null : "title"))}
          className="max-w-[420px] w-full sm:w-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] text-[12px] font-medium text-white/85 truncate transition"
          title={conversationId ? String(conversationId) : undefined}
        >
          <span className="truncate">{centerLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
        </button>
      </div>

      {/* Right: attachments · model · share */}
      <div className="flex items-center gap-2 relative">
        {attachmentsCount > 0 ? (
          <button
            type="button"
            onClick={onAttachmentsClick}
            className="flex items-center gap-1 px-2 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-[11px] text-white/60 transition"
            title="Attachments in this session"
          >
            <Paperclip className="w-3.5 h-3.5" />
            {attachmentsCount}
          </button>
        ) : null}

        <button
          ref={modelBtnRef}
          type="button"
          onClick={() => {
            setMenuOpen((v) => (v === "model" ? null : "model"));
            setShowOlder(false);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition"
          aria-label="Model menu"
          title="Model & versions"
        >
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[12px] font-semibold text-white">{modelName}</span>
            <span className="text-[10px] text-white/45">{formatGen(currentGen, currentMinor)}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-white/40" />
        </button>

        <button
          ref={shareBtnRef}
          type="button"
          onClick={() => {
            onShareClick?.();
            setMenuOpen((v) => (v === "share" ? null : "share"));
            setShowOlder(false);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-[11px] text-white/70 transition"
          aria-label="Share"
        >
          <Share2 className="w-3 h-3" />
          Share
        </button>

        {mounted && menuOpen ? createPortal(MenuPanel, document.body) : null}
      </div>
    </header>
  );
}
