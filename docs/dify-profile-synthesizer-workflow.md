# Profile Synthesizer (Step 2)

Workflow app **Profile Synthesizer** runs when teachers click **Analysis** on `/design/profile`.

## Where to add the API key

1. In Dify: open the **Profile Synthesizer** workflow app → **API Access** → copy the **API Key** (starts with `app-`).
2. In this repo, create or edit **`.env.local`** at the project root (same folder as `package.json`).  
   **Do not** commit `.env.local` — it is gitignored.
3. Add:

```bash
DIFY_APP_PROFILE_SYNTHESIS_API_KEY=app-paste-your-key-here
```

4. Optional — only if this app uses a different base URL than your other Dify apps:

```bash
DIFY_APP_PROFILE_SYNTHESIS_API_BASE=https://api.dify.ai/v1
```

5. Restart the Next.js dev server (`npm run dev`) so env vars reload.

The UI reads configuration via `GET /api/config`; if the key is missing, Step 2 shows a banner and **Analysis** stays disabled.

See also `.env.example` for all env variable names.

## Inputs (blocking `POST /workflows/run`)

| Variable | Type | Description |
|----------|------|-------------|
| `topic_summary` | string | Confirmed Step 1 topic summary |
| `scope_and_constraints` | string | Confirmed scope |
| `visual_models` | string | Confirmed visual models |
| `learner_profiles` | **string** | `JSON.stringify({ "students": [ … ] })` — Dify start input is text/paragraph, not JSON object |
| `custom_profile` | string | Teacher class notes (Step 2 custom profile) |

The start-node variable name must be exactly **`learner_profiles`**. Parse it in a Code node with `json.loads(learner_profiles)` (Python) or `JSON.parse` if needed before the LLM.

### Dify JSON schema for `learner_profiles`

```json
{
  "type": "object",
  "properties": {
    "students": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "class": { "type": "string" },
          "sen_type": { "type": "string" },
          "current_performance": {
            "type": "object",
            "properties": {
              "strengths_and_interests": { "type": "string" },
              "weaknesses": { "type": "string" }
            }
          },
          "domains": {
            "type": "object",
            "properties": {
              "learning_adjustment": {
                "type": "object",
                "properties": {
                  "tier_1_support": { "type": "string" },
                  "tier_2_and_3_support": { "type": "string" }
                }
              },
              "social_behavioral_adjustment": {
                "type": "object",
                "properties": {
                  "tier_1_support": { "type": "string" },
                  "tier_2_and_3_support": { "type": "string" }
                }
              }
            }
          }
        },
        "required": ["id", "name", "class"]
      }
    }
  },
  "required": ["students"]
}
```

### Example payload (API `inputs`)

```json
{
  "topic_summary": "…",
  "scope_and_constraints": "…",
  "visual_models": "…",
  "custom_profile": "…",
  "learner_profiles": "{\"students\":[{\"id\":\"07\",\"name\":\"Lam Wing Yan (林穎欣)\",\"class\":\"1A\",…}]}"
}
```

The string content must still match the JSON schema below when parsed.

General (non-SEN) students include only `id`, `name`, and `class`. SEN rows are loaded from `data/students.json` for the selected class and ids.

Implementation: `buildLearnerProfilesDocument()` in `src/lib/profile-synthesizer.ts`.

## Outputs

**Preferred:** a single JSON object matching the structured schema (Traditional Chinese first, then English in each string). The app parses it from workflow `outputs`, `structured_output`, or JSON embedded after `` in a text field.

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

Stored in session as `learner.profileSynthesisStructured` and passed to Step 3 as the Dify string input **`learner_profile_analysis`** (`JSON.stringify` of this object).

**Legacy:** plain-text `profile_analysis` (or aliases below) — **five numbered sections** (titles are fixed in the app UI; Dify should use `1.`–`5.` and put content after each marker):

1. 班級 SEN 概覽 (Class Profile Summary)
2. 教師目標對齊 (Goal Alignment)
3. 個別學生的認知瓶頸 (Specific Cognitive Bottlenecks)
4. 教學調適 (Instructional Accommodations)
5. 課堂行為與環境管理 (Behavioral & Environmental Management)

Legacy aliases still parsed: `pedagogical_constraints`, `profile_synthesis`, `summary`, `text`.

## App API

`POST /api/profile-synthesizer` — body: `{ classId, studentIds, classProfile, footprint }`. Result stored in session draft as `learner.pedagogicalSynthesis` and shown under Step 1 on the right column.
