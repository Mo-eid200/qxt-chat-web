import { useCallback, useState } from "react";

export function useSidebarDnD() {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropOverId, setDropOverId] = useState<string | null>(null);
  const [dropSectionOver, setDropSectionOver] = useState<string | null>(null);
  const [dropProjectOver, setDropProjectOver] = useState<string | null>(null);

  const clearDragState = useCallback(() => {
    setDraggingId(null);
    setDropOverId(null);
    setDropSectionOver(null);
    setDropProjectOver(null);
  }, []);

  const startDrag = useCallback(
    (id: string, e: React.DragEvent) => {
      setDraggingId(id);

      setDropOverId(null);
      setDropSectionOver(null);
      setDropProjectOver(null);

      try {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.setData("application/x-qxt-session", id);
      } catch {
        // Browser may restrict DataTransfer in some environments.
      }
    },
    []
  );

  const getDraggedId = useCallback(
    (e: React.DragEvent): string | null => {
      if (draggingId) return draggingId;

      try {
        return (
          e.dataTransfer.getData("application/x-qxt-session") ||
          e.dataTransfer.getData("text/plain") ||
          null
        );
      } catch {
        return null;
      }
    },
    [draggingId]
  );

  const dragEnd = useCallback(() => {
    clearDragState();
  }, [clearDragState]);

  const dragOverSession = useCallback(
    (id: string, e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      e.dataTransfer.dropEffect = "move";

      if (draggingId && draggingId !== id) {
        setDropOverId(id);
      }

      setDropSectionOver(null);
      setDropProjectOver(null);
    },
    [draggingId]
  );

  const dragOverProject = useCallback(
    (projectId: string, e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      e.dataTransfer.dropEffect = "move";

      setDropProjectOver(projectId);
      setDropSectionOver(null);
      setDropOverId(null);
    },
    []
  );

  const dragOverSection = useCallback(
    (section: string, e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      e.dataTransfer.dropEffect = "move";

      setDropSectionOver(section);
      setDropProjectOver(null);
      setDropOverId(null);
    },
    []
  );

  return {
    draggingId,
    setDraggingId,

    dropOverId,
    setDropOverId,

    dropSectionOver,
    setDropSectionOver,

    dropProjectOver,
    setDropProjectOver,

    startDrag,
    getDraggedId,
    dragEnd,
    clearDragState,
    dragOverSession,
    dragOverProject,
    dragOverSection,
  };
}