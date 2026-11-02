export type CorpusId = "textbook";

export const CORPUS_IDS: CorpusId[] = ["textbook"];

export const CORPUS_META: Record<
  CorpusId,
  {
    title: string;
    shortTitle: string;
    difyName: string;
    description: string;
    uploadHint: string;
    uploadDetail: string;
  }
> = {
  textbook: {
    title: "Maths textbook",
    shortTitle: "Textbook",
    difyName: "MathsTextbook",
    description:
      "Upload your textbook as Markdown so Dify can index it for chat and lesson planning.",
    uploadHint:
      "Only Markdown (.md) files are accepted — one chapter or unit per file works well.",
    uploadDetail:
      "Prepare content in Markdown: use headings for sections, plain text for examples and exercises, and keep filenames clear (e.g. grade1-ch03-addition.md). Dify will chunk and embed the file for retrieval. PDFs and Word documents are not supported on this page; convert to .md first if needed.",
  },
};

export function isCorpusId(value: string): value is CorpusId {
  return value === "textbook";
}

export function isMarkdownUploadFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".md") || name.endsWith(".markdown");
}
