import { BilingualStack } from "./Bilingual";

type EnvConfigBannerProps = {
  configured: boolean;
  deployHint: "local" | "vercel";
  envKey?: string;
  bilingual?: boolean;
};

export default function EnvConfigBanner({
  configured,
  deployHint,
  envKey = "DIFY_API_KEY",
  bilingual = false,
}: EnvConfigBannerProps) {
  if (configured) {
    return null;
  }

  const vercelEn = (
    <>
      Set <code className="font-mono">{envKey}</code> in Vercel → Project → Settings
      → Environment Variables (Production), then redeploy.
    </>
  );
  const vercelZh = (
    <>
      請在 Vercel → 專案 → 設定 → 環境變數（Production）設定{" "}
      <code className="font-mono">{envKey}</code>，然後重新部署。
    </>
  );
  const localEn = (
    <>
      Add <code className="font-mono">{envKey}</code> to{" "}
      <code className="font-mono">.env.local</code>, then restart the app.
    </>
  );
  const localZh = (
    <>
      請在 <code className="font-mono">.env.local</code> 加入{" "}
      <code className="font-mono">{envKey}</code>，然後重新啟動應用程式。
    </>
  );

  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {bilingual ? (
        <BilingualStack
          layout="stack"
          zh={deployHint === "vercel" ? vercelZh : localZh}
          en={deployHint === "vercel" ? vercelEn : localEn}
          enClassName="text-amber-800/85"
        />
      ) : deployHint === "vercel" ? (
        vercelEn
      ) : (
        localEn
      )}
    </p>
  );
}
