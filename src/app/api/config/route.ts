import { NextResponse } from "next/server";
import { getDifyConfig } from "@/lib/dify";

export async function GET() {
  try {
    const { lockedDatasetId } = getDifyConfig();
    return NextResponse.json({
      configured: true,
      lockedDatasetId,
    });
  } catch {
    return NextResponse.json(
      { configured: false, lockedDatasetId: null },
      { status: 500 },
    );
  }
}
