import React from "react";
import { Code2 } from "lucide-react";
import { SectionHeader } from "../items/SectionHeader";

type CodeSectionProps = {
    L: Record<string, string>;
    router: any;
    sectionProps: Omit<Parameters<typeof SectionHeader>[0], 'title' | 'sectionKey' | 'IconOpen' | 'IconClosed'>;
};

export function CodeSection({ L, router, sectionProps }: CodeSectionProps) {
    return (
        <section>
            <SectionHeader
                sectionKey="code"
                title={L.code}
                IconOpen={Code2}
                IconClosed={Code2}
                linkMode
                hideChevron
                onOpen={() => router.push("/qxt-chat/code")}
                {...sectionProps}
            />
        </section>
    );
}