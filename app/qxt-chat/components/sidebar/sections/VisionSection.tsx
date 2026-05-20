import React from "react";
import { Wand2, Palette, ScanText, Sparkles } from "lucide-react";
import { VisionKey } from "../types";
import { cn } from "../utils/cn";

type VisionSectionProps = {
    L: Record<string, string>;
    rowBase: string;
    rowHover: string;
    onOpenVision?: (key: VisionKey) => void;
};

const visionItems: Array<{ key: VisionKey; icon: any; labelAr: string; labelEn: string }> = [
    { key: "image_generator", icon: Wand2, labelAr: "Image Generator", labelEn: "Image Generator" },
    { key: "design_branding", icon: Palette, labelAr: "Design / Art / Branding", labelEn: "Design / Art / Branding" },
    { key: "ocr_analysis", icon: ScanText, labelAr: "OCR Analysis", labelEn: "OCR Analysis" },
];

export function VisionSection({ L, rowBase, rowHover, onOpenVision }: VisionSectionProps) {
    return (
        <section>
            <div className="px-1 mt-2 mb-1 text-[11px] font-semibold uppercase tracking-wide">{L.vision}</div>
            <div className="space-y-1">
                {visionItems.map((it) => {
                    const Icon = it.icon;
                    return (
                        <button
                            key={it.key}
                            type="button"
                            onClick={() => onOpenVision?.(it.key)}
                            className={cn(rowBase, rowHover)}
                        >
                            <Icon className="w-4 h-4 opacity-90" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium leading-5 line-clamp-1">{it.labelEn}</div>
                            </div>
                            <Sparkles className="w-4 h-4 opacity-40" />
                        </button>
                    );
                })}
            </div>
        </section>
    );
}