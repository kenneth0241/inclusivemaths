"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import {
  gameTargetIdsEqual,
  sortStudentIds,
} from "@/lib/game-targets";
import {
  isSenStudent,
  senTypeShortLabel,
  studentListSubtitle,
  type StudentRecord,
} from "@/lib/student-record";
import type { LearnerProfile } from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";

type GameTargetLearnersPanelProps = {
  learner: LearnerProfile;
  rosterStudents: StudentRecord[];
  gameTargetStudentIds: string[];
  disabled?: boolean;
  onChangeGameTargets: (ids: string[]) => void;
};

function briefNames(students: StudentRecord[], max = 3) {
  if (students.length === 0) {
    return "";
  }
  const names = students.map((s) => s.name);
  if (names.length <= max) {
    return names.join("、");
  }
  return `${names.slice(0, max).join("、")}… +${names.length - max}`;
}

export default function GameTargetLearnersPanel({
  learner,
  rosterStudents,
  gameTargetStudentIds,
  disabled = false,
  onChangeGameTargets,
}: GameTargetLearnersPanelProps) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(true);

  const targetSet = useMemo(
    () => new Set(gameTargetStudentIds),
    [gameTargetStudentIds],
  );

  const gameTargetStudents = useMemo(
    () =>
      gameTargetStudentIds
        .map((id) => rosterStudents.find((s) => s.id === id))
        .filter((s): s is StudentRecord => s !== undefined),
    [gameTargetStudentIds, rosterStudents],
  );

  const hasRoster = rosterStudents.length > 0;
  const hasTargets = gameTargetStudentIds.length > 0;
  const allGameTargetsSelected =
    hasRoster && gameTargetStudentIds.length === rosterStudents.length;

  useEffect(() => {
    if (!hasRoster) {
      return;
    }
    setExpanded(true);
  }, [hasRoster]);

  function toggleStudent(studentId: string) {
    const next = new Set(gameTargetStudentIds);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    onChangeGameTargets(sortStudentIds([...next]));
  }

  function selectAllTargets() {
    onChangeGameTargets(sortStudentIds(rosterStudents.map((s) => s.id)));
  }

  function clearTargets() {
    onChangeGameTargets([]);
  }

  return (
    <section className="rounded-3xl bg-white ring-1 ring-teal-100">
      <header className="relative z-20 flex flex-wrap items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-teal-ink uppercase">
            <BilingualStack
              zh="遊戲對象"
              en="Game targets"
              layout="inline"
              enClassName="text-teal-700/80"
            />
          </p>
          {expanded ? (
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              <BilingualStack
                zh="從第二步名單中勾選本遊戲的對象（可少於全班）。"
                en="Pick which Step 2 learners this game is for (can be a subset)."
                layout="stack"
                enClassName="text-zinc-400"
              />
            </p>
          ) : (
            <p className="mt-2 text-xs leading-5 text-zinc-600">
              {!hasRoster ? (
                <BilingualStack
                  zh="尚未有名單"
                  en="No roster yet"
                  layout="inline"
                />
              ) : !hasTargets ? (
                <BilingualStack
                  zh="未勾選遊戲對象"
                  en="No game targets selected"
                  layout="inline"
                />
              ) : (
                <>
                  <span className="font-medium text-zinc-700">
                    {gameTargetStudentIds.length}/{rosterStudents.length} ·{" "}
                  </span>
                  {briefNames(gameTargetStudents)}
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {learner.classId && expanded ? (
            <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200">
              <BilingualStack
                zh={`班級 ${learner.classId}`}
                en={`Class ${learner.classId}`}
                layout="inline"
              />
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="shrink-0 rounded-full bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
          >
            <BilingualStack
              zh={expanded ? "收合" : "展開"}
              en={expanded ? "Collapse" : "Expand"}
              layout="inline"
            />
          </button>
        </div>
      </header>

      <div
        id={panelId}
        hidden={!expanded}
        className="space-y-4 p-5 pt-4 sm:p-6 sm:pt-4"
      >
        {!hasRoster ? (
          <p className="text-sm text-zinc-500">
            <BilingualStack
              layout="stack"
              zh="第二步尚未選學生。請先選班與學習者。"
              en="No students in Step 2. Pick class and learners first."
              enClassName="text-zinc-400"
            />
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-zinc-500">
                <BilingualStack
                  zh={`已選 ${gameTargetStudentIds.length} / ${rosterStudents.length} 位`}
                  en={`${gameTargetStudentIds.length} of ${rosterStudents.length} selected`}
                  layout="inline"
                />
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={disabled || allGameTargetsSelected}
                  onClick={selectAllTargets}
                  className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 ring-1 ring-teal-100 disabled:opacity-40"
                >
                  <BilingualStack zh="全選" en="Select all" layout="inline" />
                </button>
                <button
                  type="button"
                  disabled={disabled || !hasTargets}
                  onClick={clearTargets}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 disabled:opacity-40"
                >
                  <BilingualStack zh="清除" en="Clear" layout="inline" />
                </button>
              </div>
            </div>

            <ul className="max-h-[20rem] space-y-2 overflow-y-auto overscroll-y-contain px-0.5 py-0.5">
              {rosterStudents.map((student) => (
                <GameTargetPickRow
                  key={`${student.class}-${student.id}`}
                  student={student}
                  selected={targetSet.has(student.id)}
                  disabled={disabled}
                  onToggle={() => toggleStudent(student.id)}
                />
              ))}
            </ul>
          </>
        )}

        <p className="text-xs">
          <Link
            href="/design/profile"
            className="font-medium text-teal-800 underline decoration-teal-200 underline-offset-2 hover:text-teal-950"
          >
            <BilingualStack
              zh="調整第二步名單"
              en="Edit Step 2 roster"
              layout="inline"
            />
          </Link>
        </p>
      </div>
    </section>
  );
}

function GameTargetPickRow({
  student,
  selected,
  disabled,
  onToggle,
}: {
  student: StudentRecord;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const subtitle = studentListSubtitle(student);
  const senLabel = senTypeShortLabel(student.sen_type);

  return (
    <li>
      <div
        className={`flex w-full items-start gap-3 rounded-2xl px-4 py-3 ring-1 transition ${
          selected
            ? "bg-teal-50 ring-teal-300"
            : "bg-zinc-50/80 ring-zinc-200 hover:ring-teal-200"
        }`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          aria-pressed={selected}
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border disabled:opacity-50 ${
            selected
              ? "border-teal-700 bg-teal-700 text-white"
              : "border-zinc-300 bg-white"
          }`}
          aria-label={selected ? "取消遊戲對象" : "設為遊戲對象"}
        >
          {selected ? "✓" : ""}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          className="min-w-0 flex-1 text-left disabled:opacity-50"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900">
              {student.name}
              <span className="ml-1.5 font-normal text-zinc-500">
                ({student.id})
              </span>
            </p>
            {isSenStudent(student) && senLabel ? (
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-sky-lock ring-1 ring-sky-100">
                {senLabel}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-1 text-xs leading-5 text-zinc-600">{subtitle}</p>
          ) : (
            <p className="mt-1 text-xs text-zinc-400">
              <BilingualStack
                zh="一般學習者"
                en="General learner"
                layout="inline"
              />
            </p>
          )}
        </button>
      </div>
    </li>
  );
}
