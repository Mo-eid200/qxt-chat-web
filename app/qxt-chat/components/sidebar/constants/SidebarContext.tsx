import React, {
  createContext,
  useContext,
} from "react";

import { getSidebarLabels } from "../constants/sidebarLabels";
import { getSidebarStyles } from "../constants/sidebarStyles";

import type {
  SidebarEnvironment,
} from "../constants/sidebarEnvironment";

type SidebarContextType = {
  L: ReturnType<
    typeof getSidebarLabels
  >;

  styles: ReturnType<
    typeof getSidebarStyles
  >;

  darkMode: boolean;

  environment: SidebarEnvironment;

  activeSessionId: string | null;
};

const SidebarContext =
  createContext<
    SidebarContextType | undefined
  >(undefined);

type SidebarProviderProps =
  SidebarContextType & {
    children: React.ReactNode;
  };

export function SidebarProvider({
  children,
  ...value
}: SidebarProviderProps) {
  return (
    <SidebarContext.Provider
      value={value}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const ctx =
    useContext(SidebarContext);

  if (!ctx) {
    throw new Error(
      "useSidebarContext must be used inside <SidebarProvider>"
    );
  }

  return ctx;
}