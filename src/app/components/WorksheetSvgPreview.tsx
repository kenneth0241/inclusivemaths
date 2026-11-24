"use client";

import { sanitizeWorksheetSvgForPreview } from "@/lib/worksheet-svg-preview";
import { BilingualStack } from "./Bilingual";

type WorksheetSvgPreviewProps = {
  svgCode: string;
  caption?: string;
};

export default function WorksheetSvgPreview({
  svgCode,
  caption,
}: WorksheetSvgPreviewProps) {
  const safe = sanitizeWorksheetSvgForPreview(svgCode);
  if (!safe) {
    return (
      <p className="text-xs text-amber-900">
        <BilingualStack
          zh="SVG 無法在預覽中顯示（格式不正確或遭拒絕）。"
          en="SVG could not be shown in preview (invalid or blocked)."
          layout="inline"
        />
      </p>
    );
  }

  return (
    <figure className="my-4 space-y-2">
      {caption ? (
        <figcaption className="text-xs font-medium text-zinc-600">
          {caption}
        </figcaption>
      ) : null}
      <div
        className="overflow-x-auto rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200 [&_svg]:mx-auto [&_svg]:max-h-56 [&_svg]:max-w-full"
        // Dify worksheet SVG is trusted teacher content; basic script/event strip only.
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </figure>
  );
}