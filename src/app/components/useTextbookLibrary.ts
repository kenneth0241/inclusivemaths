"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  TextbookMarkdownItem,
  TextbookPdfItem,
} from "@/lib/textbook-library";

export function useTextbookLibrary(active: boolean) {
  const [markdown, setMarkdown] = useState<TextbookMarkdownItem[]>([]);
  const [pdfs, setPdfs] = useState<TextbookPdfItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [folderUrl, setFolderUrl] = useState("");
  const [knowledgeConfigured, setKnowledgeConfigured] = useState<boolean | null>(
    null,
  );
  const [corpusConfigured, setCorpusConfigured] = useState<boolean | null>(
    null,
  );
  const [deployHint, setDeployHint] = useState<"local" | "vercel">("local");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setPdfError("");

    const configRes = await fetch("/api/config", { cache: "no-store" });
    const config = (await configRes.json()) as {
      knowledgeConfigured?: boolean;
      deployHint?: "local" | "vercel";
      corpora?: { corpus: string; configured: boolean }[];
    };
    setKnowledgeConfigured(Boolean(config.knowledgeConfigured));
    setDeployHint(config.deployHint === "vercel" ? "vercel" : "local");
    setCorpusConfigured(
      Boolean(config.corpora?.find((c) => c.corpus === "textbook")?.configured),
    );

    if (!config.knowledgeConfigured) {
      setMarkdown([]);
      setPdfs([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/textbook-library", {
        cache: "no-store",
      });
      const body = (await response.json()) as {
        error?: string;
        markdown?: TextbookMarkdownItem[];
        pdfs?: TextbookPdfItem[];
        folderUrl?: string;
        pdfError?: string;
      };

      if (!response.ok) {
        throw new Error(body.error || "Could not load textbook files.");
      }

      setMarkdown(body.markdown ?? []);
      setPdfs(body.pdfs ?? []);
      setFolderUrl(body.folderUrl ?? "");
      setPdfError(body.pdfError ?? "");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load textbook files.";
      setError(message);
      setMarkdown([]);
      setPdfs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load when tab opens
    void load();
  }, [active, load]);

  return {
    markdown,
    pdfs,
    loading,
    error,
    pdfError,
    folderUrl,
    knowledgeConfigured,
    corpusConfigured,
    deployHint,
    reload: load,
  };
}
