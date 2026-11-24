import { sanitizeWorksheetSvgForPreview } from "@/lib/worksheet-svg-preview";

/** Rasterize worksheet SVG for Word (DOCX needs a bitmap fallback). */
export async function worksheetSvgToPngUint8Array(
  svg: string,
  fallbackWidth = 360,
  fallbackHeight = 140,
): Promise<Uint8Array | null> {
  if (typeof document === "undefined") {
    return null;
  }
  const safe = sanitizeWorksheetSvgForPreview(svg);
  if (!safe) {
    return null;
  }

  const blob = new Blob([safe], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const width = image.naturalWidth || fallbackWidth;
    const height = image.naturalHeight || fallbackHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/png");
    return base64ToUint8Array(dataUrl.split(",")[1] ?? "");
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("SVG load failed"));
    img.src = src;
  });
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}