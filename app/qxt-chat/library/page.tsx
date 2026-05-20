"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Plus,
  Upload,
  Download,
  Sparkles,
  Code2,
  FileText,
  Bookmark,
  Tags,
  Database,
  Shield,
  Wand2,
  Layers,
  Clock,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function QxtLibraryPage() {
  const router = useRouter();
  const [q, setQ] = useState("");

  // ✅ Product identity (Archive / LibraryQXT)
  const PRODUCT = useMemo(
    () => ({
      suiteName: "OpenQCore",
      productName: "LibraryQXT",
      engineName: "Archive",
      version: "G1.0",
      // لو جو الشركة الأم
      suiteModeLabel: "OpenQCore Suite",
      // غيّرها لو عايز "Parent Company" بدل Suite
      // suiteModeLabel: "Parent Company",
    }),
    []
  );

  const sections = [
    {
      key: "prompts",
      icon: Sparkles,
      title: "Prompts",
      desc: "Saved prompts, system roles, templates.",
      href: "/qxt-chat/library/prompts",
    },
    {
      key: "snippets",
      icon: Code2,
      title: "Snippets",
      desc: "Reusable code blocks, helpers, utilities.",
      href: "/qxt-chat/library/snippets",
    },
    {
      key: "docs",
      icon: FileText,
      title: "Docs",
      desc: "Notes, docs, references, long-form content.",
      href: "/qxt-chat/library/docs",
    },
    {
      key: "saved",
      icon: Bookmark,
      title: "Saved",
      desc: "Pinned chats, messages, and important assets.",
      href: "/qxt-chat/library/saved",
    },
  ] as const;

  const coreFeatures = [
    { icon: Database, title: "CRUD Items", desc: "Create / List / Get / Update / Delete library items." },
    { icon: Search, title: "Fast Search", desc: "POST /library/search with cursor pagination and filters." },
    { icon: Tags, title: "Tags + Meta", desc: "Organize by tags, source, and meta fields." },
    { icon: Clock, title: "Created/Updated", desc: "Track item lifecycle, sort and filter by timestamps." },
  ];

  const powerFeatures = [
    { icon: Layers, title: "Collections & Folders", desc: "Project folders, pinned sets, smart groupings." },
    { icon: Download, title: "Export / Import", desc: "Backup as JSON/MD, restore in one click." },
    { icon: Shield, title: "Share & Scopes", desc: "Public links, workspace access, API-key scopes (Business)." },
    { icon: Wand2, title: "AI Actions", desc: "Auto-tag, summarize, rewrite, generate prompt/snippet from content." },
  ];

  // ✅ Browse All currently 404 in your logs => keep disabled until route exists
  const BROWSE_ALL_ENABLED = false;

  const goSearch = () => {
    const trimmed = q.trim();
    if (!trimmed) return router.push("/qxt-chat/library/search");
    router.push(`/qxt-chat/library/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen text-white bg-[#060014] relative overflow-hidden">
      {/* Ambient / Grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-fuchsia-500/18 blur-[120px]" />
        <div className="absolute -bottom-72 left-1/2 h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-violet-500/18 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(168,85,247,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(168,85,247,0.18) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-black/0 to-black/55" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          {/* ✅ Identity badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-white/[0.04] px-3 py-1 text-xs text-fuchsia-100/90">
            <span className="h-2 w-2 rounded-full bg-fuchsia-300 shadow-[0_0_18px_rgba(168,85,247,0.65)]" />
            {PRODUCT.engineName} Engine • {PRODUCT.version}
            <span className="ml-2 rounded-full border border-white/10 bg-white/[0.03] px-2 py-[2px] text-[10px] text-white/70">
              {PRODUCT.productName}
            </span>
          </div>

          <button
            onClick={() => router.push("/qxt-chat")}
            className={cn(
              "rounded-2xl px-4 py-2 text-sm transition inline-flex items-center gap-2",
              "border border-fuchsia-400/20 bg-white/[0.04] backdrop-blur",
              "hover:bg-white/[0.07] hover:border-fuchsia-300/30",
              "shadow-[0_0_0_1px_rgba(168,85,247,0.10),0_0_26px_rgba(168,85,247,0.10)]"
            )}
          >
            <ArrowLeft className="h-4 w-4 text-fuchsia-200" />
            Back to Chat
          </button>
        </div>

        {/* HERO */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr] items-center">
          {/* Product poster */}
          <div className="rounded-3xl border border-white/6 bg-white/[0.035] backdrop-blur p-5 shadow-[0_0_0_1px_rgba(168,85,247,0.10),0_0_44px_rgba(168,85,247,0.12)]">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-fuchsia-300/15">
              <Image src="/QXT-Library.png" alt="QXT Library" fill priority className="object-cover" />
            </div>

            <div className="mt-4 text-sm text-white/70">
              Your knowledge vault for prompts, snippets, documents, and saved items.
            </div>

            <div className="mt-3 text-xs text-white/55">
              Versions:{" "}
              <span className="text-fuchsia-200/90">{PRODUCT.engineName} · {PRODUCT.version}</span>{" "}
              • <span className="text-white/55">{PRODUCT.engineName} · G1.x</span>
            </div>
          </div>

          {/* Hero copy */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              <span className="text-white">Archive</span>{" "}
              <span className="text-fuchsia-200">Library</span>
            </h1>

            <p className="mt-2 text-white/70 max-w-2xl">
              {PRODUCT.productName} is powered by <span className="text-white/85">Library Items + Search</span>.
              Save, organize, retrieve, and scale it into a monetizable asset via{" "}
              <span className="text-white/85">Scopes, Share Links, Export/Import, and AI Actions</span>.
            </p>

            {/* Quick actions row */}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-2xl px-4 py-2 text-sm inline-flex items-center gap-2 border border-fuchsia-300/20 bg-fuchsia-500/15 hover:bg-fuchsia-500/20 transition shadow-[0_0_24px_rgba(168,85,247,0.16)]"
                onClick={() => router.push("/qxt-chat/library/docs?new=1")}
              >
                <Plus className="h-4 w-4 text-fuchsia-200" />
                Create Item
              </button>

              <button
                className="rounded-2xl px-4 py-2 text-sm inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition"
                onClick={() => router.push("/qxt-chat/library/import")}
              >
                <Upload className="h-4 w-4 text-white/75" />
                Import
              </button>

              <button
                className="rounded-2xl px-4 py-2 text-sm inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition"
                onClick={() => router.push("/qxt-chat/library/export")}
              >
                <Download className="h-4 w-4 text-white/75" />
                Export
              </button>

              <button
                className="rounded-2xl px-4 py-2 text-sm inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition"
                onClick={goSearch}
              >
                <Search className="h-4 w-4 text-white/75" />
                Open Search
              </button>
            </div>

            {/* Search inline */}
            <div className="mt-5 rounded-3xl p-[1px] bg-gradient-to-r from-fuchsia-500/35 via-violet-500/25 to-fuchsia-500/35">
              <div className="rounded-3xl border border-white/6 bg-white/[0.04] backdrop-blur px-4 py-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-white/65" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goSearch();
                    }}
                    placeholder="Search your library… (POST /api/v1/library/search)"
                    className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/40"
                  />
                  <button
                    type="button"
                    onClick={goSearch}
                    className="text-[11px] px-2 py-1 rounded-full border border-fuchsia-400/20 bg-white/[0.04] text-fuchsia-200/90 hover:bg-white/[0.06] transition inline-flex items-center gap-1"
                  >
                    {PRODUCT.version}
                    <ExternalLink className="h-3 w-3 opacity-80" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mini stats placeholders */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Items", value: "—" },
                { label: "Prompts", value: "—" },
                { label: "Snippets", value: "—" },
                { label: "Docs", value: "—" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/6 bg-white/[0.03] backdrop-blur px-3 py-3">
                  <div className="text-xs text-white/55">{s.label}</div>
                  <div className="mt-1 text-lg font-semibold text-fuchsia-100">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Library Sections</h2>

            {/* ✅ avoid 404 */}
            <button
              className={cn(
                "text-sm inline-flex items-center gap-1 transition",
                BROWSE_ALL_ENABLED ? "text-fuchsia-200/90 hover:text-fuchsia-200" : "text-white/35 cursor-not-allowed"
              )}
              onClick={() => {
                if (!BROWSE_ALL_ENABLED) return;
                router.push("/qxt-chat/library/all");
              }}
              title={BROWSE_ALL_ENABLED ? "Browse all items" : "Coming soon: /qxt-chat/library/all"}
            >
              Browse all <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {sections.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => router.push(c.href)}
                  className="group text-left rounded-3xl p-[1px] bg-gradient-to-r from-fuchsia-500/28 via-violet-500/16 to-fuchsia-500/28 hover:from-fuchsia-500/40 hover:via-violet-500/22 hover:to-fuchsia-500/40 transition"
                >
                  <div className="rounded-3xl border border-white/6 bg-white/[0.035] backdrop-blur p-5 group-hover:bg-white/[0.055] transition">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl flex items-center justify-center border border-fuchsia-300/25 bg-white/[0.04] shadow-[0_0_22px_rgba(168,85,247,0.18)]">
                        <Icon className="h-5 w-5 text-fuchsia-200" />
                      </div>
                      <div>
                        <div className="text-base font-semibold">{c.title}</div>
                        <div className="mt-1 text-xs text-white/65">{c.desc}</div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Features */}
        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/6 bg-white/[0.035] backdrop-blur p-6">
            <div className="text-sm font-semibold text-fuchsia-200">Core Features (Backend Ready)</div>
            <div className="mt-4 space-y-3">
              {coreFeatures.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
                    <div className="h-10 w-10 rounded-2xl border border-fuchsia-300/20 bg-white/[0.04] flex items-center justify-center">
                      <Icon className="h-5 w-5 text-fuchsia-200" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{f.title}</div>
                      <div className="text-xs text-white/65 mt-1">{f.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/6 bg-white/[0.035] backdrop-blur p-6">
            <div className="text-sm font-semibold text-fuchsia-200">Power Features (Monetizable)</div>
            <div className="mt-4 space-y-3">
              {powerFeatures.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
                    <div className="h-10 w-10 rounded-2xl border border-fuchsia-300/20 bg-white/[0.04] flex items-center justify-center">
                      <Icon className="h-5 w-5 text-fuchsia-200" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{f.title}</div>
                      <div className="text-xs text-white/65 mt-1">{f.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 text-xs text-white/55">
              * Next step: wire UI to real endpoints (items + search + cursor) and add “Save from Chat”.
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="mt-10 rounded-3xl border border-white/6 bg-white/[0.03] backdrop-blur p-5 text-sm text-white/70">
          <span className="text-fuchsia-200 font-semibold">Pro Tip:</span>{" "}
          Library becomes a product when you add:{" "}
          <span className="text-white/85">Share links + Scopes + AI Actions</span>.
        </div>

        {/* Zero Footer (Parent Company) */}
        <div className="mt-8 pb-6">
          <div className="rounded-2xl border border-white/6 bg-white/[0.025] backdrop-blur px-4 py-3 text-[12px] text-white/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Optional: OpenQCore logo */}
              <Image src="/OpenQCore.png" alt="OpenQCore" width={18} height={18} className="opacity-90" />
              <span className="text-white/75 font-semibold">{PRODUCT.suiteName}</span>
              <span>— {PRODUCT.suiteModeLabel}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-[2px] text-[10px] text-white/70">
                {PRODUCT.engineName} • Engine
              </span>
              <span className="rounded-full border border-fuchsia-400/15 bg-fuchsia-500/10 px-2 py-[2px] text-[10px] text-fuchsia-200/90">
                {PRODUCT.version}
              </span>
              <span className="text-white/45">© {new Date().getFullYear()} {PRODUCT.suiteName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
