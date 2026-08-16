import {
  Pencil,
  Trash2,
  Check,
  Link as LinkIcon,
  Pin,
  PinOff,
  Star,
  Mail,
  MailOpen,
} from "lucide-react";

type SessionMenuProps = {
  sId: string;
  copiedSid: string | null;
  onCopySessionLink?: (sid: string) => void;
  onRenameSession?: (sid: string) => void;
  onDeleteSession?: (sid: string) => void;
  onTogglePin?: (sid: string) => void;
  onToggleStar?: (sid: string) => void;
  onToggleUnread?: (sid: string) => void;

  pinned?: boolean;
  starred?: boolean;
  markedUnread?: boolean;
  setMenu: (m: any) => void;
  menuItem: string;
  L: Record<string, string>;
  darkMode?: boolean;
};

export function SessionMenu({
  sId,
  copiedSid,
  onCopySessionLink,
  onRenameSession,
  onDeleteSession,
  onTogglePin,
  onToggleStar,
  onToggleUnread,
  pinned = false,
  starred = false,
  markedUnread = false,
  setMenu,
  L,
}: SessionMenuProps) {
  // `w-full flex` is applied explicitly here rather than relying on
  // the `menuItem` className prop from the caller — that string was
  // an inline-styled button class not guaranteed to force block/full-
  // width layout, which is exactly what caused these to render side
  // by side instead of stacked. Ignoring the prop and using our own
  // consistent row classes here fixes that and keeps every dropdown
  // in the sidebar (Footer, Create Project, this one) visually
  // identical.
  return (
    <>
      <button
        type="button"
        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-white/70 transition-all hover:bg-amber-300/[0.08] hover:text-white"
        onClick={() => {
          onCopySessionLink?.(sId);
          setMenu(null);
        }}
      >
        {copiedSid === sId ? (
          <Check className="w-4 h-4" />
        ) : (
          <LinkIcon className="w-4 h-4" />
        )}
        <span>{L.copyLink}</span>
      </button>

      <button
        type="button"
        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-white/70 transition-all hover:bg-amber-300/[0.08] hover:text-white"
        onClick={() => {
          onRenameSession?.(sId);
          setMenu(null);
        }}
      >
        <Pencil className="w-4 h-4" />
        <span>{L.rename}</span>
      </button>

      <div className="my-1 border-t border-white/[0.08]" />
      <button
  type="button"
  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-white/70 transition-all hover:bg-amber-300/[0.08] hover:text-white"
  onClick={() => {
    onTogglePin?.(sId);
    setMenu(null);
  }}
>
  {pinned ? (
    <PinOff className="w-4 h-4" />
  ) : (
    <Pin className="w-4 h-4" />
  )}

  <span>
    {pinned ? "Unpin" : "Pin"}
  </span>
</button>

<button
  type="button"
  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-white/70 transition-all hover:bg-amber-300/[0.08] hover:text-white"
  onClick={() => {
    onToggleStar?.(sId);
    setMenu(null);
  }}
>
  <Star
    className="w-4 h-4"
    fill={starred ? "currentColor" : "none"}
  />

  <span>
    {starred ? "Unstar" : "Star"}
  </span>
</button>

<button
  type="button"
  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-white/70 transition-all hover:bg-amber-300/[0.08] hover:text-white"
  onClick={() => {
    onToggleUnread?.(sId);
    setMenu(null);
  }}
>
  {markedUnread ? (
    <MailOpen className="w-4 h-4" />
  ) : (
    <Mail className="w-4 h-4" />
  )}

  <span>
    {markedUnread
      ? "Mark as read"
      : "Mark as unread"}
  </span>
</button>

      <button
        type="button"
        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-red-300 transition-all hover:bg-red-500/[0.10] hover:text-red-200"
        onClick={() => {
          onDeleteSession?.(sId);
          setMenu(null);
        }}
      >
        <Trash2 className="w-4 h-4" />
        <span>{L.delete}</span>
      </button>
    </>
  );
}
