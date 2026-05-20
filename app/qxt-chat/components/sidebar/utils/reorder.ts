// app/qxt-chat/components/sidebar/utils/reorder.ts
export function reorderList(list: string[], fromId: string, toId: string) {
    if (fromId === toId) return list;
    const next = list.slice();
    const fromIdx = next.indexOf(fromId);
    const toIdx = next.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return list;
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, fromId);
    return next;
}