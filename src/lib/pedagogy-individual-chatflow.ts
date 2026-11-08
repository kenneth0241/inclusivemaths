import {
  parsePedagogyWorkflowOutputs,
  pedagogyStructuredResultReady,
  toPedagogyStructuredPayload,
  tryParsePedagogyStructuredAnswerText,
} from "@/lib/pedagogy-strategy";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseJsonObjectFromText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return asRecord(JSON.parse(trimmed));
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return asRecord(JSON.parse(trimmed.slice(start, end + 1)));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Dify structured-output chatflows usually stream a single JSON object as `answer`. */
function shouldSuppressStructuredAnswerStream(text: string): boolean {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("{")) {
    return false;
  }
  if (
    trimmed.includes('"chat_reply"') ||
    trimmed.includes('"part_1_udl"') ||
    trimmed.includes('"part_2_individualized"')
  ) {
    return true;
  }
  // Suppress early chunks before keys appear (e.g. "{\n  \"ch").
  return /^[{][\s\S]*$/.test(trimmed) && trimmed.length < 48_000;
}

function extractOutputsFromChatEvent(
  event: Record<string, unknown>,
): Record<string, unknown> | null {
  const eventName = typeof event.event === "string" ? event.event : "";

  if (eventName === "workflow_finished" || eventName === "node_finished") {
    const data = asRecord(event.data);
    if (!data) {
      return null;
    }
    const outputs = asRecord(data.outputs);
    return outputs ?? data;
  }

  if (eventName === "message_end") {
    const answer =
      typeof event.answer === "string" ? event.answer.trim() : "";
    const fromAnswer = parseJsonObjectFromText(answer);
    if (fromAnswer) {
      return fromAnswer;
    }
  }

  return null;
}

function sseDataLine(event: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export type PedagogyIndividualChatflowMeta = {
  refine_scope: "student";
  student_index?: number;
};

export function createPedagogyIndividualChatflowTransform(
  meta: PedagogyIndividualChatflowMeta,
): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let lineBuffer = "";
  let answerAccum = "";
  let suppressStructuredJsonStream = false;
  let structuredEmitted = false;

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      lineBuffer += decoder.decode(chunk, { stream: true });
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) {
          if (line.length > 0) {
            controller.enqueue(encoder.encode(`${line}\n`));
          }
          continue;
        }

        const payload = line.slice(6).trim();
        if (!payload || payload === "[DONE]") {
          controller.enqueue(encoder.encode(`${line}\n\n`));
          continue;
        }

        let event: Record<string, unknown>;
        try {
          event = JSON.parse(payload) as Record<string, unknown>;
        } catch {
          controller.enqueue(encoder.encode(`${line}\n\n`));
          continue;
        }

        const eventName = typeof event.event === "string" ? event.event : "";

        const emitStructured = (outputs: Record<string, unknown>) => {
          if (structuredEmitted) {
            return;
          }
          const parsed = parsePedagogyWorkflowOutputs(outputs);
          if (!pedagogyStructuredResultReady(parsed)) {
            return;
          }
          const structured = toPedagogyStructuredPayload(parsed);
          const chatReply = parsed.chatReply.trim();

          if (chatReply) {
            controller.enqueue(sseDataLine({ event: "message", answer: chatReply }));
          }

          controller.enqueue(
            sseDataLine({
              event: "pedagogy_structured",
              refine_scope: meta.refine_scope,
              student_index: meta.student_index,
              ...(chatReply ? { chat_reply: chatReply } : {}),
              ...structured,
            }),
          );
          structuredEmitted = true;
        };

        if (eventName === "message" || eventName === "agent_message") {
          const chunkText = typeof event.answer === "string" ? event.answer : "";
          answerAccum += chunkText;

          if (
            !suppressStructuredJsonStream &&
            shouldSuppressStructuredAnswerStream(answerAccum)
          ) {
            suppressStructuredJsonStream = true;
          }

          if (suppressStructuredJsonStream) {
            continue;
          }

          controller.enqueue(encoder.encode(`${line}\n\n`));
          continue;
        }

        if (eventName === "message_end") {
          const mergedAnswer =
            answerAccum ||
            (typeof event.answer === "string" ? event.answer : "");
          const parsedFromAnswer =
            tryParsePedagogyStructuredAnswerText(mergedAnswer);
          if (parsedFromAnswer) {
            emitStructured(parsedFromAnswer.raw);
          } else {
            const outputs = extractOutputsFromChatEvent({
              ...event,
              answer: mergedAnswer,
            });
            if (outputs) {
              emitStructured(outputs);
            } else if (mergedAnswer.trim()) {
              const fromText = parseJsonObjectFromText(mergedAnswer);
              if (fromText) {
                emitStructured(fromText);
              }
            }
          }

          controller.enqueue(encoder.encode(`${line}\n\n`));
          answerAccum = "";
          suppressStructuredJsonStream = false;
          continue;
        }

        if (eventName === "workflow_finished" || eventName === "node_finished") {
          const outputs = extractOutputsFromChatEvent(event);
          if (outputs) {
            emitStructured(outputs);
          }
        }

        controller.enqueue(encoder.encode(`${line}\n\n`));
      }
    },
    flush(controller) {
      if (answerAccum.trim() && !structuredEmitted) {
        const fromText = parseJsonObjectFromText(answerAccum);
        if (fromText) {
          const parsed = parsePedagogyWorkflowOutputs(fromText);
          if (pedagogyStructuredResultReady(parsed)) {
            const structured = toPedagogyStructuredPayload(parsed);
            const chatReply = parsed.chatReply.trim();
            if (chatReply) {
              controller.enqueue(
                sseDataLine({ event: "message", answer: chatReply }),
              );
            }
            controller.enqueue(
              sseDataLine({
                event: "pedagogy_structured",
                refine_scope: meta.refine_scope,
                student_index: meta.student_index,
                ...(chatReply ? { chat_reply: chatReply } : {}),
                ...structured,
              }),
            );
            structuredEmitted = true;
          }
        }
      }
      if (lineBuffer) {
        controller.enqueue(encoder.encode(lineBuffer));
      }
    },
  });
}
