"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Dataset = {
  id: string;
  name: string;
  description?: string | null;
  document_count?: number;
};

type UploadItem = {
  id: string;
  fileName: string;
  status: "queued" | "uploading" | "indexing" | "completed" | "error";
  message?: string;
  batch?: string | null;
  datasetId?: string;
};

const ACCEPTED =
  ".txt,.md,.markdown,.pdf,.html,.htm,.xlsx,.xls,.docx,.csv,.xml,.epub,.pptx,.ppt";

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

export default function UploadForm() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState("");
  const [locked, setLocked] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDatasets = useCallback(async () => {
    setLoadError("");
    const [configRes, datasetsRes] = await Promise.all([
      fetch("/api/config"),
      fetch("/api/datasets"),
    ]);

    const config = (await configRes.json()) as {
      configured?: boolean;
      lockedDatasetId?: string | null;
    };
    setConfigured(Boolean(config.configured));

    if (!datasetsRes.ok) {
      const body = (await datasetsRes.json()) as { error?: string };
      setLoadError(body.error || "Could not load Dify knowledge bases.");
      return;
    }

    const body = (await datasetsRes.json()) as { datasets?: Dataset[] };
    const list = body.datasets ?? [];
    setDatasets(list);

    if (config.lockedDatasetId) {
      setLocked(true);
      setDatasetId(config.lockedDatasetId);
    } else if (list.length === 1) {
      setDatasetId(list[0].id);
    }
  }, []);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  function addFiles(incoming: FileList | File[]) {
    const next = Array.from(incoming);
    setFiles((current) => {
      const names = new Set(current.map((file) => `${file.name}:${file.size}`));
      return [
        ...current,
        ...next.filter((file) => !names.has(`${file.name}:${file.size}`)),
      ];
    });
  }

  async function pollIndexing(itemId: string, dataset: string, batch: string) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await fetch(
        `/api/indexing-status?datasetId=${encodeURIComponent(dataset)}&batch=${encodeURIComponent(batch)}`,
      );
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
              ? { ...item, status: "completed", message: "Indexed in Dify Knowledge." }
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
              message: "Still indexing in Dify. Check the Knowledge page if this takes a while.",
            }
          : item,
      ),
    );
  }

  async function uploadAll() {
    if (!datasetId) {
      setLoadError("Select a knowledge base first.");
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
        form.append("datasetId", datasetId);

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
          await pollIndexing(itemId, body.datasetId, body.batch);
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

  return (
    <div className="w-full max-w-xl space-y-6">
      {configured === false ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add <code className="font-mono">DIFY_API_KEY</code> to{" "}
          <code className="font-mono">.env.local</code>, then restart the app.
        </p>
      ) : null}

      {loadError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-zinc-800">Knowledge base</span>
        <select
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none ring-emerald-500/30 focus:ring-4 disabled:bg-zinc-50"
          value={datasetId}
          disabled={locked || busy || datasets.length === 0}
          onChange={(event) => setDatasetId(event.target.value)}
        >
          <option value="">
            {datasets.length === 0 ? "No knowledge bases found" : "Choose a knowledge base"}
          </option>
          {datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.name}
              {typeof dataset.document_count === "number"
                ? ` (${dataset.document_count} documents)`
                : ""}
            </option>
          ))}
        </select>
      </label>

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
          Drop teaching files here
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          PDF, Word, PowerPoint, Excel, text, Markdown, HTML, CSV
        </p>
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
        disabled={busy || !datasetId || files.length === 0}
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
