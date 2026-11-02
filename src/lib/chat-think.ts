/** Split model output that wraps chain-of-thought in think tags from the visible reply. */
export function splitChatThinkContent(content: string) {
  const thinkParts: string[] = [];
  let answer = content;

  const tagPatterns = [
    /<\s*think\s*>([\s\S]*?)<\s*\/\s*think\s*>/gi,
    /<\s*redacted_reasoning\s*>([\s\S]*?)<\s*\/\s*redacted_reasoning\s*>/gi,
  ];

  for (const completeBlock of tagPatterns) {
    answer = answer.replace(completeBlock, (_, inner: string) => {
    const trimmed = inner.trim();
    if (trimmed) {
      thinkParts.push(trimmed);
    }
      return "";
    });
  }

  const openMatch = answer.match(
    /<\s*(?:think|redacted_reasoning)\s*>([\s\S]*)$/i,
  );
  if (openMatch) {
    const trailing = openMatch[1]?.trim() ?? "";
    if (trailing) {
      thinkParts.push(trailing);
    }
    answer = answer.slice(0, openMatch.index ?? 0);
  }

  return {
    think: thinkParts.join("\n\n").trim(),
    answer: answer.trim(),
  };
}

/** Trim line ends; keep one blank line between blocks, drop extra model spacing. */
export function formatChatDisplayText(text: string) {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
