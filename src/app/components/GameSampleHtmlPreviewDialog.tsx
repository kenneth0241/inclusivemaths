"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GameParameterTemplate } from "@/lib/game-parameter-template";
import { BilingualStack } from "./Bilingual";

type GameSampleHtmlPreviewDialogProps = {
  template: GameParameterTemplate | null;
  onClose: () => void;
};

export default function GameSampleHtmlPreviewDialog({
  template,
  onClose,
}: GameSampleHtmlPreviewDialogProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!template?.sample_html.trim()) {
      setIframeSrc((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }
        return null;
      });
      return;
    }
    const blob = new Blob([template.sample_html], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    setIframeSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [template]);

  const openInNewTab = useCallback(() => {
    const html = template?.sample_html?.trim() ?? "";
    if (!html) {
      return;
    }
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  }, [template]);

  const enterFullscreen = useCallback(async () => {
    const el = rootRef.current;
    if (!el) {
      return;
    }
    if (document.fullscreenElement === el) {
      return;
    }
    try {
      await el.requestFullscreen();
    } catch {
      /* overlay still uses full viewport */
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }, []);

  const close = useCallback(() => {
    void exitFullscreen();
    onClose();
  }, [exitFullscreen, onClose]);

  useEffect(() => {
    if (!template) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [template]);

  useEffect(() => {
    if (!template) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [template, close]);

  useEffect(() => {
    const sync = () => {
      setIsNativeFullscreen(document.fullscreenElement === rootRef.current);
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  if (!template || !mounted) {
    return null;
  }

  return createPortal(
    <div
      ref={rootRef}
      className="fixed inset-0 z-[200] flex h-dvh max-h-dvh w-dvw max-w-[100dvw] flex-col bg-zinc-950"
      role="dialog"
      aria-modal="true"
      aria-label="Sample HTML preview"
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-zinc-950 px-4 text-white">
        <p className="min-w-0 truncate text-sm font-semibold">
          {template.name}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={openInNewTab}
            className="hidden rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 hover:bg-white/15 sm:inline-block"
          >
            <BilingualStack zh="新分頁" en="New tab" layout="inline" />
          </button>
          <button
            type="button"
            onClick={() => void enterFullscreen()}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 hover:bg-white/15"
          >
            <BilingualStack
              zh={isNativeFullscreen ? "離開全螢幕" : "全螢幕"}
              en={isNativeFullscreen ? "Exit fullscreen" : "Fullscreen"}
              layout="inline"
            />
          </button>
          <button
            type="button"
            onClick={() => void close()}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            <BilingualStack zh="關閉" en="Close" layout="inline" />
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 w-full overflow-hidden bg-white">
        {iframeSrc ? (
          <iframe
            title="Sample game HTML"
            src={iframeSrc}
            className="absolute inset-0 size-full border-0"
            sandbox="allow-scripts allow-same-origin allow-modals"
          />
        ) : null}
      </div>
    </div>,
    document.body,
  );
}