import type { Metadata } from "next";
import Link from "next/link";
import { SILLAGE_ADDRESS_DISPLAY, SILLAGE_CONTACT_EMAIL, SILLAGE_LEGAL } from "@/lib/brand/company";
import { getRequestLocale } from "@/lib/i18n/request";
import { buildPublicPageMetadata } from "@/lib/seo/site";
import { LegalPage, LegalSection } from "@/app/components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPublicPageMetadata({
    path: "/confidentialite",
    locale,
    title: "Politique de confidentialité et cookies | Sillage Immo",
    description:
      "Comment Sillage Immo collecte, utilise et protège vos données personnelles : estimation, recherche, espace client, assistant IA et cookies.",
  });
}

export default function ConfidentialitePage() {
  return (
    <LegalPage
      eyebrow="Données personnelles"
      title="Politique de confidentialité et cookies"
      intro="Cette page décrit les données que nous collectons lorsque vous utilisez sillage-immo.com, pourquoi nous les utilisons, combien de temps nous les conservons et comment exercer vos droits."
    >
      <LegalSection title="Responsable du traitement">
        <p>
          Sillage Immo (SARL {SILLAGE_LEGAL.legalName}, {SILLAGE_LEGAL.rcs}), {SILLAGE_ADDRESS_DISPLAY}. Contact pour toute
          question relative à vos données : {SILLAGE_CONTACT_EMAIL}.
        </p>
      </LegalSection>

      <LegalSection title="Données collectées et finalités">
        <p>
          <strong>Demande d’estimation</strong> : identité, coordonnées, caractéristiques et
          adresse du bien, documents et photos que vous transmettez. Finalité : produire une
          estimation et vous proposer un accompagnement à la vente. Base légale : exécution de
          mesures précontractuelles à votre demande.
        </p>
        <p>
          <strong>Recherche acquéreur et alertes</strong> : identité, coordonnées, critères et zone
          de recherche. Finalité : vous adresser des biens correspondant à votre projet, avec votre
          accord, et permettre à un conseiller de suivre votre recherche. Base légale : votre
          consentement (retirable à tout moment depuis votre espace ou par email).
        </p>
        <p>
          <strong>Espace client</strong> : email, historique de connexion, documents partagés avec
          votre conseiller, échanges. Finalité : suivi de votre projet. Base légale : exécution du
          contrat ou de mesures précontractuelles.
        </p>
        <p>
          <strong>Assistant IA</strong> : le contenu de vos échanges avec l’assistant est conservé
          sous forme pseudonymisée pour améliorer l’accompagnement. Vous pouvez demander leur
          suppression à tout moment via la page{" "}
          <Link href="/confidentialite/conversations" className="underline underline-offset-2">
            Supprimer mes conversations IA
          </Link>
          .
        </p>
        <p>
          <strong>Mesure d’audience</strong> : voir la section Cookies ci-dessous.
        </p>
      </LegalSection>

      <LegalSection title="Destinataires">
        <p>
          Vos données sont traitées par l’équipe de Sillage Immo et par nos prestataires
          techniques agissant pour notre compte : hébergement (Vercel), base de données et
          authentification (Supabase), logiciel de transaction immobilière (SweepBright), envoi
          d’emails transactionnels, signature électronique et gestion documentaire (MyNotary),
          modèles d’intelligence artificielle pour l’assistant. Aucune donnée n’est vendue à des
          tiers.
        </p>
      </LegalSection>

      <LegalSection title="Durées de conservation">
        <p>
          Prospects (estimation, recherche) : 3 ans à compter du dernier contact. Clients : durée de
          la relation contractuelle puis délais légaux de prescription (5 ans) et obligations
          comptables (10 ans). Conversations avec l’assistant IA : 12 mois, ou suppression sur
          demande. Cookies de mesure d’audience : 13 mois maximum.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation,
          d’opposition et de portabilité de vos données, ainsi que du droit de retirer votre
          consentement à tout moment et de définir des directives post-mortem. Pour les exercer,
          écrivez à {SILLAGE_CONTACT_EMAIL}. Vous pouvez également introduire une réclamation auprès
          de la CNIL (cnil.fr).
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Le site dépose des cookies strictement nécessaires à son fonctionnement (choix de langue,
          session de connexion, préférence de consentement). Avec votre accord uniquement, il
          utilise Google Analytics via Google Tag Manager pour mesurer l’audience du site. Vous
          pouvez accepter, refuser ou personnaliser ces cookies via le bandeau affiché à votre
          première visite, et modifier votre choix à tout moment en supprimant le cookie{" "}
          <code className="rounded bg-white px-1 py-0.5 text-[13px]">sillage_consent</code> de votre
          navigateur.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
