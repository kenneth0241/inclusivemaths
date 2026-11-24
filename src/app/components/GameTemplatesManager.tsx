"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_GAME_GENERATION_PROMPT } from "@/lib/game-generation-settings";
import {
  slugifyTemplateId,
  type GameParameterTemplate,
} from "@/lib/game-parameter-template";
import AppNav from "./AppNav";
import { BilingualStack } from "./Bilingual";
import ManageSubNav from "./ManageSubNav";

function blankTemplate(): GameParameterTemplate {
  return {
    id: "",
    name: "",
    game_rules: "",
    scoring_method: "",
    ui_style: "",
    sample_html: "",
  };
}

function cloneTemplate(template: GameParameterTemplate): GameParameterTemplate {
  return { ...template };
}

export function GameTemplatesManager() {
  const [templates, setTemplates] = useState<GameParameterTemplate[]>([]);
  const [generationPrompt, setGenerationPrompt] = useState(
    DEFAULT_GAME_GENERATION_PROMPT,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editing, setEditing] = useState<GameParameterTemplate | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/game-templates", { cache: "no-store" });
      const body = (await response.json()) as {
        templates?: GameParameterTemplate[];
        generationPrompt?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error || "Failed to load templates.");
      }
      setTemplates(body.templates ?? []);
      setGenerationPrompt(
        body.generationPrompt?.trim() || DEFAULT_GAME_GENERATION_PROMPT,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function persist(next: GameParameterTemplate[]) {
    setSaveBusy(true);
    setSaveError("");
    try {
      const response = await fetch("/api/game-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templates: next,
          generation_prompt: generationPrompt,
        }),
      });
      const body = (await response.json()) as {
        templates?: GameParameterTemplate[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error || "Save failed.");
      }
      setTemplates(body.templates ?? next);
      setEditing(null);
      setEditingIndex(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaveBusy(false);
    }
  }

  function openNew() {
    setEditing(blankTemplate());
    setEditingIndex(null);
    setSaveError("");
  }

  function openEdit(template: GameParameterTemplate, index: number) {
    setEditing(cloneTemplate(template));
    setEditingIndex(index);
    setSaveError("");
  }

  function closeEdit() {
    setEditing(null);
    setEditingIndex(null);
    setSaveError("");
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) {
      return;
    }
    const trimmedName = editing.name.trim();
    if (!trimmedName) {
      setSaveError("Name is required.");
      return;
    }
    const next = [...templates];
    const payload: GameParameterTemplate = {
      ...editing,
      id:
        editing.id.trim() ||
        slugifyTemplateId(trimmedName),
      name: trimmedName,
      game_rules: editing.game_rules.trim(),
      scoring_method: editing.scoring_method.trim(),
      ui_style: editing.ui_style.trim(),
    };
    if (editingIndex === null) {
      next.push(payload);
    } else {
      next[editingIndex] = { ...payload, id: templates[editingIndex]?.id ?? payload.id };
    }
    await persist(next);
  }

  async function removeAt(index: number) {
    const next = templates.filter((_, i) => i !== index);
    await persist(next);
  }

  async function onHtmlFile(file: File | null) {
    if (!file || !editing) {
      return;
    }
    const text = await file.text();
    setEditing({ ...editing, sample_html: text });
  }

  const content = (
    <div className="mt-8 space-y-6">
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-800">{error}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openNew}
              disabled={saveBusy}
              className="rounded-2xl bg-teal-ink px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <BilingualStack zh="新增模板" en="Add template" layout="inline" />
            </button>
            <Link
              href="/design/assets/games"
              className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
            >
              <BilingualStack zh="前往 Step 4" en="Open Step 4" layout="inline" />
            </Link>
          </div>

          <ul className="space-y-3">
            {templates.map((template, index) => (
              <li
                key={template.id}
                className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">
                      {template.name}
                    </p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      {template.id}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {[
                        template.game_rules ? "Rules" : null,
                        template.scoring_method ? "Scoring" : null,
                        template.ui_style ? "UI" : null,
                        template.sample_html.trim() ? "Sample HTML" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={saveBusy}
                      onClick={() => openEdit(template, index)}
                      className="rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={saveBusy}
                      onClick={() => void removeAt(index)}
                      className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-900 ring-1 ring-red-100 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing ? (
        <form
          onSubmit={(event) => void submitEdit(event)}
          className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-teal-100 sm:p-6"
        >
          <h2 className="text-sm font-semibold text-zinc-900">
            {editingIndex === null ? "New template" : "Edit template"}
          </h2>
          {saveError ? (
            <p className="text-sm text-red-800">{saveError}</p>
          ) : null}
          <label className="block text-xs font-medium text-zinc-700">
            Name
            <input
              value={editing.name}
              onChange={(event) =>
                setEditing({ ...editing, name: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              required
            />
          </label>
          {editingIndex !== null ? (
            <p className="text-xs text-zinc-500">
              Id: <code className="font-mono">{editing.id}</code>
            </p>
          ) : null}
          <label className="block text-xs font-medium text-zinc-700">
            game_rules
            <textarea
              value={editing.game_rules}
              onChange={(event) =>
                setEditing({ ...editing, game_rules: event.target.value })
              }
              rows={6}
              className="mt-1 w-full resize-y rounded-xl border border-zinc-200 px-3 py-2 font-mono text-xs leading-5"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-700">
            scoring_method
            <textarea
              value={editing.scoring_method}
              onChange={(event) =>
                setEditing({ ...editing, scoring_method: event.target.value })
              }
              rows={6}
              className="mt-1 w-full resize-y rounded-xl border border-zinc-200 px-3 py-2 font-mono text-xs leading-5"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-700">
            ui_style
            <textarea
              value={editing.ui_style}
              onChange={(event) =>
                setEditing({ ...editing, ui_style: event.target.value })
              }
              rows={6}
              className="mt-1 w-full resize-y rounded-xl border border-zinc-200 px-3 py-2 font-mono text-xs leading-5"
            />
          </label>
          <fieldset className="space-y-1">
            <legend className="text-xs font-medium text-zinc-700">
              sample_html
            </legend>
            <input
              type="file"
              accept=".html,text/html,text/plain"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void onHtmlFile(file);
              }}
              className="mt-1 text-xs"
            />
            <textarea
              value={editing.sample_html}
              onChange={(event) =>
                setEditing({ ...editing, sample_html: event.target.value })
              }
              rows={8}
              placeholder="Paste or upload a sample game HTML file…"
              className="mt-2 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-950 px-3 py-2 font-mono text-xs leading-5 text-emerald-100"
            />
            {editing.sample_html.trim() ? (
              <p className="mt-1 text-xs text-zinc-500">
                {editing.sample_html.length.toLocaleString()} characters
              </p>
            ) : null}
          </fieldset>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saveBusy}
              className="rounded-2xl bg-teal-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              disabled={saveBusy}
              onClick={closeEdit}
              className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <p className="text-xs text-zinc-500">
        File: <code className="font-mono">data/game-parameter-templates.json</code>
        {" · "}
        Teachers pick templates on Step 4 → Game parameters.
      </p>
    </div>
  );

  return content;
}

export function GameTemplatesManageShell() {
  return (
    <div className="flex flex-1 flex-col bg-paper pb-16">
      <AppNav />
      <main className="mx-auto w-full max-w-layout-wide px-[5vw] pt-8">
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-teal-ink">
          <BilingualStack
            zh="系統設定"
            en="System settings"
            layout="inline"
            enClassName="font-normal normal-case text-teal-700/80"
          />
        </p>
        <h1 className="mt-2 text-center text-3xl font-semibold text-zinc-900">
          <BilingualStack
            zh="遊戲參數套裝模板"
            en="Game parameter templates"
            layout="stack"
            enClassName="text-xl font-medium text-zinc-500"
          />
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-zinc-600">
          Define combined Rules, Scoring, and UI text plus an optional sample HTML.
          Stored in local JSON for Step 4.
        </p>
        <ManageSubNav />
        <GameTemplatesManager />
      </main>
    </div>
  );
}