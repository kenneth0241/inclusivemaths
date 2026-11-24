import { redirect } from "next/navigation";

/** Step 4 entry — default to games (4.1). */
export default function AssetsIndexPage() {
  redirect("/design/assets/games");
}