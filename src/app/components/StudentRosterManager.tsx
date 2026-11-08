"use client";

import { useMemo, useState } from "react";
import AppNav from "./AppNav";
import {
  EMPTY_CURRENT_PERFORMANCE,
  EMPTY_IEP_DOMAINS,
  isSenStudent,
  normalizeStudentForSave,
  senTypeShortLabel,
  type StudentRecord,
} from "@/lib/student-record";
import { useStudentRoster } from "@/lib/use-student-roster";
import { BilingualStack } from "./Bilingual";
import {
  StudentRecordEditDialog,
  StudentRecordViewDialog,
} from "./StudentRecordDialog";

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
  const [viewStudent, setViewStudent] = useState<StudentRecord | null>(null);
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
    return [...list].sort(
      (a, b) =>
        a.class.localeCompare(b.class) ||
        a.id.localeCompare(b.id, undefined, { numeric: true }),
    );
  }, [students, classFilter]);

  function closeEditModal() {
    setEditing(null);
    setEditingOriginalId(null);
    setEditingOriginalClass(null);
    setSaveError("");
  }

  function openNew() {
    const defaultClass =
      classFilter !== "all" ? classFilter : (students[0]?.class ?? "1A");
    setViewStudent(null);
    setEditing(blankStudent(defaultClass));
    setEditingOriginalId(null);
    setEditingOriginalClass(null);
    setSaveError("");
  }

  function openView(student: StudentRecord) {
    setViewStudent(cloneStudent(student));
  }

  function openEdit(student: StudentRecord) {
    setViewStudent(null);
    setEditing(cloneStudent(student));
    setEditingOriginalId(student.id);
    setEditingOriginalClass(student.class);
    setSaveError("");
  }

  function editFromView() {
    if (!viewStudent) {
      return;
    }
    openEdit(viewStudent);
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
        closeEditModal();
      }
      if (
        viewStudent?.id === student.id &&
        viewStudent.class === student.class
      ) {
        setViewStudent(null);
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
      closeEditModal();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-zinc-600">Class</span>
          <div className="flex flex-wrap gap-2">
            {classFilterOptions.map((id) => {
              const active = classFilter === id;
              const label = id === "all" ? "All" : id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setClassFilter(id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition ${
                    active
                      ? "bg-teal-ink text-white ring-teal-ink"
                      : "bg-white text-zinc-800 ring-zinc-200 hover:ring-teal-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
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
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
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
                  <td
                    className="cursor-pointer px-4 py-3 text-zinc-900 hover:text-teal-800"
                    title="Click to view profile"
                    onClick={() => openView(student)}
                  >
                    {student.name}
                  </td>
                  <td className="px-4 py-3">{student.class}</td>
                  <td className="px-4 py-3">
                    {isSenStudent(student) ? (
                      <span
                        className="inline-block max-w-[11rem] truncate rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-lock ring-1 ring-sky-100"
                        title={student.sen_type ?? ""}
                      >
                        {senTypeShortLabel(student.sen_type) ?? "SEN"}
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

      <StudentRecordViewDialog
        student={viewStudent}
        onClose={() => setViewStudent(null)}
        onEdit={editFromView}
      />
      <StudentRecordEditDialog
        editing={editing}
        isNew={!editingOriginalId}
        saveBusy={saveBusy}
        saveError={saveError}
        onClose={closeEditModal}
        onSubmit={(event) => void submitEdit(event)}
        patchEditing={patchEditing}
        setSenEnabled={setSenEnabled}
      />

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
