import type { AppLocale } from "@/lib/i18n/config";

/**
 * Textes des pages métier (Acheter, Vendre, Louer, L'agence), par langue.
 * Les sections partagées avec l'accueil (vendeur, acquéreur, méthode,
 * comparatif, espace client, appel final) gardent leurs textes dans
 * app/_home/copy.ts ; ici uniquement ce qui est propre à ces pages.
 */

type Hero = { eyebrow: string; title: string; subtitle: string; imageAlt: string };
type Step = { title: string; body: string };

export type BuyPageCopy = {
  seo: { title: string; description: string };
  hero: Hero;
  ctaSearch: string;
  ctaCatalog: string;
  manifesto: { title: string; paragraphs: string[] };
  steps: { eyebrow: string; title: string; items: Step[] };
  latest: { eyebrow: string; title: string; subtitle: string; cta: string };
};

export type SellPageCopy = {
  seo: { title: string; description: string };
  hero: Hero;
  ctaEstimate: string;
  ctaMethod: string;
  manifesto: { title: string; paragraphs: string[] };
  fees: { eyebrow: string; title: string; body: string; cta: string };
};

export type RentPageCopy = {
  seo: { title: string; description: string };
  hero: Hero;
  ctaCatalog: string;
  ctaOwner: string;
  owner: { eyebrow: string; title: string; body: string; points: string[]; feesNote: string; cta: string };
  tenant: { eyebrow: string; title: string; body: string; points: string[]; cta: string; ctaAlert: string };
  latest: { eyebrow: string; title: string; subtitle: string; cta: string };
};

export type AgencyPageCopy = {
  seo: { title: string; description: string };
  hero: Hero;
  ctaCall: string;
  ctaEmail: string;
  story: { eyebrow: string; title: string; paragraphs: string[]; promise: string };
  values: { eyebrow: string; title: string; items: Step[] };
  team: { eyebrow: string; title: string; intro: string; alsoLabel: string };
  visit: {
    eyebrow: string;
    title: string;
    body: string;
    addressLabel: string;
    phoneLabel: string;
    emailLabel: string;
    mapTitle: string;
    directions: string;
  };
};

export type PagesCopy = {
  buy: BuyPageCopy;
  sell: SellPageCopy;
  rent: RentPageCopy;
  agency: AgencyPageCopy;
};

const fr: PagesCopy = {
  buy: {
    seo: {
      title: "Acheter à Nice — Recherche accompagnée, alertes et conseiller dédié | Sillage Immo",
      description:
        "Achetez à Nice avec une recherche dessinée à la main, des alertes en temps réel et un conseiller qui cherche aussi hors de notre catalogue. Visites utiles, offre sécurisée.",
    },
    hero: {
      eyebrow: "Acheter à Nice",
      title: "Acheter à Nice sans subir le marché",
      subtitle:
        "Une recherche dessinée à la main sur la carte, des alertes dès qu'un bien correspond, et un conseiller qui cherche aussi en dehors de notre catalogue.",
      imageAlt: "Vue aérienne de la baie des Anges et de la Promenade des Anglais à Nice",
    },
    ctaSearch: "Créer ma recherche",
    ctaCatalog: "Voir les biens en vente",
    manifesto: {
      title: "Ce qu'un acquéreur attend vraiment",
      paragraphs: [
        "À Nice, les bons biens partent en quelques jours, souvent avant même d'être publiés. Attendre les annonces, c'est arriver après les autres. Ce dont vous avez besoin, ce n'est pas d'une alerte de plus : c'est de quelqu'un qui connaît les rues, qui rappelle, et qui vous dit franchement si un bien vaut le déplacement.",
        "Chez Sillage, votre recherche est prise en charge par un conseiller identifié. Il l'active dans nos outils métier et dans notre réseau d'agences partenaires de la Côte d'Azur, filtre les visites inutiles et vous accompagne jusqu'à l'offre, la négociation et la signature, avec la compétence d'un juriste sur chaque document.",
      ],
    },
    steps: {
      eyebrow: "Comment ça se passe",
      title: "Quatre étapes, un interlocuteur",
      items: [
        { title: "Votre brief", body: "Zone dessinée, budget, critères, contraintes de calendrier : on formalise le projet en un échange." },
        { title: "La recherche", body: "Alertes automatiques sur notre catalogue, recherche active chez nos partenaires et hors marché." },
        { title: "Des visites utiles", body: "Nous ne vous faisons visiter que ce qui correspond. Chaque visite est préparée et débriefée." },
        { title: "L'offre et la signature", body: "Rédaction de l'offre, négociation, relecture des documents, suivi jusqu'à l'acte dans votre espace Sillage." },
      ],
    },
    latest: {
      eyebrow: "En ce moment",
      title: "Les derniers biens en vente",
      subtitle: "Une sélection à Nice et sur la Côte d'Azur. Le catalogue complet est mis à jour chaque jour.",
      cta: "Tout le catalogue",
    },
  },
  sell: {
    seo: {
      title: "Vendre à Nice — Estimation argumentée, mandat souple, acquéreurs qualifiés | Sillage Immo",
      description:
        "Vendez votre appartement ou votre maison à Nice avec une estimation argumentée, un mandat exclusif sans engagement, des acquéreurs qualifiés et un suivi en temps réel.",
    },
    hero: {
      eyebrow: "Vendre à Nice",
      title: "Vendre vite, au bon prix, sans perdre le contrôle",
      subtitle:
        "Estimation argumentée, mandat exclusif sans engagement, acquéreurs qualifiés et suivi de chaque étape dans votre espace Sillage.",
      imageAlt: "La Promenade des Anglais et la baie des Anges vues depuis la colline du Château à Nice",
    },
    ctaEstimate: "Estimer mon bien",
    ctaMethod: "Voir notre méthode",
    manifesto: {
      title: "Ce que vous ne devriez plus accepter",
      paragraphs: [
        "Un prix « à l'intuition », des photos prises au téléphone, des visites qui n'aboutissent pas et un conseiller qui ne rappelle pas : c'est ce que reprochent la plupart des vendeurs aux agences. Ce n'est pas une fatalité, c'est une question de méthode.",
        "Chez Sillage, chaque vente commence par une estimation que nous pouvons défendre devant un acquéreur, se poursuit avec une mise en valeur sérieuse et une qualification rigoureuse des candidats, et se termine par une négociation menée par un professionnel formé au droit. Entre les deux, vous savez toujours où en est votre vente.",
      ],
    },
    fees: {
      eyebrow: "Honoraires",
      title: "Des honoraires connus d'avance",
      body:
        "Notre barème est public, dégressif et affiché sur chaque annonce. Aucun frais avant la vente, aucune surprise à la signature.",
      cta: "Consulter le barème",
    },
  },
  rent: {
    seo: {
      title: "Louer à Nice — Gestion locative et locations | Sillage Immo",
      description:
        "Propriétaire : confiez votre bien à Sillage Immo pour la mise en location et la gestion. Locataire : découvrez nos appartements disponibles à Nice et créez une alerte.",
    },
    hero: {
      eyebrow: "Louer à Nice",
      title: "Louer, côté propriétaire comme côté locataire",
      subtitle:
        "Des locataires solides et un loyer sécurisé pour les propriétaires ; des biens vérifiés et une réponse rapide pour ceux qui cherchent.",
      imageAlt: "Ruelle animée du Vieux-Nice avec ses façades colorées et ses terrasses",
    },
    ctaCatalog: "Voir les locations",
    ctaOwner: "Confier mon bien",
    owner: {
      eyebrow: "Propriétaires",
      title: "Louer sans y passer vos soirées",
      body:
        "Fixer le bon loyer, sélectionner un dossier solide, rédiger un bail conforme, faire un état des lieux qui protège vraiment : chaque étape a des conséquences juridiques et financières. Nous les prenons en charge, avec la garantie financière et l'assurance qu'impose la loi.",
      points: [
        "Loyer fixé sur le marché réel et l'encadrement en vigueur",
        "Dossiers vérifiés, garanties étudiées, choix argumenté",
        "Bail, annexes et état des lieux conformes",
        "Gestion locative : encaissement, régularisations, suivi technique",
      ],
      feesNote: "Honoraires de location affichés sur chaque annonce, conformes au plafond légal.",
      cta: "Parler de mon bien",
    },
    tenant: {
      eyebrow: "Locataires",
      title: "Des biens vérifiés, une réponse rapide",
      body:
        "Chaque appartement que nous proposons a été visité et documenté par nos soins. Vous savez à quoi vous attendre avant de vous déplacer, et vous avez une réponse sur votre dossier sans relancer.",
      points: [
        "Annonces complètes : photos, surface, charges, DPE, quartier",
        "Dossier déposé une fois, réutilisé pour chaque candidature",
        "Réponse sous quelques jours, visite préparée",
      ],
      cta: "Voir les biens disponibles",
      ctaAlert: "Créer une alerte location",
    },
    latest: {
      eyebrow: "Disponibles",
      title: "Les dernières locations",
      subtitle: "Appartements disponibles à Nice. Le catalogue est mis à jour chaque jour.",
      cta: "Toutes les locations",
    },
  },
  agency: {
    seo: {
      title: "L'agence — Sillage Immo, boutique immobilière à Nice (Riquier, Port)",
      description:
        "Sillage Immo est une boutique immobilière indépendante installée rue Arson, à Nice. 30 ans de professionnalisme, la compétence d'un juriste, la modernité d'une startup.",
    },
    hero: {
      eyebrow: "L'agence",
      title: "Une boutique immobilière à Nice, pas une agence de plus",
      subtitle:
        "Trente ans de professionnalisme, la compétence d'un juriste et la modernité d'une startup, au service de chaque transaction.",
      imageAlt: "Le port de Nice et ses bateaux, vus depuis les hauteurs, à deux pas du quartier Riquier",
    },
    ctaCall: "Appeler l'agence",
    ctaEmail: "Écrire à Yoann",
    story: {
      eyebrow: "Pourquoi Sillage",
      title: "Née d'un constat simple",
      paragraphs: [
        "Demandez autour de vous ce que les gens reprochent aux agences immobilières. Les réponses sont toujours les mêmes : le conseiller ne rappelle pas, ne tient pas au courant, ou n'apporte rien de plus qu'une clé pour ouvrir la porte.",
        "Sillage est née de la volonté de donner plus à chaque client, à chaque transaction. Une structure à taille humaine, où la personne qui estime votre bien est celle qui le vend et celle qui vous rappelle ; où chaque document est relu avec un œil de juriste ; et où les outils servent à vous tenir informé, pas à vous remplacer un interlocuteur.",
      ],
      promise: "Trente ans de professionnalisme, la compétence d'un juriste, la modernité d'une startup.",
    },
    values: {
      eyebrow: "Ce que nous défendons",
      title: "Cinq idées de l'immobilier",
      items: [
        { title: "Boutique", body: "Peu de dossiers à la fois, un interlocuteur unique du premier appel à la signature." },
        { title: "Modernisme", body: "Estimation fondée sur les données, espace client, alertes, visite virtuelle : la technologie au service du suivi." },
        { title: "Compétence", body: "Une formation juridique et trente ans de transactions pour lire chaque situation, y compris les plus complexes." },
        { title: "Transparence", body: "Un barème public, un prix argumenté, un espace où vous voyez tout ce que nous faisons." },
        { title: "Efficacité", body: "Des ventes conclues en quelques semaines quand le prix et la préparation sont justes." },
      ],
    },
    team: {
      eyebrow: "L'équipe",
      title: "Des conseillers bien réels",
      intro: "Derrière chaque estimation, chaque recherche et chaque espace client, une personne identifiée, joignable et responsable de votre projet.",
      alsoLabel: "À vos côtés également",
    },
    visit: {
      eyebrow: "Nous rencontrer",
      title: "Rue Arson, à Riquier",
      body:
        "L'agence est installée dans le quartier Riquier, à quelques minutes à pied du port et de la place Garibaldi. On y vient pour une estimation, un café et une réponse franche.",
      addressLabel: "Adresse",
      phoneLabel: "Téléphone",
      emailLabel: "Email",
      mapTitle: "Sillage Immo, 35 rue Arson à Nice",
      directions: "Itinéraire",
    },
  },
};

const en: PagesCopy = {
  buy: {
    seo: {
      title: "Buy in Nice — Guided search, alerts and a dedicated advisor | Sillage Immo",
      description:
        "Buy in Nice with a hand-drawn search area, real-time alerts and an advisor who also looks beyond our own listings. Useful viewings, secure offer.",
    },
    hero: {
      eyebrow: "Buying in Nice",
      title: "Buy in Nice without being at the market's mercy",
      subtitle:
        "Draw your search area on the map, get alerted as soon as a property matches, and rely on an advisor who also searches outside our catalogue.",
      imageAlt: "Aerial view of the Baie des Anges and the Promenade des Anglais in Nice",
    },
    ctaSearch: "Create my search",
    ctaCatalog: "View properties for sale",
    manifesto: {
      title: "What a buyer really needs",
      paragraphs: [
        "In Nice, the best properties go within days, often before they are even published. Waiting for listings means arriving after everyone else. What you need is not one more alert: it is someone who knows the streets, who calls back, and who tells you frankly whether a property is worth the trip.",
        "At Sillage, your search is handled by a named advisor. They activate it in our professional tools and in our network of partner agencies on the Riviera, filter out pointless viewings and stay with you through the offer, the negotiation and the signing, reviewing every document with a lawyer's eye.",
      ],
    },
    steps: {
      eyebrow: "How it works",
      title: "Four steps, one point of contact",
      items: [
        { title: "Your brief", body: "Drawn area, budget, criteria, timing: we formalise the project in one conversation." },
        { title: "The search", body: "Automatic alerts on our catalogue, active search with our partners and off-market." },
        { title: "Useful viewings", body: "We only show you what matches. Every viewing is prepared and debriefed." },
        { title: "Offer and signing", body: "Drafting the offer, negotiating, reviewing documents, following through to completion in your Sillage space." },
      ],
    },
    latest: {
      eyebrow: "Right now",
      title: "Latest properties for sale",
      subtitle: "A selection in Nice and on the Riviera. The full catalogue is updated daily.",
      cta: "Full catalogue",
    },
  },
  sell: {
    seo: {
      title: "Sell in Nice — Reasoned valuation, flexible mandate, qualified buyers | Sillage Immo",
      description:
        "Sell your apartment or house in Nice with a reasoned valuation, an exclusive mandate without lock-in, qualified buyers and real-time follow-up.",
    },
    hero: {
      eyebrow: "Selling in Nice",
      title: "Sell fast, at the right price, without losing control",
      subtitle:
        "A reasoned valuation, an exclusive mandate without lock-in, qualified buyers and every step tracked in your Sillage space.",
      imageAlt: "The Promenade des Anglais and the Baie des Anges seen from Castle Hill in Nice",
    },
    ctaEstimate: "Value my property",
    ctaMethod: "See our method",
    manifesto: {
      title: "What you should no longer accept",
      paragraphs: [
        "A price set by gut feeling, photos taken on a phone, viewings that lead nowhere and an advisor who never calls back: that is what most sellers hold against agencies. It is not inevitable; it is a matter of method.",
        "At Sillage, every sale starts with a valuation we can defend in front of a buyer, continues with serious presentation and rigorous screening of candidates, and ends with a negotiation led by a legally trained professional. In between, you always know where your sale stands.",
      ],
    },
    fees: {
      eyebrow: "Fees",
      title: "Fees you know in advance",
      body: "Our scale is public, decreasing and shown on every listing. Nothing to pay before the sale, no surprise at signing.",
      cta: "See the fee scale",
    },
  },
  rent: {
    seo: {
      title: "Rent in Nice — Property management and rentals | Sillage Immo",
      description:
        "Owners: entrust your property to Sillage Immo for letting and management. Tenants: discover our available apartments in Nice and set up an alert.",
    },
    hero: {
      eyebrow: "Renting in Nice",
      title: "Renting, for owners and for tenants",
      subtitle:
        "Solid tenants and secured rent for owners; verified properties and quick answers for those searching.",
      imageAlt: "Lively lane in Old Nice with colourful facades and café terraces",
    },
    ctaCatalog: "View rentals",
    ctaOwner: "Entrust my property",
    owner: {
      eyebrow: "Owners",
      title: "Let your property without giving up your evenings",
      body:
        "Setting the right rent, selecting a solid file, drafting a compliant lease, doing an inventory that really protects you: each step has legal and financial consequences. We handle them, with the financial guarantee and insurance the law requires.",
      points: [
        "Rent set on the real market and current regulations",
        "Verified files, guarantees reviewed, reasoned choice",
        "Compliant lease, annexes and inventory",
        "Property management: collection, adjustments, maintenance follow-up",
      ],
      feesNote: "Letting fees shown on every listing, within the legal cap.",
      cta: "Talk about my property",
    },
    tenant: {
      eyebrow: "Tenants",
      title: "Verified properties, quick answers",
      body:
        "Every apartment we offer has been visited and documented by us. You know what to expect before travelling, and you get an answer on your file without chasing.",
      points: [
        "Complete listings: photos, area, charges, energy rating, neighbourhood",
        "File submitted once, reused for every application",
        "Answer within days, prepared viewing",
      ],
      cta: "View available properties",
      ctaAlert: "Create a rental alert",
    },
    latest: {
      eyebrow: "Available",
      title: "Latest rentals",
      subtitle: "Apartments available in Nice. The catalogue is updated daily.",
      cta: "All rentals",
    },
  },
  agency: {
    seo: {
      title: "The agency — Sillage Immo, boutique real estate in Nice (Riquier, Port)",
      description:
        "Sillage Immo is an independent boutique agency on rue Arson in Nice. Thirty years of professionalism, a lawyer's competence, a start-up's modernity.",
    },
    hero: {
      eyebrow: "The agency",
      title: "A boutique agency in Nice, not just another agency",
      subtitle: "Thirty years of professionalism, a lawyer's competence and a start-up's modernity, for every transaction.",
      imageAlt: "The port of Nice and its boats seen from above, a short walk from the Riquier district",
    },
    ctaCall: "Call the agency",
    ctaEmail: "Write to Yoann",
    story: {
      eyebrow: "Why Sillage",
      title: "Born from a simple observation",
      paragraphs: [
        "Ask around what people hold against estate agencies. The answers are always the same: the advisor does not call back, does not keep you informed, or brings nothing more than a key to open the door.",
        "Sillage was born from the will to give more to every client, on every transaction. A human-sized structure where the person who values your property is the one who sells it and the one who calls you back; where every document is read with a lawyer's eye; and where tools exist to keep you informed, not to replace your point of contact.",
      ],
      promise: "Thirty years of professionalism, a lawyer's competence, a start-up's modernity.",
    },
    values: {
      eyebrow: "What we stand for",
      title: "Five ideas about real estate",
      items: [
        { title: "Boutique", body: "Few files at a time, a single point of contact from the first call to the signing." },
        { title: "Modernity", body: "Data-based valuation, client space, alerts, virtual tours: technology in the service of follow-up." },
        { title: "Competence", body: "Legal training and thirty years of transactions to read every situation, including the complex ones." },
        { title: "Transparency", body: "A public fee scale, a reasoned price, a space where you see everything we do." },
        { title: "Efficiency", body: "Sales closed within weeks when price and preparation are right." },
      ],
    },
    team: {
      eyebrow: "The team",
      title: "Real advisors",
      intro: "Behind every valuation, every search and every client space, a named person who is reachable and accountable for your project.",
      alsoLabel: "Also by your side",
    },
    visit: {
      eyebrow: "Meet us",
      title: "Rue Arson, in Riquier",
      body:
        "The agency is in the Riquier district, a few minutes' walk from the port and Place Garibaldi. Come for a valuation, a coffee and a frank answer.",
      addressLabel: "Address",
      phoneLabel: "Phone",
      emailLabel: "Email",
      mapTitle: "Sillage Immo, 35 rue Arson, Nice",
      directions: "Directions",
    },
  },
};

const es: PagesCopy = {
  buy: {
    seo: {
      title: "Comprar en Niza — Búsqueda acompañada, alertas y asesor dedicado | Sillage Immo",
      description:
        "Compre en Niza con una zona de búsqueda dibujada a mano, alertas en tiempo real y un asesor que también busca fuera de nuestro catálogo.",
    },
    hero: {
      eyebrow: "Comprar en Niza",
      title: "Comprar en Niza sin sufrir el mercado",
      subtitle:
        "Dibuje su zona en el mapa, reciba una alerta en cuanto una propiedad coincida y cuente con un asesor que también busca fuera de nuestro catálogo.",
      imageAlt: "Vista aérea de la bahía de los Ángeles y del Paseo de los Ingleses en Niza",
    },
    ctaSearch: "Crear mi búsqueda",
    ctaCatalog: "Ver propiedades en venta",
    manifesto: {
      title: "Lo que un comprador necesita de verdad",
      paragraphs: [
        "En Niza, las mejores propiedades se venden en pocos días, a menudo antes de publicarse. Esperar los anuncios es llegar después de los demás. Lo que necesita no es una alerta más: es alguien que conozca las calles, que devuelva las llamadas y que le diga con franqueza si una propiedad merece el desplazamiento.",
        "En Sillage, su búsqueda la lleva un asesor identificado. La activa en nuestras herramientas profesionales y en nuestra red de agencias asociadas de la Costa Azul, filtra las visitas inútiles y le acompaña hasta la oferta, la negociación y la firma, revisando cada documento con ojo de jurista.",
      ],
    },
    steps: {
      eyebrow: "Cómo funciona",
      title: "Cuatro etapas, un interlocutor",
      items: [
        { title: "Su brief", body: "Zona dibujada, presupuesto, criterios, calendario: formalizamos el proyecto en una conversación." },
        { title: "La búsqueda", body: "Alertas automáticas en nuestro catálogo, búsqueda activa con nuestros socios y fuera de mercado." },
        { title: "Visitas útiles", body: "Solo le mostramos lo que coincide. Cada visita se prepara y se comenta después." },
        { title: "Oferta y firma", body: "Redacción de la oferta, negociación, revisión de documentos y seguimiento hasta la escritura en su espacio Sillage." },
      ],
    },
    latest: {
      eyebrow: "Ahora mismo",
      title: "Las últimas propiedades en venta",
      subtitle: "Una selección en Niza y la Costa Azul. El catálogo completo se actualiza a diario.",
      cta: "Todo el catálogo",
    },
  },
  sell: {
    seo: {
      title: "Vender en Niza — Valoración argumentada, mandato flexible, compradores cualificados | Sillage Immo",
      description:
        "Venda su piso o su casa en Niza con una valoración argumentada, un mandato exclusivo sin permanencia, compradores cualificados y seguimiento en tiempo real.",
    },
    hero: {
      eyebrow: "Vender en Niza",
      title: "Vender rápido, al precio justo, sin perder el control",
      subtitle:
        "Valoración argumentada, mandato exclusivo sin permanencia, compradores cualificados y cada etapa visible en su espacio Sillage.",
      imageAlt: "El Paseo de los Ingleses y la bahía de los Ángeles vistos desde la colina del Castillo en Niza",
    },
    ctaEstimate: "Valorar mi propiedad",
    ctaMethod: "Ver nuestro método",
    manifesto: {
      title: "Lo que ya no debería aceptar",
      paragraphs: [
        "Un precio « a ojo », fotos hechas con el móvil, visitas que no llevan a nada y un asesor que no devuelve las llamadas: eso es lo que la mayoría de los vendedores reprocha a las agencias. No es una fatalidad, es una cuestión de método.",
        "En Sillage, cada venta empieza con una valoración que podemos defender ante un comprador, continúa con una presentación seria y una selección rigurosa de candidatos, y termina con una negociación dirigida por un profesional con formación jurídica. Entre medias, siempre sabe en qué punto está su venta.",
      ],
    },
    fees: {
      eyebrow: "Honorarios",
      title: "Honorarios conocidos de antemano",
      body: "Nuestro baremo es público, decreciente y aparece en cada anuncio. Nada que pagar antes de la venta, ninguna sorpresa en la firma.",
      cta: "Consultar el baremo",
    },
  },
  rent: {
    seo: {
      title: "Alquilar en Niza — Gestión de alquileres y pisos disponibles | Sillage Immo",
      description:
        "Propietarios: confíe su vivienda a Sillage Immo para el alquiler y la gestión. Inquilinos: descubra nuestros pisos disponibles en Niza y cree una alerta.",
    },
    hero: {
      eyebrow: "Alquilar en Niza",
      title: "Alquilar, para propietarios y para inquilinos",
      subtitle:
        "Inquilinos solventes y renta asegurada para los propietarios; viviendas verificadas y respuesta rápida para quienes buscan.",
      imageAlt: "Callejuela animada del casco antiguo de Niza con fachadas de colores y terrazas",
    },
    ctaCatalog: "Ver alquileres",
    ctaOwner: "Confiar mi vivienda",
    owner: {
      eyebrow: "Propietarios",
      title: "Alquilar sin dedicarle sus noches",
      body:
        "Fijar la renta correcta, seleccionar un expediente sólido, redactar un contrato conforme, hacer un inventario que proteja de verdad: cada etapa tiene consecuencias jurídicas y financieras. Nos ocupamos de ellas, con la garantía financiera y el seguro que exige la ley.",
      points: [
        "Renta fijada según el mercado real y la normativa vigente",
        "Expedientes verificados, garantías estudiadas, elección argumentada",
        "Contrato, anexos e inventario conformes",
        "Gestión del alquiler: cobro, regularizaciones, seguimiento técnico",
      ],
      feesNote: "Honorarios de alquiler indicados en cada anuncio, dentro del límite legal.",
      cta: "Hablar de mi vivienda",
    },
    tenant: {
      eyebrow: "Inquilinos",
      title: "Viviendas verificadas, respuesta rápida",
      body:
        "Cada piso que proponemos ha sido visitado y documentado por nosotros. Sabe qué esperar antes de desplazarse y recibe respuesta sobre su expediente sin tener que insistir.",
      points: [
        "Anuncios completos: fotos, superficie, gastos, certificado energético, barrio",
        "Expediente presentado una vez, reutilizado en cada candidatura",
        "Respuesta en pocos días, visita preparada",
      ],
      cta: "Ver viviendas disponibles",
      ctaAlert: "Crear una alerta de alquiler",
    },
    latest: {
      eyebrow: "Disponibles",
      title: "Los últimos alquileres",
      subtitle: "Pisos disponibles en Niza. El catálogo se actualiza a diario.",
      cta: "Todos los alquileres",
    },
  },
  agency: {
    seo: {
      title: "La agencia — Sillage Immo, boutique inmobiliaria en Niza (Riquier, Puerto)",
      description:
        "Sillage Immo es una boutique inmobiliaria independiente en la rue Arson, en Niza. Treinta años de profesionalidad, la competencia de un jurista, la modernidad de una startup.",
    },
    hero: {
      eyebrow: "La agencia",
      title: "Una boutique inmobiliaria en Niza, no una agencia más",
      subtitle: "Treinta años de profesionalidad, la competencia de un jurista y la modernidad de una startup, en cada transacción.",
      imageAlt: "El puerto de Niza y sus barcos vistos desde las alturas, a dos pasos del barrio de Riquier",
    },
    ctaCall: "Llamar a la agencia",
    ctaEmail: "Escribir a Yoann",
    story: {
      eyebrow: "Por qué Sillage",
      title: "Nacida de una constatación sencilla",
      paragraphs: [
        "Pregunte a su alrededor qué se reprocha a las agencias inmobiliarias. Las respuestas son siempre las mismas: el asesor no devuelve las llamadas, no informa, o no aporta más que una llave para abrir la puerta.",
        "Sillage nació de la voluntad de dar más a cada cliente, en cada transacción. Una estructura a escala humana, donde quien valora su vivienda es quien la vende y quien le llama; donde cada documento se revisa con ojo de jurista; y donde las herramientas sirven para mantenerle informado, no para sustituir a su interlocutor.",
      ],
      promise: "Treinta años de profesionalidad, la competencia de un jurista, la modernidad de una startup.",
    },
    values: {
      eyebrow: "Lo que defendemos",
      title: "Cinco ideas sobre el sector inmobiliario",
      items: [
        { title: "Boutique", body: "Pocos expedientes a la vez, un interlocutor único desde la primera llamada hasta la firma." },
        { title: "Modernidad", body: "Valoración basada en datos, espacio cliente, alertas, visita virtual: la tecnología al servicio del seguimiento." },
        { title: "Competencia", body: "Formación jurídica y treinta años de transacciones para leer cada situación, incluidas las más complejas." },
        { title: "Transparencia", body: "Un baremo público, un precio argumentado, un espacio donde ve todo lo que hacemos." },
        { title: "Eficacia", body: "Ventas cerradas en pocas semanas cuando el precio y la preparación son los correctos." },
      ],
    },
    team: {
      eyebrow: "El equipo",
      title: "Asesores de carne y hueso",
      intro: "Detrás de cada valoración, cada búsqueda y cada espacio cliente, una persona identificada, localizable y responsable de su proyecto.",
      alsoLabel: "También a su lado",
    },
    visit: {
      eyebrow: "Conocernos",
      title: "Rue Arson, en Riquier",
      body:
        "La agencia está en el barrio de Riquier, a pocos minutos a pie del puerto y de la plaza Garibaldi. Se viene por una valoración, un café y una respuesta franca.",
      addressLabel: "Dirección",
      phoneLabel: "Teléfono",
      emailLabel: "Email",
      mapTitle: "Sillage Immo, 35 rue Arson, Niza",
      directions: "Cómo llegar",
    },
  },
};

const ru: PagesCopy = {
  buy: {
    seo: {
      title: "Купить в Ницце — сопровождаемый подбор, уведомления и личный консультант | Sillage Immo",
      description:
        "Покупка в Ницце: зона поиска, нарисованная на карте, уведомления в реальном времени и консультант, который ищет и за пределами нашего каталога.",
    },
    hero: {
      eyebrow: "Купить в Ницце",
      title: "Купить в Ницце, не подчиняясь рынку",
      subtitle:
        "Нарисуйте зону поиска на карте, получайте уведомления, как только объект подходит, и положитесь на консультанта, который ищет и вне нашего каталога.",
      imageAlt: "Вид с высоты на бухту Ангелов и Английскую набережную в Ницце",
    },
    ctaSearch: "Создать поиск",
    ctaCatalog: "Объекты в продаже",
    manifesto: {
      title: "Что на самом деле нужно покупателю",
      paragraphs: [
        "В Ницце лучшие объекты уходят за несколько дней, часто ещё до публикации. Ждать объявлений — значит приходить после всех. Вам нужно не ещё одно уведомление, а человек, который знает улицы, перезванивает и честно говорит, стоит ли объект поездки.",
        "В Sillage вашим поиском занимается конкретный консультант. Он подключает профессиональные базы и сеть агентств-партнёров на Лазурном Берегу, отсеивает бесполезные просмотры и сопровождает вас до предложения, переговоров и подписания, проверяя каждый документ взглядом юриста.",
      ],
    },
    steps: {
      eyebrow: "Как это происходит",
      title: "Четыре шага, один контакт",
      items: [
        { title: "Ваш бриф", body: "Зона на карте, бюджет, критерии, сроки: формализуем проект за один разговор." },
        { title: "Поиск", body: "Автоматические уведомления по каталогу, активный поиск у партнёров и вне рынка." },
        { title: "Полезные просмотры", body: "Показываем только то, что подходит. Каждый просмотр подготовлен и обсуждён после." },
        { title: "Предложение и сделка", body: "Составление предложения, переговоры, проверка документов, сопровождение до акта в вашем кабинете Sillage." },
      ],
    },
    latest: {
      eyebrow: "Сейчас",
      title: "Последние объекты в продаже",
      subtitle: "Подборка в Ницце и на Лазурном Берегу. Полный каталог обновляется ежедневно.",
      cta: "Весь каталог",
    },
  },
  sell: {
    seo: {
      title: "Продать в Ницце — обоснованная оценка, гибкий договор, проверенные покупатели | Sillage Immo",
      description:
        "Продайте квартиру или дом в Ницце с обоснованной оценкой, эксклюзивным договором без обязательств, проверенными покупателями и контролем каждого этапа.",
    },
    hero: {
      eyebrow: "Продать в Ницце",
      title: "Продать быстро, по правильной цене, не теряя контроль",
      subtitle:
        "Обоснованная оценка, эксклюзивный договор без обязательств, проверенные покупатели и каждый этап в вашем кабинете Sillage.",
      imageAlt: "Английская набережная и бухта Ангелов с Замковой горы в Ницце",
    },
    ctaEstimate: "Оценить мою недвижимость",
    ctaMethod: "Наш метод",
    manifesto: {
      title: "С чем больше не стоит мириться",
      paragraphs: [
        "Цена «на глаз», фотографии с телефона, просмотры без результата и консультант, который не перезванивает: именно это большинство продавцов ставят в упрёк агентствам. Это не неизбежность, а вопрос метода.",
        "В Sillage каждая продажа начинается с оценки, которую мы можем отстоять перед покупателем, продолжается серьёзной подготовкой объекта и строгим отбором кандидатов и завершается переговорами, которые ведёт профессионал с юридическим образованием. И на каждом этапе вы знаете, где находится ваша сделка.",
      ],
    },
    fees: {
      eyebrow: "Комиссия",
      title: "Комиссия известна заранее",
      body: "Наши тарифы публичны, регрессивны и указаны в каждом объявлении. Ничего до продажи, никаких сюрпризов при подписании.",
      cta: "Посмотреть тарифы",
    },
  },
  rent: {
    seo: {
      title: "Аренда в Ницце — управление недвижимостью и аренда | Sillage Immo",
      description:
        "Собственникам: доверьте Sillage Immo сдачу и управление вашей недвижимостью. Арендаторам: смотрите доступные квартиры в Ницце и создайте уведомление.",
    },
    hero: {
      eyebrow: "Аренда в Ницце",
      title: "Аренда для собственников и для арендаторов",
      subtitle:
        "Надёжные арендаторы и гарантированная плата для собственников; проверенные объекты и быстрый ответ для тех, кто ищет.",
      imageAlt: "Оживлённая улочка Старой Ниццы с цветными фасадами и террасами",
    },
    ctaCatalog: "Смотреть аренду",
    ctaOwner: "Доверить объект",
    owner: {
      eyebrow: "Собственникам",
      title: "Сдавать, не тратя на это вечера",
      body:
        "Установить правильную плату, выбрать надёжное досье, составить корректный договор, сделать опись, которая действительно защищает: у каждого шага есть юридические и финансовые последствия. Мы берём их на себя, с финансовой гарантией и страховкой, которых требует закон.",
      points: [
        "Плата по реальному рынку и действующим правилам",
        "Проверенные досье, изученные гарантии, обоснованный выбор",
        "Договор, приложения и опись в соответствии с законом",
        "Управление: сбор платежей, перерасчёты, технический контроль",
      ],
      feesNote: "Комиссия за аренду указана в каждом объявлении, в пределах законного максимума.",
      cta: "Обсудить мой объект",
    },
    tenant: {
      eyebrow: "Арендаторам",
      title: "Проверенные объекты, быстрый ответ",
      body:
        "Каждую квартиру мы осмотрели и задокументировали сами. Вы знаете, чего ожидать, до поездки, и получаете ответ по досье без напоминаний.",
      points: [
        "Полные объявления: фото, площадь, расходы, энергокласс, район",
        "Досье подаётся один раз и используется для каждой заявки",
        "Ответ в течение нескольких дней, подготовленный просмотр",
      ],
      cta: "Доступные объекты",
      ctaAlert: "Создать уведомление об аренде",
    },
    latest: {
      eyebrow: "Доступно",
      title: "Последние предложения аренды",
      subtitle: "Квартиры в Ницце. Каталог обновляется ежедневно.",
      cta: "Вся аренда",
    },
  },
  agency: {
    seo: {
      title: "Агентство — Sillage Immo, бутик-агентство недвижимости в Ницце (Рикье, Порт)",
      description:
        "Sillage Immo — независимое бутик-агентство на улице Арсон в Ницце. Тридцать лет профессионализма, компетенция юриста, современность стартапа.",
    },
    hero: {
      eyebrow: "Агентство",
      title: "Бутик-агентство в Ницце, а не ещё одно агентство",
      subtitle: "Тридцать лет профессионализма, компетенция юриста и современность стартапа — в каждой сделке.",
      imageAlt: "Порт Ниццы с лодками, вид сверху, в двух шагах от района Рикье",
    },
    ctaCall: "Позвонить в агентство",
    ctaEmail: "Написать Йоанну",
    story: {
      eyebrow: "Почему Sillage",
      title: "Родилось из простого наблюдения",
      paragraphs: [
        "Спросите знакомых, что они ставят в упрёк агентствам недвижимости. Ответы всегда одни и те же: консультант не перезванивает, не держит в курсе или приносит лишь ключ, чтобы открыть дверь.",
        "Sillage родилось из желания давать клиенту больше в каждой сделке. Небольшая структура, где тот, кто оценивает вашу недвижимость, — тот, кто её продаёт и кто вам перезванивает; где каждый документ читается взглядом юриста; и где инструменты нужны, чтобы держать вас в курсе, а не заменять собеседника.",
      ],
      promise: "Тридцать лет профессионализма, компетенция юриста, современность стартапа.",
    },
    values: {
      eyebrow: "Наши принципы",
      title: "Пять идей о недвижимости",
      items: [
        { title: "Бутик", body: "Немного дел одновременно, один контакт от первого звонка до подписания." },
        { title: "Современность", body: "Оценка на основе данных, личный кабинет, уведомления, виртуальный тур: технологии на службе сопровождения." },
        { title: "Компетенция", body: "Юридическое образование и тридцать лет сделок, чтобы понимать любую ситуацию, даже самую сложную." },
        { title: "Прозрачность", body: "Публичные тарифы, обоснованная цена, кабинет, где видно всё, что мы делаем." },
        { title: "Эффективность", body: "Продажи за несколько недель, когда цена и подготовка верны." },
      ],
    },
    team: {
      eyebrow: "Команда",
      title: "Настоящие консультанты",
      intro: "За каждой оценкой, каждым поиском и каждым кабинетом — конкретный человек, доступный и отвечающий за ваш проект.",
      alsoLabel: "Также рядом с вами",
    },
    visit: {
      eyebrow: "Встретиться с нами",
      title: "Улица Арсон, район Рикье",
      body:
        "Агентство находится в районе Рикье, в нескольких минутах ходьбы от порта и площади Гарибальди. Сюда приходят за оценкой, чашкой кофе и честным ответом.",
      addressLabel: "Адрес",
      phoneLabel: "Телефон",
      emailLabel: "Email",
      mapTitle: "Sillage Immo, 35 rue Arson, Ницца",
      directions: "Маршрут",
    },
  },
};

export const PAGES_COPY: Record<AppLocale, PagesCopy> = { fr, en, es, ru };
