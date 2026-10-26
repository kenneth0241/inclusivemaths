# Teacher Dify Upload

A small website for teachers to drop files into a form. The server sends each file to **Dify Knowledge** with the Knowledge API. The API key never leaves the server.

## Setup

1. Copy `.env.example` to `.env.local`.
2. In Dify, open **Knowledge → API** and create a **Knowledge** API key (not an app key).
3. Fill in:

```bash
DIFY_API_KEY=dataset-...
DIFY_API_BASE=https://api.dify.ai/v1
```

Self-hosted Dify usually uses `http://localhost/v1` or `https://your-host/v1`.

Optional: set `DIFY_DATASET_ID` to lock teachers to one knowledge base. Otherwise they pick from the list.

4. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

1. The page loads knowledge bases from `GET /v1/datasets`.
2. Each file is posted to `POST /v1/datasets/{id}/document/create-by-file`.
3. The UI polls indexing status until Dify finishes (or reports an error).

Dify accepts one file per request; this app uploads a batch one file after another.

## File types

Typical Dify document types: PDF, TXT, Markdown, HTML, DOCX, XLSX, CSV, PPTX, EPUB, XML.
