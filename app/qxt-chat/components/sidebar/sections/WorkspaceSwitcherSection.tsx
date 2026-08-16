"use client";

import React from "react";
import { ChevronDown, Check, Plus, Loader2 } from "lucide-react";
import { useWorkspace } from "../../../../context/WorkspaceContext";
import type { SidebarEnvironment } from "../constants/sidebarEnvironment";

export type WorkspaceSwitcherSectionProps = {
  darkMode: boolean;
  currentEnvironment: SidebarEnvironment;
  onEnvironmentChangeAction: (env: SidebarEnvironment) => void;
  onOpenBusinessSettingsAction: () => void;
};

export default function WorkspaceSwitcherSection({
  currentEnvironment,
  onEnvironmentChangeAction,
}: WorkspaceSwitcherSectionProps) {
  const {
    loading,
    workspaces,
    activeWorkspace,
    switchWorkspace,
    switchToPersonal,
    createWorkspace,
  } = useWorkspace();

  const hasWorkspace = workspaces.length > 0;

  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [draftName, setDraftName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!selectorOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setSelectorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selectorOpen]);

  async function handlePersonalClick() {
    switchToPersonal();
    onEnvironmentChangeAction("personal");
  }

  async function handleWorkspaceClick() {
  if (!hasWorkspace) {
    setCreating(true);
    return;
  }

  const targetId =
    activeWorkspace?.id ??
    workspaces[0].id;

  // Update UI immediately.
  onEnvironmentChangeAction(
    "workspace"
  );

  // Then synchronize runtime workspace.
  await switchWorkspace(targetId);
}

  async function handleSelectWorkspace(
  id: string
) {
  setSelectorOpen(false);

  onEnvironmentChangeAction(
    "workspace"
  );

  await switchWorkspace(id);
}

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = draftName.trim();
    if (!name || submitting) return;

    setSubmitting(true);
    try {
      await createWorkspace({ name });
      onEnvironmentChangeAction("workspace");
      setCreating(false);
      setDraftName("");
    } catch {
      // createWorkspace already logs/throws on the API side; keep the
      // form open so the user can retry without losing their input.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-3 pb-2">
      <div className="flex items-center gap-1 rounded-full bg-white/[0.03] p-1">
        <button
          type="button"
          onClick={handlePersonalClick}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
            currentEnvironment === "personal"
              ? "bg-white/[0.08] text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Personal
        </button>

        <button
          type="button"
          onClick={handleWorkspaceClick}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
            currentEnvironment === "workspace"
              ? "bg-white/[0.08] text-white"
              : "text-white/40 hover:text-white/70"
          }`}
          title={hasWorkspace ? "Workspace" : "Create your first workspace"}
        >
          Workspace
        </button>
      </div>

      {/* Workspace picker — only shown once in workspace mode with a
          real workspace selected, so a user with more than one can
          switch between them without leaving the sidebar. */}
      {currentEnvironment === "workspace" && hasWorkspace ? (
        <div className="relative mt-1.5" ref={ref}>
          <button
            type="button"
            onClick={() => setSelectorOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-left transition hover:bg-white/[0.04]"
          >
            <span className="truncate text-[12px] font-medium text-white/75">
              {activeWorkspace?.name || "Select workspace"}
            </span>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-white/30" />
            ) : (
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-white/30 transition-transform ${
                  selectorOpen ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          {selectorOpen ? (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113] shadow-2xl">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => handleSelectWorkspace(ws.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] text-white/70 transition hover:bg-white/[0.05]"
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.id === activeWorkspace?.id ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  ) : null}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setSelectorOpen(false);
                  setCreating(true);
                }}
                className="flex w-full items-center gap-2 border-t border-white/[0.06] px-3 py-2 text-left text-[12px] text-white/50 transition hover:bg-white/[0.05] hover:text-white/80"
              >
                <Plus className="h-3.5 w-3.5" />
                New workspace
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Inline create-workspace form — shown when the user has no
          workspace yet and taps "Workspace", or explicitly picks
          "New workspace" from the picker above. */}
      {creating ? (
        <form
          onSubmit={handleCreateSubmit}
          className="mt-1.5 flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5"
        >
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Workspace name"
            className="min-w-0 flex-1 bg-transparent px-1.5 text-[12px] text-white/85 placeholder:text-white/25 focus:outline-none"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={!draftName.trim() || submitting}
            className="shrink-0 rounded-lg bg-white/[0.08] px-2 py-1 text-[11px] font-medium text-white/85 transition hover:bg-white/[0.12] disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setDraftName("");
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-white/40 transition hover:bg-white/[0.05] hover:text-white/70"
          >
            Cancel
          </button>
        </form>
      ) : null}
    </div>
  );
}