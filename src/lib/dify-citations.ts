/** Dify Knowledge Retrieval / citation payload (API + UI). */
export type DifyRetrieverResource = {
  position?: number;
  dataset_id?: string;
  dataset_name?: string;
  document_id?: string;
  document_name?: string;
  segment_id?: string;
  score?: number;
  content?: string;
};

function resourcesFromRecord(record: Record<string, unknown>) {
  const raw =
    record.retriever_resources ?? record.citations ?? record.resources;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw as DifyRetrieverResource[];
}

export function parseRetrieverResources(source: unknown): DifyRetrieverResource[] {
  if (!source || typeof source !== "object") {
    return [];
  }
  const record = source as Record<string, unknown>;
  const direct = resourcesFromRecord(record);
  if (direct.length > 0) {
    return direct;
  }

  if (record.outputs && typeof record.outputs === "object") {
    const fromOutputs = resourcesFromRecord(
      record.outputs as Record<string, unknown>,
    );
    if (fromOutputs.length > 0) {
      return fromOutputs;
    }
  }

  if (record.data && typeof record.data === "object") {
    return parseRetrieverResources(record.data);
  }

  return [];
}

export function mergeRetrieverResources(
  current: DifyRetrieverResource[],
  incoming: DifyRetrieverResource[],
) {
  if (incoming.length === 0) {
    return current;
  }
  const seen = new Set(
    current.map(
      (item) =>
        `${item.segment_id ?? ""}:${item.document_id ?? ""}:${item.document_name ?? ""}:${item.content?.slice(0, 120) ?? ""}`,
    ),
  );
  const next = [...current];
  for (const citation of incoming) {
    const key = `${citation.segment_id ?? ""}:${citation.document_id ?? ""}:${citation.document_name ?? ""}:${citation.content?.slice(0, 120) ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      next.push(citation);
    }
  }
  return next;
}

/** Pull citations from any chat-messages SSE chunk (Chatbot, Agent, Chatflow). */
export function extractCitationsFromChatEvent(
  event: Record<string, unknown>,
): DifyRetrieverResource[] {
  const fromMetadata = parseRetrieverResources(event.metadata);
  if (fromMetadata.length > 0) {
    return fromMetadata;
  }

  const eventName = typeof event.event === "string" ? event.event : "";

  if (eventName === "retriever_resources") {
    return parseRetrieverResources(event.data);
  }

  if (eventName === "workflow_finished" || eventName === "node_finished") {
    const fromData = parseRetrieverResources(event.data);
    if (fromData.length > 0) {
      return fromData;
    }
  }

  return [];
}

export function sortRetrieverResources(items: DifyRetrieverResource[]) {
  return [...items].sort(
    (a, b) => (a.position ?? 9999) - (b.position ?? 9999),
  );
}
