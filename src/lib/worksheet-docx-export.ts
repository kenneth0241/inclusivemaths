import {
  Document,
  HeadingLevel,
  ImageRun,
  PageBreak,
  Packer,
  Paragraph,
  TextRun,
  type FileChild,
} from "docx";
import type {
  WorksheetStructuredItem,
  WorksheetStructuredOutput,
} from "@/lib/worksheet-structured-output";
import { worksheetSvgToPngUint8Array } from "@/lib/worksheet-svg-to-png";

function halfPointSize(pt: number): number {
  return Math.max(16, Math.round(pt * 2));
}

function slugFilename(name: string, topic: string): string {
  const slug =
    topic
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "inclusive-maths";
  const learner = name
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .slice(0, 24);
  return learner ? `${slug}-${learner}-worksheet.docx` : `${slug}-worksheet.docx`;
}

export function worksheetDocxFilename(
  studentName: string,
  topic: string,
): string {
  return slugFilename(studentName, topic);
}

function runsForLine(
  line: string,
  highlightKeywords: string[],
  baseHalfPts: number,
  enlargeOperators: boolean,
): TextRun[] {
  const keywords = highlightKeywords
    .map((word) => word.trim())
    .filter(Boolean);
  if (keywords.length === 0) {
    return [
      new TextRun({
        text: line,
        size: baseHalfPts,
        bold: false,
      }),
    ];
  }

  const lower = line.toLowerCase();
  const segments: { start: number; end: number; bold: boolean }[] = [];
  for (const word of keywords) {
    const needle = word.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(needle, from);
      if (index < 0) {
        break;
      }
      segments.push({ start: index, end: index + needle.length, bold: true });
      from = index + needle.length;
    }
  }
  segments.sort((a, b) => a.start - b.start);
  const merged: typeof segments = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && seg.start <= last.end) {
      last.end = Math.max(last.end, seg.end);
    } else {
      merged.push({ ...seg });
    }
  }

  const runs: TextRun[] = [];
  let cursor = 0;
  for (const seg of merged) {
    if (cursor < seg.start) {
      runs.push(
        ...runsForOperators(
          line.slice(cursor, seg.start),
          baseHalfPts,
          enlargeOperators,
          false,
        ),
      );
    }
    runs.push(
      ...runsForOperators(
        line.slice(seg.start, seg.end),
        baseHalfPts,
        enlargeOperators,
        true,
      ),
    );
    cursor = seg.end;
  }
  if (cursor < line.length) {
    runs.push(
      ...runsForOperators(
        line.slice(cursor),
        baseHalfPts,
        enlargeOperators,
        false,
      ),
    );
  }
  return runs.length > 0 ? runs : [new TextRun({ text: line, size: baseHalfPts })];
}

function runsForOperators(
  text: string,
  baseHalfPts: number,
  enlargeOperators: boolean,
  bold: boolean,
): TextRun[] {
  if (!enlargeOperators) {
    return [new TextRun({ text, size: baseHalfPts, bold })];
  }
  const operatorRe = /[+\-×÷=]/g;
  const runs: TextRun[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = operatorRe.exec(text)) !== null) {
    const idx = match.index;
    if (idx > last) {
      runs.push(
        new TextRun({ text: text.slice(last, idx), size: baseHalfPts, bold }),
      );
    }
    runs.push(
      new TextRun({
        text: match[0],
        size: Math.round(baseHalfPts * 1.35),
        bold: true,
      }),
    );
    last = idx + match[0].length;
  }
  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last), size: baseHalfPts, bold }));
  }
  return runs.length > 0 ? runs : [new TextRun({ text, size: baseHalfPts, bold })];
}

async function paragraphsForItem(
  item: WorksheetStructuredItem,
  layout: WorksheetStructuredOutput["docx_layout"],
): Promise<FileChild[]> {
  const baseHalfPts = halfPointSize(layout.font_size_pt);
  const blocks: FileChild[] = [];

  // One question per printed page (title/header stay on earlier pages).
  blocks.push(new Paragraph({ children: [new PageBreak()] }));

  blocks.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: `Question ${item.number}`,
          size: baseHalfPts + 4,
          bold: true,
        }),
      ],
      spacing: { after: 120 },
    }),
  );

  if (item.student_text.trim()) {
    for (const line of item.student_text.split("\n")) {
      if (!line.trim()) {
        blocks.push(new Paragraph({ spacing: { after: 80 } }));
        continue;
      }
      blocks.push(
        new Paragraph({
          children: runsForLine(
            line,
            item.highlight_keywords,
            baseHalfPts,
            layout.enlarge_operators,
          ),
          spacing: { after: 100, line: 360 },
        }),
      );
    }
  }

  if (item.step_breakdown.length > 0) {
    for (const step of item.step_breakdown) {
      blocks.push(
        new Paragraph({
          children: [
            new TextRun({ text: step, size: baseHalfPts - 4, italics: true }),
          ],
          spacing: { after: 80 },
        }),
      );
    }
  }

  if (item.svg_code.trim()) {
    const png = await worksheetSvgToPngUint8Array(item.svg_code);
    if (png) {
      blocks.push(
        new Paragraph({
          children: [
            new ImageRun({
              type: "png",
              data: png,
              transformation: { width: 360, height: 140 },
            }),
          ],
          spacing: { before: 120, after: 160 },
        }),
      );
    } else if (item.visual_asset.trim()) {
      blocks.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Visual: ${item.visual_asset.trim()}`,
              size: baseHalfPts - 4,
            }),
          ],
        }),
      );
    }
  }

  if (item.options.length > 0) {
    item.options.forEach((opt, index) => {
      blocks.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${String.fromCharCode(65 + index)}) ${opt}`,
              size: baseHalfPts,
            }),
          ],
          spacing: { after: 80 },
        }),
      );
    });
  }

  blocks.push(new Paragraph({ spacing: { after: 240 } }));
  return blocks;
}

export async function buildWorksheetDocxBlob(
  output: WorksheetStructuredOutput,
  options?: { includeTeacherKey?: boolean },
): Promise<Blob> {
  const includeTeacherKey = options?.includeTeacherKey ?? true;
  const title =
    output.worksheet_title.trim() ||
    output.topic_summary.trim() ||
    "Inclusive Maths Worksheet";
  const baseHalfPts = halfPointSize(output.docx_layout.font_size_pt);

  const children: FileChild[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, size: baseHalfPts + 8, bold: true })],
    }),
  ];

  if (output.student_name.trim()) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Student: ${output.student_name.trim()}`,
            size: baseHalfPts,
          }),
        ],
        spacing: { after: 200 },
      }),
    );
  }

  if (output.teacher_note.trim()) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: output.teacher_note.trim(),
            size: baseHalfPts - 4,
            italics: true,
          }),
        ],
        spacing: { after: 240 },
      }),
    );
  }

  for (const item of output.items) {
    const itemBlocks = await paragraphsForItem(item, output.docx_layout);
    children.push(...itemBlocks);
  }

  if (includeTeacherKey) {
    children.push(
      new Paragraph({
        children: [
          new PageBreak(),
          new TextRun({
            text: "Teacher answer key (do not distribute)",
            size: baseHalfPts,
            bold: true,
          }),
        ],
      }),
    );

    for (const item of output.items) {
      const r = item.teacher_review;
      const bits = [
        r.answer ? `Answer: ${r.answer}${r.unit ? ` ${r.unit}` : ""}` : "",
        r.marking_criterion ? `Marking: ${r.marking_criterion}` : "",
        r.applied_adaptation ? `Adaptation: ${r.applied_adaptation}` : "",
      ].filter(Boolean);
      if (bits.length === 0) {
        continue;
      }
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Q${item.number}: ${bits.join(" · ")}`,
              size: baseHalfPts - 4,
            }),
          ],
          spacing: { after: 100 },
        }),
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}