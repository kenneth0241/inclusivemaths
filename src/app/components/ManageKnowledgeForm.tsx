"use client";

import { useCallback, useEffect, useState } from "react";
import { type CorpusId, CORPUS_META } from "@/lib/corpus";
import EnvConfigBanner from "./EnvConfigBanner";

type DocumentRow = {
  id: string;
  name: string;
  indexing_status?: string;
  display_status?: string;
  created_at?: number;
  error?: string | null;
};

function formatDate(timestamp?: number) {
  if (!timestamp) {
    return "—";
  }
  return new Date(timestamp * 1000).toLocaleString();
}

function statusBadge(doc: DocumentRow) {
  const status = doc.display_status || doc.indexing_status || "unknown";
  const normalized = status.toLowerCase();
  if (normalized === "available" || normalized === "completed") {
    return { label: "Ready", className: "text-emerald-700 bg-emerald-50" };
  }
  if (normalized === "error") {
    return { label: "Error", className: "text-red-700 bg-red-50" };
  }
  if (
    normalized === "indexing" ||
    normalized === "queuing" ||
    normalized === "waiting"
  ) {
    return { label: "Indexing", className: "text-amber-700 bg-amber-50" };
  }
  return { label: status, className: "text-zinc-600 bg-zinc-100" };
}

type ManageKnowledgeFormProps = {
  corpus: CorpusId;
};

export default function ManageKnowledgeForm({ corpus }: ManageKnowledgeFormProps) {
  const meta = CORPUS_META[corpus];
  const [corpusConfigured, setCorpusConfigured] = useState<boolean | null>(null);
  const [knowledgeConfigured, setKnowledgeConfigured] = useState<boolean | null>(
    null,
  );
  const [deployHint, setDeployHint] = useState<"local" | "vercel">("local");
  const [loadError, setLoadError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const loadConfig = useCallback(async () => {
    const response = await fetch("/api/config", { cache: "no-store" });
    const config = (await response.json()) as {
      knowledgeConfigured?: boolean;
      deployHint?: "local" | "vercel";
      corpora?: { corpus: CorpusId; configured: boolean }[];
    };
    setKnowledgeConfigured(Boolean(config.knowledgeConfigured));
    setDeployHint(config.deployHint === "vercel" ? "vercel" : "local");
    const entry = config.corpora?.find((item) => item.corpus === corpus);
    setCorpusConfigured(Boolean(entry?.configured));
  }, [corpus]);

  const loadDocuments = useCallback(
    async (nextPage: number, nextKeyword: string) => {
      if (!corpusConfigured) {
        setDocuments([]);
        setTotal(0);
        setHasMore(false);
        return;
      }

      setLoadingDocs(true);
      setLoadError("");

      const query = new URLSearchParams({
        corpus,
        page: String(nextPage),
        limit: "20",
      });
      if (nextKeyword) {
        query.set("keyword", nextKeyword);
      }

      try {
        const response = await fetch(`/api/documents?${query.toString()}`);
        const body = (await response.json()) as {
          error?: string;
          data?: DocumentRow[];
          total?: number;
          has_more?: boolean;
        };

        if (!response.ok) {
          throw new Error(body.error || "Could not load documents.");
        }

        setDocuments(body.data ?? []);
        setTotal(body.total ?? 0);
        setHasMore(Boolean(body.has_more));
        setPage(nextPage);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not load documents.";
        setLoadError(message);
        setDocuments([]);
      } finally {
        setLoadingDocs(false);
      }
    },
    [corpus, corpusConfigured],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch corpus config on mount
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (corpusConfigured !== true) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload list when filters change
    void loadDocuments(1, keyword);
  }, [corpusConfigured, keyword, loadDocuments]);

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const envKey = "DIFY_DATASET_TEXTBOOK";

  return (
    <div className="w-full max-w-layout-narrow space-y-6">
      <EnvConfigBanner
        configured={Boolean(knowledgeConfigured && corpusConfigured)}
        deployHint={deployHint}
        envKey={
          knowledgeConfigured && !corpusConfigured ? envKey : "DIFY_API_KEY"
        }
      />

      {loadError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setKeyword(searchInput.trim());
        }}
      >
        <input
          type="search"
          placeholder={`Search ${meta.difyName} files`}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none ring-emerald-500/30 focus:ring-4"
          disabled={!corpusConfigured}
        />
        <button
          type="submit"
          disabled={!corpusConfigured}
          className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:bg-zinc-300"
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 text-sm text-zinc-500">
          <span>
            {corpusConfigured
              ? `${total} file${total === 1 ? "" : "s"} in ${meta.difyName}`
              : "Corpus not configured"}
          </span>
          {loadingDocs ? <span>Loading…</span> : null}
        </div>

        {documents.length === 0 && corpusConfigured && !loadingDocs ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            No files found{keyword ? ` matching “${keyword}”` : ""}.
          </p>
        ) : null}

        {documents.length > 0 ? (
          <ul className="divide-y divide-zinc-100">
            {documents.map((document) => {
              const badge = statusBadge(document);
              return (
                <li
                  key={document.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900">
                      {document.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Added {formatDate(document.created_at)}
                    </p>
                    {document.error ? (
                      <p className="mt-1 text-sm text-red-600">
                        {document.error}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page <= 1 || loadingDocs}
            onClick={() => void loadDocuments(page - 1, keyword)}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium ring-1 ring-zinc-200 disabled:text-zinc-400"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={!hasMore || loadingDocs}
            onClick={() => void loadDocuments(page + 1, keyword)}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium ring-1 ring-zinc-200 disabled:text-zinc-400"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
