import { marked } from "marked";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
});

turndown.addRule("strikethrough", {
  filter: ["del", "s"],
  replacement(content: string) {
    return `~~${content}~~`;
  },
});

turndown.addRule("highlight", {
  filter(node) {
    return (
      node.nodeName === "MARK" ||
      (node.nodeName === "SPAN" &&
        Boolean((node as HTMLElement).style?.backgroundColor))
    );
  },
  replacement(content: string) {
    return `==${content}==`;
  },
});

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function markdownToEditorHtml(markdown: string) {
  const trimmed = markdown.trim();
  if (!trimmed) {
    return "<p><br></p>";
  }
  const parsed = marked.parse(trimmed);
  return typeof parsed === "string" ? parsed : trimmed;
}

export function editorHtmlToMarkdown(html: string) {
  const trimmed = html.trim();
  if (!trimmed || trimmed === "<br>" || trimmed === "<p><br></p>") {
    return "";
  }
  return turndown.turndown(trimmed).trim();
}
