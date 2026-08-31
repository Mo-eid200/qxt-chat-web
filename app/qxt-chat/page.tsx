"use client";

import { Suspense } from "react";

import QXTChatClient from "./QXTChatClient";

import type {
    AgentRuntime,
} from "../lib/api/agents/agent-runtime";

export default function QXTChatPage({
    agentRuntime,
}: {
    agentRuntime?: AgentRuntime;
}) {

    return (
        <Suspense fallback={null}>
            <QXTChatClient
                agentRuntime={
                    agentRuntime
                }
            />
        </Suspense>
    );
}