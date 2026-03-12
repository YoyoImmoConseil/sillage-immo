type MerciVendeurPageProps = {
  searchParams: Promise<{ leadId?: string }>;
};

export default async function MerciVendeurPage({ searchParams }: MerciVendeurPageProps) {
  const params = await searchParams;
  const leadId = params.leadId ?? null;

  return (
    <main className="min-h-screen">
      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-12 md:px-10 xl:px-14 2xl:px-20">
          <h1 className="text-2xl font-semibold">Merci, votre demande est bien enregistree.</h1>
        </div>
      </section>
      <section className="bg-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.22)] p-6 space-y-4">
            <p className="text-sm opacity-75">
              Un conseiller Sillage Immo vous recontacte rapidement pour cadrer la mise en vente
              et vous accompagner pas a pas jusqu&apos;a la concretisation de votre projet.
            </p>
            {leadId ? (
              <p className="text-xs opacity-60">
                Reference interne: <code>{leadId}</code>
              </p>
            ) : null}
            <a className="sillage-btn inline-block rounded px-4 py-2" href="/estimation">
              Revenir au parcours vendeur
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
