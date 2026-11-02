"use client";

import { useState } from "react";
import { type CorpusId, CORPUS_META } from "@/lib/corpus";
import TextbookMarkdownTab from "./TextbookMarkdownTab";
import TextbookPdfTab from "./TextbookPdfTab";
import UploadForm from "./UploadForm";
import { useTextbookLibrary } from "./useTextbookLibrary";

type CorpusKnowledgePageProps = {
  corpus: CorpusId;
};

type TabId = "upload" | "markdown" | "pdf";

export default function CorpusKnowledgePage({ corpus }: CorpusKnowledgePageProps) {
  const meta = CORPUS_META[corpus];
  const [tab, setTab] = useState<TabId>("upload");
  const library = useTextbookLibrary(tab === "markdown" || tab === "pdf");

  const tabs: { id: TabId; label: string }[] = [
    { id: "upload", label: "Upload" },
    { id: "markdown", label: "Chat & lessons" },
    { id: "pdf", label: "Textbook PDFs" },
  ];

  return (
    <>
      <p className="text-sm font-semibold tracking-wide text-emerald-700 uppercase">
        Knowledge · {meta.shortTitle}
      </p>
      <h1 className="mt-2 text-center text-4xl font-semibold tracking-tight text-zinc-900">
        {meta.title}
      </h1>
      <p className="mt-3 mb-8 max-w-layout-prose text-center text-base leading-7 text-zinc-600">
        {meta.description}
      </p>

      <div className="mb-8 flex flex-wrap justify-center gap-2 rounded-full bg-white p-1 ring-1 ring-zinc-200">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === item.id
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <UploadForm corpus={corpus} />
      ) : tab === "markdown" ? (
        <TextbookMarkdownTab library={library} />
      ) : (
        <TextbookPdfTab library={library} />
      )}
    </>
  );
}
