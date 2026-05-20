"use client";

import React, {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Image from "next/image";

import {
  X,
  LogOut,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Cpu,
  Layers3,
} from "lucide-react";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";

import { UpgradeModal } from "./UpgradeModal";

import { setStoredWorkspace } from "../../lib/api/core/qxtClient";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  lang: "en" | "ar";
}

type AuthMode = "signin" | "signup";

export default function AuthModal({
  open,
  onClose,
  lang,
}: AuthModalProps) {
  const isAr = lang === "ar";

  const {
    user,
    login,
    register,
    logout,
    loadingUser,
  } = useAuth();

  const {
    plan,
    status,
    balance,
    fairUseLimit,
    monthlyUsed,
    renewalDate,
    daysRemaining,
    refresh,
  } = useApp();

  const [mode, setMode] =
    useState<AuthMode>("signin");

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [passwordConfirm, setPasswordConfirm] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const [showUpgrade, setShowUpgrade] =
    useState(false);

  const isMounted = useRef(true);

  const isLoggedIn = !!user;

  const isSignin = mode === "signin";

  const displayName =
    (user as any)?.display_name ||
    (user as any)?.full_name ||
    (user as any)?.username ||
    user?.email?.split("@")[0] ||
    "User";

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setErrorMsg(null);
    }
  }, [open]);

  async function handleSubmit(
    e: FormEvent
  ) {
    e.preventDefault();

    if (loadingUser || submitting)
      return;

    setErrorMsg(null);

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanPass = password;

    if (!cleanEmail || !cleanPass) {
      setErrorMsg(
        "Please enter your email and password."
      );

      return;
    }

    if (
      !isSignin &&
      cleanPass.length < 8
    ) {
      setErrorMsg(
        "Password must be at least 8 characters."
      );

      return;
    }

    if (
      !isSignin &&
      cleanPass !== passwordConfirm
    ) {
      setErrorMsg(
        "Passwords do not match."
      );

      return;
    }

    try {
      setSubmitting(true);

      let response: any;

      if (isSignin) {
        response = await login(
          cleanEmail,
          cleanPass
        );
      } else {
        response = await register(
          cleanEmail,
          cleanPass
        );
      }

      if (response?.workspace_id) {
        setStoredWorkspace(
          String(response.workspace_id)
        );
      } else {
        const ctx = await fetch(
          "/api/v1/auth/context",
          {
            credentials: "include",
          }
        );

        const data = await ctx.json();

        if (data?.workspace_id) {
          setStoredWorkspace(
            String(data.workspace_id)
          );
        }
      }

      await refresh();

      if (!isMounted.current)
        return;

      setFullName("");
      setEmail("");
      setPassword("");
      setPasswordConfirm("");

      onClose();
    } catch (err: any) {
      if (!isMounted.current)
        return;

      const data =
        err?.response?.data;

      let message =
        data?.detail ??
        data?.error ??
        err?.message ??
        "Something went wrong.";

      if (Array.isArray(message)) {
        message = message
          .map((e: any) => {
            const loc = Array.isArray(
              e?.loc
            )
              ? e.loc.join(".")
              : "field";

            return `${loc}: ${e?.msg || "invalid"
              }`;
          })
          .join(" | ");
      }

      setErrorMsg(String(message));
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  }

  function handleLogout() {
    logout();
    onClose();
  }

  function startOAuth(
    provider: "google" | "outlook"
  ) {
    if (typeof window === "undefined")
      return;

    const baseURL =
      process.env
        .NEXT_PUBLIC_QXT_API_BASE_URL ||
      "http://127.0.0.1:8000";

    const redirectUri =
      `${window.location.origin}/auth/callback`;

    const path =
      provider === "google"
        ? "/api/v1/auth/oauth/google/start"
        : "/api/v1/auth/oauth/outlook/start";

    window.location.assign(
      `${baseURL}${path}?redirect_uri=${encodeURIComponent(
        redirectUri
      )}`
    );
  }

  const title = isLoggedIn
    ? "ChatQXT · OQC Account"
    : "Welcome to ChatQXT AI";

  const subtitle = isLoggedIn
    ? "Manage your subscription and workspace."
    : "Sign in to access your workspace.";

  const stats = useMemo(
    () => [
      {
        icon: Cpu,
        label: "AI",
      },
      {
        icon: Layers3,
        label: "Workspace",
      },
      {
        icon: ShieldCheck,
        label: "Secure",
      },
    ],
    []
  );

  if (!open) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          dir={isAr ? "rtl" : "ltr"}
          className="
            fixed inset-0 z-[300]

            flex items-center justify-center

            bg-black/70
            backdrop-blur-md

            p-4
          "
        >
          <motion.div
            initial={{
              opacity: 0,
              y: 12,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 12,
              scale: 0.98,
            }}
            transition={{
              duration: 0.22,
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
            className="
              relative

              w-full
              max-w-[780px]

              overflow-hidden

              rounded-2xl

              border border-white/[0.06]

              bg-[#070b14]/96

              shadow-[0_20px_70px_rgba(0,0,0,0.45)]

              text-white
            "
          >
            {/* Background Glow */}
            <div
              className="
                pointer-events-none
                absolute inset-0

                bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.05),transparent_40%)]
              "
            />

            {/* Close */}
            <button
              onClick={onClose}
              className={`
    absolute z-50

    ${isAr ? "left-5" : "right-5"}

    top-5

    flex h-8 w-8 items-center justify-center

    rounded-full

    bg-white/[0.03]

    text-white/45

    transition-all duration-200

    hover:bg-white/[0.06]
    hover:text-white/80
  `}
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-center gap-3">
                  <div
                    className="
    relative

    h-[58px] w-[58px]

    shrink-0
  "
                  >
                    <Image
                      src="/chatqxt.png"
                      alt="ChatQXT"
                      fill
                      sizes="44px"
                      className="object-contain p-2"
                    />
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {title}
                    </h2>

                    <p className="mt-1 text-sm text-white/45">
                      {subtitle}
                    </p>
                  </div>
                </div>

                {!isLoggedIn && (
                  <div className="hidden items-center gap-2 mr-12 lg:flex">
                    {stats.map((item) => {
                      const Icon =
                        item.icon;

                      return (
                        <div
                          key={item.label}
                          className="
                            flex items-center gap-2

                            rounded-lg

                            border border-white/[0.05]

                            bg-white/[0.02]

                            px-3 py-2
                          "
                        >
                          <Icon className="h-3.5 w-3.5 text-cyan-300/80" />

                          <span className="text-[11px] text-white/55">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {isLoggedIn ? (
              <div className="px-5 pb-5 space-y-5">
                {/* User */}
                <div
                  className="
                    rounded-xl

                    border border-white/[0.06]

                    bg-white/[0.02]

                    p-4
                  "
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="
                        flex h-11 w-11 items-center justify-center

                        rounded-full

                        bg-gradient-to-br
                        from-slate-600
                        to-slate-800

                        text-sm font-semibold
                      "
                    >
                      {user?.email?.[0]?.toUpperCase() ||
                        "U"}
                    </div>

                    <div>
                      <div className="text-sm font-medium">
                        {displayName}
                      </div>

                      <div className="mt-1 text-xs text-white/45">
                        {user?.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing */}
                <div
                  className="
                    space-y-4

                    rounded-xl

                    border border-white/[0.06]

                    bg-white/[0.02]

                    p-4
                  "
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">
                      Plan
                    </span>

                    <span className="text-sm font-medium">
                      {plan || "Free"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">
                      Q-Power
                    </span>

                    <span className="text-sm font-medium">
                      {balance ?? 0}
                    </span>
                  </div>

                  {fairUseLimit > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">
                        Usage
                      </span>

                      <span className="text-sm font-medium">
                        {monthlyUsed} /{" "}
                        {fairUseLimit}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">
                      Renewal date
                    </span>

                    <span className="text-sm font-medium">
                      {renewalDate
                        ? new Date(
                          renewalDate
                        ).toLocaleDateString(
                          "en-US"
                        )

                        : "Not set"}
                    </span>
                  </div>

                  {status === "free" && (
                    <button
                      onClick={() =>
                        setShowUpgrade(
                          true
                        )
                      }
                      className="
                        mt-2

                        flex h-10 w-full items-center justify-center gap-2

                        rounded-lg

                        bg-white

                        text-sm
                        font-semibold
                        text-black

                        transition-all duration-200

                        hover:bg-white/90
                      "
                    >
                      <Sparkles className="h-4 w-4" />
                      Upgrade to Pro
                    </button>
                  )}

                  {daysRemaining > 0 && (
                    <div className="text-right text-xs text-white/40">
                      {daysRemaining} days remaining
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="
                      flex h-10 flex-1 items-center justify-center

                      rounded-lg

                      bg-white

                      text-sm
                      font-medium
                      text-black

                      transition-all duration-200

                      hover:bg-white/90
                    "
                  >
                    Back
                  </button>

                  <button
                    onClick={handleLogout}
                    className="
                      flex h-10 items-center justify-center gap-2

                      rounded-lg

                      border border-white/[0.06]

                      bg-white/[0.02]

                      px-4

                      text-sm text-white/70

                      transition-all duration-200

                      hover:bg-white/[0.05]
                    "
                  >
                    <LogOut className="h-4 w-4" />

                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 pb-6">
                <div
                  className="
                    rounded-2xl

                    border border-white/[0.06]

                    bg-white/[0.02]

                    p-5
                  "
                >

                  {/* Logos */}
                  <div
                    className={`
    mb-6

    flex items-center justify-center gap-5

    ${isAr ? "flex-row-reverse" : ""}
  `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="
        relative

        h-[52px] w-[52px]

        shrink-0
      "
                      >
                        <Image
                          src="/OpenQCore.png"
                          alt="OpenQCore"
                          fill
                          priority
                          sizes="52px"
                          className="object-contain"
                        />
                      </div>

                      <span
                        className="
    text-sm
    font-bold
    tracking-[-0.01em]
    text-white
  "
                      >
                        OpenQCore AI
                      </span>
                    </div>

                    <ChevronRight
                      className={`
      h-4 w-4 text-white/20

      ${isAr ? "rotate-180" : ""}
    `}
                    />

                    <div className="flex items-center gap-3">
                      <div
                        className="
        relative

        h-[52px] w-[52px]

        shrink-0
      "
                      >
                        <Image
                          src="/chatqxt.png"
                          alt="ChatQXT"
                          fill
                          priority
                          sizes="52px"
                          className="object-contain"
                        />
                      </div>

                      <span
                        className="
    text-sm
    font-bold
    tracking-[-0.01em]
    text-white
  "
                      >
                        ChatQXT
                      </span>
                    </div>
                  </div>

                  <div
                    className="
    grid gap-6
    md:grid-cols-[1fr_290px]
  "
                  >
                    {/* Form */}
                    <div
                      className={`
      ${isAr
                          ? "md:border-l md:pl-5"
                          : "md:border-r md:pr-5"
                        }

      border-white/[0.06]
    `}
                    >
                      {/* Tabs */}
                      <div className="mb-5">
                        <div
                          className="
          inline-flex

          rounded-xl

          border border-white/[0.06]

          bg-white/[0.02]

          p-1
        "
                        >
                          <button
                            onClick={() =>
                              setMode("signin")
                            }
                            className={`
            h-8 rounded-lg px-3.5

            text-sm
            font-medium

            transition-all duration-200

            ${isSignin
                                ? "bg-white text-black"
                                : "text-white/45 hover:text-white"
                              }
          `}
                          >
                            Sign in
                          </button>

                          <button
                            onClick={() =>
                              setMode("signup")
                            }
                            className={`
            h-8 rounded-lg px-3.5

            text-sm
            font-medium

            transition-all duration-200

            ${!isSignin
                                ? "bg-white text-black"
                                : "text-white/45 hover:text-white"
                              }
          `}
                          >
                            Create account
                          </button>
                        </div>
                      </div>

                      {/* Form */}
                      <form
                        onSubmit={handleSubmit}
                        className="space-y-2"
                      >
                        {!isSignin && (
                          <div className="space-y-1.5">
                            <label className="text-[12px] text-white/50">
                              Full name
                            </label>

                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) =>
                                setFullName(
                                  e.target.value
                                )
                              }
                              className="
              h-[38px]
              w-full

              rounded-lg

              border border-white/[0.06]

              bg-white/[0.02]

              px-3

              text-[13px]

              outline-none

              transition-all duration-200

              focus:border-white/[0.12]
              focus:bg-white/[0.03]
            "
                            />
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-sm text-white/55">
                            Email
                          </label>

                          <input
                            type="email"
                            value={email}
                            onChange={(e) =>
                              setEmail(
                                e.target.value
                              )
                            }
                            required
                            className="
            h-[38px]
            w-full

            rounded-lg

            border border-white/[0.06]

            bg-white/[0.02]

            px-3

            text-sm

            outline-none

            transition-all duration-200

            focus:border-white/[0.12]
            focus:bg-white/[0.03]
          "
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[12px] text-white/55">
                            Password
                          </label>

                          <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                              setPassword(
                                e.target.value
                              )
                            }
                            required
                            minLength={8}
                            className="
            h-[38px]
            w-full

            rounded-lg

            border border-white/[0.06]

            bg-white/[0.02]

            px-3

            text-sm

            outline-none

            transition-all duration-200

            focus:border-white/[0.12]
            focus:bg-white/[0.03]
          "
                          />
                        </div>

                        {!isSignin && (
                          <div className="space-y-1.5">
                            <label className="text-[12px] text-white/55">
                              Confirm password
                            </label>

                            <input
                              type="password"
                              value={passwordConfirm}
                              onChange={(e) =>
                                setPasswordConfirm(
                                  e.target.value
                                )
                              }
                              required
                              minLength={8}
                              className="
              h-[38px]
              w-full

              rounded-lg

              border border-white/[0.06]

              bg-white/[0.02]

              px-3

              text-sm

              outline-none

              transition-all duration-200

              focus:border-white/[0.12]
              focus:bg-white/[0.03]
            "
                            />
                          </div>
                        )}

                        {errorMsg && (
                          <div
                            className="
            rounded-lg

            border border-red-500/15

            bg-red-500/10

            px-4 py-3

            text-sm text-red-300
          "
                          >
                            {errorMsg}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={
                            submitting ||
                            loadingUser
                          }
                          className="
          flex h-10 w-full items-center justify-center

          rounded-lg

          bg-white

          text-sm
          font-semibold
          text-black

          transition-all duration-200

          hover:bg-white/90

          disabled:cursor-not-allowed
          disabled:opacity-50
        "
                        >
                          {submitting || loadingUser
                            ? "Please wait..."
                            : isSignin
                              ? "Sign in"
                              : "Create account"}
                        </button>

                        <button
                          type="button"
                          onClick={onClose}
                          className="
          w-full

          text-sm text-white/40

          transition-all duration-200

          hover:text-white/70
        "
                        >
                          Continue as guest
                        </button>
                      </form>
                    </div>

                    {/* OAuth */}
                    <div className="space-y-3">
                      <div className="text-sm text-white/45">
                        Or continue with
                      </div>

                      {/* Google */}
                      <button
                        type="button"
                        onClick={() =>
                          startOAuth("google")
                        }
                        className="
        group

        w-full

        rounded-xl

        border border-white/[0.05]

        bg-white/[0.02]

        p-3.5

        transition-all duration-200

        hover:bg-white/[0.04]
      "
                      >
                        <div
                          className={`
          flex items-center justify-between

          ${isAr
                              ? "flex-row-reverse"
                              : ""
                            }
        `}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="
              flex h-10 w-10 items-center justify-center

              rounded-full

              bg-white
            "
                            >
                              <Image
                                src="/google.png"
                                alt="Google"
                                width={18}
                                height={18}
                              />
                            </div>

                            <div className="text-left">
                              <div className="text-[11px] text-white/40">
                                Continue with
                              </div>

                              <div className="text-sm font-medium">
                                Google
                              </div>
                            </div>
                          </div>

                          <ChevronRight className="h-4 w-4 text-white/25 transition-all group-hover:text-white/60" />
                        </div>
                      </button>

                      {/* Outlook */}
                      <button
                        type="button"
                        onClick={() =>
                          startOAuth("outlook")
                        }
                        className="
        group

        w-full

        rounded-xl

        border border-white/[0.05]

        bg-white/[0.02]

        p-3.5

        transition-all duration-200

        hover:bg-white/[0.04]
      "
                      >
                        <div
                          className={`
          flex items-center justify-between

          ${isAr
                              ? "flex-row-reverse"
                              : ""
                            }
        `}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="
              flex h-10 w-10 items-center justify-center

              rounded-full

              bg-[#2563eb]
            "
                            >
                              <Image
                                src="/outlook.png"
                                alt="Outlook"
                                width={18}
                                height={18}
                              />
                            </div>

                            <div className="text-left">
                              <div className="text-[11px] text-white/40">
                                Continue with
                              </div>

                              <div className="text-sm font-medium">
                                Microsoft
                              </div>
                            </div>
                          </div>

                          <ChevronRight className="h-4 w-4 text-white/25 transition-all group-hover:text-white/60" />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Footer */}
                  <p
                    className="
    mt-6

    text-center

    text-[11px]
    leading-relaxed

    text-white/35
  "
                  >
                    By continuing, you agree to OpenQCore Terms of Service and Privacy Policy.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Upgrade */}
      {showUpgrade && (
        <UpgradeModal
          open={showUpgrade}
          onClose={() =>
            setShowUpgrade(false)
          }
          onUpgrade={async (
            planId
          ) => {
            try {
              const res = await fetch(
                "/api/v1/billing/subscribe",
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  credentials:
                    "include",
                  body: JSON.stringify(
                    {
                      plan_id: planId,
                    }
                  ),
                }
              );

              const data =
                await res.json();

              if (
                data?.checkout_url
              ) {
                window.location.href =
                  data.checkout_url;
              }
            } catch (err) {
              console.error(
                "Upgrade failed",
                err
              );
            }
          }}
        />
      )}
    </>
  );
}