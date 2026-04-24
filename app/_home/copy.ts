import type { AppLocale } from "@/lib/i18n/config";

export type SocialProofItem = { figure: string; label: string };

export type CardContent = { title: string; body: string };

export type BenefitContent = { title: string; body: string };

export type MethodStep = { title: string; body: string };

export type NeighborhoodContent = { name: string; body: string };

export type HomeCopy = {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    tagline: string;
    microcopy: string;
    imageAlt: string;
  };
  socialProof: {
    items: SocialProofItem[];
    bridge: string;
  };
  assistant: {
    eyebrow: string;
    title: string;
    body: string;
    microcopy: string;
  };
  positioning: {
    eyebrow: string;
    title: string;
    intro: string;
    cards: [CardContent, CardContent, CardContent];
    ctaLabel: string;
  };
  seller: {
    eyebrow: string;
    title: string;
    subtitle: string;
    exclusiveMandate: string;
    benefits: BenefitContent[];
  };
  buyer: {
    eyebrow: string;
    title: string;
    subtitle: string;
    benefits: BenefitContent[];
    mapCaption: string;
  };
  clientSpace: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cards: [CardContent, CardContent, CardContent];
    primaryLabel: string;
    secondaryLabel: string;
  };
  method: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: MethodStep[];
    ctaLabel: string;
  };
  comparison: {
    eyebrow: string;
    title: string;
    aloneTitle: string;
    alonePoints: string[];
    sillageTitle: string;
    sillagePoints: string[];
    ctaLabel: string;
  };
  catalog: {
    eyebrow: string;
    title: string;
    subtitle: string;
    salesTitle: string;
    salesBody: string;
    salesCta: string;
    rentalsTitle: string;
    rentalsBody: string;
    rentalsCta: string;
    microcopy: string;
    alertCta: string;
  };
  neighborhoods: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: NeighborhoodContent[];
    ctaLabel: string;
  };
  international: {
    eyebrow: string;
    title: string;
    subtitle: string;
    benefits: BenefitContent[];
    ctaLabel: string;
  };
  team: {
    eyebrow: string;
    title: string;
    intro: string;
    bookLabel: string;
    callLabel: string;
    portraitComingSoon: string;
  };
  finalCta: {
    title: string;
    body: string;
    microcopy: string;
  };
  ctaGlobal: {
    estimate: string;
    search: string;
    viewSales: string;
    viewRentals: string;
    callAdvisor: string;
    callSillage: string;
    bookAppointment: string;
    email: string;
    methodAnchor: string;
    clientSpace: string;
    requestInvitation: string;
    sellWithSillage: string;
    launchEstimation: string;
    discoverValue: string;
    createAlert: string;
    talkAboutNeighborhood: string;
  };
};

const PHONE_ARIA_FR = "Appeler Sillage Immo au +33 4 23 45 04 85";
const PHONE_ARIA_EN = "Call Sillage Immo at +33 4 23 45 04 85";
const PHONE_ARIA_ES = "Llamar a Sillage Immo al +33 4 23 45 04 85";
const PHONE_ARIA_RU = "Позвонить Sillage Immo по номеру +33 4 23 45 04 85";

const fr: HomeCopy = {
  hero: {
    eyebrow: "Agence immobilière premium à Nice et sur la Côte d'Azur",
    title: "L'immobilier à Nice, piloté par la data et l'humain",
    subtitle:
      "Vente, achat, location : Sillage Immo associe expertise locale, accompagnement sur-mesure et outils intelligents pour vous offrir une expérience immobilière plus claire, plus fluide et plus efficace.",
    tagline:
      "Une boutique immobilière premium à Nice et sur la Côte d'Azur, avec un interlocuteur unique et un espace client pour suivre chaque étape de votre projet.",
    microcopy:
      "Estimation, recherche, visite virtuelle, alertes et suivi client : tout est centralisé dans une expérience simple et sécurisée.",
    imageAlt: "Vue sur Nice et la baie des Anges depuis un appartement premium",
  },
  socialProof: {
    items: [
      { figure: "4,9/5", label: "avis Google" },
      { figure: "350+", label: "vendeurs accompagnés" },
      { figure: "10+ ans", label: "d'expérience locale" },
      { figure: "7j/7", label: "conseil et suivi digital" },
    ],
    bridge:
      "Une expertise locale renforcée par des outils conçus pour mieux vendre, mieux acheter et mieux suivre chaque projet.",
  },
  assistant: {
    eyebrow: "Assistant Sillage",
    title: "Décrivez votre projet, Sillage vous guide",
    body: "Vous voulez vendre, acheter, louer ou comprendre le marché local ? Notre assistant vous oriente vers le bon parcours en quelques secondes, avec la possibilité de parler à un conseiller à tout moment.",
    microcopy: "Choisissez votre intention : vendre, acheter ou comprendre le marché.",
  },
  positioning: {
    eyebrow: "Notre approche",
    title: "Une agence boutique, une plateforme intelligente",
    intro:
      "Sillage Immo n'est pas une agence immobilière classique. Nous combinons la proximité d'une structure indépendante, l'exigence d'un accompagnement premium et la puissance d'outils digitaux conçus pour simplifier chaque étape.",
    cards: [
      {
        title: "Un interlocuteur unique",
        body: "Un conseiller identifié vous accompagne du premier échange jusqu'à la signature, avec un vrai interlocuteur à vos côtés.",
      },
      {
        title: "Des outils vraiment utiles",
        body: "Estimation fondée sur les données, alertes, recherche dessinée, visite virtuelle et espace client : la technologie sert votre projet, sans le compliquer.",
      },
      {
        title: "Une approche locale et premium",
        body: "Nice, Mont Boron, Cimiez, Carré d'Or, Le Port, Libération, Wilson : nous adaptons la stratégie à chaque quartier et à chaque typologie de bien.",
      },
    ],
    ctaLabel: "Découvrir notre méthode",
  },
  seller: {
    eyebrow: "Vous vendez",
    title: "Vendre avec une stratégie claire, pas avec une simple annonce",
    subtitle:
      "Une bonne vente ne commence pas par une publication. Elle commence par une estimation argumentée, un prix défendable, une mise en valeur sérieuse et une qualification rigoureuse des acquéreurs.",
    exclusiveMandate:
      "Mandat exclusif, sans engagement : nous nous engageons sur le service, vous gardez votre liberté. Un cadre plus souple, plus lisible et plus transparent.",
    benefits: [
      {
        title: "Estimation fiable et argumentée",
        body: "Votre bien est analysé avec les données du marché, ses caractéristiques réelles, son emplacement et le contexte de vente.",
      },
      {
        title: "Mise en valeur premium",
        body: "Photos soignées, présentation claire, visite virtuelle Matterport lorsque c'est pertinent, et annonce pensée pour déclencher des visites qualifiées.",
      },
      {
        title: "Suivi transparent",
        body: "Avancement, documents, prochaines étapes : tout reste centralisé dans votre espace Sillage.",
      },
      {
        title: "Acheteurs mieux qualifiés",
        body: "Nous privilégions les visites utiles, avec des acquéreurs dont le projet, le budget et la motivation sont réellement cohérents.",
      },
    ],
  },
  buyer: {
    eyebrow: "Vous cherchez",
    title: "Votre recherche immobilière, exactement comme vous la dessinez",
    subtitle:
      "Dessinez votre zone, indiquez vos critères et recevez des alertes ciblées. Votre recherche peut aussi être suivie par un conseiller Sillage, qui l'active dans nos outils métier et notre réseau professionnel Côte d'Azur pour aller au-delà de notre propre catalogue.",
    benefits: [
      {
        title: "Dessinez votre zone",
        body: "Tracez précisément les rues, quartiers ou secteurs qui vous intéressent.",
      },
      {
        title: "Recherche activée par un conseiller",
        body: "Votre projet ne reste pas une simple alerte : un conseiller peut l'analyser, l'affiner avec vous et rechercher des opportunités dans nos bases métier partenaires.",
      },
      {
        title: "Recevez des alertes instantanées",
        body: "Dès qu'un bien correspond à votre recherche, vous êtes informé sans perdre de temps.",
      },
      {
        title: "Suivez vos biens dans votre espace",
        body: "Retrouvez vos recherches, vos biens matchés, les nouveautés et les informations importantes dans un espace unique.",
      },
    ],
    mapCaption: "Votre zone de recherche, dessinée à la main sur la carte de Nice.",
  },
  clientSpace: {
    eyebrow: "Espace client Sillage",
    title: "Votre espace Sillage : un seul lien, zéro mot de passe",
    subtitle:
      "Vendeur ou acquéreur, vous accédez à votre projet par magic link sécurisé. Pas de mot de passe à retenir, pas d'échanges dispersés, pas d'information perdue.",
    cards: [
      {
        title: "Pour les vendeurs",
        body: "Suivez l'état de commercialisation, les étapes clés, les documents et les rendez-vous liés à votre bien.",
      },
      {
        title: "Pour les acquéreurs",
        body: "Retrouvez vos recherches, vos zones dessinées, vos critères, vos biens matchés et les nouveautés.",
      },
      {
        title: "Pour tous",
        body: "Un accès simple, sécurisé et fluide, conçu pour réduire les relances et rendre votre projet plus lisible.",
      },
    ],
    primaryLabel: "Accéder à mon espace",
    secondaryLabel: "Demander une invitation",
  },
  method: {
    eyebrow: "Notre méthode",
    title: "Une méthode structurée pour vendre mieux",
    subtitle:
      "Chaque bien mérite une stratégie. Nous combinons expertise locale, data, mise en valeur et suivi humain pour sécuriser les décisions.",
    steps: [
      {
        title: "Estimation",
        body: "Comprendre la valeur réelle du bien, son marché et son potentiel.",
      },
      {
        title: "Stratégie",
        body: "Définir le bon prix, le bon angle de présentation et le bon calendrier.",
      },
      {
        title: "Mise en valeur",
        body: "Préparer une présentation premium : photos, descriptif, supports digitaux, visite virtuelle si adaptée.",
      },
      {
        title: "Diffusion",
        body: "Activer les bons canaux et la bonne audience, sans banaliser le bien.",
      },
      {
        title: "Qualification",
        body: "Filtrer les demandes, prioriser les acquéreurs solides et limiter les visites inutiles.",
      },
      {
        title: "Signature",
        body: "Accompagner la négociation, les documents, les délais et la sécurisation de la vente.",
      },
    ],
    ctaLabel: "Lancer mon estimation",
  },
  comparison: {
    eyebrow: "Comparatif",
    title: "Vendre seul ou vendre avec une stratégie ?",
    aloneTitle: "Vendre seul",
    alonePoints: [
      "Prix souvent fixé par intuition",
      "Photos et annonce difficiles à optimiser",
      "Visites nombreuses mais peu qualifiées",
      "Négociation directe avec les acheteurs",
      "Suivi dispersé",
      "Risque de sous-évaluer ou de surexposer le bien",
    ],
    sillageTitle: "Avec Sillage Immo",
    sillagePoints: [
      "Estimation argumentée et défendable",
      "Mise en valeur premium",
      "Diffusion structurée",
      "Acquéreurs qualifiés",
      "Suivi dans votre espace client",
      "Conseiller unique jusqu'à la signature",
    ],
    ctaLabel: "Vendre avec Sillage",
  },
  catalog: {
    eyebrow: "Biens disponibles",
    title: "Découvrez les biens disponibles",
    subtitle:
      "Biens en vente, biens en location, opportunités à Nice et sur la Côte d'Azur : explorez notre sélection et créez une recherche sauvegardée si vous souhaitez être alerté.",
    salesTitle: "Biens en vente",
    salesBody:
      "Appartements, maisons, résidences principales, pied-à-terre et investissements.",
    salesCta: "Voir les ventes",
    rentalsTitle: "Biens en location",
    rentalsBody: "Découvrez les biens disponibles à la location et les opportunités du moment.",
    rentalsCta: "Voir les locations",
    microcopy:
      "Vous ne trouvez pas encore le bon bien ? Créez votre recherche et recevez les prochaines opportunités.",
    alertCta: "Créer une alerte",
  },
  neighborhoods: {
    eyebrow: "Nos quartiers",
    title: "Nos quartiers, notre territoire",
    subtitle:
      "À Nice, quelques rues peuvent changer la valeur, la demande et le profil des acquéreurs. Notre rôle est de lire ces nuances et d'adapter la stratégie.",
    items: [
      {
        name: "Carré d'Or",
        body: "Adresse centrale, forte liquidité, clientèle locale et internationale.",
      },
      {
        name: "Mont Boron",
        body: "Vue, rareté, prestige et biens familiaux haut de gamme.",
      },
      {
        name: "Cimiez",
        body: "Résidentiel, patrimonial, recherché pour sa qualité de vie.",
      },
      {
        name: "Le Port",
        body: "Quartier vivant, tendance, attractif pour actifs et investisseurs.",
      },
      {
        name: "Wilson",
        body: "Centralité, charme urbain et forte demande locative.",
      },
      {
        name: "Libération",
        body: "Vie de quartier, marché, tramway et attractivité familiale.",
      },
      {
        name: "Cap de Nice",
        body: "Pieds dans l'eau, villas confidentielles et panoramas rares.",
      },
      {
        name: "Fabron",
        body: "Collines résidentielles, verdure et prestations familiales.",
      },
      {
        name: "Gairaut",
        body: "Hauteurs de Nice, villas avec vue et environnement préservé.",
      },
      {
        name: "Promenade des Anglais",
        body: "Façade mer emblématique, valeurs refuges et demande internationale.",
      },
    ],
    ctaLabel: "Parler de mon quartier",
  },
  international: {
    eyebrow: "International",
    title: "Une expérience pensée pour les clients internationaux",
    subtitle:
      "Nice et la Côte d'Azur attirent une clientèle française, européenne et internationale. Sillage Immo facilite les projets à distance grâce à une expérience digitale claire et multilingue.",
    benefits: [
      {
        title: "Site en 4 langues",
        body: "Français, anglais, espagnol et russe pour accompagner vendeurs, acquéreurs et investisseurs.",
      },
      {
        title: "Visites à distance",
        body: "Photos HD, fiches détaillées et visite virtuelle Matterport lorsque disponible.",
      },
      {
        title: "Process digital",
        body: "Magic link, espace client, alertes et suivi des étapes à distance.",
      },
      {
        title: "Expertise Côte d'Azur",
        body: "Nice, Cannes, Cap Ferrat, Monaco et les marchés les plus recherchés de la région.",
      },
    ],
    ctaLabel: "Parler de mon projet",
  },
  team: {
    eyebrow: "Notre équipe",
    title: "Une technologie utile, des conseillers bien réels",
    intro:
      "Derrière chaque estimation, chaque recherche et chaque espace client, vous gardez un interlocuteur identifié, joignable et responsable de votre projet.",
    bookLabel: "Prendre rendez-vous",
    callLabel: "Appeler",
    portraitComingSoon: "Portrait à venir",
  },
  finalCta: {
    title: "Vous avez un projet immobilier à Nice ou sur la Côte d'Azur ?",
    body: "Vendre, acheter, louer ou simplement comprendre votre marché : parlez-nous de votre projet, nous vous orienterons vers le bon parcours.",
    microcopy: "Réponse rapide, accompagnement humain, espace client sécurisé.",
  },
  ctaGlobal: {
    estimate: "Estimer mon bien",
    search: "Créer ma recherche",
    viewSales: "Voir les biens en vente",
    viewRentals: "Voir les locations",
    callAdvisor: "Parler à un conseiller",
    callSillage: "Appeler Sillage Immo",
    bookAppointment: "Prendre rendez-vous",
    email: "Écrire un email",
    methodAnchor: "Découvrir notre méthode",
    clientSpace: "Accéder à mon espace",
    requestInvitation: "Demander une invitation",
    sellWithSillage: "Vendre avec Sillage",
    launchEstimation: "Lancer mon estimation",
    discoverValue: "Découvrir la valeur de mon bien",
    createAlert: "Créer une alerte",
    talkAboutNeighborhood: "Parler de mon quartier",
  },
};

const en: HomeCopy = {
  hero: {
    eyebrow: "Premium real estate agency in Nice and on the French Riviera",
    title: "Real estate in Nice, guided by data and by people",
    subtitle:
      "Sell, buy, rent: Sillage Immo combines local expertise, bespoke support and smart tools to give you a clearer, smoother and more effective real estate experience.",
    tagline:
      "A premium boutique agency in Nice and on the French Riviera, with a single point of contact and a client space to follow every step of your project.",
    microcopy:
      "Valuation, search, virtual tour, alerts and client follow-up: everything is gathered in one simple, secure experience.",
    imageAlt: "View over Nice and the Baie des Anges from a premium apartment",
  },
  socialProof: {
    items: [
      { figure: "4.9/5", label: "Google reviews" },
      { figure: "350+", label: "sellers supported" },
      { figure: "10+ years", label: "of local expertise" },
      { figure: "7/7", label: "advisory and digital follow-up" },
    ],
    bridge:
      "Local expertise reinforced by tools designed to sell better, buy better and follow every project more closely.",
  },
  assistant: {
    eyebrow: "Sillage assistant",
    title: "Tell us about your project, Sillage guides you",
    body: "Want to sell, buy, rent or understand the local market? Our assistant points you to the right path in seconds, with the option to speak to an advisor at any time.",
    microcopy: "Choose your intent: sell, buy or understand the market.",
  },
  positioning: {
    eyebrow: "Our approach",
    title: "A boutique agency, a smart platform",
    intro:
      "Sillage Immo is not a traditional real estate agency. We combine the closeness of an independent firm, the quality of premium support and the power of digital tools designed to simplify every step.",
    cards: [
      {
        title: "A single point of contact",
        body: "A named advisor supports you from the first exchange to the signature, with a real person by your side.",
      },
      {
        title: "Tools that actually help",
        body: "Valuation grounded in market data, alerts, drawn-zone search, virtual tour and client space: technology serves your project without complicating it.",
      },
      {
        title: "A local, premium approach",
        body: "Nice, Mont Boron, Cimiez, Carré d'Or, Le Port, Libération, Wilson: we adapt the strategy to each neighborhood and to each type of property.",
      },
    ],
    ctaLabel: "Discover our method",
  },
  seller: {
    eyebrow: "You're selling",
    title: "Sell with a clear strategy, not just a listing",
    subtitle:
      "A good sale doesn't start with a listing. It starts with a well-argued valuation, a defendable price, a serious presentation and a rigorous buyer qualification.",
    exclusiveMandate:
      "Exclusive mandate, no lock-in: we commit on the service, you keep your freedom. A clearer, more flexible and more transparent framework.",
    benefits: [
      {
        title: "Reliable, argued valuation",
        body: "Your property is analyzed with market data, its real features, its location and the sale context.",
      },
      {
        title: "Premium presentation",
        body: "Careful photography, clear description, Matterport virtual tour when relevant, and a listing crafted to trigger qualified visits.",
      },
      {
        title: "Transparent follow-up",
        body: "Progress, documents, next steps: everything stays centralized in your Sillage space.",
      },
      {
        title: "Better qualified buyers",
        body: "We prioritize useful visits, with buyers whose project, budget and motivation are genuinely aligned.",
      },
    ],
  },
  buyer: {
    eyebrow: "You're searching",
    title: "Your property search, exactly the way you draw it",
    subtitle:
      "Draw your zone, set your criteria and receive targeted alerts. Your search can also be followed by a Sillage advisor, who activates it in our professional tools and our French Riviera partner network to go beyond our own catalogue.",
    benefits: [
      {
        title: "Draw your zone",
        body: "Trace precisely the streets, neighborhoods or sectors that matter to you.",
      },
      {
        title: "Search activated by an advisor",
        body: "Your project is more than an alert: an advisor can review it, refine it with you and search for opportunities through our professional partner databases.",
      },
      {
        title: "Instant alerts",
        body: "As soon as a property matches your search, you're notified right away.",
      },
      {
        title: "Follow your properties in your space",
        body: "Find your searches, matched properties, new listings and key information in a single place.",
      },
    ],
    mapCaption: "Your search zone, hand-drawn on the map of Nice.",
  },
  clientSpace: {
    eyebrow: "Sillage client space",
    title: "Your Sillage space: one link, zero passwords",
    subtitle:
      "Seller or buyer, you access your project via a secure magic link. No password to remember, no scattered exchanges, no lost information.",
    cards: [
      {
        title: "For sellers",
        body: "Track the sales progress, key milestones, documents and appointments linked to your property.",
      },
      {
        title: "For buyers",
        body: "Access your searches, your drawn zones, your criteria, your matched properties and the latest listings.",
      },
      {
        title: "For everyone",
        body: "A simple, secure and smooth access, designed to reduce follow-ups and make your project clearer.",
      },
    ],
    primaryLabel: "Access my space",
    secondaryLabel: "Request an invitation",
  },
  method: {
    eyebrow: "Our method",
    title: "A structured method to sell better",
    subtitle:
      "Every property deserves a strategy. We combine local expertise, data, presentation and human follow-up to secure decisions.",
    steps: [
      {
        title: "Valuation",
        body: "Understand the real value of the property, its market and its potential.",
      },
      {
        title: "Strategy",
        body: "Define the right price, the right angle and the right timing.",
      },
      {
        title: "Presentation",
        body: "Build a premium presentation: photos, description, digital assets, virtual tour if relevant.",
      },
      {
        title: "Diffusion",
        body: "Activate the right channels and audience, without commoditizing the property.",
      },
      {
        title: "Qualification",
        body: "Filter enquiries, prioritize solid buyers and avoid useless visits.",
      },
      {
        title: "Signature",
        body: "Support the negotiation, documents, timelines and secure the sale.",
      },
    ],
    ctaLabel: "Start my valuation",
  },
  comparison: {
    eyebrow: "Comparison",
    title: "Sell alone or sell with a strategy?",
    aloneTitle: "Selling alone",
    alonePoints: [
      "Price often set by intuition",
      "Photos and listings hard to optimize",
      "Many visits, but few qualified",
      "Direct negotiation with buyers",
      "Scattered follow-up",
      "Risk of undervaluing or overexposing the property",
    ],
    sillageTitle: "With Sillage Immo",
    sillagePoints: [
      "Argued and defendable valuation",
      "Premium presentation",
      "Structured diffusion",
      "Qualified buyers",
      "Follow-up in your client space",
      "Single advisor through to signature",
    ],
    ctaLabel: "Sell with Sillage",
  },
  catalog: {
    eyebrow: "Available properties",
    title: "Browse available properties",
    subtitle:
      "Sales, rentals, opportunities in Nice and on the French Riviera: explore our selection and create a saved search if you'd like to be alerted.",
    salesTitle: "For sale",
    salesBody: "Apartments, houses, primary residences, pied-à-terre and investments.",
    salesCta: "See listings",
    rentalsTitle: "For rent",
    rentalsBody: "Browse the properties available for rent and the latest opportunities.",
    rentalsCta: "See rentals",
    microcopy:
      "Not finding the right property yet? Create your search and receive the next opportunities.",
    alertCta: "Create an alert",
  },
  neighborhoods: {
    eyebrow: "Our neighborhoods",
    title: "Our neighborhoods, our territory",
    subtitle:
      "In Nice, a few streets can change value, demand and buyer profiles. Our role is to read these nuances and adapt the strategy.",
    items: [
      {
        name: "Carré d'Or",
        body: "Central address, strong liquidity, local and international clientele.",
      },
      {
        name: "Mont Boron",
        body: "Views, rarity, prestige and high-end family properties.",
      },
      {
        name: "Cimiez",
        body: "Residential, heritage, sought after for its quality of life.",
      },
      {
        name: "Le Port",
        body: "Lively, trendy, attractive to professionals and investors.",
      },
      {
        name: "Wilson",
        body: "Centrality, urban charm and strong rental demand.",
      },
      {
        name: "Libération",
        body: "Neighborhood life, market, tramway and family appeal.",
      },
      {
        name: "Cap de Nice",
        body: "Waterfront living, confidential villas and rare panoramas.",
      },
      {
        name: "Fabron",
        body: "Residential hills, greenery and family-oriented amenities.",
      },
      {
        name: "Gairaut",
        body: "Heights of Nice, villas with views and preserved surroundings.",
      },
      {
        name: "Promenade des Anglais",
        body: "Iconic seafront, safe-haven values and international demand.",
      },
    ],
    ctaLabel: "Talk about my neighborhood",
  },
  international: {
    eyebrow: "International",
    title: "An experience built for international clients",
    subtitle:
      "Nice and the French Riviera attract French, European and international clients. Sillage Immo makes remote projects easier through a clear, multilingual digital experience.",
    benefits: [
      {
        title: "Site in 4 languages",
        body: "French, English, Spanish and Russian to support sellers, buyers and investors.",
      },
      {
        title: "Remote visits",
        body: "HD photos, detailed listings and Matterport virtual tours when available.",
      },
      {
        title: "Digital process",
        body: "Magic link, client space, alerts and step-by-step follow-up from anywhere.",
      },
      {
        title: "French Riviera expertise",
        body: "Nice, Cannes, Cap Ferrat, Monaco and the most sought-after markets in the region.",
      },
    ],
    ctaLabel: "Discuss your project",
  },
  team: {
    eyebrow: "Our team",
    title: "Useful technology, advisors who are very real",
    intro:
      "Behind every valuation, every search and every client space, you keep a named advisor, reachable and accountable for your project.",
    bookLabel: "Book an appointment",
    callLabel: "Call",
    portraitComingSoon: "Portrait coming soon",
  },
  finalCta: {
    title: "Got a real estate project in Nice or on the French Riviera?",
    body: "Selling, buying, renting or simply understanding your market: tell us about your project, we'll guide you to the right path.",
    microcopy: "Quick reply, human support, secure client space.",
  },
  ctaGlobal: {
    estimate: "Value my property",
    search: "Create my search",
    viewSales: "See properties for sale",
    viewRentals: "See rentals",
    callAdvisor: "Talk to an advisor",
    callSillage: "Call Sillage Immo",
    bookAppointment: "Book an appointment",
    email: "Send an email",
    methodAnchor: "Discover our method",
    clientSpace: "Access my space",
    requestInvitation: "Request an invitation",
    sellWithSillage: "Sell with Sillage",
    launchEstimation: "Start my valuation",
    discoverValue: "Discover my property's value",
    createAlert: "Create an alert",
    talkAboutNeighborhood: "Talk about my neighborhood",
  },
};

const es: HomeCopy = {
  hero: {
    eyebrow: "Agencia inmobiliaria premium en Niza y la Costa Azul",
    title: "Inmobiliaria en Niza, guiada por los datos y las personas",
    subtitle:
      "Vender, comprar, alquilar: Sillage Immo combina experiencia local, acompañamiento a medida y herramientas inteligentes para ofrecerle una experiencia inmobiliaria más clara, fluida y eficaz.",
    tagline:
      "Una boutique inmobiliaria premium en Niza y la Costa Azul, con un único interlocutor y un espacio cliente para seguir cada etapa de su proyecto.",
    microcopy:
      "Valoración, búsqueda, visita virtual, alertas y seguimiento del cliente: todo centralizado en una experiencia sencilla y segura.",
    imageAlt: "Vista de Niza y la Bahía de los Ángeles desde un apartamento premium",
  },
  socialProof: {
    items: [
      { figure: "4,9/5", label: "opiniones Google" },
      { figure: "350+", label: "vendedores acompañados" },
      { figure: "10+ años", label: "de experiencia local" },
      { figure: "7/7", label: "asesoramiento y seguimiento digital" },
    ],
    bridge:
      "Una experiencia local reforzada por herramientas pensadas para vender mejor, comprar mejor y seguir cada proyecto con más cercanía.",
  },
  assistant: {
    eyebrow: "Asistente Sillage",
    title: "Cuéntenos su proyecto, Sillage le guía",
    body: "¿Quiere vender, comprar, alquilar o entender el mercado local? Nuestro asistente le orienta hacia el camino adecuado en segundos, con la opción de hablar con un asesor en cualquier momento.",
    microcopy: "Elija su intención: vender, comprar o entender el mercado.",
  },
  positioning: {
    eyebrow: "Nuestro enfoque",
    title: "Una agencia boutique, una plataforma inteligente",
    intro:
      "Sillage Immo no es una agencia inmobiliaria clásica. Combinamos la cercanía de una estructura independiente, la exigencia de un acompañamiento premium y la potencia de herramientas digitales diseñadas para simplificar cada etapa.",
    cards: [
      {
        title: "Un único interlocutor",
        body: "Un asesor identificado le acompaña desde el primer contacto hasta la firma, con un interlocutor real a su lado.",
      },
      {
        title: "Herramientas realmente útiles",
        body: "Valoración basada en los datos del mercado, alertas, búsqueda por zona dibujada, visita virtual y espacio cliente: la tecnología sirve a su proyecto sin complicarlo.",
      },
      {
        title: "Un enfoque local y premium",
        body: "Niza, Mont Boron, Cimiez, Carré d'Or, Le Port, Libération, Wilson: adaptamos la estrategia a cada barrio y a cada tipo de bien.",
      },
    ],
    ctaLabel: "Descubrir nuestro método",
  },
  seller: {
    eyebrow: "Usted vende",
    title: "Vender con una estrategia clara, no con un simple anuncio",
    subtitle:
      "Una buena venta no empieza con una publicación. Empieza con una valoración argumentada, un precio defendible, una presentación cuidada y una cualificación rigurosa de los compradores.",
    exclusiveMandate:
      "Mandato exclusivo, sin compromiso: nosotros nos comprometemos con el servicio, usted conserva su libertad. Un marco más flexible, más legible y más transparente.",
    benefits: [
      {
        title: "Valoración fiable y argumentada",
        body: "Su bien se analiza con los datos del mercado, sus características reales, su ubicación y el contexto de venta.",
      },
      {
        title: "Puesta en valor premium",
        body: "Fotos cuidadas, presentación clara, visita virtual Matterport cuando es pertinente, y un anuncio pensado para generar visitas cualificadas.",
      },
      {
        title: "Seguimiento transparente",
        body: "Avance, documentos, próximas etapas: todo queda centralizado en su espacio Sillage.",
      },
      {
        title: "Compradores mejor cualificados",
        body: "Priorizamos las visitas útiles, con compradores cuyo proyecto, presupuesto y motivación son realmente coherentes.",
      },
    ],
  },
  buyer: {
    eyebrow: "Usted busca",
    title: "Su búsqueda inmobiliaria, exactamente como la dibuja",
    subtitle:
      "Dibuje su zona, indique sus criterios y reciba alertas precisas. Su búsqueda también puede ser seguida por un asesor Sillage, que la activa en nuestras herramientas profesionales y en nuestra red de la Costa Azul para ir más allá de nuestro propio catálogo.",
    benefits: [
      {
        title: "Dibuje su zona",
        body: "Trace con precisión las calles, barrios o sectores que le interesan.",
      },
      {
        title: "Búsqueda activada por un asesor",
        body: "Su proyecto no se queda en una simple alerta: un asesor puede analizarlo, afinarlo con usted y buscar oportunidades en nuestras bases profesionales asociadas.",
      },
      {
        title: "Reciba alertas instantáneas",
        body: "En cuanto un bien coincide con su búsqueda, recibe un aviso sin perder tiempo.",
      },
      {
        title: "Siga sus bienes en su espacio",
        body: "Recupere sus búsquedas, bienes coincidentes, novedades e información clave en un único lugar.",
      },
    ],
    mapCaption: "Su zona de búsqueda, dibujada a mano sobre el mapa de Niza.",
  },
  clientSpace: {
    eyebrow: "Espacio cliente Sillage",
    title: "Su espacio Sillage: un único enlace, sin contraseñas",
    subtitle:
      "Vendedor o comprador, accede a su proyecto mediante un magic link seguro. Sin contraseñas que recordar, sin intercambios dispersos, sin información perdida.",
    cards: [
      {
        title: "Para vendedores",
        body: "Siga el estado de la comercialización, las etapas clave, los documentos y las citas vinculadas a su bien.",
      },
      {
        title: "Para compradores",
        body: "Recupere sus búsquedas, sus zonas dibujadas, sus criterios, sus bienes coincidentes y las novedades.",
      },
      {
        title: "Para todos",
        body: "Un acceso simple, seguro y fluido, pensado para reducir los recordatorios y hacer su proyecto más legible.",
      },
    ],
    primaryLabel: "Acceder a mi espacio",
    secondaryLabel: "Solicitar una invitación",
  },
  method: {
    eyebrow: "Nuestro método",
    title: "Un método estructurado para vender mejor",
    subtitle:
      "Cada bien merece una estrategia. Combinamos experiencia local, datos, puesta en valor y seguimiento humano para asegurar las decisiones.",
    steps: [
      {
        title: "Valoración",
        body: "Comprender el valor real del bien, su mercado y su potencial.",
      },
      {
        title: "Estrategia",
        body: "Definir el precio correcto, el ángulo de presentación adecuado y el calendario idóneo.",
      },
      {
        title: "Puesta en valor",
        body: "Preparar una presentación premium: fotos, descripción, soportes digitales y visita virtual si conviene.",
      },
      {
        title: "Difusión",
        body: "Activar los canales y la audiencia adecuados, sin banalizar el bien.",
      },
      {
        title: "Cualificación",
        body: "Filtrar las solicitudes, priorizar a los compradores sólidos y limitar las visitas inútiles.",
      },
      {
        title: "Firma",
        body: "Acompañar la negociación, los documentos, los plazos y la seguridad de la venta.",
      },
    ],
    ctaLabel: "Iniciar mi valoración",
  },
  comparison: {
    eyebrow: "Comparativa",
    title: "¿Vender solo o vender con estrategia?",
    aloneTitle: "Vender solo",
    alonePoints: [
      "Precio fijado a menudo por intuición",
      "Fotos y anuncios difíciles de optimizar",
      "Muchas visitas pero poco cualificadas",
      "Negociación directa con los compradores",
      "Seguimiento disperso",
      "Riesgo de infravalorar o sobreexponer el bien",
    ],
    sillageTitle: "Con Sillage Immo",
    sillagePoints: [
      "Valoración argumentada y defendible",
      "Puesta en valor premium",
      "Difusión estructurada",
      "Compradores cualificados",
      "Seguimiento en su espacio cliente",
      "Asesor único hasta la firma",
    ],
    ctaLabel: "Vender con Sillage",
  },
  catalog: {
    eyebrow: "Bienes disponibles",
    title: "Descubra los bienes disponibles",
    subtitle:
      "Bienes en venta, bienes en alquiler, oportunidades en Niza y la Costa Azul: explore nuestra selección y cree una búsqueda guardada si desea recibir alertas.",
    salesTitle: "Bienes en venta",
    salesBody: "Apartamentos, casas, residencias principales, pied-à-terre e inversiones.",
    salesCta: "Ver las ventas",
    rentalsTitle: "Bienes en alquiler",
    rentalsBody: "Descubra los bienes disponibles en alquiler y las oportunidades del momento.",
    rentalsCta: "Ver los alquileres",
    microcopy:
      "¿Aún no encuentra el bien adecuado? Cree su búsqueda y reciba las próximas oportunidades.",
    alertCta: "Crear una alerta",
  },
  neighborhoods: {
    eyebrow: "Nuestros barrios",
    title: "Nuestros barrios, nuestro territorio",
    subtitle:
      "En Niza, unas pocas calles pueden cambiar el valor, la demanda y el perfil de los compradores. Nuestro papel es leer estos matices y adaptar la estrategia.",
    items: [
      {
        name: "Carré d'Or",
        body: "Dirección central, fuerte liquidez, clientela local e internacional.",
      },
      {
        name: "Mont Boron",
        body: "Vistas, rareza, prestigio y bienes familiares de alta gama.",
      },
      {
        name: "Cimiez",
        body: "Residencial, patrimonial, apreciado por su calidad de vida.",
      },
      {
        name: "Le Port",
        body: "Barrio animado, de tendencia, atractivo para activos e inversores.",
      },
      {
        name: "Wilson",
        body: "Centralidad, encanto urbano y fuerte demanda de alquiler.",
      },
      {
        name: "Libération",
        body: "Vida de barrio, mercado, tranvía y atractivo familiar.",
      },
      {
        name: "Cap de Nice",
        body: "Primera línea de mar, villas confidenciales y panorámicas únicas.",
      },
      {
        name: "Fabron",
        body: "Colinas residenciales, vegetación y prestaciones familiares.",
      },
      {
        name: "Gairaut",
        body: "Alturas de Niza, villas con vistas y entorno preservado.",
      },
      {
        name: "Promenade des Anglais",
        body: "Fachada marítima emblemática, valores refugio y demanda internacional.",
      },
    ],
    ctaLabel: "Hablar de mi barrio",
  },
  international: {
    eyebrow: "Internacional",
    title: "Una experiencia pensada para clientes internacionales",
    subtitle:
      "Niza y la Costa Azul atraen a una clientela francesa, europea e internacional. Sillage Immo facilita los proyectos a distancia gracias a una experiencia digital clara y multilingüe.",
    benefits: [
      {
        title: "Sitio en 4 idiomas",
        body: "Francés, inglés, español y ruso para acompañar a vendedores, compradores e inversores.",
      },
      {
        title: "Visitas a distancia",
        body: "Fotos HD, fichas detalladas y visita virtual Matterport cuando está disponible.",
      },
      {
        title: "Proceso digital",
        body: "Magic link, espacio cliente, alertas y seguimiento de etapas a distancia.",
      },
      {
        title: "Experiencia Costa Azul",
        body: "Niza, Cannes, Cap Ferrat, Mónaco y los mercados más buscados de la región.",
      },
    ],
    ctaLabel: "Hablar de mi proyecto",
  },
  team: {
    eyebrow: "Nuestro equipo",
    title: "Una tecnología útil, asesores muy reales",
    intro:
      "Detrás de cada valoración, cada búsqueda y cada espacio cliente, mantiene un interlocutor identificado, accesible y responsable de su proyecto.",
    bookLabel: "Reservar una cita",
    callLabel: "Llamar",
    portraitComingSoon: "Retrato próximamente",
  },
  finalCta: {
    title: "¿Tiene un proyecto inmobiliario en Niza o en la Costa Azul?",
    body: "Vender, comprar, alquilar o simplemente entender su mercado: cuéntenos su proyecto, le orientaremos hacia el camino adecuado.",
    microcopy: "Respuesta rápida, acompañamiento humano, espacio cliente seguro.",
  },
  ctaGlobal: {
    estimate: "Valorar mi bien",
    search: "Crear mi búsqueda",
    viewSales: "Ver los bienes en venta",
    viewRentals: "Ver los alquileres",
    callAdvisor: "Hablar con un asesor",
    callSillage: "Llamar a Sillage Immo",
    bookAppointment: "Reservar una cita",
    email: "Enviar un email",
    methodAnchor: "Descubrir nuestro método",
    clientSpace: "Acceder a mi espacio",
    requestInvitation: "Solicitar una invitación",
    sellWithSillage: "Vender con Sillage",
    launchEstimation: "Iniciar mi valoración",
    discoverValue: "Descubrir el valor de mi bien",
    createAlert: "Crear una alerta",
    talkAboutNeighborhood: "Hablar de mi barrio",
  },
};

const ru: HomeCopy = {
  hero: {
    eyebrow: "Премиальное агентство недвижимости в Ницце и на Лазурном Берегу",
    title: "Недвижимость в Ницце: данные и человеческий подход",
    subtitle:
      "Продажа, покупка, аренда: Sillage Immo объединяет локальную экспертизу, индивидуальное сопровождение и умные инструменты, чтобы сделать ваш опыт в недвижимости яснее, проще и эффективнее.",
    tagline:
      "Премиальный бутик-агентство в Ницце и на Лазурном Берегу, единый консультант и личный кабинет клиента на каждом этапе вашего проекта.",
    microcopy:
      "Оценка, поиск, виртуальный тур, оповещения и сопровождение — всё собрано в одном простом и безопасном опыте.",
    imageAlt: "Вид на Ниццу и бухту Ангелов из премиальной квартиры",
  },
  socialProof: {
    items: [
      { figure: "4,9/5", label: "отзывов Google" },
      { figure: "350+", label: "сопровождённых продавцов" },
      { figure: "10+ лет", label: "локальной экспертизы" },
      { figure: "7/7", label: "консультации и цифровое сопровождение" },
    ],
    bridge:
      "Локальная экспертиза, усиленная инструментами, чтобы продавать, покупать и сопровождать каждый проект ещё внимательнее.",
  },
  assistant: {
    eyebrow: "Ассистент Sillage",
    title: "Расскажите о проекте — Sillage подскажет путь",
    body: "Хотите продать, купить, арендовать или понять локальный рынок? Наш ассистент подберёт нужный маршрут за секунды, с возможностью связаться с консультантом в любой момент.",
    microcopy: "Выберите цель: продать, купить или изучить рынок.",
  },
  positioning: {
    eyebrow: "Наш подход",
    title: "Бутик-агентство и умная платформа",
    intro:
      "Sillage Immo — не классическое агентство. Мы объединяем близость независимой структуры, премиальное сопровождение и силу цифровых инструментов, созданных, чтобы упростить каждый этап.",
    cards: [
      {
        title: "Единый консультант",
        body: "Конкретный консультант сопровождает вас от первого контакта до подписания — рядом с вами, как живой собеседник.",
      },
      {
        title: "Действительно полезные инструменты",
        body: "Оценка на рыночных данных, оповещения, поиск по нарисованной зоне, виртуальный тур и личный кабинет — технологии работают на ваш проект, не усложняя его.",
      },
      {
        title: "Локальный премиальный подход",
        body: "Ницца, Мон-Борон, Симье, Карре д'Ор, Порт, Либерасьон, Вильсон — стратегия под каждый квартал и тип объекта.",
      },
    ],
    ctaLabel: "Узнать наш метод",
  },
  seller: {
    eyebrow: "Вы продаёте",
    title: "Продавать со стратегией, а не просто объявлением",
    subtitle:
      "Хорошая продажа начинается не с публикации. Она начинается с аргументированной оценки, защищаемой цены, серьёзной презентации и строгой квалификации покупателей.",
    exclusiveMandate:
      "Эксклюзивный мандат без обязательств: мы обязуемся по уровню сервиса, вы сохраняете свою свободу. Более гибкая, ясная и прозрачная форма сотрудничества.",
    benefits: [
      {
        title: "Надёжная аргументированная оценка",
        body: "Ваш объект анализируется на основе рыночных данных, реальных характеристик, расположения и контекста продажи.",
      },
      {
        title: "Премиальная презентация",
        body: "Качественные фото, ясное описание, виртуальный тур Matterport при необходимости и объявление, созданное для качественных показов.",
      },
      {
        title: "Прозрачное сопровождение",
        body: "Прогресс, документы, следующие шаги — всё остаётся в вашем кабинете Sillage.",
      },
      {
        title: "Лучше квалифицированные покупатели",
        body: "Мы отдаём приоритет полезным просмотрам, с покупателями, чей проект, бюджет и мотивация действительно совпадают.",
      },
    ],
  },
  buyer: {
    eyebrow: "Вы ищете",
    title: "Ваш поиск недвижимости — ровно таким, каким вы его нарисуете",
    subtitle:
      "Нарисуйте зону, укажите критерии и получайте целевые уведомления. Ваш поиск также может вести консультант Sillage — он активирует его в наших профессиональных инструментах и в нашей партнёрской сети Лазурного Берега, чтобы выйти за рамки нашего каталога.",
    benefits: [
      {
        title: "Нарисуйте свою зону",
        body: "Точно очертите улицы, кварталы или сектора, которые вас интересуют.",
      },
      {
        title: "Поиск, активированный консультантом",
        body: "Ваш проект — не просто уведомление: консультант может его проанализировать, уточнить вместе с вами и искать возможности в наших профессиональных партнёрских базах.",
      },
      {
        title: "Получайте мгновенные оповещения",
        body: "Как только объект соответствует поиску, вы сразу узнаёте об этом.",
      },
      {
        title: "Отслеживайте объекты в кабинете",
        body: "Ваши поиски, совпавшие объекты, новинки и ключевая информация в одном месте.",
      },
    ],
    mapCaption: "Ваша зона поиска, нарисованная вручную на карте Ниццы.",
  },
  clientSpace: {
    eyebrow: "Личный кабинет Sillage",
    title: "Ваш кабинет Sillage: одна ссылка, ноль паролей",
    subtitle:
      "Продавец или покупатель — вы заходите в проект по безопасной magic-ссылке. Никаких паролей, никаких разрозненных сообщений, никакой потерянной информации.",
    cards: [
      {
        title: "Для продавцов",
        body: "Следите за ходом продажи, ключевыми этапами, документами и встречами по объекту.",
      },
      {
        title: "Для покупателей",
        body: "Возвращайтесь к своим поискам, нарисованным зонам, критериям, совпавшим объектам и новинкам.",
      },
      {
        title: "Для всех",
        body: "Простой, безопасный и плавный доступ, чтобы меньше напоминаний и больше ясности в проекте.",
      },
    ],
    primaryLabel: "Открыть мой кабинет",
    secondaryLabel: "Запросить приглашение",
  },
  method: {
    eyebrow: "Наш метод",
    title: "Структурированный метод, чтобы продать лучше",
    subtitle:
      "Каждый объект заслуживает стратегии. Мы объединяем локальную экспертизу, данные, презентацию и человеческое сопровождение, чтобы защитить ваши решения.",
    steps: [
      {
        title: "Оценка",
        body: "Понять реальную ценность объекта, его рынок и потенциал.",
      },
      {
        title: "Стратегия",
        body: "Определить правильную цену, презентацию и тайминг.",
      },
      {
        title: "Презентация",
        body: "Подготовить премиальную подачу: фото, описание, цифровые материалы, виртуальный тур при необходимости.",
      },
      {
        title: "Диффузия",
        body: "Активировать нужные каналы и аудиторию, не обесценивая объект.",
      },
      {
        title: "Квалификация",
        body: "Фильтровать запросы, приоритет надёжным покупателям и меньше бесполезных показов.",
      },
      {
        title: "Подписание",
        body: "Сопровождать переговоры, документы, сроки и безопасность сделки.",
      },
    ],
    ctaLabel: "Начать оценку",
  },
  comparison: {
    eyebrow: "Сравнение",
    title: "Продавать самостоятельно или со стратегией?",
    aloneTitle: "Самостоятельная продажа",
    alonePoints: [
      "Цена часто устанавливается интуитивно",
      "Сложно оптимизировать фото и объявление",
      "Много показов, мало качественных",
      "Прямые переговоры с покупателями",
      "Разрозненное сопровождение",
      "Риск недооценки или избыточного выставления объекта",
    ],
    sillageTitle: "С Sillage Immo",
    sillagePoints: [
      "Аргументированная и защищаемая оценка",
      "Премиальная презентация",
      "Структурированное продвижение",
      "Квалифицированные покупатели",
      "Сопровождение в личном кабинете",
      "Единый консультант до подписания",
    ],
    ctaLabel: "Продавать с Sillage",
  },
  catalog: {
    eyebrow: "Доступные объекты",
    title: "Откройте доступные объекты",
    subtitle:
      "Продажа, аренда, возможности в Ницце и на Лазурном Берегу: изучите подборку и сохраните поиск, чтобы получать оповещения.",
    salesTitle: "На продажу",
    salesBody: "Квартиры, дома, основные резиденции, pied-à-terre и инвестиции.",
    salesCta: "Смотреть продажи",
    rentalsTitle: "В аренду",
    rentalsBody: "Откройте объекты в аренду и актуальные возможности.",
    rentalsCta: "Смотреть аренду",
    microcopy:
      "Пока не нашли нужный объект? Создайте поиск и получайте следующие возможности.",
    alertCta: "Создать оповещение",
  },
  neighborhoods: {
    eyebrow: "Наши кварталы",
    title: "Наши кварталы, наша территория",
    subtitle:
      "В Ницце несколько улиц могут изменить цену, спрос и профиль покупателей. Наша задача — читать эти нюансы и адаптировать стратегию.",
    items: [
      {
        name: "Carré d'Or",
        body: "Центральный адрес, высокая ликвидность, локальная и международная клиентура.",
      },
      {
        name: "Mont Boron",
        body: "Виды, редкость, престиж и семейные объекты высокого класса.",
      },
      {
        name: "Cimiez",
        body: "Резидентный, патримониальный, востребован за качество жизни.",
      },
      {
        name: "Le Port",
        body: "Живой, модный квартал, привлекательный для активных людей и инвесторов.",
      },
      {
        name: "Wilson",
        body: "Центральность, городской шарм и сильный арендный спрос.",
      },
      {
        name: "Libération",
        body: "Жизнь квартала, рынок, трамвай и семейная привлекательность.",
      },
      {
        name: "Cap de Nice",
        body: "У самой воды, приватные виллы и редкие панорамы.",
      },
      {
        name: "Fabron",
        body: "Резидентные холмы, зелень и семейные удобства.",
      },
      {
        name: "Gairaut",
        body: "Высоты Ниццы, виллы с видом и сохранённая среда.",
      },
      {
        name: "Promenade des Anglais",
        body: "Культовая набережная, защитные активы и международный спрос.",
      },
    ],
    ctaLabel: "Поговорить о моём квартале",
  },
  international: {
    eyebrow: "Международный подход",
    title: "Опыт, созданный для международных клиентов",
    subtitle:
      "Ницца и Лазурный Берег привлекают французских, европейских и международных клиентов. Sillage Immo упрощает удалённые проекты благодаря ясному многоязычному цифровому опыту.",
    benefits: [
      {
        title: "Сайт на 4 языках",
        body: "Французский, английский, испанский и русский для продавцов, покупателей и инвесторов.",
      },
      {
        title: "Удалённые просмотры",
        body: "HD-фото, подробные карточки и виртуальные туры Matterport, когда доступны.",
      },
      {
        title: "Цифровой процесс",
        body: "Magic-ссылка, личный кабинет, оповещения и пошаговое сопровождение удалённо.",
      },
      {
        title: "Экспертиза Лазурного Берега",
        body: "Ницца, Канны, Кап-Ферра, Монако и самые востребованные рынки региона.",
      },
    ],
    ctaLabel: "Обсудить мой проект",
  },
  team: {
    eyebrow: "Наша команда",
    title: "Полезные технологии и очень реальные консультанты",
    intro:
      "За каждой оценкой, поиском и личным кабинетом — конкретный консультант, с которым легко связаться и который отвечает за ваш проект.",
    bookLabel: "Записаться на встречу",
    callLabel: "Позвонить",
    portraitComingSoon: "Фото скоро появится",
  },
  finalCta: {
    title: "У вас проект недвижимости в Ницце или на Лазурном Берегу?",
    body: "Продать, купить, арендовать или просто понять рынок — расскажите о проекте, мы подскажем верный путь.",
    microcopy: "Быстрый ответ, человеческое сопровождение, защищённый кабинет клиента.",
  },
  ctaGlobal: {
    estimate: "Оценить мой объект",
    search: "Создать поиск",
    viewSales: "Смотреть объекты на продажу",
    viewRentals: "Смотреть аренду",
    callAdvisor: "Связаться с консультантом",
    callSillage: "Позвонить Sillage Immo",
    bookAppointment: "Записаться на встречу",
    email: "Написать email",
    methodAnchor: "Узнать наш метод",
    clientSpace: "Открыть мой кабинет",
    requestInvitation: "Запросить приглашение",
    sellWithSillage: "Продавать с Sillage",
    launchEstimation: "Начать оценку",
    discoverValue: "Узнать ценность моего объекта",
    createAlert: "Создать оповещение",
    talkAboutNeighborhood: "Поговорить о моём квартале",
  },
};

export const HOME_COPY: Record<AppLocale, HomeCopy> = { fr, en, es, ru };

export const PHONE_ARIA_LABEL: Record<AppLocale, string> = {
  fr: PHONE_ARIA_FR,
  en: PHONE_ARIA_EN,
  es: PHONE_ARIA_ES,
  ru: PHONE_ARIA_RU,
};

export const SILLAGE_PHONE_RAW = "+33423450485";
export const SILLAGE_PHONE_DISPLAY = "+33 4 23 45 04 85";
