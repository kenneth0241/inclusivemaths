"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
} from "@/lib/rich-text-markdown";
import { BilingualStack } from "./Bilingual";

export type WordLikeSummaryEditorHandle = {
  focus: () => void;
  getMarkdown: () => string;
};

type WordLikeSummaryEditorProps = {
  markdown: string;
  className?: string;
};

function ToolbarButton({
  label,
  titleZh,
  titleEn,
  onClick,
  active,
}: {
  label: ReactNode;
  titleZh: string;
  titleEn: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={`${titleZh} · ${titleEn}`}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`min-w-9 rounded-lg border px-2.5 py-2 text-sm font-semibold transition ${
        active
          ? "border-teal-400 bg-teal-50 text-teal-900"
          : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
      }`}
    >
      {label}
    </button>
  );
}

const WordLikeSummaryEditor = forwardRef<
  WordLikeSummaryEditorHandle,
  WordLikeSummaryEditorProps
>(function WordLikeSummaryEditor({ markdown, className = "" }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    getMarkdown: () => editorHtmlToMarkdown(editorRef.current?.innerHTML ?? ""),
  }));

  useEffect(() => {
    const el = editorRef.current;
    if (!el) {
      return;
    }
    el.innerHTML = markdownToEditorHtml(markdown);
  }, [markdown]);

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    refreshActiveFormats();
  }

  function refreshActiveFormats() {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 ${className}`.trim()}>
      <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-700">
        <BilingualStack
          layout="stack"
          zh="選取文字後按工具列按鈕，用法與 Word 類似。章節仍請保留 1. 2. 3. 編號。"
          en='Select text, then use the toolbar like Word. Keep section numbers 1. 2. 3.'
          enClassName="text-zinc-500"
        />
      </p>

      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2"
      >
        <ToolbarButton
          label="B"
          titleZh="粗體"
          titleEn="Bold"
          active={activeFormats.bold}
          onClick={() => runCommand("bold")}
        />
        <ToolbarButton
          label={<span className="italic">I</span>}
          titleZh="斜體"
          titleEn="Italic"
          active={activeFormats.italic}
          onClick={() => runCommand("italic")}
        />
        <ToolbarButton
          label={<span className="underline">U</span>}
          titleZh="底線"
          titleEn="Underline"
          active={activeFormats.underline}
          onClick={() => runCommand("underline")}
        />
        <ToolbarButton
          label={
            <span className="rounded bg-yellow-200 px-1 text-zinc-900">A</span>
          }
          titleZh="螢光筆"
          titleEn="Highlight"
          onClick={() => runCommand("hiliteColor", "#fef08a")}
        />
        <span className="mx-1 h-6 w-px bg-zinc-200" aria-hidden />
        <ToolbarButton
          label="•"
          titleZh="項目符號"
          titleEn="Bullet list"
          onClick={() => runCommand("insertUnorderedList")}
        />
        <ToolbarButton
          label="1."
          titleZh="編號清單"
          titleEn="Numbered list"
          onClick={() => runCommand("insertOrderedList")}
        />
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyUp={refreshActiveFormats}
        onMouseUp={refreshActiveFormats}
        className="min-h-[min(44vh,26rem)] flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-base leading-8 text-zinc-900 outline-none ring-teal-500/20 focus:ring-4 [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:list-disc"
      />
    </div>
  );
});

export default WordLikeSummaryEditor;
