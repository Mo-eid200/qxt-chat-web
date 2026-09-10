"use client";

import React, { useCallback, useRef, useState } from "react";
import { Image as ImageIcon, FileText, Camera, ClipboardPaste, MonitorUp } from "lucide-react";

type AttachmentType = "image" | "file";

type Props = {
  darkMode: boolean;
  menuClass: string;
  disabled?: boolean;
  onFileSelect: (type: AttachmentType) => void;
  onCameraCapture: (file: File) => void;
  onClipboardPaste: (file: File) => void;
  onScreenCapture: (file: File) => void;
};

type MenuOption = {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
};

export function AttachmentMenu({
  darkMode,
  menuClass,
  disabled,
  onFileSelect,
  onCameraCapture,
  onClipboardPaste,
  onScreenCapture,
}: Props) {
  const [clipboardBusy, setClipboardBusy] = useState(false);
  const [screenBusy, setScreenBusy] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleCameraChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onCameraCapture(file);
      e.target.value = "";
    },
    [onCameraCapture]
  );

  const handlePasteFromClipboard = useCallback(async () => {
    if (!navigator.clipboard?.read) return;
    setClipboardBusy(true);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split("/")[1] || "png";
          onClipboardPaste(new File([blob], `clipboard.${ext}`, { type: imageType }));
          break;
        }
      }
    } catch {
      // Clipboard read denied or empty — silently no-op, matches the
      // existing onPaste handler's behavior of doing nothing when
      // there's no image to paste.
    } finally {
      setClipboardBusy(false);
    }
  }, [onClipboardPaste]);

  const handleScreenCapture = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) return;
    setScreenBusy(true);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const capture = new ImageCapture(track);
      const bitmap = await capture.grabFrame();
      track.stop();

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(bitmap, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) onScreenCapture(new File([blob], "screenshot.png", { type: "image/png" }));
      }, "image/png");
    } catch {
      // User cancelled the screen picker or the browser doesn't
      // support it — no-op, same pattern as clipboard.
    } finally {
      setScreenBusy(false);
    }
  }, [onScreenCapture]);

  const options: MenuOption[] = [
    {
      label: "Photos & videos",
      description: "JPG, PNG, GIF, MP4",
      icon: ImageIcon,
      iconBg: "bg-blue-500/15 border-blue-500/25",
      iconColor: "text-blue-400",
      onClick: () => onFileSelect("image"),
    },
    {
      label: "Documents",
      description: "PDF, Word, Excel, PowerPoint",
      icon: FileText,
      iconBg: "bg-amber-500/15 border-amber-500/25",
      iconColor: "text-amber-400",
      onClick: () => onFileSelect("file"),
    },
    {
      label: "Take photo",
      description: "Use your camera",
      icon: Camera,
      iconBg: "bg-emerald-500/15 border-emerald-500/25",
      iconColor: "text-emerald-400",
      onClick: () => cameraInputRef.current?.click(),
    },
    {
      label: clipboardBusy ? "Reading clipboard..." : "Paste from clipboard",
      description: "Image you just copied",
      icon: ClipboardPaste,
      iconBg: "bg-purple-500/15 border-purple-500/25",
      iconColor: "text-purple-400",
      onClick: handlePasteFromClipboard,
    },
    {
      label: screenBusy ? "Capturing..." : "Screenshot",
      description: "Capture part of your screen",
      icon: MonitorUp,
      iconBg: "bg-pink-500/15 border-pink-500/25",
      iconColor: "text-pink-400",
      onClick: handleScreenCapture,
    },
  ];

  return (
    <>
      {/* Hidden native camera input — capture="environment" opens
          the device camera directly on mobile; desktop browsers fall
          back to a normal file picker. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        className="hidden"
      />
      <div
        className={`
          absolute bottom-full right-0 mb-2 w-64
          rounded-2xl border overflow-hidden
          animate-in slide-in-from-bottom-2 fade-in duration-150
          z-50 ${menuClass}
        `}
      >
        {options.map(({ label, description, icon: Icon, iconBg, iconColor, onClick }, idx) => (
          <button
            key={label}
            onClick={onClick}
            disabled={disabled}
            className={`
              w-full flex items-center gap-3 px-3 py-3 text-left
              transition-colors duration-100 disabled:opacity-40
              ${darkMode ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.04]"}
              ${idx < options.length - 1 ? `border-b ${darkMode ? "border-white/[0.06]" : "border-black/[0.06]"}` : ""}
            `}
          >
            <div className={`h-9 w-9 shrink-0 rounded-xl border flex items-center justify-center ${iconBg}`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <div className={`font-serif text-sm font-medium truncate ${darkMode ? "text-white/85" : "text-black/85"}`}>
                {label}
              </div>
              <div className={`text-[11px] truncate ${darkMode ? "text-white/35" : "text-black/35"}`}>
                {description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

AttachmentMenu.displayName = "AttachmentMenu";
