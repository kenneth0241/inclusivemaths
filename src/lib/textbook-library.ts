import type { DriveFileRow } from "./google-drive";

export type DifyDocRow = {
  id: string;
  name: string;
  indexing_status?: string;
  display_status?: string;
  created_at?: number;
  error?: string | null;
};

export type LibraryStatus = "chat_ready" | "processing" | "issue";

export type TextbookMarkdownItem = {
  key: string;
  name: string;
  status: LibraryStatus;
  statusLabel: string;
  dateMs: number;
  issueMessage?: string;
};

export type TextbookPdfItem = {
  key: string;
  name: string;
  dateMs: number;
  driveFileId: string;
};

export function isMarkdownFileName(name: string) {
  const lower = name.trim().toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown");
}

export function isPdfFileName(name: string) {
  return name.trim().toLowerCase().endsWith(".pdf");
}

function difyStatus(doc: DifyDocRow): LibraryStatus {
  const raw = (doc.display_status || doc.indexing_status || "").toLowerCase();
  if (raw === "available" || raw === "completed") {
    return "chat_ready";
  }
  if (raw === "error") {
    return "issue";
  }
  if (
    raw === "indexing" ||
    raw === "queuing" ||
    raw === "waiting" ||
    raw === "parsing"
  ) {
    return "processing";
  }
  return "processing";
}

function statusLabel(status: LibraryStatus) {
  switch (status) {
    case "chat_ready":
      return "Ready to use";
    case "processing":
      return "Preparing…";
    case "issue":
      return "Needs attention";
  }
}

export function difyDocsToMarkdownItems(
  difyDocs: DifyDocRow[],
): TextbookMarkdownItem[] {
  return difyDocs
    .filter((doc) => isMarkdownFileName(doc.name))
    .map((doc) => {
      const status = difyStatus(doc);
      return {
        key: doc.id,
        name: doc.name,
        status,
        statusLabel: statusLabel(status),
        dateMs: doc.created_at ? doc.created_at * 1000 : 0,
        issueMessage: doc.error ?? undefined,
      };
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

export function driveFilesToPdfItems(
  driveFiles: DriveFileRow[],
): TextbookPdfItem[] {
  return driveFiles
    .filter((file) => isPdfFileName(file.name))
    .map((file) => ({
      key: `pdf-${file.id}`,
      name: file.name.trim(),
      dateMs: file.modifiedTime
        ? new Date(file.modifiedTime).getTime()
        : 0,
      driveFileId: file.id,
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

export function statusPillClass(status: LibraryStatus) {
  switch (status) {
    case "chat_ready":
      return "bg-emerald-50 text-emerald-800 ring-emerald-100";
    case "processing":
      return "bg-amber-50 text-amber-900 ring-amber-100";
    case "issue":
      return "bg-red-50 text-red-800 ring-red-100";
  }
}
