"use client";

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

        <QXTChatClient
            agentRuntime={
                agentRuntime
            }
        />
    );
}