# Dify Workflow: Textbook_Chat_Analysis

Use this with **`DIFY_APP_TOPIC_API_KEY`** — the app calls `POST /api/chat/topic-analysis` after each assistant reply on `/chat`.

Workflow name in Dify (for your reference): **Textbook_Chat_Analysis**.

## Start inputs

| Input | Description |
|-------|-------------|
| `chat_history` | Recent turns as plain text (`Teacher:` / `Assistant:` blocks) |
| `conversation_transcript` | Same as `chat_history` |
| `chat_history_json` | JSON array `[{ "role", "content" }, …]` |
| `grade` | `"1"` |
| `subject` | `"maths"` |
| `chat_conversation_id` | Main Chatflow conversation id (may be empty) |

Map your Dify **Start** node variable (e.g. `chat_history`) to the matching input above.

## Structured output (End / LLM node)

The website parser expects this schema (or JSON with these keys inside `text` / `structured_output`):

| Dify field | App use |
|------------|---------|
| `topic_summary` | Discussion summary in Content Footprint + chat card |
| `scope_and_constraints` | Content Footprint → 具體範圍與限制 |
| `scope_quality_rating` | Integer **1–5** → information completeness (shown as /5) |
| `scope_feedback` | Shown under scope rating → **回饋 · Feedback** |

Example JSON:

```json
{
  "topic_summary": "教師查詢一年級目錄；助理列出單元並說明 20 以內加減與十格陣、分合圖。",
  "scope_and_constraints": "20以內加減法；不涉及進位。",
  "scope_quality_rating": 4,
  "scope_feedback": "有單元與數值範圍；可再寫明是否涉及進位或應用題比例。"
}
```

JSON Schema (for Dify Structured Output) — copy from [`textbook-chat-analysis-structured-output.schema.json`](./textbook-chat-analysis-structured-output.schema.json) into the LLM node **Structured output** editor. Use **`additionalProperties: false`** only with the schema below (exactly **4** top-level keys, no extras).

Optional legacy fields still work **if** you add a Code node to strip extras before End (not inside strict structured output): `discussion_summary`, `suggested_question`, `ready`, `confidence` (0–100), etc. The app **ignores** `visual_models`, `visual_quality_rating`, and `visual_feedback` for Step 1 UI (visual models are decided in Step 4).

## LLM system prompt (paste into Textbook_Chat_Analysis)

Use this (or equivalent) on the **analysis LLM** node that emits structured JSON:

```text
You analyze a Primary 1 maths textbook chat between a teacher and an assistant.

Read the conversation and fill the structured JSON object.

RULES (mandatory):
1. Emit ONLY these keys, spelled exactly:
   topic_summary, scope_and_constraints,
   scope_quality_rating, scope_feedback
2. Do NOT emit any other keys. Forbidden examples:
   scope_and_constraints_en, scope_and_constraints_zh,
   scope_feedback_placeholder,
   or any *_en / *_zh / *_placeholder suffix.
3. Bilingual text belongs inside the single string fields above (e.g. "20以內加減 · addition within 20"), not separate language keys.
4. scope_quality_rating is an integer 1–5 only.
5. scope_feedback explains the rating and what the teacher should clarify next (short paragraphs).
6. If scope was not discussed, use an empty string "" for scope_and_constraints, not a new key.
7. Focus analysis on topic clarity and mathematical scope & constraints — not visual models (those are handled later when designing games/worksheets).
```

Republish the workflow after updating **both** the structured output schema and the system prompt.

Publish the workflow and set **`DIFY_APP_TOPIC_API_KEY`** in `.env.local` or Vercel, then restart the dev server.

## Troubleshooting structured output

If Dify reports **`Structured output validation failed`** / **`Additional properties are not allowed`**:

| Unexpected key (examples) | Fix |
|---------------------------|-----|
| `scope_feedback_placeholder`, `visual_feedback_placeholder` | Use **`scope_feedback`** only |
| `scope_and_constraints_en`, `scope_and_constraints_zh` | Put all languages in **`scope_and_constraints`** (one string) |
| `visual_models`, `visual_quality_rating` | Remove from schema if you still have the old 7-key prompt |

Checklist in Dify:

1. Open workflow **Textbook_Chat_Analysis** → analysis **LLM** node.
2. **Structured output** JSON schema = file `docs/textbook-chat-analysis-structured-output.schema.json` (4 properties, `additionalProperties: false`).
3. System prompt includes the **RULES** block above (no bilingual key splits).
4. Remove prompt examples that show alternate key names or Jinja placeholders as JSON keys.
5. **Publish** the workflow; restart this app if you changed env keys.

Fallback (only if the model keeps adding keys): add a **Code** node after the LLM that `pick`s the four allowed keys into a new object before **End** — do not rely on relaxed validation long term.

The website parser also accepts legacy aliases **`scope_feedback_placeholder`** only when they reach the API (e.g. via Code node); strict Dify validation must pass first.