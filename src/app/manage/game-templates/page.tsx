import type { Metadata } from "next";
import { GameTemplatesManageShell } from "@/app/components/GameTemplatesManager";

export const metadata: Metadata = {
  title: "Game templates · Inclusive Maths",
  description:
    "Configure Step 4 game parameter templates stored in data/game-parameter-templates.json.",
};

export default function ManageGameTemplatesPage() {
  return <GameTemplatesManageShell />;
}