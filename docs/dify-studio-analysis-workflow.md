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
| `visual_models` | Content Footprint → 視覺圖解與表達 |
| `scope_quality_rating` | Integer **1–5** → information completeness (shown as /5) |
| `visual_quality_rating` | Integer **1–5** → information completeness (shown as /5) |
| `scope_feedback` | Shown under scope rating → **回饋 · Feedback** |
| `visual_feedback` | Shown under visual rating → **回饋 · Feedback** |

Example JSON:

```json
{
  "topic_summary": "教師查詢一年級目錄；助理列出單元並說明 20 以內加減與十格陣、分合圖。",
  "scope_and_constraints": "20以內加減法；不涉及進位。",
  "visual_models": "Ten-frames；Number Bonds（分合圖）。",
  "scope_quality_rating": 4,
  "visual_quality_rating": 5,
  "scope_feedback": "有單元與數值範圍；可再寫明是否涉及進位或應用題比例。",
  "visual_feedback": "已點名 Ten-frames 與 Number Bonds，與課本一致。"
}
```

JSON Schema (for Dify Structured Output):

```json
{
  "type": "object",
  "properties": {
    "topic_summary": {
      "type": "string",
      "description": "A concise 1-2 sentence summary of the textbook topic and overall scope discussed."
    },
    "scope_and_constraints": {
      "type": "string",
      "description": "The exact mathematical boundaries extracted from the chat (e.g., 'Addition up to 10, no carrying over'). Leave blank if not discussed."
    },
    "visual_models": {
      "type": "string",
      "description": "The specific graphical representations extracted from the chat (e.g., 'Ten-frames', 'Number Bonds'). Leave blank if not discussed."
    },
    "scope_quality_rating": {
      "type": "integer",
      "description": "Rate the completeness of the Scope & Constraints from 1 to 5.",
      "minimum": 1,
      "maximum": 5
    },
    "visual_quality_rating": {
      "type": "integer",
      "description": "Rate the completeness of the Visual Models from 1 to 5.",
      "minimum": 1,
      "maximum": 5
    },
    "scope_feedback": {
      "type": "string",
      "description": "Brief explanation of why the scope score was given and exactly what is missing."
    },
    "visual_feedback": {
      "type": "string",
      "description": "Brief explanation of why the visual score was given and exactly what is missing."
    }
  },
  "required": [
    "topic_summary",
    "scope_and_constraints",
    "visual_models",
    "scope_quality_rating",
    "visual_quality_rating",
    "scope_feedback",
    "visual_feedback"
  ],
  "additionalProperties": false
}
```

Optional legacy fields still work: `discussion_summary`, `suggested_question`, `ready`, `confidence` (0–100), etc.

Publish the workflow and set **`DIFY_APP_TOPIC_API_KEY`** in `.env.local` or Vercel, then restart the dev server.

## Troubleshooting structured output

If Dify reports **`Additional properties are not allowed ('scope_feedback_placeholder' was unexpected)`**:

- Structured output keys must match the schema **exactly**: `scope_feedback` and `visual_feedback` — not `scope_feedback_placeholder`, `scope_feedback_xxx`, or template variable names from the prompt.
- In the LLM system prompt, describe the fields in prose but tell the model to emit JSON keys exactly as in the schema.
- In Dify **Structured Output** settings, set **`additionalProperties": false`** only if the model reliably omits extra keys; otherwise use a **Code** node after the LLM to pick only allowed keys before the End node.
- The website also accepts `scope_feedback_placeholder` / `visual_feedback_placeholder` **only if** those keys appear in workflow outputs (e.g. after validation is relaxed); fixing the LLM output is still the right fix.
