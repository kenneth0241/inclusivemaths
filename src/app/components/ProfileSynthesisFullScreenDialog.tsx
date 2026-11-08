"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  mergeProfileAnalysisSectionsForEdit,
  PROFILE_SYNTHESIS_SECTION_TITLES,
  serializeProfileAnalysisSections,
  type ProfileAnalysisSection,
} from "@/lib/profile-synthesizer";
import { BilingualStack } from "./Bilingual";
import ProfileSynthesisSectionList from "./ProfileSynthesisSectionList";
import WordLikeSummaryEditor, {
  type WordLikeSummaryEditorHandle,
} from "./WordLikeSummaryEditor";

type ProfileSynthesisFullScreenDialogProps = {
  open: boolean;
  content: string;
  onClose: () => void;
  onSave: (content: string) => void;
};

export default function ProfileSynthesisFullScreenDialog({
  open,
  content,
  onClose,
  onSave,
}: ProfileSynthesisFullScreenDialogProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [sections, setSections] = useState<ProfileAnalysisSection[]>([]);
  const [editingSectionNumber, setEditingSectionNumber] = useState<
    number | null
  >(null);
  const editorRef = useRef<WordLikeSummaryEditorHandle>(null);

  const editingSection = useMemo(
    () => sections.find((s) => s.number === editingSectionNumber) ?? null,
    [sections, editingSectionNumber],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setSections(mergeProfileAnalysisSectionsForEdit(content));
      setEditingSectionNumber(null);
    }
  }, [open, content]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (editingSectionNumber !== null) {
          setEditingSectionNumber(null);
          return;
        }
        onClose();
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, editingSectionNumber]);

  if (!open || !mounted || !content.trim()) {
    return null;
  }

  function persistSections(nextSections: ProfileAnalysisSection[]) {
    const serialized = serializeProfileAnalysisSections(nextSections);
    setSections(nextSections);
    onSave(serialized);
  }

  function handleSaveSection() {
    if (editingSectionNumber === null || !editorRef.current) {
      return;
    }
    const body = editorRef.current.getMarkdown();
    const nextSections = sections.map((section) =>
      section.number === editingSectionNumber
        ? { ...section, body }
        : section,
    );
    persistSections(nextSections);
    setEditingSectionNumber(null);
  }

  function handleCancelSectionEdit() {
    setEditingSectionNumber(null);
  }

  const editingTitle =
    editingSectionNumber !== null
      ? PROFILE_SYNTHESIS_SECTION_TITLES[editingSectionNumber]
      : null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col p-2 sm:p-3">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-auto flex h-[min(96vh,100%)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-zinc-100 px-4 py-4 sm:px-8 sm:py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-teal-800 uppercase">
              Profile Synthesizer
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-semibold text-zinc-900 sm:text-xl">
              {editingSectionNumber !== null && editingTitle ? (
                <BilingualStack
                  zh={`編輯第 ${editingSectionNumber} 節 · ${editingTitle.zh}`}
                  en={`Edit section ${editingSectionNumber} · ${editingTitle.en}`}
                  layout="inline"
                  enClassName="font-normal text-zinc-500"
                />
              ) : (
                <BilingualStack
                  zh="核心教學限制摘要"
                  en="Core pedagogical constraints"
                  layout="inline"
                  enClassName="font-normal text-zinc-500"
                />
              )}
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {editingSectionNumber !== null ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelSectionEdit}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <BilingualStack
                    layout="inline"
                    zh="取消"
                    en="Cancel"
                    enClassName="text-zinc-500"
                  />
                </button>
                <button
                  type="button"
                  onClick={handleSaveSection}
                  className="rounded-xl bg-teal-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  <BilingualStack
                    layout="inline"
                    zh="儲存此節"
                    en="Save section"
                    enClassName="text-white/90"
                  />
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              <BilingualStack
                layout="inline"
                zh="關閉"
                en="Close"
                enClassName="text-zinc-500"
              />
            </button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
          {editingSectionNumber !== null && editingSection ? (
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
              <p className="mb-3 rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-2 text-sm text-teal-950">
                <BilingualStack
                  layout="stack"
                  zh="只編輯此節內文；章節標題 (1–5) 由系統固定。"
                  en="You edit this section’s body only — section titles 1–5 stay fixed."
                  enClassName="text-teal-900/85"
                />
              </p>
              <WordLikeSummaryEditor
                ref={editorRef}
                key={`section-${editingSectionNumber}-${editingSection.body.slice(0, 24)}`}
                markdown={editingSection.body}
                className="flex-1"
              />
            </div>
          ) : (
            <ProfileSynthesisSectionList
              sections={sections}
              onEditSection={setEditingSectionNumber}
              className="mx-auto max-w-3xl"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
