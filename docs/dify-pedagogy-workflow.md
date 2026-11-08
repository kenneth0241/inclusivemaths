# Dify Workflow: Pedagogical Strategy (Step 3)

Use with **`DIFY_APP_PEDAGOGY_API_KEY`** and **`DIFY_APP_PEDAGOGY_APP_MODE=workflow`**.

## Step 3 UI flow

1. **Auto baseline** — when Steps 1–2 are complete, `POST /api/pedagogy-strategy` runs once per fingerprint on entering Step 3 (workflow + `refine_scope: baseline`).
2. **Refine** — teacher opens drawer for **UDL** or one **student**; Step 1–2 context + current analysis seed the chat; follow-ups use `POST /api/pedagogy-chat`.
3. **UDL refine** uses the main pedagogy app. **Student refine** uses the individual app — see [`docs/dify-pedagogy-individual-refine.md`](dify-pedagogy-individual-refine.md).

## Local testing without Step 1–2

On **`/design/pedagogy`**:

- Click **載入示範資料 · Load demo data**, or
- Open **`/design/pedagogy?demo=1`** (auto-loads).

This fills Step 1–2 only, then **auto-runs Step 3 baseline** (same as arriving from real Steps 1–2). Requires workflow configured unless analysis errors (use refine drawer to retry).

The site calls **`POST /api/pedagogy-chat`** → Dify `POST /workflows/run` (blocking), then maps workflow outputs into the right panel (**教育理論** / **支援策略**).

## Start inputs

| Input | Description |
|-------|-------------|
| `topic_summary` | Step 1 discussion summary |
| `scope_and_constraints` | Step 1 scope |
| `visual_models` | Step 1 visual models |
| `learner_profiles` | JSON string: `{ students, profile_analysis?, class_profile? }` |
| `query` | Current teacher message (auto prompt on first load) |
| `chat_history` | Optional prior turns (`Teacher:` / `Assistant:` blocks) |

Variable names must match **exactly** on the Start node.

## Structured output (LLM → End)

If you use Dify **Structured Output**, the root object must include every **required** property. A common schema:

| Field | Type | UI |
|-------|------|-----|
| `part_1_udl` | string **or** object (see below) | **教育理論 · Educational Theory** (+ class-level **How** when nested) |
| `part_2_individualized` | **array** (never a string) | Per-student **支援策略** (appended when non-empty) |

`part_1_udl` object (bilingual — matches current Dify schema):

| Key | Maps to |
|-----|---------|
| `educational_theory_zh` / `educational_theory_en` | Right panel · 教育理論 |
| `learning_strategies_zh` / `learning_strategies_en` | Right panel · 支援策略 (when `part_2_individualized` is `[]`) |

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

Per-student rows (optional):

```json
{
  "part_1_udl": { "educational_theory_zh": "…", "educational_theory_en": "…" },
  "part_2_individualized": [
    {
      "student_id": "07",
      "student_name": "Lam Wing Yan",
      "strategies_zh": "…",
      "strategies_en": "…"
    }
  ]
}
```

No selected SEN rows in context:

```json
{
  "part_1_udl": "…",
  "part_2_individualized": []
}
```

### Prompt snippet (recommended)

Add to the LLM system prompt:

```text
Respond with JSON only. No markdown fences, no commentary outside JSON.
Top-level keys must be exactly: part_1_udl, part_2_individualized.
part_1_udl: string (Educational Theory / UDL — The Why, 繁中+EN OK).
part_2_individualized: array of objects (The How per student). Use [] if no learner rows.
Do not rename keys. Do not omit part_1_udl.
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

1. Start variables match the table above.
2. Structured schema `additionalProperties: false` only if the prompt forbids extra keys.
3. End node maps LLM structured fields (or `structured_output`) to workflow outputs.
4. Republish after prompt/schema changes.
