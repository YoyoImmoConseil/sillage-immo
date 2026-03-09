export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-3xl w-full rounded-2xl border p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Sillage Immo</h1>
        <p className="mt-2 text-sm opacity-70">
          Lancez votre estimation vendeur avec un parcours guide, verification email,
          puis restitution immediate de la fourchette estimee.
        </p>
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Demarrer mon estimation vendeur</h2>
          <p className="text-sm opacity-70">
            Le parcours est 100% API-first: donnees qualifiees, verification email et
            creation directe du dossier commercial.
          </p>
          <a
            href="/estimation"
            className="inline-block rounded bg-black px-4 py-2 text-sm text-white"
          >
            Demarrer l&apos;estimation
          </a>
        </section>
      </div>
    </main>
  );
}