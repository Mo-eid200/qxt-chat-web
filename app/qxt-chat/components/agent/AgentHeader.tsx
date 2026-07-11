"use client";

import React from "react";

import clsx from "clsx";

import {
    Bot,
    Brain,
    Cpu,
    Globe,
    Mic,
    Sparkles,
} from "lucide-react";

import type {
    AgentRuntime,
} from "../../../types/agent";

type Props = {

    runtime: AgentRuntime;

    darkMode?: boolean;
};

function getIcon(
    icon?: string | null,
) {

    switch (icon) {

        case "brain":
            return Brain;

        case "sparkles":
            return Sparkles;

        case "bot":
            return Bot;

        default:
            return Cpu;
    }
}

export default function AgentHeader({

    runtime,

    darkMode = true,

}: Props) {

    const {
        agent,
    } = runtime;

    const Icon =
        getIcon(
            agent.icon
        );

    return (

        <div
            className={clsx(
                `
                    relative

                    overflow-hidden

                    rounded-3xl

                    border

                    p-6
                `,
                darkMode

                    ? `
                        border-white/10
                        bg-[#0b1018]
                    `

                    : `
                        border-black/10
                        bg-white
                    `
            )}
        >

            {/* GLOW */}

            <div
                className="
                    pointer-events-none

                    absolute
                    inset-0

                    bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.10),transparent_40%)]
                "
            />

            <div
                className="
                    relative

                    flex
                    items-start
                    justify-between

                    gap-6
                "
            >

                {/* LEFT */}

                <div
                    className="
                        flex
                        min-w-0
                        items-start
                        gap-4
                    "
                >

                    {/* AVATAR */}

                    <div
                        className="
                            flex
                            h-16
                            w-16

                            shrink-0

                            items-center
                            justify-center

                            rounded-3xl

                            border
                            border-amber-400/15

                            bg-amber-400/10

                            text-amber-300
                        "
                    >

                        <Icon
                            className="
                                h-7
                                w-7
                            "
                        />

                    </div>

                    {/* INFO */}

                    <div
                        className="
                            min-w-0
                            flex-1
                        "
                    >

                        <div
                            className="
                                flex
                                flex-wrap
                                items-center

                                gap-2
                            "
                        >

                            <h1
                                className="
                                    truncate

                                    text-2xl
                                    font-bold

                                    tracking-tight

                                    text-white
                                "
                            >
                                {agent.name}
                            </h1>

                            <div
                                className="
                                    rounded-full

                                    border
                                    border-emerald-400/15

                                    bg-emerald-400/10

                                    px-2.5
                                    py-1

                                    text-[11px]
                                    font-medium

                                    uppercase
                                    tracking-[0.15em]

                                    text-emerald-300
                                "
                            >
                                ACTIVE
                            </div>

                        </div>

                        <div
                            className="
                                mt-1

                                text-sm
                                font-medium

                                text-amber-300
                            "
                        >
                            {agent.role}
                        </div>

                        {
                            agent.description && (

                                <p
                                    className="
                                        mt-3

                                        max-w-3xl

                                        text-sm
                                        leading-7

                                        text-white/55
                                    "
                                >
                                    {
                                        agent.description
                                    }
                                </p>
                            )
                        }

                    </div>

                </div>

                {/* RIGHT */}

                <div
                    className="
                        hidden

                        lg:flex
                        lg:flex-col
                        lg:items-end
                        lg:gap-3
                    "
                >

                    <div
                        className="
                            rounded-2xl

                            border
                            border-white/10

                            bg-black/20

                            px-4
                            py-3
                        "
                    >

                        <div
                            className="
                                text-[11px]
                                uppercase
                                tracking-[0.18em]

                                text-white/35
                            "
                        >
                            MODEL
                        </div>

                        <div
                            className="
                                mt-1

                                text-sm
                                font-semibold

                                text-white
                            "
                        >
                            {
                                runtime.model
                            }
                        </div>

                    </div>

                </div>

            </div>

            {/* CAPABILITIES */}

            {
                runtime.capabilities
                ?.length > 0 && (

                    <div
                        className="
                            relative

                            mt-6

                            flex
                            flex-wrap

                            gap-2
                        "
                    >

                        {
                            runtime.capabilities.map(
                                (
                                    capability
                                ) => {

                                    const IconComponent =

                                        capability
                                        === "web"

                                            ? Globe

                                            : capability
                                            === "voice"

                                                ? Mic

                                                : Cpu;

                                    return (

                                        <div
                                            key={
                                                capability
                                            }

                                            className="
                                                inline-flex
                                                items-center

                                                gap-2

                                                rounded-full

                                                border
                                                border-white/10

                                                bg-white/[0.03]

                                                px-3
                                                py-1.5

                                                text-xs
                                                font-medium

                                                text-white/70
                                            "
                                        >

                                            <IconComponent
                                                className="
                                                    h-3.5
                                                    w-3.5
                                                "
                                            />

                                            {
                                                capability
                                            }

                                        </div>
                                    );
                                }
                            )
                        }

                    </div>
                )
            }

        </div>
    );
}