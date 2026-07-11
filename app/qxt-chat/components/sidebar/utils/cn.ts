// app/qxt-chat/components/sidebar/utils/cn.ts
export function cn(...a: Array<string | false | null | undefined>) {
    return a.filter(Boolean).join(" ");
}