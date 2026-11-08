"use client";

import { useEffect, useMemo, useState } from "react";
import EnvConfigBanner from "./EnvConfigBanner";
import {
  isSenStudent,
  mergeInferredSenTags,
  senTypeShortLabel,
  studentListSubtitle,
  type StudentRecord,
} from "@/lib/student-record";
import { useStudentRoster } from "@/lib/use-student-roster";
import {
  isStudioContextReady,
  type LearnerProfile,
  type WorkflowDraft,
} from "@/lib/workflow-draft";
import { StudioStep1FootprintSummary } from "./StudioStep1FootprintSummary";
import { formatProfileAnalysisText } from "@/lib/profile-synthesizer";
import { BilingualStack } from "./Bilingual";
import ProfileAnalysisDisplay from "./ProfileAnalysisDisplay";
import ProfileSynthesisFullScreenDialog from "./ProfileSynthesisFullScreenDialog";
import { StudentRecordViewDialog } from "./StudentRecordDialog";

type LearnerProfileFormProps = {
  draft: WorkflowDraft;
  onChange: (learner: LearnerProfile) => void;
};

export default function LearnerProfileForm({
  draft,
  onChange,
}: LearnerProfileFormProps) {
  const { classes, loading, error, findStudent } = useStudentRoster();
  const { learner, footprint } = draft;
  const [viewStudent, setViewStudent] = useState<StudentRecord | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [profileSynthesizerConfigured, setProfileSynthesizerConfigured] =
    useState<boolean | null>(null);
  const [deployHint, setDeployHint] = useState<"local" | "vercel">("local");

  useEffect(() => {
    void fetch("/api/config")
      .then((response) => response.json())
      .then(
        (body: {
          profileSynthesizerConfigured?: boolean;
          deployHint?: string;
        }) => {
          setProfileSynthesizerConfigured(
            Boolean(body.profileSynthesizerConfigured),
          );
          if (body.deployHint === "vercel" || body.deployHint === "local") {
            setDeployHint(body.deployHint);
          }
        },
      )
      .catch(() => setProfileSynthesizerConfigured(false));
  }, []);
  const selectedClass = classes.find((item) => item.id === learner.classId);
  const classStudents = selectedClass?.students ?? [];
  const selectedSet = useMemo(
    () => new Set(learner.studentIds),
    [learner.studentIds],
  );
  const allSelected =
    classStudents.length > 0 &&
    classStudents.every((student) => selectedSet.has(student.id));

  function patch(partial: Partial<LearnerProfile>) {
    onChange({ ...learner, ...partial });
  }

  function applyStudentIds(studentIds: string[]) {
    const records = studentIds
      .map((id) => findStudent(learner.classId, id))
      .filter((student): student is StudentRecord => student !== null);
    onChange({
      ...learner,
      studentIds,
      senTags: mergeInferredSenTags(records),
      pedagogicalSynthesis: "",
    });
  }

  function selectClass(classId: string) {
    onChange({
      ...learner,
      classId,
      studentIds: [],
      senTags: [],
      pedagogicalSynthesis: "",
    });
  }

  async function runProfileAnalysis() {
    if (analysisBusy) {
      return;
    }
    setAnalysisError("");
    patch({ pedagogicalSynthesis: "" });
    setAnalysisBusy(true);
    try {
      const response = await fetch("/api/profile-synthesizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: learner.classId,
          studentIds: learner.studentIds,
          classProfile: learner.classProfile,
          footprint,
        }),
      });
      const body = (await response.json()) as {
        pedagogicalConstraints?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error || "Profile analysis failed.");
      }
      patch({
        pedagogicalSynthesis: formatProfileAnalysisText(
          body.pedagogicalConstraints ?? "",
        ),
      });
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : "Profile analysis failed.",
      );
    } finally {
      setAnalysisBusy(false);
    }
  }

  const canAnalyze =
    profileSynthesizerConfigured === true &&
    learner.studentIds.length > 0 &&
    isStudioContextReady(footprint) &&
    Boolean(learner.classId);

  function toggleStudent(studentId: string) {
    const next = new Set(learner.studentIds);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    applyStudentIds(
      [...next].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    );
  }

  function selectAllInClass() {
    applyStudentIds(classStudents.map((student) => student.id));
  }

  function clearSelection() {
    applyStudentIds([]);
  }

  return (
    <div className="w-full">
      <StudentRecordViewDialog
        student={viewStudent}
        onClose={() => setViewStudent(null)}
        showEdit={false}
      />

      <div className="grid w-full gap-5 lg:grid-cols-[3fr_2fr] lg:items-start">
        <div className="min-w-0 space-y-5">
          <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100 sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              Class · 班別
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              <BilingualStack
                layout="inline"
                zh="可在「學習者檔案」管理頁編輯。"
                en="Edit via Learner Profiles."
                enClassName="text-zinc-500"
              />
            </p>
            {loading ? (
              <p className="mt-4 text-sm text-zinc-500">Loading roster…</p>
            ) : error ? (
              <p className="mt-4 text-sm text-red-700">{error}</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                {classes.map((item) => {
                  const active = learner.classId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectClass(item.id)}
                      className={`rounded-2xl px-3 py-3 text-center text-sm font-semibold ring-1 transition ${
                        active
                          ? "bg-teal-ink text-white ring-teal-ink"
                          : "bg-zinc-50 text-zinc-800 ring-zinc-200 hover:ring-teal-300"
                      }`}
                    >
                      <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5">
                        <span>{item.label}</span>
                        <span className="text-xs font-normal opacity-80">
                          · {item.students.length} students
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            <BilingualStack
              zh="選取學生"
              en="Select students"
              layout="inline"
              enClassName="font-normal text-zinc-500"
            />
          </h2>
          {selectedClass ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">
                {learner.studentIds.length}/{classStudents.length}
              </span>
              <button
                type="button"
                onClick={selectAllInClass}
                disabled={allSelected}
                className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 ring-1 ring-teal-100 disabled:opacity-40"
              >
                <BilingualStack
                  zh="全選"
                  en="Select all"
                  layout="inline"
                  enClassName="text-teal-800/80"
                />
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={learner.studentIds.length === 0}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 disabled:opacity-40"
              >
                <BilingualStack
                  zh="清除"
                  en="Clear"
                  layout="inline"
                  enClassName="text-zinc-400"
                />
              </button>
            </div>
          ) : null}
        </div>

        {profileSynthesizerConfigured === false ? (
          <div className="mt-3">
            <EnvConfigBanner
              configured={false}
              deployHint={deployHint}
              envKey="DIFY_APP_PROFILE_SYNTHESIS_API_KEY"
              bilingual
            />
          </div>
        ) : null}
        {analysisError ? (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
            {analysisError}
          </p>
        ) : null}

        {!selectedClass ? (
          <p className="mt-4 text-sm text-zinc-500">Select a class first.</p>
        ) : (
          <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto overscroll-y-contain px-1 py-1">
            {classStudents.map((student) => (
              <StudentPickRow
                key={`${student.class}-${student.id}`}
                student={student}
                selected={selectedSet.has(student.id)}
                onToggle={() => toggleStudent(student.id)}
                onViewProfile={() => setViewStudent(student)}
              />
            ))}
          </ul>
        )}
          </section>

          <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100 sm:p-6">
            <label className="block text-sm font-semibold text-zinc-900">
              Custom class profile · 課堂備註
              <textarea
                rows={5}
                value={learner.classProfile}
                onChange={(event) => patch({ classProfile: event.target.value })}
                placeholder="Baselines, class dynamics, accommodations already in use…"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none ring-teal-500/20 focus:ring-4"
              />
            </label>
          </section>
        </div>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-4">
          <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100 sm:p-6">
            <StudioStep1FootprintSummary footprint={footprint} />
          </section>
          <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100 sm:p-6">
            <ProfileSynthesisPanel
              synthesis={learner.pedagogicalSynthesis}
              loading={analysisBusy}
              canAnalyze={canAnalyze}
              synthesizerConfigured={profileSynthesizerConfigured === true}
              onRunAnalysis={() => void runProfileAnalysis()}
              onSaveSynthesis={(value) => patch({ pedagogicalSynthesis: value })}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

function ProfileSynthesisPanel({
  synthesis,
  loading,
  canAnalyze,
  synthesizerConfigured,
  onRunAnalysis,
  onSaveSynthesis,
}: {
  synthesis: string;
  loading: boolean;
  canAnalyze: boolean;
  synthesizerConfigured: boolean;
  onRunAnalysis: () => void;
  onSaveSynthesis: (value: string) => void;
}) {
  const displayText = formatProfileAnalysisText(synthesis);
  const [expanded, setExpanded] = useState(false);
  const hasSynthesis = displayText.length > 0;
  const showRequiredCallout =
    synthesizerConfigured && !hasSynthesis && !loading;

  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-teal-800 uppercase">
        Profile Synthesizer
      </p>
      <h3 className="mt-1 text-sm font-semibold text-zinc-900">
        <BilingualStack
          zh="核心教學限制摘要"
          en="Core pedagogical constraints"
          layout="inline"
          enClassName="font-normal text-zinc-500"
        />
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        <BilingualStack
          layout="inline"
          zh="選取學生後必須執行分析，才可前往教案（Step 3）。"
          en="Required after selecting students — run before the lesson plan (Step 3)."
          enClassName="text-zinc-400"
        />
      </p>

      <div className="mt-4">
        {showRequiredCallout ? (
          <div
            className="mb-4 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-4 ring-2 ring-amber-200/80"
            role="status"
          >
            <p className="text-xs font-bold tracking-wide text-amber-900 uppercase">
              Step 2 · Required
            </p>
            <p className="mt-1 text-sm font-semibold text-amber-950">
              <BilingualStack
                layout="stack"
                zh="請執行 Profile Synthesizer"
                en="Run Profile Synthesizer next"
                enClassName="text-sm font-medium text-amber-900/90"
              />
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-900/90">
              <BilingualStack
                layout="stack"
                zh="整合 Step 1 內容足跡、課堂備註與所選學生 IEP，產生教學限制摘要。"
                en="Combines Step 1 footprint, class notes, and selected IEP profiles."
                enClassName="text-amber-900/75"
              />
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={!canAnalyze || loading}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-semibold shadow-sm transition ${
            canAnalyze && !loading
              ? hasSynthesis
                ? "bg-white text-teal-900 ring-2 ring-teal-300 hover:bg-teal-50"
                : "bg-teal-ink text-white ring-2 ring-teal-700 hover:bg-teal-700 animate-[pulse_2.5s_ease-in-out_3]"
              : "cursor-not-allowed bg-zinc-200 text-zinc-500 ring-1 ring-zinc-200"
          }`}
        >
          <span aria-hidden className="text-xl leading-none">
            {loading ? "⋯" : hasSynthesis ? "↻" : "▶"}
          </span>
          <BilingualStack
            layout="stack"
            zh={
              loading
                ? "分析進行中…"
                : hasSynthesis
                  ? "重新分析"
                  : "執行分析"
            }
            en={
              loading
                ? "Analyzing…"
                : hasSynthesis
                  ? "Run analysis again"
                  : "Run analysis"
            }
            zhClassName=""
            enClassName={
              canAnalyze && !loading
                ? hasSynthesis
                  ? "text-xs font-medium text-teal-800/80"
                  : "text-xs font-medium text-white/90"
                : "text-zinc-400"
            }
          />
        </button>
        {!canAnalyze && synthesizerConfigured && !loading ? (
          <p className="mt-2 text-center text-xs text-zinc-500">
            <BilingualStack
              layout="stack"
              zh="請先選擇班別與至少一名學生，並確認 Step 1 三項內容。"
              en="Select a class and students, and confirm Step 1 footprint first."
              enClassName="text-zinc-400"
            />
          </p>
        ) : null}
      </div>

      {loading ? (
        <div
          className="mt-4 rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 px-4 py-6 text-center"
          aria-busy="true"
        >
          <p className="text-sm font-medium text-teal-900">
            Running Profile Synthesizer…
          </p>
          <p className="mt-1 text-xs text-teal-800/70">
            分析進行中 · Synthesizing learner constraints
          </p>
        </div>
      ) : displayText ? (
        <>
          <p className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <BilingualStack
              layout="inline"
              zh="已完成 · 可前往教案"
              en="Complete · ready for lesson plan"
              enClassName="text-emerald-700/90"
            />
          </p>
          <div className="mt-3 rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/60 to-white px-4 py-4 ring-1 ring-teal-100/80">
            <div className="max-h-72 overflow-y-auto pr-1">
              <ProfileAnalysisDisplay content={displayText} />
            </div>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-3 w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-medium text-teal-900 transition hover:bg-teal-50"
            >
              <BilingualStack
                layout="inline"
                zh="點擊查看詳情"
                en="Click for detail"
                enClassName="text-teal-700/80"
              />
            </button>
          </div>
          <ProfileSynthesisFullScreenDialog
            open={expanded}
            content={displayText}
            onClose={() => setExpanded(false)}
            onSave={(value) => onSaveSynthesis(value)}
          />
        </>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          <BilingualStack
            layout="stack"
            zh="尚未分析。完成 Step 1 並選取學生後，按「分析」。"
            en="No synthesis yet. Confirm Step 1, select students, then Analysis."
            enClassName="text-zinc-400"
          />
        </p>
      )}
    </div>
  );
}

function StudentPickRow({
  student,
  selected,
  onToggle,
  onViewProfile,
}: {
  student: StudentRecord;
  selected: boolean;
  onToggle: () => void;
  onViewProfile: () => void;
}) {
  const subtitle = studentListSubtitle(student);
  const senLabel = senTypeShortLabel(student.sen_type);

  return (
    <li>
      <div
        className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 transition ${
          selected
            ? "border-sky-300 bg-sky-50"
            : "border-zinc-200 bg-white hover:border-sky-200"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
            selected
              ? "border-sky-lock bg-sky-lock text-white"
              : "border-zinc-300 bg-white"
          }`}
          aria-label={selected ? "Deselect student" : "Select student"}
        >
          {selected ? "✓" : ""}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <button
              type="button"
              onClick={onToggle}
              className="text-left text-sm font-semibold text-zinc-900 hover:text-teal-800"
            >
              {student.name}
            </button>
            {isSenStudent(student) && senLabel ? (
              <button
                type="button"
                onClick={onViewProfile}
                className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-sky-lock ring-1 ring-sky-100 hover:bg-sky-50"
                title="View IEP profile"
              >
                {senLabel}
              </button>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-1 text-xs leading-5 text-zinc-600">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
