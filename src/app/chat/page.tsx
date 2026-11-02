import type { Metadata } from "next";
import ChatStudio from "../components/ChatStudio";
import WorkflowShell from "../components/WorkflowShell";

export const metadata: Metadata = {
  title: "Chat with Textbook · Inclusive Maths",
  description:
    "Chat with your MathsTextbook knowledge base and lock a Content Footprint for Primary Grade 1.",
};

export default function ChatPage() {
  return (
    <WorkflowShell
      step={1}
      wide
      kicker="第一步 · 課本對話"
      kickerEn="Step 1 · Textbook chat"
      title="與課本對話"
      titleEn="Chat with the textbook"
      proceedLabel="前往學習者檔案"
      proceedLabelEn="Proceed to learner profile"
    >
      <ChatStudio />
    </WorkflowShell>
  );
}
