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
| `name` | Roster student name (or parsed from `student_profile`) |
| `topic_summary` | Step 1 footprint |
| `scope_and_constraints` | Step 1 footprint |
| `visual_models` | Step 1 footprint |
| `student_bottleneck_analysis` | Step 2 `specific_cognitive_bottlenecks` row for this student (`{name}: {description}`) |
| `educational_theory` | Current row — `educational_theory_zh` + `en` |
| `learning_strategies` | Current row — `learning_strategies_zh` + `en` |
| `applied_modes` | Current row — e.g. `Chunking (High), Visual Mode (Medium)` |

Plus per turn:

| Variable | Role |
|----------|------|
| `query` | Teacher message |
| `conversation_id` | Chatflow session (optional) |

Example:

```json
{
  "inputs": {
    "name": "Lee Ka Yan",
    "topic_summary": "…",
    "scope_and_constraints": "…",
    "visual_models": "…",
    "student_bottleneck_analysis": "Lee Ka Yan (李嘉恩): 嚴重視覺追蹤困難…",
    "educational_theory": "CPA 具體-圖像-抽象模式…",
    "learning_strategies": "結合「拆解模式」與「視覺模式」…",
    "applied_modes": "Chunking (High), Visual Mode (Medium)"
  },
  "query": "Can you design a specific worksheet question for him based on this strategy?",
  "response_mode": "streaming",
  "conversation_id": "",
  "user": "inclusive-maths-teacher"
}
```

## Behaviour

1. Drawer shows the **current individualized analysis** (from baseline).
2. Teacher types the first message; each reply updates theory, strategies, and `applied_modes`; the app merges into `part_2_individualized` for that student index.

## Chatflow structured output (recommended)

Root JSON (no `part_1_udl` / `part_2_individualized` wrapper):

| Field | Role |
|-------|------|
| `chat_reply` | Markdown in the refine drawer |
| `educational_theory_zh` / `educational_theory_en` | 教育理論 panels |
| `learning_strategies_zh` / `learning_strategies_en` | 支援策略 panels |
| `applied_modes` | `[{ "mode", "intensity_level" }]` — same enum as baseline |
| `name` | Student name (echo / revise) |

`POST /api/pedagogy-chat` (student + chatflow) transforms the Dify SSE stream: it emits `pedagogy_structured` for the workspace and uses `chat_reply` for the assistant bubble instead of raw JSON.
