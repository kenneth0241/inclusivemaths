"use client";

import {
  CLASS_FOCUS_OPTIONS,
  DURATION_OPTIONS,
  LESSON_GRADE,
  type LessonPlanFormValues,
} from "@/lib/lesson-plan";

type LessonPlanFormProps = {
  values: LessonPlanFormValues;
  onChange: (values: LessonPlanFormValues) => void;
  disabled?: boolean;
  onSubmit: () => void;
  submitLabel?: string;
};

export default function LessonPlanForm({
  values,
  onChange,
  disabled,
  onSubmit,
  submitLabel = "Generate lesson plan",
}: LessonPlanFormProps) {
  function patch(partial: Partial<LessonPlanFormValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <form
      className="space-y-5 rounded-3xl bg-white p-6 ring-1 ring-zinc-200"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-950">
        Primary <strong>Grade {LESSON_GRADE}</strong> — this pilot is scoped to
        one year level.
      </p>

      <div className="grid gap-5 sm:grid-cols-1">
        <label className="block text-sm font-medium text-zinc-800">
          Lesson duration
          <select
            value={values.durationMinutes}
            disabled={disabled}
            onChange={(event) =>
              patch({ durationMinutes: event.target.value })
            }
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none ring-emerald-500/30 focus:ring-4 disabled:bg-zinc-50"
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-zinc-800">
        Topic
        <input
          type="text"
          required
          disabled={disabled}
          value={values.topic}
          onChange={(event) => patch({ topic: event.target.value })}
          placeholder="e.g. Addition within 20, telling time"
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none ring-emerald-500/30 focus:ring-4 disabled:bg-zinc-50"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-800">
        Class focus
        <select
          value={values.classFocus}
          disabled={disabled}
          onChange={(event) => patch({ classFocus: event.target.value })}
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none ring-emerald-500/30 focus:ring-4 disabled:bg-zinc-50"
        >
          {CLASS_FOCUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-zinc-800">
        SpLD / learner details{" "}
        <span className="font-normal text-zinc-500">(optional)</span>
        <textarea
          rows={3}
          disabled={disabled}
          value={values.learnerNotes}
          onChange={(event) => patch({ learnerNotes: event.target.value })}
          placeholder="Reading level, accommodations already in use, group size…"
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none ring-emerald-500/30 focus:ring-4 disabled:bg-zinc-50"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-800">
        Your requirements
        <textarea
          rows={5}
          required
          disabled={disabled}
          value={values.requirements}
          onChange={(event) => patch({ requirements: event.target.value })}
          placeholder="What should this lesson include? Materials, textbook pages, differentiation ideas…"
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none ring-emerald-500/30 focus:ring-4 disabled:bg-zinc-50"
        />
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-full bg-teal-ink px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-zinc-300 sm:w-auto"
      >
        {submitLabel}
      </button>
    </form>
  );
}
