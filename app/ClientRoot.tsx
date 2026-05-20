// app/ClientRoot.tsx
"use client";

import Providers from "./providers";

export default function ClientRoot({
    children,
}: {
    children: React.ReactNode;
}) {
    console.log("🔥 ClientRoot mounted");

    return <Providers>{children}</Providers>;
}