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
  ChevronRight,
  ShieldCheck,
  Cpu,
  Layers3,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "../../context/AuthContext";



// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  lang: "en" | "ar";
}

type AuthMode = "signin" | "signup";

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuthModal({ open, onClose, lang }: AuthModalProps) {
  const isAr = lang === "ar";

  // ── Auth: user identity + actions ─────────────────────────────────────────
  const { login, register, loadingUser } = useAuth();


  // ── Local state ───────────────────────────────────────────────────────────
  const [mode, setMode]                       = useState<AuthMode>("signin");
  const [fullName, setFullName]               = useState("");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [errorMsg, setErrorMsg]               = useState<string | null>(null);
  const closeAfterAuthRef = useRef(false);

  const isMounted  = useRef(true);
  const isSignin   = mode === "signin";



  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
  if (!open) {
    closeAfterAuthRef.current = false;
    setSubmitting(false);
    setErrorMsg(null);
  }
}, [open]);

  // ── Handlers ──────────────────────────────────────────────────────────────

async function handleSubmit(e: FormEvent) {
  e.preventDefault();

  if (loadingUser || submitting) return;

  setErrorMsg(null);
  closeAfterAuthRef.current = false;

  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password;

  if (!cleanEmail || !cleanPass) {
    setErrorMsg("Please enter your email and password.");
    return;
  }

  if (!isSignin && cleanPass.length < 8) {
    setErrorMsg("Password must be at least 8 characters.");
    return;
  }

  if (!isSignin && cleanPass !== passwordConfirm) {
    setErrorMsg("Passwords do not match.");
    return;
  }

  try {
    setSubmitting(true);

    const response = isSignin
      ? await login(cleanEmail, cleanPass)
      : await register(cleanEmail, cleanPass);

    // Authentication is not complete yet if MFA is required.
    if ("mfa_required" in response && response.mfa_required) {
      if (!response.challenge_id) {
        throw new Error("Missing MFA challenge ID");
      }

      // TODO: show MFA verification UI.
      return;
    }

    if (!isMounted.current) return;

    // Clear form only after successful authentication.
    setFullName("");
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setErrorMsg(null);

    // Prevent any intermediate authenticated UI from flashing.
    closeAfterAuthRef.current = true;

    // Close exactly once after auth is fully complete.
    onClose();

  } catch (err: any) {
    if (!isMounted.current) return;

    const data = err?.response?.data;

    let message =
      data?.detail ??
      data?.error?.message ??
      data?.error ??
      err?.message ??
      "Something went wrong.";

    if (Array.isArray(message)) {
      message = message
        .map((item: any) => {
          const loc = Array.isArray(item?.loc)
            ? item.loc.join(".")
            : "field";

          return `${loc}: ${item?.msg || "invalid"}`;
        })
        .join("\n");
    }

    setErrorMsg(String(message));

  } finally {
    if (isMounted.current) {
      setSubmitting(false);
    }
  }
}
  function startOAuth(provider: "google" | "outlook" | "apple") {
  if (typeof window === "undefined") return;

  const baseURL =
    process.env.NEXT_PUBLIC_QXT_API_BASE_URL ||
    "http://localhost:8000";

  const returnTo = `${window.location.origin}/auth/callback`;

  const paths = {
    google: "/api/v1/auth/oauth/google/start",
    outlook: "/api/v1/auth/oauth/outlook/start",
    apple: "/api/v1/auth/oauth/apple/start",
  } as const;

  const params = new URLSearchParams({
    return_to: returnTo,
    next: "/",
  });

  window.location.assign(
    `${baseURL}${paths[provider]}?${params.toString()}`
  );
}

  // ── Static data ───────────────────────────────────────────────────────────

  const stats = useMemo(
    () => [
      { icon: Cpu,        label: "AI"        },
      { icon: Layers3,    label: "Workspace"  },
      { icon: ShieldCheck, label: "Secure"   },
    ],
    []
  );

  const title = "Welcome to ChatQXT AI";
  const subtitle = "Sign in to access your workspace.";

  if (!open) return null;

  // ── Render ────────────────────────────────────────────────────────────────

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
            bg-black/70 backdrop-blur-md
            p-4
          "
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
            className="
              relative w-full max-w-[780px]
              overflow-hidden rounded-2xl
              border border-white/[0.06]
              bg-[#070b14]/96
              shadow-[0_20px_70px_rgba(0,0,0,0.45)]
              text-white
            "
          >
            {/* Glow */}
            <div className="
              pointer-events-none absolute inset-0
              bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.05),transparent_40%)]
            " />

            {/* Close button */}
            <button
              onClick={onClose}
              className={`
                absolute z-50 top-5
                ${isAr ? "left-5" : "right-5"}
                flex h-8 w-8 items-center justify-center
                rounded-full bg-white/[0.03] text-white/45
                transition-all duration-200
                hover:bg-white/[0.06] hover:text-white/80
              `}
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-center gap-3">
                  <div className="relative h-[58px] w-[58px] shrink-0">
                    <Image
                      src="/corelogo.png"
                      alt="ChatQXT"
                      fill
                      sizes="58px"
                      className="object-contain p-2"
                    />
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {title}
                    </h2>
                    <p className="mt-1 text-sm text-white/45">{subtitle}</p>
                  </div>
                </div>

                <div className="hidden items-center gap-2 mr-12 lg:flex">
                    {stats.map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="
                          flex items-center gap-2 rounded-lg
                          border border-white/[0.05] bg-white/[0.02]
                          px-3 py-2
                        "
                      >
                        <Icon className="h-3.5 w-3.5 text-cyan-300/80" />
                        <span className="text-[11px] text-white/55">{label}</span>
                      </div>
                    ))}
                  </div>
              </div>
            </div>

              {/* Guest / login view */}
              <div className="px-6 pb-6">
                <div className="
                  rounded-2xl border border-white/[0.06]
                  bg-white/[0.02] p-5
                ">
                  {/* Brand bridge */}
                  <div className={`
                    mb-6 flex items-center justify-center gap-5
                    ${isAr ? "flex-row-reverse" : ""}
                  `}>
                    <div className="flex items-center gap-3">
                      <div className="relative h-[52px] w-[52px] shrink-0">
                        <Image
                          src="/OpenQCore.png"
                          alt="OpenQCore"
                          fill priority sizes="52px"
                          className="object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold tracking-[-0.01em] text-white">
                        OpenQCore AI
                      </span>
                    </div>

                    <ChevronRight className={`
                      h-4 w-4 text-white/20
                      ${isAr ? "rotate-180" : ""}
                    `} />

                    <div className="flex items-center gap-3">
                      <div className="relative h-[52px] w-[52px] shrink-0">
                        <Image
                          src="/corelogo.png"
                          alt="ChatQXT"
                          fill priority sizes="52px"
                          className="object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold tracking-[-0.01em] text-white">
                        ChatQXT
                      </span>
                    </div>
                  </div>

                  {/* Form + OAuth grid */}
                  <div className="grid gap-6 md:grid-cols-[1fr_290px]">
                    {/* Left: form */}
                    <div className={`
                      ${isAr ? "md:border-l md:pl-5" : "md:border-r md:pr-5"}
                      border-white/[0.06]
                    `}>
                      {/* Mode tabs */}
                      <div className="mb-5">
                        <div className="
                          inline-flex rounded-xl
                          border border-white/[0.06] bg-white/[0.02] p-1
                        ">
                          {(["signin", "signup"] as AuthMode[]).map((m) => (
                            <button
                              key={m}
                              onClick={() => setMode(m)}
                              className={`
                                h-8 rounded-lg px-3.5
                                text-sm font-medium
                                transition-all duration-200
                                ${mode === m
                                  ? "bg-white text-black"
                                  : "text-white/45 hover:text-white"
                                }
                              `}
                            >
                              {m === "signin" ? "Sign in" : "Create account"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Fields */}
                      <form onSubmit={handleSubmit} className="space-y-2">
                        {!isSignin && (
                          <div className="space-y-1.5">
                            <label className="text-[12px] text-white/50">Full name</label>
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="
                                h-[38px] w-full rounded-lg
                                border border-white/[0.06] bg-white/[0.02]
                                px-3 text-[13px] outline-none
                                transition-all duration-200
                                focus:border-white/[0.12] focus:bg-white/[0.03]
                              "
                            />
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-sm text-white/55">Email</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="
                              h-[38px] w-full rounded-lg
                              border border-white/[0.06] bg-white/[0.02]
                              px-3 text-sm outline-none
                              transition-all duration-200
                              focus:border-white/[0.12] focus:bg-white/[0.03]
                            "
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[12px] text-white/55">Password</label>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            className="
                              h-[38px] w-full rounded-lg
                              border border-white/[0.06] bg-white/[0.02]
                              px-3 text-sm outline-none
                              transition-all duration-200
                              focus:border-white/[0.12] focus:bg-white/[0.03]
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
                              onChange={(e) => setPasswordConfirm(e.target.value)}
                              required
                              minLength={8}
                              className="
                                h-[38px] w-full rounded-lg
                                border border-white/[0.06] bg-white/[0.02]
                                px-3 text-sm outline-none
                                transition-all duration-200
                                focus:border-white/[0.12] focus:bg-white/[0.03]
                              "
                            />
                          </div>
                        )}

                        {errorMsg && (
                          <div className="
                            rounded-lg border border-red-500/15
                            bg-red-500/10 px-4 py-3
                            text-sm text-red-300
                          ">
                            {errorMsg}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={submitting || loadingUser}
                          className="
                            flex h-10 w-full items-center justify-center
                            rounded-lg bg-white
                            text-sm font-semibold text-black
                            transition-all duration-200 hover:bg-white/90
                            disabled:cursor-not-allowed disabled:opacity-50
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
                            w-full text-sm text-white/40
                            transition-all duration-200 hover:text-white/70
                          "
                        >
                          Continue as guest
                        </button>
                      </form>
                    </div>

                    {/* Right: OAuth */}
                    <div className="space-y-3">
                      <div className="text-sm text-white/45">Or continue with</div>

                      {(
                        [
                          {
                            provider: "google"  as const,
                            logo: "/google.png",
                            label: "Google",
                            bg: "bg-white",
                          },
                          {
                            provider: "outlook" as const,
                            logo: "/outlook.png",
                            label: "Microsoft",
                            bg: "bg-[#2563eb]",
                          },
                        ] as const
                      ).map(({ provider, logo, label, bg }) => (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => startOAuth(provider)}
                          className="
                            group w-full rounded-xl
                            border border-white/[0.05] bg-white/[0.02]
                            p-3.5 transition-all duration-200
                            hover:bg-white/[0.04]
                          "
                        >
                          <div className={`
                            flex items-center justify-between
                            ${isAr ? "flex-row-reverse" : ""}
                          `}>
                            <div className="flex items-center gap-3">
                              <div className={`
                                flex h-10 w-10 items-center justify-center
                                rounded-full ${bg}
                              `}>
                                <Image src={logo} alt={label} width={18} height={18} />
                              </div>

                              <div className="text-left">
                                <div className="text-[11px] text-white/40">
                                  Continue with
                                </div>
                                <div className="text-sm font-medium">{label}</div>
                              </div>
                            </div>

                            <ChevronRight className="
                              h-4 w-4 text-white/25
                              transition-all group-hover:text-white/60
                            " />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="
                    mt-6 text-center
                    text-[11px] leading-relaxed text-white/35
                  ">
                    By continuing, you agree to OpenQCore Terms of Service and Privacy Policy.
                  </p>
                </div>
              </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
