export function getDifyConfig() {
  const apiKey = process.env.DIFY_API_KEY?.trim();
  const apiBase = (process.env.DIFY_API_BASE ?? "https://api.dify.ai/v1").replace(
    /\/$/,
    "",
  );
  const lockedDatasetId = process.env.DIFY_DATASET_ID?.trim() || null;

  if (!apiKey) {
    throw new Error("DIFY_API_KEY is not set");
  }

  return { apiKey, apiBase, lockedDatasetId };
}

export async function difyFetch(path: string, init?: RequestInit) {
  const { apiKey, apiBase } = getDifyConfig();
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  return response;
}

export async function readDifyError(response: Response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { message?: string; code?: string };
    return json.message || json.code || text || `Dify error ${response.status}`;
  } catch {
    return text || `Dify error ${response.status}`;
  }
}
