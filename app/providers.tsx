"use client";

import React from "react";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { ModelsProvider } from "./context/ModelsContext";
import { AgentRuntimeProvider } from "./context/AgentRuntimeContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";

const queryClient =
  new QueryClient();

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
  <AgentRuntimeProvider>
    <WorkspaceProvider>
      <AppProvider>
        <ModelsProvider>
          {children}
        </ModelsProvider>
      </AppProvider>
    </WorkspaceProvider>
  </AgentRuntimeProvider>
</AuthProvider>
    </QueryClientProvider>
  );
}