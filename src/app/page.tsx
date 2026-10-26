import UploadForm from "./components/UploadForm";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-[#f6f3ee] px-6 py-16">
      <main className="flex w-full max-w-xl flex-col items-center">
        <p className="text-sm font-semibold tracking-wide text-emerald-700 uppercase">
          Teacher upload
        </p>
        <h1 className="mt-2 text-center text-4xl font-semibold tracking-tight text-zinc-900">
          Send files to Dify Knowledge
        </h1>
        <p className="mt-3 mb-10 text-center text-base leading-7 text-zinc-600">
          Choose a knowledge base, drop in your materials, and they are uploaded
          straight into Dify for indexing.
        </p>
        <UploadForm />
      </main>
    </div>
  );
}
