"use client";

import React from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  Menu,
  Share2,
  Pencil,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
  Paperclip,
  Lock,
  Globe,
  Copy,
  Video,
  FileText,
  File as FileIcon,
  Star,
  EyeOff,
  FolderInput,
  Folder,
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

// One item shown in the Files panel. Backend doesn't have an
// attachments-list endpoint yet — this type is the contract that
// endpoint should return against once it exists (see TODO near
// `attachments` prop below).
export interface SessionAttachment {
  id: string;
  type: "image" | "video" | "document" | "other";
  name?: string;
  url?: string;
  preview?: string; // thumbnail url, images only
}

// Minimal shape needed for the "Add to project" submenu — matches
// the ProjectFolder items already used across ChatSidebar/workspaceTree.
export interface ProjectFolderOption {
  id: string;
  title: string;
}

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
  starred?: boolean;
  markedUnread?: boolean;
  onToggleStar?: () => void;
  onToggleUnread?: () => void;
  onShareClick?: () => void;
  // Real "Add to project" action — moves the current session into the
  // given folder (null = remove from any folder / unfiled). Wired to
  // the same handleMoveSessionToFolder already used by ChatSidebar.
  projectFolders?: ProjectFolderOption[];
  onAddToProject?: (folderId: string | null) => void;
  // The default "responder" persona is Quarc. When a Personal/Workspace
  // agent is active for this session (see AgentRuntimeContext), pass
  // its name here so the header reflects who's actually answering.
  activeAgentName?: string | null;
  // Optional — number of attachments (uploaded or generated) in this
  // session. Omit or 0 hides the Files icon.
  attachmentsCount?: number;
  // TODO(backend): populate this from a real "list session attachments"
  // endpoint once it exists. Until then it's fine to omit — the Files
  // panel just shows an empty state.
  attachments?: SessionAttachment[];
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


type MenuRoot = null | "title" | "share" | "files";

export function ChatHeader({
  conversationId,
  sessionTitle,
  sessionKind = "chat",
  onToggleSidebar,
  onCopyLink,
  onNativeShare,
  onRenameSession,
  onDeleteSession,
  starred = false,
  markedUnread = false,
  onToggleStar,
  onToggleUnread,
  onShareClick,
  projectFolders = [],
  onAddToProject,
  activeAgentName,
  attachmentsCount = 0,
  attachments = [],
  onAttachmentsClick,
}: ChatHeaderProps) {
  /* =========================
     Models Context (Backend-bound) — kept only for the static
     model/gen display. Switching versions and the QXT-products
     catalog used to live in a big dropdown here; that's been
     removed entirely per product decision, not just hidden.
  ========================= */
  const { label } = useModels();

  // Quarc is the default responder persona; an active agent takes over
  // as "the responder" instead, when one is running for this session.
  const responderName = activeAgentName?.trim() || "Quarc";

  const sid = shortId(conversationId);
  const centerLabel =
    sessionTitle?.trim()
      ? sessionTitle.trim()
      : conversationId
      ? `${getKindLabel(sessionKind)} · #${sid ?? ""}`.trim()
      : "New chat";



  /* =========================
     4 Menus: title | share | files | (project submenu is nested
     inside title, not a root-level menu)
     (the old "model" menu — Previous versions + QXT Products catalog
     — has been removed entirely, not just hidden; the model/responder
     is now a static, non-interactive badge.)
  ========================= */
  const [menuOpen, setMenuOpen] = React.useState<MenuRoot>(null);
  const [renderMenu, setRenderMenu] = React.useState<MenuRoot>(null);
  const [projectSubmenuOpen, setProjectSubmenuOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [shareVisibility, setShareVisibility] = React.useState<"private" | "public">("private");

  const titleBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const shareBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const filesBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  // Takes the target root explicitly instead of reading it from state —
  // avoids the stale-closure bug where the position was computed against
  // the *previous* open menu because state updates aren't synchronous.
  const getAnchorFor = React.useCallback((root: MenuRoot) => {
    if (root === "title") return titleBtnRef.current;
    if (root === "files") return filesBtnRef.current;
    if (root === "share") return shareBtnRef.current;
    return null;
  }, []);

  const computeMenuPosition = React.useCallback(
    (root: MenuRoot) => {
      const anchor = getAnchorFor(root);
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const MENU_W = root === "title" ? 250 : 320;
      const GAP = 8;
      const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const top = r.bottom + GAP;
      let left = root === "title" ? r.left : r.right - MENU_W;
      const maxLeft = Math.max(8, vw - MENU_W - 8);
      left = clamp(left, 8, maxLeft);
      const approxH = root === "files" ? 380 : 260;
      let finalTop = top;
      if (finalTop + approxH > vh - 8) {
        finalTop = Math.max(8, r.top - GAP - approxH);
      }
      setMenuPos({ top: finalTop, left });
    },
    [getAnchorFor]
  );

  // Effect 1: animation lifecycle — mount immediately on open, fade out
  // (keeping renderMenu around for the exit transition) on close.
  React.useEffect(() => {
    if (menuOpen) {
      setRenderMenu(menuOpen);
      setProjectSubmenuOpen(false);
      computeMenuPosition(menuOpen);
      requestAnimationFrame(() => requestAnimationFrame(() => setMenuVisible(true)));
    } else if (renderMenu) {
      setMenuVisible(false);
      const t = setTimeout(() => setRenderMenu(null), 150);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

  // Effect 2: listeners — stay active through the fade-out too, so a
  // click during the closing animation still behaves correctly.
  React.useEffect(() => {
    if (!renderMenu) return;

    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      const inside =
        menuRef.current?.contains(t) ||
        titleBtnRef.current?.contains(t) ||
        shareBtnRef.current?.contains(t) ||
        filesBtnRef.current?.contains(t);
      if (!inside) setMenuOpen(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(null);
    }
    function onReflow() {
      if (menuOpen) computeMenuPosition(menuOpen);
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
  }, [renderMenu, menuOpen, computeMenuPosition]);

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
      {/* Star — UI-only stub, no backend field yet. */}
      <button
  type="button"
  className={menuItem}
  onClick={() => {
    onToggleStar?.();
    setMenuOpen(null);
  }}
>
  <Star
    className={`${menuIcon} ${
      starred ? "fill-current text-amber-300" : ""
    }`}
  />
  <span>{starred ? "Unstar" : "Star"}</span>
</button>

      {/* Mark as unread — UI-only stub, no backend field yet. */}
      <button
  type="button"
  className={menuItem}
  onClick={() => {
    onToggleUnread?.();
    setMenuOpen(null);
  }}
>
  <EyeOff className={menuIcon} />
  <span>
    {markedUnread
      ? "Mark as read"
      : "Mark as unread"}
  </span>
</button>

      <div className="my-1 border-t border-white/[0.08]" />

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

      {/* Add to project — real, wired to onAddToProject. */}
      <div className="relative">
        <button
          type="button"
          className={menuItem}
          onClick={() => setProjectSubmenuOpen((v) => !v)}
        >
          <FolderInput className={menuIcon} />
          <span className="flex-1 text-left">Add to project</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
        </button>

        {projectSubmenuOpen ? (
          <div className="qxt-scroll mt-1 ml-2 pl-2 border-l border-white/[0.08] space-y-0.5 max-h-[180px] overflow-y-auto">
            {projectFolders.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-white/35">No projects yet</div>
            ) : (
              projectFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className={menuItem}
                  onClick={() => {
                    onAddToProject?.(folder.id);
                    setProjectSubmenuOpen(false);
                    setMenuOpen(null);
                  }}
                >
                  <Folder className="w-3.5 h-3.5 opacity-70" />
                  <span className="truncate">{folder.title}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

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

  // Privacy options are UI-only for now — no backend endpoint exists
  // yet to actually create/revoke a public share link. Selecting
  // "Create public link" just reveals the current session link (same
  // one Copy-link already used) as a placeholder so the layout and
  // flow are ready to wire up once that endpoint ships.
  const SharePanel = (
    <div className="space-y-3">
      <div className="px-1">
        <div className="text-[13px] font-semibold text-white">Share chat</div>
        <div className="mt-1 text-[11px] text-white/45">
          Only messages up to this point will be shared.
        </div>
      </div>

      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setShareVisibility("private")}
          className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-left transition ${
            shareVisibility === "private"
              ? "border-[color:var(--accent)]/40 bg-[color:var(--accent)]/[0.08]"
              : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
          }`}
        >
          <Lock className="w-4 h-4 mt-0.5 text-white/70 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[12px] font-medium text-white/90">Keep private</span>
            <span className="block text-[11px] text-white/45">Only you have access</span>
          </span>
          {shareVisibility === "private" ? (
            <Check className="w-4 h-4 ml-auto mt-0.5 text-[color:var(--accent-text)] shrink-0" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setShareVisibility("public")}
          className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-left transition ${
            shareVisibility === "public"
              ? "border-[color:var(--accent)]/40 bg-[color:var(--accent)]/[0.08]"
              : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
          }`}
        >
          <Globe className="w-4 h-4 mt-0.5 text-white/70 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[12px] font-medium text-white/90">Create public link</span>
            <span className="block text-[11px] text-white/45">Anyone with the link can view</span>
          </span>
          {shareVisibility === "public" ? (
            <Check className="w-4 h-4 ml-auto mt-0.5 text-[color:var(--accent-text)] shrink-0" />
          ) : null}
        </button>
      </div>

      {shareVisibility === "public" ? (
        // TODO(backend): swap this for a real public-link creation
        // call once the endpoint exists; today it just reuses the
        // session link as a stand-in so the UI flow is complete.
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 truncate rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/55">
            {typeof window !== "undefined"
              ? `${window.location.origin}/qxt-chat?sid=${sid ?? ""}`
              : ""}
          </div>
          <button
            type="button"
            onClick={doCopyLink}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-[11px] text-white/75 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}

      {onNativeShare ? (
        <>
          <div className="h-px bg-white/[0.08] mx-1" />
          <button
            type="button"
            className={menuItem}
            onClick={() => {
              onNativeShare?.();
              setMenuOpen(null);
            }}
          >
            <Share2 className={menuIcon} />
            <span>Share via…</span>
          </button>
        </>
      ) : null}
    </div>
  );

  // TODO(backend): wire `attachments` up to a real "list session
  // attachments" endpoint. Until then this derives from in-memory
  // messages (see useSessionAttachments hook).
  const FilesPanel = (
    <div className="space-y-3">
      <div className="px-1 text-[13px] font-semibold text-white">Files</div>

      {attachments.length === 0 ? (
        <div className="px-3 py-8 text-center">
          <div className="text-[12px] text-white/40">No files yet in this session.</div>
          <div className="mt-1 text-[11px] text-white/25">
            Images, videos, and documents will appear here.
          </div>
        </div>
      ) : (
        <div className="qxt-scroll grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
            >
              {a.type === "image" && a.preview ? (
                <div className="relative h-20 w-full bg-black/40">
                  <Image
                    src={a.preview}
                    alt={a.name ?? "attachment"}
                    fill
                    sizes="140px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-20 w-full flex items-center justify-center bg-black/20">
                  {a.type === "video" ? (
                    <Video className="w-5 h-5 text-white/40" />
                  ) : a.type === "document" ? (
                    <FileText className="w-5 h-5 text-white/40" />
                  ) : (
                    <FileIcon className="w-5 h-5 text-white/40" />
                  )}
                </div>
              )}
              <div className="px-2 py-1.5 text-[10px] text-white/55 truncate">
                {a.name ?? "Untitled"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const MenuPanel = (
    <div
      ref={menuRef}
      className={`${menuPanelClass} ${renderMenu === "title" ? "w-[250px]" : "w-[320px]"} ${
        menuVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      style={{ top: menuPos.top, left: menuPos.left, transformOrigin: "top" }}
    >
      {renderMenu === "title" ? TitleMenu : null}
      {renderMenu === "share" ? SharePanel : null}
      {renderMenu === "files" ? FilesPanel : null}
    </div>
  );

  /* =========================
     Render — title sits far-left with a hover-reveal pencil (real OS
     cursor icons can't be swapped without a custom cursor image asset;
     this hover affordance is the practical equivalent). Model/responder
     badge takes the center, Files + Share stay on the right.
  ========================= */
  return (
    <header className="relative flex items-center justify-between gap-3 px-4 py-2 border-b border-white/[0.06] bg-[#0f1012]/92 backdrop-blur-2xl">
      {/* Left: sidebar toggle + chat title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <button
          ref={titleBtnRef}
          type="button"
          onClick={() => setMenuOpen((v) => (v === "title" ? null : "title"))}
          className="group max-w-[280px] sm:max-w-[420px] flex items-center gap-1 px-2 py-1.5 rounded-lg text-[13px] font-medium text-white/85 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
          title={conversationId ? String(conversationId) : undefined}
          aria-haspopup="true"
          aria-expanded={menuOpen === "title"}
        >
          <span className="truncate">{centerLabel}</span>

<ChevronDown
  className={`w-3.5 h-3.5 shrink-0 opacity-45 transition-transform duration-150 ${
    menuOpen === "title" ? "rotate-180" : ""
  }`}
/>
        </button>
      </div>

      {/* Center: model/responder — static badge, no dropdown */}
      <div className="flex-1 flex justify-center px-3 min-w-0">
        <div className="flex flex-col items-center leading-tight" title="Model & responder">
          <span className="text-[12px] font-semibold text-white">{label}</span>
          <span className="text-[10px] text-white/45">{responderName} responder</span>
        </div>
      </div>

      {/* Right: files · share */}
      <div className="flex items-center gap-2 relative">
        {attachmentsCount > 0 ? (
          <button
            ref={filesBtnRef}
            type="button"
            onClick={() => {
              onAttachmentsClick?.();
              setMenuOpen((v) => (v === "files" ? null : "files"));
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-[11px] text-white/60 transition"
            title="Files"
            aria-label="Files"
            aria-haspopup="true"
            aria-expanded={menuOpen === "files"}
          >
            <Paperclip className="w-3.5 h-3.5" />
            {attachmentsCount}
          </button>
        ) : null}

        <button
          ref={shareBtnRef}
          type="button"
          onClick={() => {
            onShareClick?.();
            setMenuOpen((v) => (v === "share" ? null : "share"));
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-[11px] text-white/70 transition"
          aria-label="Share"
          aria-haspopup="true"
          aria-expanded={menuOpen === "share"}
        >
          <Share2 className="w-3 h-3" />
          Share
        </button>

        {mounted && renderMenu ? createPortal(MenuPanel, document.body) : null}
      </div>
    </header>
  );
}