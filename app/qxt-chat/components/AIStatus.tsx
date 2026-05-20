"use client"

import React, { memo } from "react"

type AIStage = "thinking" | "analyzing" | "searching" | "generating" | "writing"

interface AIStatusProps {
    stage: AIStage
    history?: AIStage[]
    showProgress?: boolean
}

const stageConfig: Record<AIStage, {
    icon: string
    label: string
    color: string
    message: string
}> = {
    thinking: {
        icon: "🧠",
        label: "Thinking",
        color: "emerald",
        message: "Analyzing your request...",
    },
    analyzing: {
        icon: "📊",
        label: "Analyzing",
        color: "blue",
        message: "Analyzing context...",
    },
    searching: {
        icon: "🔎",
        label: "Searching",
        color: "cyan",
        message: "Searching knowledge base...",
    },
    generating: {
        icon: "⚡",
        label: "Generating",
        color: "amber",
        message: "Generating response...",
    },
    writing: {
        icon: "✍️",
        label: "Writing",
        color: "rose",
        message: "Refining response...",
    },
}

const colorMap = {
    emerald: {
        dot: "bg-emerald-500",
        text: "text-emerald-300",
        border: "border-emerald-500/30",
        glow: "shadow-emerald-500/20",
    },
    blue: {
        dot: "bg-blue-500",
        text: "text-blue-300",
        border: "border-blue-500/30",
        glow: "shadow-blue-500/20",
    },
    cyan: {
        dot: "bg-cyan-500",
        text: "text-cyan-300",
        border: "border-cyan-500/30",
        glow: "shadow-cyan-500/20",
    },
    amber: {
        dot: "bg-amber-500",
        text: "text-amber-300",
        border: "border-amber-500/30",
        glow: "shadow-amber-500/20",
    },
    rose: {
        dot: "bg-rose-500",
        text: "text-rose-300",
        border: "border-rose-500/30",
        glow: "shadow-rose-500/20",
    },
}

/* ======================================================
   ANIMATIONS
====================================================== */

const PulseAnimation = memo(() => (
    <div className="flex items-center gap-1">
        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: "0.2s" }} />
        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: "0.4s" }} />
    </div>
))
PulseAnimation.displayName = "PulseAnimation"

const ScanAnimation = memo(() => (
    <div className="w-16 h-0.5 bg-blue-500/20 rounded-full overflow-hidden relative">
        <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" />
    </div>
))
ScanAnimation.displayName = "ScanAnimation"

const SearchAnimation = memo(() => (
    <div className="w-16 h-0.5 bg-cyan-500/20 rounded-full overflow-hidden relative">
        <div
            className="absolute top-0 left-0 h-full w-1/4 bg-cyan-400 rounded-full"
            style={{ animation: "slide 1.2s linear infinite" }}
        />
    </div>
))
SearchAnimation.displayName = "SearchAnimation"

const BarAnimation = memo(() => (
    <div className="flex items-end gap-0.5 h-3">
        {[0, 0.1, 0.2, 0.3].map((delay, i) => (
            <div
                key={i}
                className="w-1 bg-amber-400 rounded-full"
                style={{
                    height: "4px",
                    animation: "bounce 0.6s ease-in-out infinite",
                    animationDelay: `${delay}s`,
                }}
            />
        ))}
    </div>
))
BarAnimation.displayName = "BarAnimation"

const TypeAnimation = memo(() => (
    <div className="flex items-center gap-1.5">
        <div className="w-12 h-0.5 bg-rose-500/20 rounded-full overflow-hidden relative">
            <div
                className="absolute top-0 left-0 h-full w-1/4 bg-rose-400"
                style={{ animation: "typing 1.2s ease-in-out infinite" }}
            />
        </div>
        <span className="text-rose-400 text-xs animate-pulse">|</span>
    </div>
))
TypeAnimation.displayName = "TypeAnimation"

/* ======================================================
   PROGRESS BAR
====================================================== */

const ProgressBar = memo(({ currentStage, history }: { currentStage: AIStage; history: AIStage[] }) => {
    const allStages: AIStage[] = ["thinking", "analyzing", "searching", "generating", "writing"]
    const currentIndex = allStages.indexOf(currentStage)

    return (
        <div className="flex items-center justify-between gap-1.5">
            {allStages.map((stage, idx) => {
                const isCompleted = idx < currentIndex
                const isCurrent = idx === currentIndex
                const colors = colorMap[stageConfig[stage].color as keyof typeof colorMap]

                return (
                    <React.Fragment key={stage}>
                        {/* Dot */}
                        <div
                            className={`w-2 h-2 rounded-full transition-all ${isCompleted
                                ? `${colors.dot} shadow-lg shadow-${colors.glow}`
                                : isCurrent
                                    ? `${colors.dot} scale-125 shadow-xl`
                                    : "bg-gray-600/30"
                                }`}
                        />

                        {/* Line */}
                        {idx < allStages.length - 1 && (
                            <div
                                className={`flex-1 h-0.5 rounded-full transition-all ${isCompleted
                                    ? "bg-gradient-to-r from-emerald-400 to-cyan-400"
                                    : "bg-gray-600/20"
                                    }`}
                            />
                        )}
                    </React.Fragment>
                )
            })}
        </div>
    )
})
ProgressBar.displayName = "ProgressBar"

/* ======================================================
   MAIN COMPONENT
====================================================== */

export const AIStatus = memo(function AIStatus({
    stage,
    history = [],
    showProgress = true,
}: AIStatusProps) {
    const config = stageConfig[stage]
    const colors = colorMap[config.color as keyof typeof colorMap]
    const limitedHistory = history.slice(-2)

    const getAnimation = () => {
        switch (stage) {
            case "thinking":
                return <PulseAnimation />
            case "analyzing":
                return <ScanAnimation />
            case "searching":
                return <SearchAnimation />
            case "generating":
                return <BarAnimation />
            case "writing":
                return <TypeAnimation />
        }
    }

    return (
        <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Progress Line */}
            {showProgress && (
                <div className="px-1">
                    <ProgressBar currentStage={stage} history={limitedHistory} />
                </div>
            )}

            {/* History Stack - Compact */}
            {limitedHistory.length > 0 && (
                <div className="flex gap-1.5">
                    {limitedHistory.map((histStage) => {
                        const histConfig = stageConfig[histStage]
                        const histColors = colorMap[histConfig.color as keyof typeof colorMap]

                        return (
                            <div
                                key={histStage}
                                className={`
                  px-2 py-1 rounded-lg border text-[10px] font-semibold
                  ${histColors.text} ${histColors.border}
                  bg-black/40 opacity-50
                `}
                            >
                                {histConfig.label}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Current Stage - Compact */}
            <div
                className={`
          px-3 py-2.5 rounded-xl border
          bg-black/50 backdrop-blur-sm
          ${colors.border}
          shadow-lg shadow-${colors.glow}
          transition-all duration-300
        `}
            >
                <div className="flex items-center gap-2.5">
                    {/* Icon */}
                    <div className="text-base flex-shrink-0 animate-pulse">
                        {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wide opacity-60 ${colors.text}`}>
                                {config.label}
                            </span>
                            <span className={`text-xs ${colors.text}`}>
                                {config.message}
                            </span>
                        </div>

                        {/* Animation */}
                        <div className="mt-1.5">
                            {getAnimation()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})

AIStatus.displayName = "AIStatus"

/* ======================================================
   GLOBAL STYLES (Add to your CSS)
====================================================== */

/*
@keyframes slide {
    0% { left: -33.33%; }
    100% { left: 133.33%; }
}

@keyframes typing {
    0% { width: 0%; }
    50% { width: 100%; }
    100% { width: 0%; }
}

@keyframes bounce {
    0%, 100% { height: 4px; }
    50% { height: 12px; }
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
*/