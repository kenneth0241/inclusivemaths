"use client";

import { SEN_TAG_LABELS, type SenTag } from "@/lib/learner-roster";
import {
  formatIepForWorkflow,
  inferSenTags,
  isSenStudent,
  studentListLine,
  type StudentRecord,
} from "@/lib/student-record";
import { useStudentRoster } from "@/lib/use-student-roster";
import {
  deriveLearnerProfileTag,
  isStudioContextReady,
  type LearnerProfile,
  type WorkflowDraft,
} from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";

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
  const selectedClass = classes.find((item) => item.id === learner.classId);
  const selectedStudent = findStudent(learner.classId, learner.studentId);
  const tag = deriveLearnerProfileTag(learner);

  function patch(partial: Partial<LearnerProfile>) {
    onChange({ ...learner, ...partial });
  }

  function selectClass(classId: string) {
    onChange({
      ...learner,
      classId,
      studentId: undefined,
      senTags: learner.audience === "whole_class" ? [] : learner.senTags,
    });
  }

  function selectAudience(audience: LearnerProfile["audience"]) {
    onChange({
      ...learner,
      audience,
      studentId: audience === "whole_class" ? undefined : learner.studentId,
      senTags: audience === "whole_class" ? [] : learner.senTags,
    });
  }

  function selectStudent(studentId: string) {
    const student = findStudent(learner.classId, studentId);
    onChange({
      ...learner,
      audience: "student",
      studentId,
      senTags: student ? inferSenTags(student) : [],
    });
  }

  return (
    <div className="grid w-full gap-5 md:grid-cols-12">
      <div className="space-y-5 md:col-span-7">
        <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100 sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Class · 班別</h2>
          <p className="mt-1 text-sm text-zinc-600">
            <BilingualStack
              layout="stack"
              zh="班別與學生名單來自 data/students.json（可在「學生名單管理」編輯）。"
              en="Classes and students load from data/students.json (edit via Student roster)."
              enClassName="text-zinc-500"
            />
          </p>
          {loading ? (
            <p className="mt-4 text-sm text-zinc-500">Loading roster…</p>
          ) : error ? (
            <p className="mt-4 text-sm text-red-700">{error}</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {classes.map((item) => {
                const active = learner.classId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectClass(item.id)}
                    className={`rounded-2xl px-3 py-4 text-center text-sm font-semibold ring-1 transition ${
                      active
                        ? "bg-teal-ink text-white ring-teal-ink"
                        : "bg-zinc-50 text-zinc-800 ring-zinc-200 hover:ring-teal-300"
                    }`}
                  >
                    {item.label}
                    <span className="mt-1 block text-xs font-normal opacity-80">
                      {item.students.length} students
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100 sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Audience · 對象
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => selectAudience("whole_class")}
              className={`rounded-2xl px-4 py-4 text-left ring-1 transition ${
                learner.audience === "whole_class"
                  ? "bg-teal-ink text-white ring-teal-ink"
                  : "bg-zinc-50 text-zinc-800 ring-zinc-200 hover:ring-teal-300"
              }`}
            >
              <span className="block text-sm font-semibold">Whole class</span>
              <span className="mt-1 block text-xs opacity-80">全班</span>
            </button>
            <button
              type="button"
              onClick={() => selectAudience("student")}
              className={`rounded-2xl px-4 py-4 text-left ring-1 transition ${
                learner.audience === "student"
                  ? "bg-teal-ink text-white ring-teal-ink"
                  : "bg-zinc-50 text-zinc-800 ring-zinc-200 hover:ring-teal-300"
              }`}
            >
              <span className="block text-sm font-semibold">
                Specific student
              </span>
              <span className="mt-1 block text-xs opacity-80">個別學生</span>
            </button>
          </div>

          {learner.audience === "student" ? (
            <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
              {(selectedClass?.students ?? []).map((student) => (
                <StudentPickRow
                  key={student.id}
                  student={student}
                  active={learner.studentId === student.id}
                  onSelect={() => selectStudent(student.id)}
                />
              ))}
              {!selectedClass ? (
                <p className="text-sm text-zinc-500">Select a class first.</p>
              ) : null}
            </ul>
          ) : null}
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

      <aside className="space-y-4 md:col-span-5">
        <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100">
          <p className="text-xs font-semibold tracking-wide text-sky-lock uppercase">
            Routing tag
          </p>
          <p className="mt-2 text-lg font-semibold text-zinc-900">{tag}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Passed to the lesson workflow as learner profile context, together
            with the Content Footprint.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["spld", "adhd", "mixed"] as SenTag[]).map((sen) => (
              <span
                key={sen}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                  learner.senTags.includes(sen)
                    ? "bg-sky-50 text-sky-lock ring-sky-200"
                    : "bg-zinc-50 text-zinc-400 ring-zinc-200"
                }`}
              >
                {SEN_TAG_LABELS[sen]}
              </span>
            ))}
          </div>
          {selectedStudent ? (
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              <p className="font-medium text-zinc-900">{selectedStudent.name}</p>
              {isSenStudent(selectedStudent) ? (
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">
                  {formatIepForWorkflow(selectedStudent)}
                </pre>
              ) : (
                <p className="text-zinc-600">General class member (no IEP on file).</p>
              )}
            </div>
          ) : learner.classId ? (
            <p className="mt-3 text-sm text-zinc-700">
              Whole class {learner.classId}
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No class selected yet.</p>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100">
          <p className="text-xs font-semibold tracking-wide text-sky-lock uppercase">
            第一步 · Step 1
          </p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-900">
            <BilingualStack
              zh="已確認的內容足跡"
              en="Confirmed content footprint"
              layout="inline"
              enClassName="font-normal text-zinc-500"
            />
          </h3>
          {isStudioContextReady(footprint) ? (
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-zinc-500">
                  <BilingualStack
                    zh="主題摘要"
                    en="Topic summary"
                    layout="inline"
                    enClassName="text-zinc-400"
                  />
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-zinc-800">
                  {footprint.topicSummary}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">
                  <BilingualStack
                    zh="具體範圍與限制"
                    en="Scope & constraints"
                    layout="inline"
                    enClassName="text-zinc-400"
                  />
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-zinc-800">
                  {footprint.scope}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">
                  <BilingualStack
                    zh="視覺圖解與表達"
                    en="Visual models"
                    layout="inline"
                    enClassName="text-zinc-400"
                  />
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-zinc-800">
                  {footprint.visualModels}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              <BilingualStack
                layout="stack"
                zh="請在第一步完成對話，並按「前往學習者檔案」確認三項內容。"
                en="Finish Step 1 chat and use Proceed to learner profile to confirm all three items."
                enClassName="text-zinc-400"
              />
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}

function StudentPickRow({
  student,
  active,
  onSelect,
}: {
  student: StudentRecord;
  active: boolean;
  onSelect: () => void;
}) {
  const tags = inferSenTags(student);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`w-full rounded-2xl px-4 py-3 text-left ring-1 transition ${
          active
            ? "bg-sky-50 ring-sky-300"
            : "bg-white ring-zinc-200 hover:ring-sky-200"
        }`}
      >
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-zinc-900">
            {student.name}
          </span>
          <span className="flex gap-1">
            {tags.map((sen) => (
              <span
                key={sen}
                className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-sky-lock ring-1 ring-sky-100"
              >
                {SEN_TAG_LABELS[sen]}
              </span>
            ))}
          </span>
        </span>
        <span className="mt-1 block text-xs leading-5 text-zinc-600">
          {studentListLine(student)}
        </span>
      </button>
    </li>
  );
}
