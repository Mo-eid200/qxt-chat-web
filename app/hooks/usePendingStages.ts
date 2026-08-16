"use client";

import { useCallback, useState } from "react";
import type { AIStage, PendingStage } from "../types/chat";

export function usePendingStages() {
  const [pendingStage, setPendingStage] = useState<PendingStage>(null);
  const [pendingDetail, setPendingDetail] = useState<string | undefined>(undefined);

  const stopPendingStage = useCallback(() => {
    setPendingStage(null);
    setPendingDetail(undefined);
  }, []);

  // Called once, right when a new message send begins -- just resets
  // to a clean slate. The actual stage progression now comes from
  // real backend events via updatePendingStage(), not a fake timer
  // sequence.
  const startPendingStage = useCallback(() => {
    setPendingStage(null);
    setPendingDetail(undefined);
  }, []);

  // 🔧 REAL FIX: this is the function that was missing entirely --
  // the backend's delta.status events had nothing to call on the
  // frontend. Call this from the stream reader whenever a status
  // chunk arrives.
  const updatePendingStage = useCallback((stage: AIStage, detail?: string) => {
    setPendingStage(stage);
    setPendingDetail(detail);
  }, []);

  return {
    pendingStage,
    pendingDetail,
    startPendingStage,
    updatePendingStage,
    stopPendingStage,
  };
}