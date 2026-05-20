import { useState } from "react";
import type { SessionItem } from "../types";

/**
 * Hook for managing DnD state for sidebar items
 */

export function useSidebarDnD() {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dropOverId, setDropOverId] = useState<string | null>(null);
    const [dropSectionOver, setDropSectionOver] = useState<string | null>(null);
    const [dropProjectOver, setDropProjectOver] = useState<string | null>(null);

    function dragEnd() {
        setDraggingId(null);
        setDropOverId(null);
    }

    function dragOver(id: string, e: React.DragEvent) {
        e.preventDefault();
        if (draggingId && draggingId !== id) setDropOverId(id);
    }

    function drop(onDrop: (id: string) => void, id: string, e: React.DragEvent) {
        e.preventDefault();
        if (draggingId && draggingId !== id) {
            onDrop(id);
        }
        setDraggingId(null);
        setDropOverId(null);
    }

    return {
        draggingId,
        setDraggingId,
        dropOverId,
        setDropOverId,
        dropSectionOver,
        setDropSectionOver,
        dropProjectOver,
        setDropProjectOver,
        dragEnd,
        dragOver,
        drop,
    };
}