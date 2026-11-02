"use client";

import { useMemo, useState } from "react";
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

type TextbookPdfTabProps = {
  library: LibraryState;
};

export default function TextbookPdfTab({ library }: TextbookPdfTabProps) {
  const { pdfs, loading, error, pdfError, folderUrl, reload } = library;
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return pdfs;
    }
    return pdfs.filter((item) => item.name.toLowerCase().includes(q));
  }, [pdfs, search]);

  return (
    <div className="w-full max-w-layout-narrow space-y-6">
      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {pdfError ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {pdfError}
        </p>
      ) : null}

      <div className="rounded-3xl bg-white p-6 ring-1 ring-zinc-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Textbook PDFs
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Original textbook files for reading offline or printing.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              {loading
                ? "Loading…"
                : `${pdfs.length} PDF${pdfs.length === 1 ? "" : "s"} available`}
            </p>
            {folderUrl ? (
              <a
                href={folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-600"
              >
                Open full folder
              </a>
            ) : null}
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
            placeholder="Search PDFs…"
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-base outline-none ring-emerald-500/30 focus:bg-white focus:ring-4"
          />
        </div>
      </div>

      <TextbookListShell
        loading={loading}
        empty={filtered.length === 0}
        search={search}
        emptyMessage="No PDFs found in the textbook folder."
      >
        {filtered.map((item) => (
          <li
            key={item.key}
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-xs font-bold text-red-700">
                PDF
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">{item.name}</p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Updated {formatDate(item.dateMs)}
                </p>
              </div>
            </div>
            <a
              href={`/api/textbook-drive/download?fileId=${encodeURIComponent(item.driveFileId)}`}
              className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700"
            >
              Download
            </a>
          </li>
        ))}
      </TextbookListShell>
    </div>
  );
}
