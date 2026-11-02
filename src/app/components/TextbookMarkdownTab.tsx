"use client";

import { useMemo, useState } from "react";
import {
  statusPillClass,
  type LibraryStatus,
  type TextbookMarkdownItem,
} from "@/lib/textbook-library";
import EnvConfigBanner from "./EnvConfigBanner";
import { TextbookListShell } from "./TextbookListShell";
import type { useTextbookLibrary } from "./useTextbookLibrary";

function formatDate(ms: number) {
  if (!ms) {
    return "—";
  }
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type LibraryState = ReturnType<typeof useTextbookLibrary>;

type TextbookMarkdownTabProps = {
  library: LibraryState;
};

export default function TextbookMarkdownTab({ library }: TextbookMarkdownTabProps) {
  const {
    markdown,
    loading,
    error,
    knowledgeConfigured,
    corpusConfigured,
    deployHint,
    reload,
  } = library;
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return markdown;
    }
    return markdown.filter((item) => item.name.toLowerCase().includes(q));
  }, [markdown, search]);

  const readyCount = markdown.filter((i) => i.status === "chat_ready").length;

  return (
    <div className="w-full max-w-layout-narrow space-y-6">
      <EnvConfigBanner
        configured={Boolean(knowledgeConfigured && corpusConfigured)}
        deployHint={deployHint}
        envKey={
          knowledgeConfigured && !corpusConfigured
            ? "DIFY_DATASET_TEXTBOOK"
            : "DIFY_API_KEY"
        }
      />

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="rounded-3xl bg-white p-6 ring-1 ring-zinc-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Textbook for chat & lessons
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Sections the assistant can search when you chat with the textbook
              or create lesson plans.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              {loading
                ? "Loading…"
                : `${markdown.length} section${markdown.length === 1 ? "" : "s"} · ${readyCount} ready to use`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-200 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
        <div className="mt-5">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-base outline-none ring-emerald-500/30 focus:bg-white focus:ring-4"
          />
        </div>
      </div>

      <TextbookListShell
        loading={loading}
        empty={filtered.length === 0}
        search={search}
      >
        {filtered.map((item) => (
          <MarkdownRow key={item.key} item={item} />
        ))}
      </TextbookListShell>
    </div>
  );
}

function MarkdownRow({ item }: { item: TextbookMarkdownItem }) {
  const status = item.status as LibraryStatus;
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-zinc-900">{item.name}</p>
        <p className="mt-0.5 text-sm text-zinc-500">
          Added {formatDate(item.dateMs)}
        </p>
        {item.issueMessage ? (
          <p className="mt-1 text-sm text-red-600">{item.issueMessage}</p>
        ) : null}
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusPillClass(status)}`}
      >
        {item.statusLabel}
      </span>
    </li>
  );
}
