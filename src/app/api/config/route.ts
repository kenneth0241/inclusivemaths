import { connection } from "next/server";
import { NextResponse } from "next/server";
import { CORPUS_IDS } from "@/lib/corpus";
import {
  getChatConfig,
  getDifyConfig,
  getLessonPlanConfig,
  isLessonPlanRefineConfigured,
  getPedagogyAppMode,
  isPedagogyChatConfigured,
  isPedagogyIndividualRefineConfigured,
  isPedagogyWorkflowConfigured,
  isGameChatConfigured,
  isGameUdlChatConfigured,
  getPedagogyIndividualRefineAppMode,
  getPedagogyIndividualRefineConfig,
  isProfileSynthesizerConfigured,
  isTopicAnalysisConfigured,
  resolveCorpusDatasetId,
} from "@/lib/dify";
import { isTextbookDriveConfigured } from "@/lib/google-drive";

export async function GET() {
  await connection();
  const deployHint = process.env.VERCEL ? "vercel" : "local";

  let knowledgeConfigured = false;
  try {
    getDifyConfig();
    knowledgeConfigured = true;
  } catch {
    knowledgeConfigured = false;
  }

  let chatConfigured = false;
  try {
    getChatConfig();
    chatConfigured = true;
  } catch {
    chatConfigured = false;
  }

  let lessonPlanConfigured = false;
  try {
    getLessonPlanConfig();
    lessonPlanConfigured = true;
  } catch {
    lessonPlanConfigured = false;
  }

  const corpora = CORPUS_IDS.map((corpus) => {
    try {
      resolveCorpusDatasetId(corpus);
      return { corpus, configured: true };
    } catch {
      return { corpus, configured: false };
    }
  });

  let pedagogyIndividualRefineApiBase: string | null = null;
  let pedagogyIndividualRefineKeyKind: "app" | "dataset" | "other" | null =
    null;
  if (isPedagogyIndividualRefineConfigured()) {
    try {
      const { apiBase, apiKey } = getPedagogyIndividualRefineConfig();
      pedagogyIndividualRefineApiBase = apiBase;
      pedagogyIndividualRefineKeyKind = apiKey.startsWith("app-")
        ? "app"
        : apiKey.startsWith("dataset-")
          ? "dataset"
          : "other";
    } catch {
      pedagogyIndividualRefineApiBase = null;
    }
  }

  return NextResponse.json({
    configured: knowledgeConfigured,
    knowledgeConfigured,
    chatConfigured,
    lessonPlanConfigured,
    lessonPlanRefineConfigured: isLessonPlanRefineConfigured(),
    topicAnalysisConfigured: isTopicAnalysisConfigured(),
    profileSynthesizerConfigured: isProfileSynthesizerConfigured(),
    pedagogyChatConfigured: isPedagogyChatConfigured(),
    pedagogyWorkflowConfigured: isPedagogyWorkflowConfigured(),
    pedagogyIndividualRefineConfigured: isPedagogyIndividualRefineConfigured(),
    pedagogyIndividualRefineAppMode: getPedagogyIndividualRefineAppMode(),
    pedagogyIndividualRefineApiBase,
    pedagogyIndividualRefineKeyKind,
    pedagogyAppMode: getPedagogyAppMode(),
    gameChatConfigured: isGameChatConfigured(),
    gameUdlChatConfigured: isGameUdlChatConfigured(),
    textbookDriveConfigured: isTextbookDriveConfigured(),
    deployHint,
    lockedDatasetId: knowledgeConfigured ? getDifyConfig().lockedDatasetId : null,
    corpora,
  });
}
