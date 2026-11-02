import AppNav from "../../components/AppNav";
import CorpusKnowledgePage from "../../components/CorpusKnowledgePage";

export default function TextbookKnowledgePage() {
  return (
    <div className="flex flex-1 flex-col bg-paper pb-20">
      <AppNav />
      <main className="mx-auto flex w-full max-w-layout-narrow flex-col items-center pt-10">
        <CorpusKnowledgePage corpus="textbook" />
      </main>
    </div>
  );
}
