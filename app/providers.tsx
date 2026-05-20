"use client";

import React from "react";

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";

import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { ModelsProvider } from "./context/ModelsContext";

const queryClient = new QueryClient();

export default function Providers({
    children,
}: {
    children: React.ReactNode;
}) {
    console.log("🧱 Providers render");

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <AppProvider>
                    <ModelsProvider productKey="chat">
                        {children}
                    </ModelsProvider>
                </AppProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}