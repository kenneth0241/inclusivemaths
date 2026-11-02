"use client";

import { useEffect, useState } from "react";
import { type CorpusId } from "@/lib/corpus";
import CorpusStatusCards from "./CorpusStatusCards";
import CorpusStatusSkeleton from "./CorpusStatusSkeleton";

type CorpusStatus = {
  corpus: CorpusId;
  configured: boolean;
  documentCount: number;
  error?: string;
};

export function CorpusStatusSection() {
  const [corpora, setCorpora] = useState<CorpusStatus[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/corpus/status", { cache: "no-store" });
        const body = (await response.json()) as { corpora?: CorpusStatus[] };
        if (!cancelled) {
          setCorpora(body.corpora ?? []);
        }
      } catch {
        if (!cancelled) {
          setCorpora([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!corpora) {
    return <CorpusStatusSkeleton />;
  }

  return <CorpusStatusCards corpora={corpora} />;
}
