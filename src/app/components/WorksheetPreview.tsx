import WorksheetSvgPreview from "./WorksheetSvgPreview";

type Block =
  | { kind: "line"; text: string }
  | { kind: "heading1"; text: string }
  | { kind: "heading2"; text: string }
  | { kind: "hr" }
  | { kind: "gap" }
  | { kind: "svg"; code: string };

function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.trim() === "```svg") {
      const svgLines: string[] = [];
      index += 1;
      while (index < lines.length && lines[index]?.trim() !== "```") {
        svgLines.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push({ kind: "svg", code: svgLines.join("\n") });
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({ kind: "heading1", text: line.slice(2) });
    } else if (line.startsWith("## ")) {
      blocks.push({ kind: "heading2", text: line.slice(3) });
    } else if (line.trim() === "---") {
      blocks.push({ kind: "hr" });
    } else if (!line.trim()) {
      blocks.push({ kind: "gap" });
    } else {
      blocks.push({ kind: "line", text: line });
    }
    index += 1;
  }

  return blocks;
}

export default function WorksheetPreview({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownBlocks(markdown);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.kind === "heading1") {
          return (
            <h3 key={index} className="text-2xl font-semibold">
              {block.text}
            </h3>
          );
        }
        if (block.kind === "heading2") {
          return (
            <h4 key={index} className="pt-2 text-xl font-semibold">
              {block.text}
            </h4>
          );
        }
        if (block.kind === "hr") {
          return <hr key={index} className="border-zinc-200" />;
        }
        if (block.kind === "gap") {
          return <div key={index} className="h-2" />;
        }
        if (block.kind === "svg") {
          return <WorksheetSvgPreview key={index} svgCode={block.code} />;
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {block.text.replaceAll("**", "")}
          </p>
        );
      })}
    </div>
  );
}