# Inclusive Maths (Primary Grade 1)

Educator portal for **Inclusive Maths**: upload **MathsTextbook** Markdown into Dify Knowledge, **chat with the textbook**, and **generate lesson plans** via Dify. Built with Next.js; Dify holds prompts and retrieval.

## Setup

1. Copy `.env.example` to `.env.local`.
2. In Dify, create or use the **MathsTextbook** knowledge base; copy its **dataset UUID** (from the URL, not an API key).
3. Create a **Knowledge API key**, your **Chatflow** app API key, and (optional) a **lesson plan Workflow** app API key.
4. Fill in:

```bash
DIFY_API_KEY=dataset-...
DIFY_API_BASE=https://api.dify.ai/v1
DIFY_DATASET_TEXTBOOK=...
DIFY_APP_CHAT_API_KEY=app-...
DIFY_APP_LESSON_API_KEY=app-...
```

5. Run locally:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing — status, how it works, links |
| `/knowledge` | Redirects to textbook upload |
| `/knowledge/textbook` | Upload **Markdown only** (.md) and **view** indexed files |
| `/design` | Design hub (lesson plan) |
| `/design/pedagogy` | Pedagogical strategy selector → lesson plan at `/design/pedagogy/plan` (Dify workflow) |
| `/chat` | **Chat with Textbook** (Dify Chatflow, streaming) |

## Textbook upload

- **Allowed:** `.md` / `.markdown` only (enforced in the browser and on `/api/upload`).
- **Chat & lessons tab:** uploaded sections and status (ready to use, preparing, etc.).
- **Textbook PDFs tab:** PDFs from the shared folder with download.
- Convert PDF/Word chapters to Markdown before uploading if needed.

### Google Drive (list & download)

Share the textbook folder as **Anyone with the link** (viewer). The app lists and downloads from that folder automatically (default folder ID is built in).

Optional for more reliable server-side access:

```bash
GOOGLE_DRIVE_API_KEY=AIza...
GOOGLE_DRIVE_TEXTBOOK_FOLDER_ID=10NxpupZ1VsEEQ_DkYRr-wZRnBg-EqlVz
```

## Chat with Textbook — connect your Dify Chatflow

The site proxies your existing **Chatflow**; you do not need a second chat UI in Dify.

### In Dify

1. Open your **Chatflow** app (the one you already built).
2. **Knowledge** — attach retrieval to the **MathsTextbook** dataset (same UUID as `DIFY_DATASET_TEXTBOOK`).
3. **Start inputs / conversation variables** — add (exact names):
   - `grade` — text; the site always sends `"1"`
   - `subject` — text (the site always sends `"maths"`)
4. Use `{{grade}}` and `{{subject}}` in prompts or workflow logic as needed.
5. Enable **streaming** for the LLM / answer node.
6. **Publish** the app.
7. **API access** → create an **API key** (`app-…`).

### On this website

1. Set `DIFY_APP_CHAT_API_KEY` to that Chatflow app key (local `.env.local` and/or Vercel).
2. Optional: `DIFY_APP_CHAT_API_BASE` if not using `https://api.dify.ai/v1`.
3. Restart `npm run dev` or redeploy Vercel.

### What the site sends

`POST /v1/chat-messages` (via `/api/chat`):

- `inputs.grade` — always `"1"` (Primary Grade 1 pilot)
- `inputs.subject` — `"maths"`
- `query` — the teacher’s message
- `response_mode` — `"streaming"`
- `conversation_id` — optional, kept in `sessionStorage` for follow-up turns
- `user` — `"inclusive-maths-teacher"`

Test the same payload in Dify’s **API / Logs** playground; if it works there, `/chat` should work on the site.

### Optional: second LLM for one-click follow-up questions

You can add **LLM node 2** after the answer LLM. It should output **only** a JSON **array of strings**, not prose, for example:

```json
["你會先揀邊個單元設計教案？","如何把數的分和合變成操作活動？","SpLD學生學加減法有何難點？"]
```

Wire **only LLM node 1** to the chat **Answer** (streamed reply). Connect LLM node 2 to **End** and map its output to a workflow variable named **`suggested_questions`** (or `follow_up_questions` / `follow_ups`). With **Structured output**, Dify often returns `structured_output.suggested_questions` plus a `text` field; the site reads both from `node_finished` / `workflow_finished` and from merged `answer` streams. It shows **建議追問（一鍵送出）** buttons under that reply.

If Dify merges both nodes into one streamed `answer` (common with two LLM nodes), the site still finds the **last** JSON array after the final `` block, removes it from the chat bubble, and turns it into buttons.

## Chat studio analysis — optional Dify Workflow

After each assistant reply on `/chat`, the site sends the **conversation transcript** to a separate **Workflow** (blocking). That run powers:

- **Discussion summary** (sidebar + green suggestion card)
- **Content Footprint** — topic summary + scope & constraints (teacher edits lock scope)
- **Footprint quality index** — rubric score for scope (replaces the old single “topic confidence” meter)

The main **Chatflow** still handles streamed answers and LLM2 follow-up chips; this workflow is **post-reply studio analysis** only.

**Full setup for workflow `Textbook_Chat_Analysis` (inputs + structured output schema):** see [`docs/dify-studio-analysis-workflow.md`](docs/dify-studio-analysis-workflow.md).

### On this website

1. Set `DIFY_APP_TOPIC_API_KEY` in `.env.local` / Vercel (same env name as before).
2. Optional: `DIFY_APP_TOPIC_API_BASE`.
3. Restart dev or redeploy.

The site calls `POST /api/chat/topic-analysis` → Dify `POST /workflows/run` with `response_mode: "blocking"`. If the key is missing, footprint fields use local keyword extraction and quality meters stay at 0 until Dify is configured.

**Legacy workflows** that only output `topic`, `confidence`, and `suggested_question` still work; the app maps them into summary and dual meters.

## Dify lesson plan workflow

Create a **Workflow** app (separate from Chatflow), publish, and set `DIFY_APP_LESSON_API_KEY`.

**Start inputs** (names must match the website):

| Input | Description |
|-------|-------------|
| `grade` | Always `"1"` from the server |
| `topic` | Lesson topic |
| `class_focus` | e.g. `whole_class`, `spld_dyslexia_reading`, `spld_other`, `small_group` |
| `learner_notes` | Optional |
| `duration_minutes` | e.g. `"30"`, `"40"`, `"60"` |
| `requirements` | Teacher free-text |
| `subject` | Always `"maths"` from the server |
| `previous_plan` / `refinement` | Optional, for refine on the site |

Wire **knowledge retrieval** to **MathsTextbook** when ready. The site uses `POST /v1/workflows/run` with streaming.

Optional refine Chatflow: `DIFY_APP_LESSON_REFINE_API_KEY` — otherwise refine re-runs the workflow with `previous_plan` and `refinement`.

## Deploy on Vercel

Set the same environment variables under **Project → Settings → Environment Variables**, then **Redeploy**.

## Legacy routes

- `/manage` and `/knowledge/edb` redirect to `/knowledge/textbook`.
