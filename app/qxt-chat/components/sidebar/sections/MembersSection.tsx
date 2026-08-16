"use client";

import React from "react";
import { Crown, Shield, User as UserIcon } from "lucide-react";
import { qxtApiClient } from "../../../../lib/api/core/qxtClient";
import { useWorkspace } from "../../../../context/WorkspaceContext";
import { cn } from "../utils/cn";

type Member = {
  id: number;
  user_id: number;
  email: string;
  full_name: string | null;
  role: "owner" | "admin" | "member";
  status: string;
  joined_at: string | null;
};

const ROLE_META: Record<Member["role"], { label: string; icon: typeof Crown; className: string }> = {
  owner: { label: "Owner", icon: Crown, className: "text-amber-300 bg-amber-300/[0.12]" },
  admin: { label: "Admin", icon: Shield, className: "text-red-300 bg-red-400/[0.12]" },
  member: { label: "Member", icon: UserIcon, className: "text-white/50 bg-white/[0.06]" },
};

export function MembersSection({ darkMode }: { darkMode: boolean }) {
  const { activeWorkspace } = useWorkspace();
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [currentRole, setCurrentRole] = React.useState<Member["role"] | null>(null);

  React.useEffect(() => {
    if (!activeWorkspace?.id) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const { data } = await qxtApiClient.get(
          `/api/v1/workspaces/${activeWorkspace.id}/members`
        );
        const items: Member[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        if (mounted) {
          setMembers(items);
          setCurrentRole(activeWorkspace.role as Member["role"]);
        }
      } catch {
        if (mounted) setMembers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeWorkspace?.id, activeWorkspace?.role]);

  const canManageRoles = currentRole === "owner" || currentRole === "admin";

  async function handleRoleChange(memberId: number, newRole: "admin" | "member") {
    if (!activeWorkspace?.id) return;
    try {
      await qxtApiClient.patch(
        `/api/v1/workspaces/${activeWorkspace.id}/members/${memberId}`,
        { role: newRole }
      );
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch {
      // best-effort — surfaced via existing toast/error handling if present
    }
  }

  if (loading) {
    return (
      <div className="ml-4 space-y-1.5 border-l border-white/[0.06] py-1 pl-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="ml-4 border-l border-white/[0.06] py-1 pl-3 text-[12px] text-white/40">
        No members yet.
      </div>
    );
  }

  return (
    <div className="ml-4 space-y-1 border-l border-white/[0.06] py-1 pl-3">
      {members.map((m) => {
        const meta = ROLE_META[m.role] ?? ROLE_META.member;
        const Icon = meta.icon;
        return (
          <div
            key={m.id}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-white/75"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[9px] font-bold text-white/60">
              {(m.full_name || m.email)[0]?.toUpperCase() || "?"}
            </div>
            <span className="min-w-0 flex-1 truncate">{m.full_name || m.email}</span>

            {canManageRoles && m.role !== "owner" ? (
              <select
                value={m.role}
                onChange={(e) => handleRoleChange(m.id, e.target.value as "admin" | "member")}
                className={cn(
                  "shrink-0 rounded-md border-none px-1.5 py-0.5 text-[10px] font-medium",
                  meta.className
                )}
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
            ) : (
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                  meta.className
                )}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
              </span>
            )}
          </div>
        );
      })}

      {/* TODO(backend): online/last-seen presence isn't implemented
          anywhere yet — no `is_online`/`last_seen` field on MemberOut,
          no WebSocket/polling presence system. Add here once that
          backend piece exists; showing a fake "online" dot without it
          would be misleading. */}
    </div>
  );
}