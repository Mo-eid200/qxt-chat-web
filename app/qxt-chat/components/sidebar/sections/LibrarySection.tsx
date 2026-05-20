import React from "react";
import { BookOpen } from "lucide-react";
import { SectionHeader } from "../items/SectionHeader";

type LibrarySectionProps = {
    L: Record<string, string>;
    router: any;
    sectionProps: Omit<Parameters<typeof SectionHeader>[0], 'title' | 'sectionKey' | 'IconOpen' | 'IconClosed'>;
};

export function LibrarySection({ L, router, sectionProps }: LibrarySectionProps) {
    return (
        <section>
            <SectionHeader
                sectionKey="library"
                title={L.library}
                IconOpen={BookOpen}
                IconClosed={BookOpen}
                linkMode
                hideChevron
                onOpen={() => router.push("/qxt-chat/library")}
                {...sectionProps}
            />
        </section>
    );
}