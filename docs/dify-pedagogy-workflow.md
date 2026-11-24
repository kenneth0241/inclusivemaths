# Dify Workflow: Pedagogical Strategy (Step 3)

Use with **`DIFY_APP_PEDAGOGY_API_KEY`** and **`DIFY_APP_PEDAGOGY_APP_MODE=workflow`**.

## Step 3 UI flow

1. **Auto baseline** — when Steps 1–2 are complete, `POST /api/pedagogy-strategy` runs once per fingerprint on entering Step 3 (workflow + `refine_scope: baseline`).
2. **Refine** — teacher opens drawer for **UDL** or one **student**; Step 1–2 context + current analysis seed the chat; follow-ups use `POST /api/pedagogy-chat`.
3. **UDL refine** uses the main pedagogy app. **Student refine** uses the individual app — see [`docs/dify-pedagogy-individual-refine.md`](dify-pedagogy-individual-refine.md).

The site calls **`POST /api/pedagogy-strategy`** (baseline) or **`POST /api/pedagogy-chat`** (refine) → Dify `POST /workflows/run` (blocking), then maps workflow outputs into the Step 3 workspace (**教育理論** / **支援策略** / **調適模式**).

## Start inputs (baseline)

| Input | Type | Description |
|-------|------|-------------|
| `topic_summary` | string | Step 1 discussion summary |
| `scope_and_constraints` | string | Step 1 scope |
| `visual_models` | string | Step 1 visual models |
| `learner_profile_analysis` | string | **JSON text** — Step 2 Profile Synthesizer structured object (same schema as Dify Step 2 output) |

Variable names must match **exactly** on the Start node. The app sets `learner_profile_analysis` to `JSON.stringify(learner.profileSynthesisStructured)` when available.

### Example `learner_profile_analysis` (string value)

Parse in Dify with `JSON.parse(learner_profile_analysis)` if needed:

```json
{
  "class_profile_summary": "…",
  "goal_alignment": "…",
  "specific_cognitive_bottlenecks": [
    { "student_name": "…", "bottleneck_description": "…" }
  ],
  "instructional_accommodations": {
    "tier_1_whole_class": "…",
    "tier_2_targeted": [
      {
        "student_name": "…",
        "cognitive_challenge": "…",
        "solution_context": "…"
      }
    ]
  },
  "behavioral_environmental_management": {
    "whole_class_environment": "…",
    "individual_management": [
      { "student_name": "…", "management_strategies": "…" }
    ]
  }
}
```

Refine runs may also pass `query`, `chat_history`, `refine_scope`, and (student refine) fields documented in [`docs/dify-pedagogy-individual-refine.md`](dify-pedagogy-individual-refine.md).

## Structured output (LLM → End)

Root JSON object (Structured Output schema):

| Field | Type | UI |
|-------|------|-----|
| `part_1_udl` | object | Class-wide **教育理論** + **支援策略** (UDL) |
| `part_2_individualized` | array | Per-student theory, strategies, **applied_modes** |

### `part_1_udl`

| Key | Maps to |
|-----|---------|
| `educational_theory_zh` / `educational_theory_en` | UDL · 教育理論 |
| `learning_strategies_zh` / `learning_strategies_en` | UDL · 支援策略 |

### `part_2_individualized[]`

| Key | Maps to |
|-----|---------|
| `student_profile` | Student heading / match key |
| `educational_theory_zh` / `educational_theory_en` | 教育理論 |
| `learning_strategies_zh` / `learning_strategies_en` | 支援策略 |
| `applied_modes` | 調適模式 — array of `{ "mode": "Simplify Mode" \| "Chunking" \| "Visual Mode", "intensity_level": "High" \| "Medium" \| "Low" }` |

JSON Schema for Dify **Structured output** on the baseline LLM node — copy from [`pedagogy-structured-output.schema.json`](./pedagogy-structured-output.schema.json). Both `part_1_udl` and `part_2_individualized` are **required** at the root (use `"part_2_individualized": []` when there are no rows yet).

Example (minimal valid JSON):

```json
{
  "part_1_udl": {
    "educational_theory_zh": "…",
    "educational_theory_en": "…",
    "learning_strategies_zh": "…",
    "learning_strategies_en": "…"
  },
  "part_2_individualized": []
}
```

### Prompt snippet (recommended)

```text
Respond with JSON only. No markdown fences, no commentary outside JSON.
Top-level keys must be exactly: part_1_udl, part_2_individualized.
part_1_udl: object with educational_theory_zh, educational_theory_en, learning_strategies_zh, learning_strategies_en.
part_2_individualized: array of per-student objects with student_profile, bilingual theory and strategies, and applied_modes (objects with mode + intensity_level). Use [] if no individualized rows.
```

### Common validation errors

| Error | Fix |
|-------|-----|
| `'part_1_udl' is a required property` | Model returned no root key `part_1_udl` (markdown, wrong names, or truncated JSON). Tighten prompt + show one-shot example. |
| `part_2_individualized` is not of type `array` | Model returned a string or prose. Enforce `[]` or `[{...}]` only. |

### Alternate End outputs (no structured schema)

If you skip structured output, expose plain text instead:

- `educational_theory` and `learning_strategies`, or
- `text` / `answer` with `## Educational Theory` and `## Learning Strategies` headings

The parser in `src/lib/pedagogy-strategy.ts` accepts both styles.

## Publish checklist

1. Start variables: `topic_summary`, `scope_and_constraints`, `visual_models`, `learner_profile_analysis` (plus refine extras if used).
2. Structured schema `additionalProperties: false` only if the prompt forbids extra keys.
3. End node maps LLM structured fields (or `structured_output`) to workflow outputs.
4. Republish after prompt/schema changes.
