import { connection } from "next/server";
import { NextResponse } from "next/server";
import {
  assertFileInTextbookFolder,
  getOptionalDriveApiKey,
  publicDriveDownloadUrl,
} from "@/lib/google-drive";

export async function GET(request: Request) {
  await connection();
  try {
    const fileId = new URL(request.url).searchParams.get("fileId")?.trim();
    if (!fileId) {
      return NextResponse.json({ error: "fileId is required." }, { status: 400 });
    }

    const file = await assertFileInTextbookFolder(fileId);
    const apiKey = getOptionalDriveApiKey();

    if (!apiKey) {
      return NextResponse.redirect(publicDriveDownloadUrl(fileId));
    }

    const downloadUrl = new URL(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    );
    downloadUrl.searchParams.set("alt", "media");
    downloadUrl.searchParams.set("key", apiKey);

    const driveResponse = await fetch(downloadUrl.toString(), {
      cache: "no-store",
    });

    if (!driveResponse.ok) {
      return NextResponse.redirect(publicDriveDownloadUrl(fileId));
    }

    const body = driveResponse.body;
    if (!body) {
      return NextResponse.redirect(publicDriveDownloadUrl(fileId));
    }

    const filename = file.name ?? "download";
    const contentType =
      driveResponse.headers.get("Content-Type") ??
      file.mimeType ??
      "application/octet-stream";

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Download failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
