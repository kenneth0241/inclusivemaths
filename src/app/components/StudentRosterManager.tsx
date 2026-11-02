"use client";

import { useMemo, useState } from "react";
import AppNav from "./AppNav";
import {
  EMPTY_CURRENT_PERFORMANCE,
  EMPTY_IEP_DOMAINS,
  isSenStudent,
  normalizeStudentForSave,
  type StudentRecord,
} from "@/lib/student-record";
import { useStudentRoster } from "@/lib/use-student-roster";
import { BilingualStack } from "./Bilingual";

function blankStudent(classId: string): StudentRecord {
  return {
    id: "",
    name: "",
    class: classId,
  };
}

function cloneStudent(student: StudentRecord): StudentRecord {
  return JSON.parse(JSON.stringify(student)) as StudentRecord;
}

export default function StudentRosterManager() {
  const { students, loading, error, saveAll, refresh } = useStudentRoster();
  const classFilterOptions = useMemo(() => {
    const ids = new Set(students.map((s) => s.class));
    return ["all", ...[...ids].sort()];
  }, [students]);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [editingOriginalId, setEditingOriginalId] = useState<string | null>(
    null,
  );
  const [editingOriginalClass, setEditingOriginalClass] = useState<
    string | null
  >(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  const filtered = useMemo(() => {
    const list =
      classFilter === "all"
        ? students
        : students.filter((s) => s.class === classFilter);
    return [...list].sort((a, b) => a.id.localeCompare(b.id));
  }, [students, classFilter]);

  function openNew() {
    const defaultClass =
      classFilter !== "all" ? classFilter : (students[0]?.class ?? "1A");
    setEditing(blankStudent(defaultClass));
    setEditingOriginalId(null);
    setEditingOriginalClass(null);
    setSaveError("");
  }

  function openEdit(student: StudentRecord) {
    setEditing(cloneStudent(student));
    setEditingOriginalId(student.id);
    setEditingOriginalClass(student.class);
    setSaveError("");
  }

  function patchEditing(patch: Partial<StudentRecord>) {
    setEditing((current) => (current ? { ...current, ...patch } : current));
  }

  function setSenEnabled(enabled: boolean) {
    setEditing((current) => {
      if (!current) {
        return current;
      }
      if (!enabled) {
        const next: StudentRecord = {
          id: current.id,
          name: current.name,
          class: current.class,
        };
        return next;
      }
      return {
        ...current,
        sen_type: current.sen_type ?? "",
        current_performance: current.current_performance ?? {
          ...EMPTY_CURRENT_PERFORMANCE,
        },
        domains: current.domains ?? { ...EMPTY_IEP_DOMAINS },
      };
    });
  }

  async function removeStudent(student: StudentRecord) {
    if (
      !window.confirm(
        `Remove ${student.name} (${student.class} · ${student.id})?`,
      )
    ) {
      return;
    }
    setSaveBusy(true);
    setSaveError("");
    try {
      await saveAll(
        students.filter(
          (s) => !(s.class === student.class && s.id === student.id),
        ),
      );
      if (
        editing?.id === student.id &&
        editing.class === student.class
      ) {
        setEditing(null);
        setEditingOriginalId(null);
        setEditingOriginalClass(null);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setSaveBusy(false);
    }
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) {
      return;
    }
    setSaveBusy(true);
    setSaveError("");
    try {
      const normalized = normalizeStudentForSave(editing);
      if (!normalized.id || !normalized.name || !normalized.class) {
        throw new Error("Id, name, and class are required.");
      }
      const withoutEdited =
        editingOriginalId && editingOriginalClass
          ? students.filter(
              (s) =>
                !(
                  s.id === editingOriginalId &&
                  s.class === editingOriginalClass
                ),
            )
          : students;
      const duplicate = withoutEdited.some(
        (s) => s.class === normalized.class && s.id === normalized.id,
      );
      if (duplicate) {
        throw new Error(
          `Student ${normalized.id} already exists in class ${normalized.class}.`,
        );
      }
      const next = [...withoutEdited, normalized];
      await saveAll(next);
      setEditing(null);
      setEditingOriginalId(null);
      setEditingOriginalClass(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-zinc-600">
            Class
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="ml-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            >
              {classFilterOptions.map((id) => (
                <option key={id} value={id}>
                  {id === "all" ? "All classes" : id}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-zinc-200 hover:bg-zinc-50"
          >
            Reload
          </button>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded-full bg-teal-ink px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Add student
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-teal-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">SEN</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr
                  key={`${student.class}-${student.id}`}
                  className="border-t border-zinc-100"
                >
                  <td className="px-4 py-3 font-mono text-xs">{student.id}</td>
                  <td className="px-4 py-3">{student.name}</td>
                  <td className="px-4 py-3">{student.class}</td>
                  <td className="px-4 py-3">
                    {isSenStudent(student) ? (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-lock ring-1 ring-sky-100">
                        IEP
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(student)}
                      className="mr-2 text-teal-800 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeStudent(student)}
                      className="text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              No students in this filter.
            </p>
          ) : null}
        </div>
      )}

      {saveError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {saveError}
        </p>
      ) : null}

      {editing ? (
        <form
          onSubmit={(event) => void submitEdit(event)}
          className="space-y-4 rounded-3xl bg-white p-6 ring-1 ring-teal-100"
        >
          <h2 className="text-lg font-semibold text-zinc-900">
            {editingOriginalId ? "Edit student" : "New student"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">ID</span>
              <input
                required
                value={editing.id}
                onChange={(e) => patchEditing({ id: e.target.value })}
                placeholder="11"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-zinc-700">Name</span>
              <input
                required
                value={editing.name}
                onChange={(e) => patchEditing({ name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Class</span>
              <input
                required
                value={editing.class}
                onChange={(e) => patchEditing({ class: e.target.value })}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isSenStudent(editing)}
              onChange={(e) => setSenEnabled(e.target.checked)}
            />
            <span>SEN student (Individual Education Plan)</span>
          </label>

          {isSenStudent(editing) ? (
            <div className="space-y-4 border-t border-zinc-100 pt-4">
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">sen_type</span>
                <input
                  required
                  value={editing.sen_type ?? ""}
                  onChange={(e) => patchEditing({ sen_type: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium text-zinc-700">
                    strengths_and_interests
                  </span>
                  <textarea
                    required
                    rows={3}
                    value={
                      editing.current_performance?.strengths_and_interests ?? ""
                    }
                    onChange={(e) =>
                      patchEditing({
                        current_performance: {
                          ...(editing.current_performance ??
                            EMPTY_CURRENT_PERFORMANCE),
                          strengths_and_interests: e.target.value,
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-zinc-700">weaknesses</span>
                  <textarea
                    required
                    rows={3}
                    value={editing.current_performance?.weaknesses ?? ""}
                    onChange={(e) =>
                      patchEditing({
                        current_performance: {
                          ...(editing.current_performance ??
                            EMPTY_CURRENT_PERFORMANCE),
                          weaknesses: e.target.value,
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
                  />
                </label>
              </div>
              {(
                [
                  ["learning_adjustment", "Learning adjustment"] as const,
                  [
                    "social_behavioral_adjustment",
                    "Social / behavioural adjustment",
                  ] as const,
                ] as const
              ).map(([key, label]) => (
                <fieldset
                  key={key}
                  className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-100"
                >
                  <legend className="px-1 text-sm font-semibold text-zinc-800">
                    {label}
                  </legend>
                  <label className="mt-2 block text-sm">
                    tier_1_support
                    <textarea
                      required
                      rows={2}
                      value={
                        editing.domains?.[key].tier_1_support ?? ""
                      }
                      onChange={(e) =>
                        patchEditing({
                          domains: {
                            ...(editing.domains ?? EMPTY_IEP_DOMAINS),
                            [key]: {
                              ...(editing.domains?.[key] ?? {
                                tier_1_support: "",
                                tier_2_and_3_support: "",
                              }),
                              tier_1_support: e.target.value,
                            },
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
                    />
                  </label>
                  <label className="mt-2 block text-sm">
                    tier_2_and_3_support
                    <textarea
                      rows={2}
                      value={
                        editing.domains?.[key].tier_2_and_3_support ?? ""
                      }
                      onChange={(e) =>
                        patchEditing({
                          domains: {
                            ...(editing.domains ?? EMPTY_IEP_DOMAINS),
                            [key]: {
                              ...(editing.domains?.[key] ?? {
                                tier_1_support: "",
                                tier_2_and_3_support: "",
                              }),
                              tier_2_and_3_support: e.target.value,
                            },
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
                    />
                  </label>
                </fieldset>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full px-4 py-2 text-sm ring-1 ring-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveBusy}
              className="rounded-full bg-teal-ink px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-300"
            >
              {saveBusy ? "Saving…" : "Save to JSON"}
            </button>
          </div>
        </form>
      ) : null}

      <p className="text-xs text-zinc-500">
        File: <code className="font-mono">data/students.json</code> · Changes
        apply immediately to Step 2 after reload.
      </p>
    </div>
  );
}

export function StudentRosterManageShell() {
  return (
    <div className="flex flex-1 flex-col bg-paper pb-16">
      <AppNav />
      <main className="mx-auto w-full max-w-layout-wide px-[5vw] pt-8">
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-teal-ink">
          <BilingualStack
            zh="學生名單管理"
            en="Student roster"
            layout="inline"
            enClassName="font-normal normal-case text-teal-700/80"
          />
        </p>
        <h1 className="mt-2 text-center text-3xl font-semibold text-zinc-900">
          <BilingualStack
            zh="檢視與編輯學生資料"
            en="View & edit student records"
            layout="stack"
            enClassName="text-xl font-medium text-zinc-500"
          />
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-zinc-600">
          Local JSON database for Step 2. General students need id, name, and
          class; SEN students include IEP fields.
        </p>
        <div className="mt-8">
          <StudentRosterManager />
        </div>
      </main>
    </div>
  );
}
