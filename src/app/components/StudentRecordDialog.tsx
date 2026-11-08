"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  EMPTY_CURRENT_PERFORMANCE,
  EMPTY_IEP_DOMAINS,
  isSenProfileOpen,
  isSenStudent,
  SEN_TYPE_OPTIONS,
  type StudentRecord,
} from "@/lib/student-record";
import { BilingualStack } from "./Bilingual";

function useDialogLock(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
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
  }, [open, onClose]);
}

const EDIT_FIELD_LABEL =
  "block text-base font-medium leading-snug text-zinc-800";
const EDIT_FIELD_INPUT =
  "mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base leading-relaxed text-zinc-900 outline-none ring-teal-500/20 placeholder:text-zinc-400 focus:ring-4";
const EDIT_FIELD_TEXTAREA =
  `${EDIT_FIELD_INPUT} min-h-[6.5rem] resize-y`;

type StudentRecordDialogShellProps = {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
  /** Wider, taller shell for long IEP edit forms. */
  size?: "default" | "wide";
};

function StudentRecordDialogShell({
  open,
  title,
  onClose,
  footer,
  children,
  size = "default",
}: StudentRecordDialogShellProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useDialogLock(open, onClose);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-[5vw]">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200 ${
          size === "wide"
            ? "max-h-[min(92vh,56rem)] max-w-4xl"
            : "max-h-[min(90vh,52rem)] max-w-2xl"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-zinc-100 px-6 py-5 sm:px-8">
          <h2
            id={titleId}
            className={`font-semibold text-zinc-900 ${
              size === "wide" ? "text-xl" : "text-lg"
            }`}
          >
            {title}
          </h2>
        </div>
        <div
          className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8 ${
            size === "wide" ? "text-base" : ""
          }`}
        >
          {children}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-zinc-100 px-6 py-4 sm:px-8">
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ReadonlyField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  if (!value.trim()) {
    return null;
  }
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      {multiline ? (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
          {value}
        </p>
      ) : (
        <p className="mt-1 text-sm text-zinc-800">{value}</p>
      )}
    </div>
  );
}

type StudentRecordViewDialogProps = {
  student: StudentRecord | null;
  onClose: () => void;
  onEdit?: () => void;
  showEdit?: boolean;
};

export function StudentRecordViewDialog({
  student,
  onClose,
  onEdit,
  showEdit = true,
}: StudentRecordViewDialogProps) {
  const open = student !== null;
  if (!student) {
    return null;
  }

  return (
    <StudentRecordDialogShell
      open={open}
      onClose={onClose}
      title={
        <BilingualStack
          zh="學生檔案"
          en="Student profile"
          layout="inline"
          enClassName="font-medium text-zinc-500"
        />
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
          >
            Close
          </button>
          {showEdit && onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full bg-teal-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Edit
            </button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xl font-semibold text-zinc-900">{student.name}</p>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold text-zinc-500">ID</dt>
            <dd className="mt-0.5 font-mono text-sm text-zinc-900">
              {student.id}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500">Class</dt>
            <dd className="mt-0.5 text-sm text-zinc-900">{student.class}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500">SEN</dt>
            <dd className="mt-0.5 text-sm text-zinc-900">
              {isSenStudent(student) ? "IEP on file" : "—"}
            </dd>
          </div>
        </dl>

        {isSenStudent(student) ? (
          <div className="space-y-4 border-t border-zinc-100 pt-4">
            <ReadonlyField label="SEN type" value={student.sen_type ?? ""} />
            <ReadonlyField
              label="strengths_and_interests"
              value={
                student.current_performance?.strengths_and_interests ?? ""
              }
              multiline
            />
            <ReadonlyField
              label="weaknesses"
              value={student.current_performance?.weaknesses ?? ""}
              multiline
            />
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
                <ReadonlyField
                  label="tier_1_support"
                  value={student.domains?.[key].tier_1_support ?? ""}
                  multiline
                />
                <ReadonlyField
                  label="tier_2_and_3_support"
                  value={student.domains?.[key].tier_2_and_3_support ?? ""}
                  multiline
                />
              </fieldset>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">
            General class member — no Individual Education Plan recorded.
          </p>
        )}
      </div>
    </StudentRecordDialogShell>
  );
}

type StudentRecordEditDialogProps = {
  editing: StudentRecord | null;
  isNew: boolean;
  saveBusy: boolean;
  saveError: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  patchEditing: (patch: Partial<StudentRecord>) => void;
  setSenEnabled: (enabled: boolean) => void;
};

export function StudentRecordEditDialog({
  editing,
  isNew,
  saveBusy,
  saveError,
  onClose,
  onSubmit,
  patchEditing,
  setSenEnabled,
}: StudentRecordEditDialogProps) {
  const open = editing !== null;
  if (!editing) {
    return null;
  }

  return (
    <StudentRecordDialogShell
      open={open}
      onClose={onClose}
      size="wide"
      title={isNew ? "New student" : "Edit student"}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-6 py-3 text-base font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="student-record-edit-form"
            disabled={saveBusy}
            className="rounded-full bg-teal-ink px-6 py-3 text-base font-semibold text-white disabled:bg-zinc-300"
          >
            {saveBusy ? "Saving…" : "Save to JSON"}
          </button>
        </>
      }
    >
      <form
        id="student-record-edit-form"
        onSubmit={onSubmit}
        className="space-y-5"
      >
        {saveError ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-base text-red-800">
            {saveError}
          </p>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-3">
          <label className={EDIT_FIELD_LABEL}>
            ID
            <input
              required
              value={editing.id}
              onChange={(e) => patchEditing({ id: e.target.value })}
              placeholder="11"
              className={EDIT_FIELD_INPUT}
            />
          </label>
          <label className={`${EDIT_FIELD_LABEL} sm:col-span-2`}>
            Name
            <input
              required
              value={editing.name}
              onChange={(e) => patchEditing({ name: e.target.value })}
              className={EDIT_FIELD_INPUT}
            />
          </label>
          <label className={EDIT_FIELD_LABEL}>
            Class
            <input
              required
              value={editing.class}
              onChange={(e) => patchEditing({ class: e.target.value })}
              className={EDIT_FIELD_INPUT}
            />
          </label>
        </div>

        <label className="flex items-center gap-3 text-base text-zinc-800">
          <input
            type="checkbox"
            className="size-4"
            checked={isSenProfileOpen(editing)}
            onChange={(e) => setSenEnabled(e.target.checked)}
          />
          <span>SEN student (Individual Education Plan)</span>
        </label>

        {isSenProfileOpen(editing) ? (
          <div className="space-y-5 border-t border-zinc-100 pt-5">
            <label className={EDIT_FIELD_LABEL}>
              SEN type
              <select
                required
                value={editing.sen_type ?? ""}
                onChange={(e) => patchEditing({ sen_type: e.target.value })}
                className={EDIT_FIELD_INPUT}
              >
                <option value="">Select SEN type…</option>
                {SEN_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-5 lg:grid-cols-1">
              <label className={EDIT_FIELD_LABEL}>
                strengths_and_interests
                <textarea
                  required
                  rows={5}
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
                  className={EDIT_FIELD_TEXTAREA}
                />
              </label>
              <label className={EDIT_FIELD_LABEL}>
                weaknesses
                <textarea
                  required
                  rows={5}
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
                  className={EDIT_FIELD_TEXTAREA}
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
                className="rounded-2xl bg-zinc-50 p-5 ring-1 ring-zinc-100"
              >
                <legend className="px-1 text-base font-semibold text-zinc-900">
                  {label}
                </legend>
                <label className={`mt-3 ${EDIT_FIELD_LABEL}`}>
                  tier_1_support
                  <textarea
                    required
                    rows={4}
                    value={editing.domains?.[key].tier_1_support ?? ""}
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
                    className={EDIT_FIELD_TEXTAREA}
                  />
                </label>
                <label className={`mt-4 ${EDIT_FIELD_LABEL}`}>
                  tier_2_and_3_support
                  <textarea
                    rows={4}
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
                    className={EDIT_FIELD_TEXTAREA}
                  />
                </label>
              </fieldset>
            ))}
          </div>
        ) : null}
      </form>
    </StudentRecordDialogShell>
  );
}
