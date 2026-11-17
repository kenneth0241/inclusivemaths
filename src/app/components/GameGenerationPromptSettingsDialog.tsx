"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_GAME_GENERATION_PROMPT } from "@/lib/game-generation-settings";
import type { GameParameterTemplate } from "@/lib/game-parameter-template";
import { BilingualStack } from "./Bilingual";

type GameGenerationPromptSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: (prompt: string) => void;
};

export default function GameGenerationPromptSettingsDialog({
  open,
  onClose,
  onSaved,
}: GameGenerationPromptSettingsDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_GAME_GENERATION_PROMPT);
  const [templates, setTemplates] = useState<GameParameterTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const response = await fetch("/api/game-templates", { cache: "no-store" });
        const body = (await response.json()) as {
          templates?: GameParameterTemplate[];
          generationPrompt?: string;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(body.error || "Could not load settings.");
        }
        if (!cancelled) {
          setPrompt(body.generationPrompt?.trim() || DEFAULT_GAME_GENERATION_PROMPT);
          setTemplates(body.templates ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load settings.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  async function save() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Prompt cannot be empty.");
      return;
    }
    setSaveBusy(true);
    setError("");
    try {
      const response = await fetch("/api/game-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generation_prompt: trimmed,
          templates,
        }),
      });
      const body = (await response.json()) as {
        generationPrompt?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error || "Save failed.");
      }
      onSaved?.(body.generationPrompt ?? trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaveBusy(false);
    }
  }

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Game generation prompt settings"
    >
      <div className="flex max-h-[min(90dvh,36rem)] w-full max-w-xl flex-col rounded-3xl bg-white shadow-xl ring-1 ring-teal-100">
        <header className="border-b border-zinc-100 px-5 py-4">
          <BilingualStack
            zh="遊戲生成提示設定"
            en="Game generation prompt"
            zhClassName="text-sm font-semibold text-zinc-900"
            enClassName="text-zinc-500"
          />
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            <BilingualStack
              layout="stack"
              zh="用於「為每位學習者生成」與建議對話的 Dify 查詢文字。儲存於 data/game-parameter-templates.json。"
              en="Used for batch Generate and the suggested chat message. Stored in game-parameter-templates.json."
              enClassName="text-zinc-400"
            />
          </p>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <label className="block text-xs font-medium text-zinc-700">
              generation_prompt
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={8}
                className="mt-2 w-full resize-y rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm leading-6 text-zinc-900 focus:border-teal-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </label>
          )}
          {error ? (
            <p className="mt-3 text-xs text-red-800">{error}</p>
          ) : null}
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <button
            type="button"
            disabled={saveBusy}
            onClick={onClose}
            className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800"
          >
            <BilingualStack zh="取消" en="Cancel" layout="inline" />
          </button>
          <button
            type="button"
            disabled={saveBusy || loading}
            onClick={() => void save()}
            className="rounded-2xl bg-teal-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <BilingualStack zh="儲存" en="Save" layout="inline" />
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}