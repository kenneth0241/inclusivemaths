# Step 4 — HTML games (Dify Chatflow)

Two Dify apps:

| App | API route | Env key | Dify `user` |
|-----|-----------|---------|-------------|
| **Per-learner** (Step 3 individualized rows) | `POST /api/game-chat` | `DIFY_APP_GAME_API_KEY` | `game-{studentId}` |
| **UDL whole-class** (Step 3 part_1_udl / class strategies) | `POST /api/game-chat-udl` | `DIFY_APP_GAME_UDL_API_KEY` | `game-udl` |

## Environment

```env
DIFY_APP_GAME_API_KEY=app-xxxxxxxxxxxxxxxxxxxxxxxx
DIFY_APP_GAME_UDL_API_KEY=app-xxxxxxxxxxxxxxxxxxxxxxxx
# Optional bases (default: DIFY_APP_PEDAGOGY_CHAT_API_BASE or https://api.dify.ai/v1)
# DIFY_APP_GAME_API_BASE=https://api.dify.ai/v1
# DIFY_APP_GAME_UDL_API_BASE=https://api.dify.ai/v1
```

Health: `GET /api/config` includes `gameChatConfigured` and `gameUdlChatConfigured` when each key is set.

## Chatflow Start variables (required keys)

| Key | Source in app |
|-----|----------------|
| `student_name` | Roster name for the active game target |
| `topic_summary` | Step 1 footprint `topicSummary` |
| `scope_and_constraints` | Step 1 `scope` (topic summary is separate in workflow) |
| `student_bottleneck` | Profile Synthesizer bottleneck for this student (Step 2 structured JSON) |
| `educational_theory` | Step 3 individualized row (or class UDL fallback) zh/en text |
| `learning_strategies` | Step 3 individualized row (or class UDL fallback) zh/en text |
| `applied_modes` | e.g. `Chunking (High), Visual Mode (Medium)` from individualized row |
| `game_rules` | Step 4 game parameters — rules textarea |
| `scoring_method` | Step 4 game parameters — scoring textarea |
| `ui_style` | Step 4 game parameters — UI textarea |
| `current_code` | **Empty string on first message.** On follow-ups: full HTML string from preview / code editor for that learner |

## Request body (`POST /api/game-chat`)

- `query` — teacher message (required)
- `conversation_id` — Dify thread id (optional; omit on first message)
- `student_id` — roster id for the active tab
- `footprint`, `learner`, `pedagogy`, `game_parameters`, `individualized_row`
- `current_code` — HTML for this learner (alias `current_html` accepted for older clients)

## Structured output (Dify)

Configure the chatflow answer node with JSON schema:

| Field | Purpose in app |
|-------|----------------|
| `chat_reply` | Shown in the Game chat bubble (markdown). Raw JSON is not shown. |
| `html_code` | Full HTML document (`<!DOCTYPE html>` …); updates that learner’s preview / code tab. No markdown fences. |

`POST /api/game-chat` pipes Dify SSE through a transform (same pattern as Step 3 student refine): it suppresses streaming raw JSON, then emits `message` chunks for `chat_reply` and a `game_structured` event with both fields.

Fallback: if the model returns plain text with a fenced `html` block or inline `<!DOCTYPE` … `</html>`, the UI still extracts HTML for preview.

## Batch generate (Step 4 UI)

1. Teacher selects **Game targets** and fills **Game parameters**.
2. Clicks **為每位學習者生成 / Generate for each learner**.
3. The app runs **sequentially**:
   - **One** `POST /api/game-chat-udl` for the **UDL · 全班** tab (class `educational_theory` + `learning_strategies` from Step 3; no individualized row).
   - **One** `POST /api/game-chat` per selected learner.
4. Each response updates that tab’s preview HTML and seeds its chat thread (`conversation_id`).

The **UDL · 全班** tab appears when Step 3 has class-wide theory/strategies. Stored under `learnerGames["__udl__"]` in the draft.

Follow-up edits use the game chat panel with populated `current_code` from the code editor / preview.

## Expected model behaviour

- First run should use empty `current_code` and produce initial HTML from context + parameters.
- Follow-up turns should read `current_code` and return an updated `html_code` plus a short `chat_reply` for the teacher.

## Example Start `inputs` JSON

```json
{
  "student_name": "陳小明",
  "topic_summary": "20以內加減",
  "scope_and_constraints": "單元 2 · 20以內加減；不涉及進位。",
  "student_bottleneck": "陳小明: 位值與進位理解困難",
  "educational_theory": "…",
  "learning_strategies": "…",
  "applied_modes": "Chunking (High), Visual Mode (Medium)",
  "game_rules": "【逐步解鎖模式 · Step-by-step Unlock / Chunking】\n…",
  "scoring_method": "【正向星星收集 · Positive Star Collection (Untimed)】\n…",
  "ui_style": "【簡約高對比 · Clean & High-Contrast (SEN Optimized)】\n…",
  "current_code": ""
}
```

Implementation: `buildGameDifyInputs()` and `buildGameUdlDifyInputs()` in `src/lib/game-generation.ts`.

## UDL chatflow Start inputs

Same keys as the per-learner app. Typical values from the app:

| Key | UDL app value |
|-----|----------------|
| `student_name` | `UDL · 全班` |
| `student_bottleneck` | Class profile text, or a whole-class UDL placeholder |
| `educational_theory` | Step 3 UDL theory (`part_1_udl` or flattened class theory) |
| `learning_strategies` | Step 3 UDL strategies |
| `applied_modes` | `UDL (class-wide · 全班)` |
| `individualized_row` | *(not sent — use the UDL API only)* |