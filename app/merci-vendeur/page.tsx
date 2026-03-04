type MerciVendeurPageProps = {
  searchParams: Promise<{ leadId?: string }>;
};

export default async function MerciVendeurPage({ searchParams }: MerciVendeurPageProps) {
  const params = await searchParams;
  const leadId = params.leadId ?? null;

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl rounded-2xl border p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Merci, votre demande est enregistree.</h1>
        <p className="text-sm opacity-75">
          Un conseiller Sillage Immo reviendra vers vous rapidement pour cadrer la
          suite et vous accompagner dans les demarches vendeur.
        </p>
        {leadId ? (
          <p className="text-xs opacity-60">
            Reference interne: <code>{leadId}</code>
          </p>
        ) : null}
        <a className="inline-block rounded bg-black px-4 py-2 text-white" href="/estimation">
          Revenir a l&apos;estimation
        </a>
      </div>
    </main>
  );
}
