# Dify App: Individualized student refine (Step 3)

Used when the teacher clicks **細化此學生 · Refine** — `POST /api/pedagogy-chat` with `refine_scope: student`.

Env:

```bash
DIFY_APP_PEDAGOGY_INDIVIDUAL_API_KEY=app-...
DIFY_APP_PEDAGOGY_INDIVIDUAL_APP_MODE=chatflow   # or workflow
# DIFY_APP_PEDAGOGY_INDIVIDUAL_API_BASE=         # optional
```

Falls back to `DIFY_APP_PEDAGOGY_API_KEY` if the individual key is unset.

## User Input (required)

| Variable | App source |
|----------|------------|
| `topic_summary` | Step 1 footprint |
| `scope_and_constraints` | Step 1 footprint |
| `visual_models` | Step 1 footprint |
| `current_theory` | Student row `educational_theory_zh` + `en` |
| `current_strategy` | Student row `learning_strategies_zh` + `en` |
| `learner_profile` | `student_profile` + roster JSON + applied modes + class notes |

Optional (workflow follow-up): `query`, `chat_history` if your graph uses them.

## Behaviour

1. Drawer shows Step 1–2 context and the **current individualized analysis** (from baseline).
2. On first open, the app sends an opening `query` to start the Dify discussion.
3. Each reply should update structured **Why / How**; the app merges into `part_2_individualized` for that student row.

## Chatflow structured output (recommended)

End node / answer schema:

| Field | Role |
|-------|------|
| `chat_reply` | Markdown shown in the refine drawer chat |
| `part_1_udl` | Optional class-wide UDL baseline (kept or refined) |
| `part_2_individualized` | Updated student row(s): theory, strategies, `applied_modes` |

`POST /api/pedagogy-chat` (student + chatflow) transforms the Dify SSE stream: it emits `pedagogy_structured` for the workspace (教育理論 · 支援策略 · 調適模式) and uses `chat_reply` for the assistant bubble instead of raw JSON.
