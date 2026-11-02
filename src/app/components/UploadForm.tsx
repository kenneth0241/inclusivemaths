"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CorpusId,
  CORPUS_META,
  isMarkdownUploadFile,
} from "@/lib/corpus";
import EnvConfigBanner from "./EnvConfigBanner";

type UploadItem = {
  id: string;
  fileName: string;
  status: "queued" | "uploading" | "indexing" | "completed" | "error";
  message?: string;
  batch?: string | null;
  datasetId?: string;
};

const ACCEPTED = ".md,.markdown";

function statusLabel(status: UploadItem["status"]) {
  switch (status) {
    case "queued":
      return "Waiting";
    case "uploading":
      return "Uploading to Dify";
    case "indexing":
      return "Indexing in Knowledge";
    case "completed":
      return "Ready in Knowledge";
    case "error":
      return "Failed";
  }
}

type UploadFormProps = {
  corpus: CorpusId;
};

export default function UploadForm({ corpus }: UploadFormProps) {
  const meta = CORPUS_META[corpus];
  const [corpusConfigured, setCorpusConfigured] = useState<boolean | null>(null);
  const [knowledgeConfigured, setKnowledgeConfigured] = useState<boolean | null>(
    null,
  );
  const [deployHint, setDeployHint] = useState<"local" | "vercel">("local");
  const [loadError, setLoadError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadConfig = useCallback(async () => {
    setLoadError("");
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch corpus config on mount
    void loadConfig();
  }, [loadConfig]);

  function addFiles(incoming: FileList | File[]) {
    const next = Array.from(incoming).filter(isMarkdownUploadFile);
    if (next.length === 0 && incoming.length > 0) {
      setLoadError("Only Markdown files (.md or .markdown) can be uploaded.");
    }
    setFiles((current) => {
      const names = new Set(current.map((file) => `${file.name}:${file.size}`));
      return [
        ...current,
        ...next.filter((file) => !names.has(`${file.name}:${file.size}`)),
      ];
    });
  }

  async function pollIndexing(
    itemId: string,
    batch: string,
    datasetId: string,
  ) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const query = new URLSearchParams({
        corpus,
        batch,
        datasetId,
      });
      const response = await fetch(`/api/indexing-status?${query.toString()}`);
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Could not check indexing status.");
      }

      const payload = (await response.json()) as {
        data?: { indexing_status?: string; error?: string | null }[];
      };
      const first = payload.data?.[0];
      const status = first?.indexing_status ?? "";

      if (status === "completed") {
        setItems((current) =>
          current.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "completed",
                  message: "Indexed in Dify Knowledge.",
                }
              : item,
          ),
        );
        return;
      }

      if (status === "error" || status === "paused" || status === "stopped") {
        throw new Error(first?.error || `Indexing ${status}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: "indexing",
              message:
                "Still indexing in Dify. Check Knowledge in Dify if this takes a while.",
            }
          : item,
      ),
    );
  }

  async function uploadAll() {
    if (!corpusConfigured) {
      setLoadError("Configure DIFY_DATASET_TEXTBOOK first.");
      return;
    }
    if (files.length === 0) {
      setLoadError("Choose at least one file.");
      return;
    }

    setBusy(true);
    setLoadError("");
    const queue: UploadItem[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      fileName: file.name,
      status: "queued",
    }));
    setItems(queue);

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const itemId = queue[index].id;
      setItems((current) =>
        current.map((item) =>
          item.id === itemId ? { ...item, status: "uploading" } : item,
        ),
      );

      try {
        const form = new FormData();
        form.append("file", file);
        form.append("corpus", corpus);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        const body = (await response.json()) as {
          error?: string;
          batch?: string | null;
          datasetId?: string;
        };

        if (!response.ok) {
          throw new Error(body.error || "Upload failed.");
        }

        setItems((current) =>
          current.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: body.batch ? "indexing" : "completed",
                  batch: body.batch,
                  datasetId: body.datasetId,
                  message: body.batch
                    ? "File received. Dify is indexing it."
                    : "Uploaded to Dify Knowledge.",
                }
              : item,
          ),
        );

        if (body.batch && body.datasetId) {
          await pollIndexing(itemId, body.batch, body.datasetId);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed.";
        setItems((current) =>
          current.map((item) =>
            item.id === itemId
              ? { ...item, status: "error", message }
              : item,
          ),
        );
      }
    }

    setBusy(false);
    setFiles([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const envKey = "DIFY_DATASET_TEXTBOOK";

  return (
    <div className="w-full max-w-layout-form space-y-6">
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

      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-zinc-200">
        <p className="text-sm font-medium text-zinc-900">{meta.title}</p>
        <p className="mt-1 text-sm text-zinc-500">{meta.uploadHint}</p>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          {meta.uploadDetail}
        </p>
      </div>

      <div
        className={`rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragOver
            ? "border-emerald-500 bg-emerald-50"
            : "border-zinc-200 bg-white"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (event.dataTransfer.files.length) {
            addFiles(event.dataTransfer.files);
          }
        }}
      >
        <p className="text-base font-medium text-zinc-900">
          Drop files for {meta.difyName}
        </p>
        <p className="mt-1 text-sm text-zinc-500">Markdown only (.md)</p>
        <button
          type="button"
          className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(event) => {
            if (event.target.files) {
              addFiles(event.target.files);
            }
          }}
        />
      </div>

      {files.length > 0 ? (
        <ul className="space-y-2 text-sm text-zinc-700">
          {files.map((file) => (
            <li
              key={`${file.name}-${file.size}`}
              className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-zinc-200"
            >
              <span className="truncate pr-3">{file.name}</span>
              <button
                type="button"
                className="text-zinc-400 hover:text-zinc-700"
                onClick={() =>
                  setFiles((current) => current.filter((item) => item !== file))
                }
                disabled={busy}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => void uploadAll()}
        disabled={busy || !corpusConfigured || files.length === 0}
        className="w-full rounded-full bg-emerald-600 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {busy ? "Uploading to Dify Knowledge…" : "Upload to Dify Knowledge"}
      </button>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl bg-white px-4 py-3 ring-1 ring-zinc-200"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {item.fileName}
                </p>
                <span
                  className={`shrink-0 text-xs font-semibold ${
                    item.status === "completed"
                      ? "text-emerald-700"
                      : item.status === "error"
                        ? "text-red-700"
                        : "text-zinc-500"
                  }`}
                >
                  {statusLabel(item.status)}
                </span>
              </div>
              {item.message ? (
                <p className="mt-1 text-sm text-zinc-500">{item.message}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
