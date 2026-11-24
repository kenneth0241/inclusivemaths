# Step 4.2 — Worksheet Dify chatflow

| Route | Env | Dify user id |
|-------|-----|----------------|
| **Individual learners** | `POST /api/worksheet-chat` | `DIFY_APP_WORKSHEET_API_KEY` | `worksheet-{studentId}` |
| **UDL whole-class** (Step 3 `part_1_udl`) | `POST /api/worksheet-chat-udl` | `DIFY_APP_WORKSHEET_UDL_API_KEY` | `worksheet-udl` |

```env
DIFY_APP_WORKSHEET_API_KEY=app-xxxxxxxxxxxxxxxxxxxxxxxx
# DIFY_APP_WORKSHEET_API_BASE=https://api.dify.ai/v1
DIFY_APP_WORKSHEET_UDL_API_KEY=app-xxxxxxxxxxxxxxxxxxxxxxxx
# DIFY_APP_WORKSHEET_UDL_API_BASE=
```

The **UDL · 全班** tab appears when Step 3 has class-wide theory/strategies (`hasClassUdlForGames`). Stored under `learnerWorksheets["__udl__"]` in the draft.

## Start inputs (chatflow)

The app sends **both** naming variants where useful so your prompt can use either:

| Key | Source |
|-----|--------|
| `student_name` | Roster student name |
| `topic_summary` | Step 1 |
| `scope_and_constraints` | Step 1 scope |
| `student_bottleneck` | Step 3 individualized bottleneck or class profile (UDL) |
| `education_theory` | Individual / UDL theory |
| `educational_theory` | Same as `education_theory` (alias) |
| `learning_strategies` | Individual / UDL strategies |
| `applied_modes` | JSON object string, e.g. `{"simplify":"High","chunking":"Medium","visual":"High"}` |
| `question_count` | UI parameter (string) |
| `response_format` | Mapped from UI: `circle_mcq_4_options`, `matching`, `large_grid_boxes`, `mixed` |
| `current_response` | Full prior worksheet JSON (empty on first run) |
| `current_code` | Alias of `current_response` for prompts that use `current_code` |

## UI → Dify `response_format`

| Step 4.2 UI | Dify value |
|-------------|------------|
| 4-option MCQ | `circle_mcq_4_options` |
| Matching | `matching` |
| Large grid boxes | `large_grid_boxes` |
| Mixed | `mixed` |

If your Dify app uses `circle_mcq_3_options` instead, change the map in `src/lib/worksheet-response-format-dify.ts`.

## Structured output

Dify must return raw JSON matching `docs/worksheet-structured-output.schema.json` (no markdown fences). Top-level fields include `header_image_prompt`, `applied_modes` (string), `docx_layout`, and `items[]` with `svg_code` per item.

The API transform suppresses streaming raw JSON and emits `worksheet_structured` with the parsed object. The UI renders preview Markdown via `renderWorksheetStructuredMarkdown()` in `src/lib/worksheet-structured-output.ts`.

Implementation: `buildWorksheetDifyInputs()` and `buildWorksheetUdlDifyInputs()` in `src/lib/worksheet-generation.ts`, SSE in `src/lib/worksheet-chatflow.ts`.

## UDL chatflow Start inputs

`buildWorksheetUdlDifyInputs()` sends **only** these keys to the UDL worksheet app:

| Key | Source |
|-----|--------|
| `topic_summary` | Step 1 |
| `scope_and_constraints` | Step 1 scope |
| `educational_theory` | Step 3 class UDL theory (zh/en) |
| `learning_strategies` | Step 3 class UDL strategies (zh/en) |
| `applied_modes` | JSON object string (class-wide default `{}` until UDL stores explicit modes) |
| `question_count` | UI parameter (string) |
| `response_format` | Mapped from UI (same as individual) |
| `current_code` | Prior worksheet JSON (empty on first run) |