import type { AppLocale } from "@/lib/i18n/config";

/**
 * Pages quartiers de Nice : contenu éditorial (français, rédigé à partir de
 * sources vérifiées — presse locale, annuaires officiels, sites des lieux),
 * adresses recommandées et rattachement aux statistiques DVF
 * (lib/quartiers-dvf-stats.json, clé `statsKey`) et au catalogue de zones
 * (`zoneSlugs`, pour retrouver les biens Sillage du quartier par leur titre).
 *
 * Règle pour les adresses : des lieux réels et ouverts, typiques, ni les plus
 * chers ni les moins chers, jamais de chaîne. Une adresse douteuse n'est pas
 * publiée.
 */

export type QuartierPlaceKind =
  | "bouche"
  | "restaurant"
  | "cafe"
  | "ecole"
  | "parc"
  | "marche"
  | "culture"
  | "sport";

export type QuartierPlace = {
  kind: QuartierPlaceKind;
  name: string;
  address: string;
  note: string;
};

export type Quartier = {
  slug: string;
  name: string;
  /** Forme avec préposition, pour les titres français (« au Port », « sur la Promenade »). */
  locative: string;
  /** Sous-titre court, sous le nom (FR + traductions). */
  tagline: Record<AppLocale, string>;
  postalCodes: string[];
  statsKey: string;
  zoneSlugs: string[];
  /** Mots du titre d'annonce qui rattachent un bien au quartier (minuscule, sans accent). */
  titleHints: string[];
  image: { src: string; alt: string; credit: string };
  center: { lat: number; lng: number };
  /** Paragraphes éditoriaux (FR). */
  paragraphs: string[];
  /** Résumé traduit (EN/ES/RU) : deux ou trois phrases. */
  summary: Record<Exclude<AppLocale, "fr">, string>;
  who: string;
  transport: string;
  places: QuartierPlace[];
  /** Ce que Sillage voit sur ce marché (FR, ton conseiller). */
  advice: string;
  seo: { title: string; description: string };
};

export const QUARTIERS: Quartier[] = [
  {
    slug: "riquier",
    name: "Riquier",
    locative: "à Riquier",
    tagline: {
      fr: "Le quartier de l'agence : entre le port et la gare, un vrai quartier de vie",
      en: "Our home district: between the port and the station, a real neighbourhood",
      es: "El barrio de la agencia: entre el puerto y la estación, un barrio de verdad",
      ru: "Район нашего агентства: между портом и вокзалом, настоящий жилой квартал",
    },
    postalCodes: ["06300"],
    statsKey: "riquier",
    zoneSlugs: ["riquier"],
    titleHints: ["riquier", "arson", "barla", "risso", "max barel", "republique"],
    image: { src: "/quartiers/riquier.jpg", alt: "Le port de Nice vu depuis les quais, avec la colline du Mont Boron", credit: "Ilona Bellotto / Unsplash" },
    center: { lat: 43.7035, lng: 7.289 },
    paragraphs: [
      "Riquier est un ancien faubourg de potagers et d'ateliers, urbanisé quand le port de Nice a pris son essor au XVIIIe siècle. Le bâti qui domine aujourd'hui date des années 1920 et 1930 : des immeubles niçois de quatre à six étages, façades ocre ou beige, balcons filants, avec quelques ensembles plus ambitieux comme le Palais de l'Esplanade. Le quartier s'organise autour de la place Max-Barel, du boulevard Risso et de la rue Arson, et bute au nord-est sur la gare de Nice-Riquier.",
      "C'est un quartier qui vit à hauteur de rue : boulangeries, primeurs, cafés de place, écoles à distance de marche. Longtemps resté très minéral et circulé, il change avec la coulée verte prolongée depuis le Paillon et la reprise progressive des rez-de-chaussée. On y est à un quart d'heure à pied du port et de la place Garibaldi, à dix minutes de tram du centre, et à un pas des trains vers Monaco et Menton.",
      "Sillage Immo est installée rue Arson, au cœur du quartier. Nous y vendons et y louons toute l'année, et nous savons ce qu'un rez-de-chaussée sur rue vaut par rapport à un dernier étage sur cour, à immeuble égal.",
    ],
    summary: {
      en: "Riquier is a 1920s–30s residential district between the port and the Nice-Riquier station, with Niçois apartment buildings, neighbourhood shops and schools within walking distance. Sillage Immo's office is on rue Arson, in the heart of the district.",
      es: "Riquier es un barrio residencial de los años 1920-30 entre el puerto y la estación de Nice-Riquier, con edificios nizardos, comercios de barrio y colegios a pie. La agencia Sillage Immo está en la rue Arson, en el corazón del barrio.",
      ru: "Рикье — жилой район 1920–30-х годов между портом и вокзалом Ницца-Рикье: ниццкие дома, магазины у дома, школы в пешей доступности. Офис Sillage Immo находится на улице Арсон, в самом центре района.",
    },
    who: "Des familles et des jeunes actifs qui veulent le centre sans le prix du centre, et des investisseurs qui misent sur la gare, le port tout proche et la rénovation en cours. Le deux ou trois pièces des années 30 avec balcon est le bien type ; les surfaces familiales sont plus rares.",
    transport: "Ligne 1 du tramway aux stations Vauban et Garibaldi, à quelques minutes à pied ; gare SNCF de Nice-Riquier (TER vers Monaco, Menton et Cannes) ; la mer au port en quinze minutes de marche.",
    places: [
      { kind: "bouche", name: "Panification de Riquier", address: "48 rue Arson", note: "La boulangerie du quartier, à deux portes de l'agence. Pain au levain, files le matin." },
      { kind: "restaurant", name: "La Table à Julie", address: "50 rue Arson", note: "Cuisine de marché sans façon, ardoise courte, prix de quartier. Le déjeuner des riverains." },
      { kind: "restaurant", name: "Le Niçois", address: "16 boulevard de Riquier", note: "Table familiale du boulevard : plats niçois, portions généreuses, service sans chichi." },
      { kind: "cafe", name: "Nicéa Café", address: "2 place Max-Barel", note: "La terrasse de la place, entre la sortie d'école et le passage vers la gare." },
      { kind: "ecole", name: "École élémentaire Risso et collège Antoine-Risso", address: "6 boulevard Pierre-Sola", note: "Le groupe scolaire public du secteur, mitoyen, sur l'axe historique du quartier." },
      { kind: "parc", name: "Coulée verte de Riquier", address: "boulevard de Riquier", note: "Le prolongement récent de la promenade du Paillon : 6 000 m² plantés, premier vrai espace vert du quartier." },
    ],
    advice: "À Riquier, tout se joue sur l'immeuble : deux adresses à cinquante mètres l'une de l'autre peuvent s'écarter de 1 500 €/m² selon l'état des parties communes, l'ascenseur et l'orientation. Nous vendons ce que nous connaissons rue par rue.",
    seo: {
      title: "Riquier, Nice — Prix immobilier, vivre à Riquier, adresses | Sillage Immo",
      description: "Vivre et acheter à Riquier (Nice 06300) : prix au m² DVF, ambiance, commerces, écoles, transports. Le quartier de l'agence Sillage Immo, rue Arson.",
    },
  },
  {
    slug: "saint-roch",
    name: "Saint-Roch",
    locative: "à Saint-Roch",
    tagline: {
      fr: "Le grand boulevard, le tram, et les prix les plus accessibles de l'est niçois",
      en: "The wide boulevard, the tram, and the most affordable prices in eastern Nice",
      es: "El gran bulevar, el tranvía y los precios más asequibles del este de Niza",
      ru: "Широкий бульвар, трамвай и самые доступные цены восточной Ниццы",
    },
    postalCodes: ["06300"],
    statsKey: "saint-roch",
    zoneSlugs: ["saint-roch"],
    titleHints: ["saint roch", "st roch", "vauban", "roquebilliere", "saint jean d angely", "route de turin"],
    image: { src: "/quartiers/saint-roch.jpg", alt: "Vue aérienne de Nice vers l'est et les collines", credit: "35MM North / Unsplash" },
    center: { lat: 43.7125, lng: 7.2925 },
    paragraphs: [
      "Saint-Roch était une plaine d'orangers et de potagers le long du Paillon avant que le chemin de fer et l'usine à gaz n'en fassent, au début du XXe siècle, un quartier ouvrier. Son boulevard, percé en 1936 sur trente mètres de large et planté de platanes, est resté le plus large de Nice. Le quartier a été durement bombardé en mai 1944 puis reconstruit : le bâti mêle immeubles des années 1950 à 1970, quelques constructions basses plus anciennes et des opérations récentes autour du tramway.",
      "C'est le quartier qui a le plus changé de l'est niçois depuis l'arrivée de la ligne 1 : stations Saint-Roch et Vauban, université à Saint-Jean-d'Angély, coulée verte, piscine et stade municipaux. Il reste populaire, vivant, avec une vraie vie de boulevard et des prix qui restent, et de loin, les plus accessibles à dix minutes de tram du centre.",
    ],
    summary: {
      en: "Saint-Roch is a lively, affordable district in eastern Nice, rebuilt after 1944 around its wide plane-tree boulevard and now served by tram line 1 (Saint-Roch and Vauban stops), ten minutes from the centre.",
      es: "Saint-Roch es un barrio animado y asequible del este de Niza, reconstruido tras 1944 en torno a su ancho bulevar de plátanos y hoy servido por la línea 1 del tranvía, a diez minutos del centro.",
      ru: "Сен-Рош — оживлённый и доступный район на востоке Ниццы, отстроенный после 1944 года вокруг широкого бульвара с платанами; линия трамвая 1 доставит в центр за десять минут.",
    },
    who: "Primo-accédants et jeunes actifs qui travaillent en centre-ville, familles qui cherchent une surface de plus pour le même budget, et investisseurs pour la demande étudiante de Saint-Jean-d'Angély. Le trois pièces des années 60 avec balcon et cave est le bien type.",
    transport: "Ligne 1 du tramway, stations Saint-Roch et Vauban : dix minutes jusqu'à la gare de Nice-Ville, un quart d'heure jusqu'à Masséna et la mer.",
    places: [
      { kind: "bouche", name: "Les Délices de Saint-Roch", address: "42 rue Monseigneur-Alfred-Daumas", note: "Boulangerie de quartier connue pour son pain signature ; on y vient des rues voisines." },
      { kind: "restaurant", name: "L'Espresso", address: "2 place Saint-Roch", note: "Daube, gnocchi, raviolis : de la cuisine niçoise à prix de quartier, suggestions qui changent chaque jour." },
      { kind: "restaurant", name: "Ma Cave", address: "25 boulevard Saint-Roch", note: "Cuisine familiale avec ses plats fixes selon les jours — paella, couscous, aïoli. Une institution du boulevard." },
      { kind: "cafe", name: "L'Entre Nous", address: "2 place Saint-Roch", note: "Salon de thé et café de place, produits maison, la halte du quartier." },
      { kind: "ecole", name: "Écoles Saint-Roch 1 et 2 (élémentaires) et maternelle Saint-Roch", address: "2 rue Fornéro-Ménéï", note: "Le groupe scolaire public du quartier, attenant, à distance de marche de tout le secteur." },
      { kind: "sport", name: "Piscine Saint-Roch", address: "boulevard Pierre-Sémard", note: "Équipement municipal hérité de la reconstruction, toujours très fréquenté." },
    ],
    advice: "Saint-Roch est le quartier où l'écart entre un immeuble entretenu et un immeuble délaissé est le plus visible sur le prix. Regardez le ravalement, la chaudière collective et les PV d'assemblée avant le prix affiché : c'est là que se fait la bonne affaire, ou la mauvaise.",
    seo: {
      title: "Saint-Roch, Nice — Prix immobilier, vivre à Saint-Roch, adresses | Sillage Immo",
      description: "Vivre et acheter à Saint-Roch (Nice 06300) : prix au m² DVF, boulevard, tramway ligne 1, commerces et écoles. Le regard de Sillage Immo, agence voisine à Riquier.",
    },
  },
  {
    slug: "le-port",
    name: "Le Port",
    locative: "au Port",
    tagline: {
      fr: "Façades ligures, place Garibaldi et le Petit Marais : le quartier qui a la cote",
      en: "Ligurian facades, Place Garibaldi and the 'Petit Marais': the district in demand",
      es: "Fachadas ligures, plaza Garibaldi y el «Petit Marais»: el barrio de moda",
      ru: "Лигурийские фасады, площадь Гарибальди и «Маленький Маре»: район, который в моде",
    },
    postalCodes: ["06300"],
    statsKey: "le-port",
    zoneSlugs: ["port-de-nice"],
    titleHints: ["port", "garibaldi", "bonaparte", "cassini", "lympia", "place du pin", "carnot", "segurane"],
    image: { src: "/quartiers/le-port.jpg", alt: "Le port Lympia et ses bateaux, vus depuis les hauteurs", credit: "Gabriel Tovar / Unsplash" },
    center: { lat: 43.6975, lng: 7.284 },
    paragraphs: [
      "Le port Lympia a été creusé à partir de 1748 sous Charles-Emmanuel III, et son bassin est resté le point de départ des ferries pour la Corse. Il est bordé d'immeubles de style ligure aux façades ocre-rouge et aux balcons ouvragés, dans une composition symétrique que domine l'église Notre-Dame-du-Port. Derrière, la place Garibaldi, plus ancienne grande place de Nice, a été entièrement rénovée à l'arrivée du tramway ; les rues Bonaparte, Cassini et la place du Pin forment ce que les Niçois appellent le Petit Marais, avec ses terrasses, ses caves et ses antiquaires.",
      "Le quartier a gagné en dix ans ce que d'autres mettent trente ans à obtenir : une clientèle jeune, une vie de soirée, des restaurants qui comptent, et des prix qui ont suivi. Il reste pourtant un vrai quartier, avec ses écoles, son marché aux puces le lundi place Garibaldi côté cours Saleya, ses pointus dans le bassin, et le Vieux-Nice et la mer à cinq minutes à pied.",
    ],
    summary: {
      en: "Le Port is Nice's most sought-after eastern district: ochre Ligurian facades around the Lympia basin, the renovated Place Garibaldi, and the lively 'Petit Marais' streets, five minutes on foot from Old Nice and the sea.",
      es: "Le Port es el barrio más buscado del este de Niza: fachadas ligures ocre en torno al puerto Lympia, la plaza Garibaldi renovada y las calles animadas del «Petit Marais», a cinco minutos a pie del casco antiguo y del mar.",
      ru: "Порт — самый востребованный район востока Ниццы: охристые лигурийские фасады вокруг гавани Лимпия, обновлённая площадь Гарибальди и оживлённые улицы «Маленького Маре», в пяти минутах пешком от Старой Ниццы и моря.",
    },
    who: "Jeunes actifs et couples qui veulent du cachet et de la vie de quartier, acheteurs de pied-à-terre, et investisseurs sur les petites surfaces à rénover. Le deux pièces avec balcon dans un immeuble ligure est le bien qui part le plus vite, à condition d'être au bon prix dès le premier jour.",
    transport: "Ligne 1 du tramway, station Garibaldi ; le Vieux-Nice et la Promenade à cinq ou dix minutes à pied ; la gare de Nice-Ville en dix minutes de tram.",
    places: [
      { kind: "bouche", name: "Fromagerie Bonaparte", address: "42 rue Bonaparte", note: "La cave à fromages du quartier, fournisseur de plusieurs tables voisines." },
      { kind: "restaurant", name: "La Socca d'Or", address: "45 rue Bonaparte", note: "Socca, pissaladière, pan-bagnat, salade niçoise : une institution 100 % niçoise, à prix d'institution niçoise." },
      { kind: "restaurant", name: "Brasserie Le Garibaldi", address: "18 place Garibaldi", note: "La brasserie de la place, cuisine traditionnelle et tarifs raisonnables sous les arcades." },
      { kind: "cafe", name: "Café de la Place", address: "place Garibaldi", note: "La terrasse populaire de la place, celle des habitants plus que des touristes." },
      { kind: "ecole", name: "Groupe scolaire Jousé-Garibaldi – Port", address: "6 quai Papacino", note: "Maternelle et élémentaire publiques du secteur, au plus près des immeubles du port." },
      { kind: "culture", name: "Théâtre National de Nice – Les Franciscains", address: "promenade des Arts", note: "La scène nationale, à deux pas de la station Garibaldi." },
    ],
    advice: "Au Port, la vue sur le bassin se paie, mais l'exposition compte autant : un appartement côté quai plein sud avec double vitrage n'a rien à voir avec le même sur rue étroite. Nous avons vendu ici en dix jours ; c'est le quartier où le bon prix se sait vite.",
    seo: {
      title: "Le Port, Nice — Prix immobilier, vivre au Port, adresses | Sillage Immo",
      description: "Vivre et acheter au Port de Nice (06300) : prix au m² DVF, place Garibaldi, Petit Marais, commerces, écoles, tram. Le regard de Sillage Immo, agence voisine.",
    },
  },
  {
    slug: "carre-dor",
    name: "Carré d'Or",
    locative: "au Carré d'Or",
    tagline: {
      fr: "Belle Époque, Musiciens et Promenade : l'adresse centrale de Nice",
      en: "Belle Époque, the Musiciens and the Promenade: Nice's central address",
      es: "Belle Époque, los Musiciens y el Paseo: la dirección central de Niza",
      ru: "Бель-Эпок, квартал Музыкантов и Променад: центральный адрес Ниццы",
    },
    postalCodes: ["06000"],
    statsKey: "carre-dor",
    zoneSlugs: ["carre-dor", "musiciens"],
    titleHints: ["carre d or", "carre d'or", "victor hugo", "musiciens", "gambetta", "rue de france", "paradis", "alphonse karr", "verdi", "auber", "berlioz", "rossini", "massenet", "dubouchage"],
    image: { src: "/quartiers/carre-dor.jpg", alt: "La coupole du Negresco et un palmier sous le ciel bleu", credit: "Arno Smit / Unsplash" },
    center: { lat: 43.6975, lng: 7.262 },
    paragraphs: [
      "Le Carré d'Or s'est bâti entre 1880 et 1930, quand Nice était la villégiature d'hiver de l'Europe : grands immeubles bourgeois Belle Époque, quelques façades Art déco, des halls à mosaïques et des ascenseurs d'époque. Il tient entre le boulevard Victor-Hugo, le boulevard Gambetta, l'avenue Jean-Médecin et la Promenade des Anglais. La rue Paradis et la rue de France concentrent les enseignes, le musée Masséna et son jardin ouvrent une respiration, et le quartier des Musiciens, autour de l'avenue Auber et de la rue Berlioz, garde une vie plus résidentielle et plus calme.",
      "C'est le quartier le plus liquide de Nice : une demande locale, française et internationale toute l'année, des professions libérales en rez-de-chaussée, et une rareté réelle des grands appartements traversants. Le soir, en dehors des grands axes, il redevient étonnamment calme.",
    ],
    summary: {
      en: "The Carré d'Or is Nice's central Belle Époque district, between Boulevard Victor-Hugo and the Promenade des Anglais, with the quieter Musiciens streets to the north. The most liquid market in the city, with year-round French and international demand.",
      es: "El Carré d'Or es el barrio central Belle Époque de Niza, entre el bulevar Victor-Hugo y el Paseo de los Ingleses, con las calles más tranquilas de los Musiciens al norte. El mercado más líquido de la ciudad.",
      ru: "Карре д'Ор — центральный район Ниццы эпохи Бель-Эпок между бульваром Виктора Гюго и Английской набережной; севернее — более тихие улицы квартала Музыкантов. Самый ликвидный рынок города.",
    },
    who: "Cadres, professions libérales, retraités aisés et clientèle internationale, en résidence principale comme en pied-à-terre. Le trois pièces bourgeois avec hauteur sous plafond est le bien recherché ; le grand traversant rénové se vend avant d'être publié.",
    transport: "Ligne 1 du tramway, stations Masséna et Jean-Médecin ; la gare de Nice-Ville et la Promenade à moins de dix minutes à pied.",
    places: [
      { kind: "restaurant", name: "Café des Musiciens", address: "13 avenue Auber", note: "Bib Gourmand 2026, cuisine du marché sans prétention : la table du quartier des Musiciens, à réserver." },
      { kind: "restaurant", name: "Casa Nissa", address: "55 rue Gioffredo", note: "Cuisine niçoise et méditerranéenne, terrasse ombragée, à quelques pas de la place Masséna." },
      { kind: "ecole", name: "École maternelle et élémentaire Auber", address: "35 avenue Auber", note: "L'école publique du secteur Musiciens – Carré d'Or, avec cantine." },
      { kind: "parc", name: "Jardin du musée Masséna", address: "65 rue de France", note: "Le jardin Belle Époque ouvert au public, seul vrai espace vert du quartier ; le musée est gratuit." },
    ],
    advice: "Au Carré d'Or, l'étage et la lumière font le prix, pas la rue. Un premier étage sur cour sombre et un quatrième traversant peuvent s'écarter du simple au double dans le même immeuble. C'est aussi le quartier où une estimation trop haute coûte le plus cher : les acquéreurs comparent tout.",
    seo: {
      title: "Carré d'Or, Nice — Prix immobilier, vivre au Carré d'Or, adresses | Sillage Immo",
      description: "Vivre et acheter au Carré d'Or (Nice 06000) : prix au m² DVF, immeubles Belle Époque, Musiciens, commerces, écoles, tram. Le regard de Sillage Immo.",
    },
  },
  {
    slug: "wilson",
    name: "Wilson",
    locative: "à Wilson",
    tagline: {
      fr: "La place, ses rues serrées et le centre à pied : Nice sans la carte postale",
      en: "The square, its tight streets and the centre on foot: Nice without the postcard",
      es: "La plaza, sus calles estrechas y el centro a pie: Niza sin la postal",
      ru: "Площадь, тесные улицы и центр пешком: Ницца без открытки",
    },
    postalCodes: ["06000"],
    statsKey: "wilson",
    zoneSlugs: [],
    titleHints: ["wilson", "pertinax", "gubernatis", "assalit", "hotel des postes", "notre dame", "gioffredo", "pastorelli"],
    image: { src: "/quartiers/wilson.jpg", alt: "La fontaine du Soleil, place Masséna, et le damier de la place", credit: "Dejox / Unsplash" },
    center: { lat: 43.703, lng: 7.272 },
    paragraphs: [
      "Autour de la place Wilson et des rues Pertinax, Assalit et Gubernatis, le quartier fait la jonction entre le centre commerçant de Jean-Médecin et les pentes de Carabacel. Le bâti est niçois, 1900-1930, plus dense et plus simple que dans le Carré d'Or voisin : quatre à six étages, escaliers en pierre, cours étroites, rez-de-chaussée occupés par des commerces de proximité, des cavistes et des petites brasseries.",
      "La place elle-même a été refaite, jardin et aire de jeux agrandis, et elle est redevenue le cœur d'une vie de quartier resserrée. On est ici à dix minutes à pied de la gare, de la place Masséna et de la coulée verte, sans la pression touristique du bord de mer. C'est le compromis que cherchent beaucoup d'acheteurs : le centre, à pied, pour moins cher.",
    ],
    summary: {
      en: "Wilson is a dense, lively central district around its renovated square and the Pertinax and Gubernatis streets, ten minutes on foot from the station and Place Masséna, with prices below the Carré d'Or.",
      es: "Wilson es un barrio central, denso y animado en torno a su plaza renovada y las calles Pertinax y Gubernatis, a diez minutos a pie de la estación y de la plaza Masséna, con precios inferiores al Carré d'Or.",
      ru: "Уилсон — плотный и оживлённый центральный район вокруг обновлённой площади и улиц Пертинакс и Губернатис, в десяти минутах пешком от вокзала и площади Массена, с ценами ниже, чем в Карре д'Ор.",
    },
    who: "Primo-accédants et jeunes actifs qui veulent le centre à pied, familles qui trouvent ici des trois pièces à prix tenable, et investisseurs sur les petites surfaces pour étudiants et jeunes professionnels.",
    transport: "Entre les stations Jean-Médecin et Gare Thiers de la ligne 1, à cinq ou dix minutes à pied ; la gare de Nice-Ville en dix minutes de marche, la mer en quinze.",
    places: [
      { kind: "bouche", name: "Boulangerie La Niçoise", address: "21 rue Gubernatis", note: "Boulangerie de quartier, spécialités niçoises à emporter le midi." },
      { kind: "restaurant", name: "Les Épicuriens", address: "6 place Wilson", note: "Cuisine mijotée niçoise, institution de la place depuis des années, rapport qualité-prix sûr." },
      { kind: "restaurant", name: "Brasserie Wilson", address: "21 rue de l'Hôtel-des-Postes", note: "Ouverte à l'automne 2025 par un Niçois de quatrième génération : esprit bistrot, formule du jour autour de 18 €." },
      { kind: "cafe", name: "La Cave Wilson", address: "16 rue Gubernatis", note: "Bar à vins de quartier, verre au comptoir, ambiance d'habitués." },
      { kind: "ecole", name: "École maternelle et élémentaire Auber", address: "35 avenue Auber", note: "L'école publique la plus proche de la place, à quelques minutes à pied." },
      { kind: "parc", name: "Jardin de la place Wilson", address: "place Wilson", note: "Jardin et aire de jeux récemment agrandis : le lieu de vie du quartier." },
    ],
    advice: "À Wilson, on achète l'emplacement plus que l'immeuble, et il faut donc regarder l'immeuble deux fois : parties communes, façade, toiture. Un appartement bien tenu dans une copropriété saine se revend ici sans difficulté ; l'inverse se négocie.",
    seo: {
      title: "Wilson, Nice — Prix immobilier, vivre à Wilson, adresses | Sillage Immo",
      description: "Vivre et acheter dans le quartier Wilson (Nice 06000) : prix au m² DVF, place Wilson, rues Pertinax et Gubernatis, commerces, écoles. Le regard de Sillage Immo.",
    },
  },
  {
    slug: "liberation",
    name: "Libération",
    locative: "à Libération",
    tagline: {
      fr: "Le marché, la Gare du Sud et le tram : le quartier le plus niçois de Nice",
      en: "The market, the Gare du Sud and the tram: the most Niçois district of Nice",
      es: "El mercado, la Gare du Sud y el tranvía: el barrio más nizardo de Niza",
      ru: "Рынок, вокзал Гар-дю-Сюд и трамвай: самый ниццкий район Ниццы",
    },
    postalCodes: ["06100", "06000"],
    statsKey: "liberation",
    zoneSlugs: ["liberation"],
    titleHints: ["liberation", "malaussena", "borriglione", "gare du sud", "general de gaulle", "joseph garnier", "michelet", "fuon cauda", "thiole"],
    image: { src: "/quartiers/liberation.jpg", alt: "Les toits du centre de Nice et les collines au nord", credit: "Patryk Kuleta / Unsplash" },
    center: { lat: 43.712, lng: 7.262 },
    paragraphs: [
      "Libération s'est développé entre 1880 et 1945 comme quartier de villégiature autour de l'avenue Malausséna et de l'actuelle place du Général-de-Gaulle, et s'étend vers l'avenue Borriglione et la Gare du Sud. Le bâti est disparate, et c'est sa chance : immeubles bourgeois de belle facture à prix plus doux que dans le Carré d'Or, immeubles niçois plus simples, quelques villas en lisière de Cimiez. Tout s'organise autour du marché quotidien, l'un des plus grands de Nice, où l'on vient de toute la ville.",
      "L'ancienne Gare du Sud, longtemps abandonnée, est devenue en 2019 une halle gourmande ; le tramway s'arrête au pied du marché ; le quartier a gardé son accent et gagné des cafés. Il attire aujourd'hui des jeunes ménages qui veulent une vraie vie de quartier, à cinq minutes de tram de la gare de Nice-Ville.",
    ],
    summary: {
      en: "Libération is Nice's most authentically local district, built around its daily market on Place du Général-de-Gaulle, the Gare du Sud food hall and tram line 1, with bourgeois and Niçois buildings at gentler prices than the centre.",
      es: "Libération es el barrio más auténticamente nizardo, organizado en torno a su mercado diario en la plaza del General de Gaulle, la halle gourmande de la Gare du Sud y la línea 1 del tranvía, con edificios burgueses y nizardos a precios más suaves que en el centro.",
      ru: "Либерасьон — самый по-настоящему местный район Ниццы: ежедневный рынок на площади Генерала де Голля, гастрономический павильон Гар-дю-Сюд и трамвай линии 1, буржуазные и ниццкие дома по ценам мягче, чем в центре.",
    },
    who: "Jeunes familles et jeunes actifs qui veulent le marché en bas de chez eux, étudiants pour la proximité de Valrose, et retraités attachés au caractère du quartier. Le trois pièces avec balcon dans un immeuble bourgeois des années 30 est le bien qui plaît le plus.",
    transport: "Ligne 1 du tramway, station Libération sur l'avenue Malausséna : deux stations de la gare de Nice-Ville, trois de Jean-Médecin.",
    places: [
      { kind: "marche", name: "Marché de la Libération", address: "place du Général-de-Gaulle et rues voisines", note: "Marché alimentaire tous les matins sauf le lundi : fruits, légumes, poissons, producteurs du pays. Le vrai centre du quartier." },
      { kind: "bouche", name: "Le Kiosque Tintin", address: "3 place du Général-de-Gaulle", note: "Le pan-bagnat de référence à Nice, à emporter sur le marché." },
      { kind: "restaurant", name: "La Gauloise", address: "28 avenue Malausséna", note: "Poissons et fruits de mer, installée de longue date sur l'avenue, addition raisonnable." },
      { kind: "restaurant", name: "Brasserie de l'Union", address: "1 rue Michelet", note: "Daube, raviolis maison, cuisine niçoise de tradition : une table de quartier reconnue." },
      { kind: "cafe", name: "L'Altra Casa", address: "2 place de la Gare du Sud", note: "Terrasse sur la place, au cœur du marché ; le rendez-vous du samedi matin." },
      { kind: "ecole", name: "École élémentaire Von Derwies", address: "60 avenue Alfred-Borriglione", note: "L'école publique du secteur Libération – Borriglione." },
      { kind: "culture", name: "Halle de la Gare du Sud", address: "avenue Malausséna", note: "L'ancienne gare des Chemins de fer de Provence, reconvertie en halle gourmande et lieu de sortie." },
    ],
    advice: "Libération est le quartier où les acheteurs viennent chercher la vie de quartier, et ils veulent un balcon ou une terrasse pour en profiter. Un extérieur, même petit, change ici le délai de vente plus que dix mètres carrés de plus.",
    seo: {
      title: "Libération, Nice — Prix immobilier, vivre à Libération, adresses | Sillage Immo",
      description: "Vivre et acheter à Libération (Nice) : prix au m² DVF, marché, Gare du Sud, tramway, commerces et écoles. Le regard de Sillage Immo.",
    },
  },
  {
    slug: "mont-boron",
    name: "Mont Boron",
    locative: "au Mont Boron",
    tagline: {
      fr: "La colline boisée, les deux baies et le silence : le prestige résidentiel de Nice",
      en: "The wooded hill, the two bays and the silence: Nice's residential prestige",
      es: "La colina boscosa, las dos bahías y el silencio: el prestigio residencial de Niza",
      ru: "Лесистый холм, две бухты и тишина: жилой престиж Ниццы",
    },
    postalCodes: ["06300"],
    statsKey: "mont-boron",
    zoneSlugs: ["mont-boron"],
    titleHints: ["mont boron", "mont-boron", "mont alban", "hesperides", "imperatrice eugenie", "germaine"],
    image: { src: "/quartiers/mont-boron.jpg", alt: "La baie des Anges vue depuis les hauteurs du Mont Boron", credit: "Steffen Rehfuß / Unsplash" },
    center: { lat: 43.692, lng: 7.3 },
    paragraphs: [
      "Le Mont Boron est une colline boisée de 57 hectares qui ferme l'est du port, culminant à près de 200 mètres. Le sommet garde une batterie de 1887 et, plus au nord, le fort du Mont Alban veille sur la rade depuis le XVIe siècle ; les deux sont aujourd'hui des espaces naturels traversés par une dizaine de kilomètres de sentiers. Le bâti mêle villas Belle Époque sur l'avenue des Hespérides et le boulevard du Mont-Boron, résidences de standing des années 60 et 70 construites pour la vue, et villas contemporaines sur le versant est.",
      "C'est un quartier presque exclusivement résidentiel : pas de rue commerçante, les courses se font sur le boulevard Carnot ou au port. On y achète le silence, la forêt et une vue à deux baies, celle des Anges et celle de Villefranche, que l'on paie à la hauteur de ce qu'elle est.",
    ],
    summary: {
      en: "Mont Boron is Nice's wooded residential hill above the port: Belle Époque villas, 1960s–70s residences built for the view over the Baie des Anges and Villefranche, forest paths, and no shops — silence is what you buy here.",
      es: "Mont Boron es la colina residencial y boscosa de Niza sobre el puerto: villas Belle Époque, residencias de los años 60-70 construidas para la vista sobre las dos bahías, senderos y ningún comercio: aquí se compra el silencio.",
      ru: "Мон-Борон — лесистый жилой холм над портом Ниццы: виллы Бель-Эпок, резиденции 60–70-х годов, построенные ради вида на две бухты, лесные тропы и никаких магазинов — здесь покупают тишину.",
    },
    who: "Familles pour une villa, cadres internationaux, et acheteurs de résidence secondaire qui veulent la vue sans le bruit. Les appartements avec terrasse et vue mer dans les résidences des années 60-70 sont le cœur du marché ; les villas se vendent entre 1,5 et 3 millions d'euros pour l'essentiel.",
    transport: "Ligne de bus 14 vers le port et le centre ; le port en dix minutes de voiture. Le relief rend la marche peu pratique pour les courses quotidiennes.",
    places: [
      { kind: "bouche", name: "Oceanosa", address: "8 boulevard Carnot", note: "La poissonnerie du bas du Mont Boron, sur l'axe que tout le quartier emprunte pour ses courses." },
      { kind: "restaurant", name: "Le Bistrot du Port", address: "28 quai Lunel", note: "Cuisine méditerranéenne de bonne tenue face aux bateaux, l'adresse du port pour les habitants de la colline." },
      { kind: "restaurant", name: "L'Escale", address: "quai des Deux-Emmanuel", note: "Produits de la mer à prix corrects, régulier, sans mise en scène." },
      { kind: "ecole", name: "École élémentaire Péglion", address: "28 bis avenue Germaine", note: "La seule école publique réellement située sur la colline." },
      { kind: "parc", name: "Parc forestier du Mont Boron", address: "boulevard du Mont-Boron", note: "57 hectares de pins et de chênes verts, sentiers balisés et belvédères sur les deux baies." },
      { kind: "culture", name: "Musée de Terra Amata", address: "25 boulevard Carnot", note: "Le site préhistorique en contrebas de la colline, avec ses foyers vieux de 400 000 ans." },
    ],
    advice: "Au Mont Boron, deux appartements de même surface dans la même résidence peuvent valoir du simple au double : tout est dans la vue, l'étage et la terrasse. Une estimation sérieuse se fait sur place, jamais sur plan.",
    seo: {
      title: "Mont Boron, Nice — Prix immobilier, vivre au Mont Boron | Sillage Immo",
      description: "Vivre et acheter au Mont Boron (Nice 06300) : prix au m² DVF, villas et résidences avec vue mer, forêt, écoles, accès. Le regard de Sillage Immo.",
    },
  },
  {
    slug: "cap-de-nice",
    name: "Cap de Nice",
    locative: "au Cap de Nice",
    tagline: {
      fr: "Maeterlinck, Franck-Pilatte, la Réserve : les pieds dans l'eau, côté Villefranche",
      en: "Maeterlinck, Franck-Pilatte, La Réserve: at the water's edge, on the Villefranche side",
      es: "Maeterlinck, Franck-Pilatte, La Réserve: a pie de agua, del lado de Villefranche",
      ru: "Метерлинк, Франк-Пилат, Ла Резерв: у самой воды, со стороны Вильфранша",
    },
    postalCodes: ["06300"],
    statsKey: "cap-de-nice",
    zoneSlugs: ["cap-de-nice"],
    titleHints: ["cap de nice", "maeterlinck", "jean lorrain", "franck pilatte", "pilatte", "reserve", "coco beach"],
    image: { src: "/quartiers/cap-de-nice.jpg", alt: "La côte rocheuse du Cap de Nice et ses criques", credit: "Maxence Werp / Unsplash" },
    center: { lat: 43.6905, lng: 7.3075 },
    paragraphs: [
      "Le Cap de Nice prolonge le Mont Boron vers Villefranche, entre le boulevard Franck-Pilatte qui longe la mer en corniche, l'avenue Jean-Lorrain et le boulevard Maeterlinck, qui doit son nom à l'écrivain, ancien propriétaire du palais des années 1920 devenu résidence privée. C'est le secteur le plus exclusif de la ville : villas contemporaines avec accès direct à la mer, et grandes résidences de standing des années 60 et 70, piscine et vue frontale sur la baie.",
      "Il n'y a pratiquement aucun commerce : le quartier est purement résidentiel et dépend du bas du Mont Boron et du port pour le quotidien. En contrepartie, le sentier du littoral, les criques rocheuses et la Réserve offrent une baignade que peu d'adresses niçoises peuvent revendiquer depuis chez soi.",
    ],
    summary: {
      en: "Cap de Nice is the city's most exclusive stretch of coast, between Mont Boron and Villefranche: contemporary villas with sea access and 1960s–70s prestige residences with pools, no shops, and rocky creeks reached on foot.",
      es: "Cap de Nice es el tramo de costa más exclusivo de la ciudad, entre Mont Boron y Villefranche: villas contemporáneas con acceso al mar y residencias de lujo de los años 60-70 con piscina, sin comercios, y calas rocosas a pie.",
      ru: "Кап-де-Нис — самый эксклюзивный участок побережья города между Мон-Бороном и Вильфраншем: современные виллы с выходом к морю, престижные резиденции 60–70-х с бассейнами, без магазинов, и скалистые бухты в пешей доступности.",
    },
    who: "La clientèle la plus haut de gamme de Nice, française et internationale, pour une villa les pieds dans l'eau ou un appartement dans une résidence avec piscine : résidence principale de prestige ou pied-à-terre. Les ventes sont peu nombreuses et se font souvent hors marché.",
    transport: "Desserte en bus limitée (ligne 14 par le boulevard du Mont-Boron) ; le port en dix à quinze minutes de voiture par la corniche. Un quartier pensé pour la voiture.",
    places: [
      { kind: "parc", name: "Sentier du littoral et criques du Cap de Nice", address: "boulevard Franck-Pilatte", note: "Le chemin côtier vers Coco Beach et les rochers de la Réserve : la plage du quartier, sans sable et sans foule." },
      { kind: "restaurant", name: "Le Bistrot du Port", address: "28 quai Lunel", note: "L'adresse la plus proche pour une cuisine méditerranéenne sans chichi, au port." },
      { kind: "restaurant", name: "L'Escale", address: "quai des Deux-Emmanuel", note: "Produits de la mer à prix corrects, l'habitude des résidents qui descendent au port." },
      { kind: "bouche", name: "Oceanosa", address: "8 boulevard Carnot", note: "Le Cap n'a pas de commerce : la poissonnerie de référence est en bas du Mont Boron." },
      { kind: "ecole", name: "École élémentaire Péglion", address: "28 bis avenue Germaine", note: "Le Cap dépend du même secteur scolaire public que le Mont Boron." },
    ],
    advice: "Au Cap de Nice, les ventes se comptent sur les doigts d'une main chaque année et les références publiques sont rares : la valeur se construit sur des comparables que seule une agence qui suit ce marché de près peut réunir.",
    seo: {
      title: "Cap de Nice — Prix immobilier, vivre au Cap de Nice | Sillage Immo",
      description: "Vivre et acheter au Cap de Nice (06300) : prix au m² DVF, villas pieds dans l'eau, résidences Maeterlinck et Franck-Pilatte, criques. Le regard de Sillage Immo.",
    },
  },
  {
    slug: "cimiez",
    name: "Cimiez",
    locative: "à Cimiez",
    tagline: {
      fr: "Les arènes, le monastère, Matisse et le Régina : la colline patrimoniale",
      en: "The arena, the monastery, Matisse and the Régina: the heritage hill",
      es: "Las arenas, el monasterio, Matisse y el Régina: la colina patrimonial",
      ru: "Арены, монастырь, Матисс и «Регина»: холм наследия",
    },
    postalCodes: ["06000", "06100"],
    statsKey: "cimiez",
    zoneSlugs: ["cimiez", "valrose"],
    titleHints: ["cimiez", "regina", "arenes", "brancolar", "flirey", "carabacel", "valrose", "bellanda", "caravadossi", "desambrois", "monastere"],
    image: { src: "/quartiers/cimiez.jpg", alt: "Les toits de Nice au coucher du soleil, vers les collines de Cimiez", credit: "Matthew DeBlieux / Unsplash" },
    center: { lat: 43.715, lng: 7.272 },
    paragraphs: [
      "Cimiez occupe la colline au nord du centre, sur le site de Cemenelum, capitale romaine des Alpes-Maritimes dont subsistent les arènes et les thermes dans un parc planté d'oliviers centenaires. Le quartier a pris sa forme à la Belle Époque, quand l'aristocratie européenne — la reine Victoria en tête — en a fait sa villégiature d'hiver : le palace Excelsior Régina, devenu copropriété, et des dizaines de villas et d'immeubles bourgeois bordent le boulevard de Cimiez. Le monastère franciscain, ses jardins et le musée Matisse complètent un ensemble que peu de villes peuvent offrir.",
      "C'est un quartier résidentiel et familial, un peu en retrait de la mer, avec de bonnes écoles, des immeubles anciens à hauts plafonds et des résidences des années 60 et 70 souvent bien tenues, avec parc et piscine. Les hauts de Cimiez et le boulevard côté Régina concentrent les vues et les prix les plus élevés.",
    ],
    summary: {
      en: "Cimiez is Nice's heritage hill north of the centre: Roman arena and olive-tree park, the former Régina palace, Belle Époque villas and 1960s–70s residences with gardens and pools. A family district, quieter and slightly set back from the sea.",
      es: "Cimiez es la colina patrimonial de Niza al norte del centro: arenas romanas y parque de olivos, el antiguo palacio Régina, villas Belle Époque y residencias de los años 60-70 con jardín y piscina. Un barrio familiar, tranquilo, algo apartado del mar.",
      ru: "Симье — холм наследия к северу от центра Ниццы: римские арены и оливковый парк, бывший дворец «Регина», виллы Бель-Эпок и резиденции 60–70-х с садами и бассейнами. Семейный, тихий район чуть в стороне от моря.",
    },
    who: "Familles, professions libérales et retraités attachés au patrimoine et au calme, plus qu'au bord de mer direct. Le grand appartement ancien avec hauteur sous plafond, ou le trois-quatre pièces en résidence avec piscine et parking, sont les biens les plus demandés.",
    transport: "Lignes de bus 5, 15, 25 et 37 sur le boulevard de Cimiez (arrêts Arènes et Musée Matisse), un quart d'heure jusqu'à Masséna ; la mer en dix à quinze minutes de voiture.",
    places: [
      { kind: "bouche", name: "Morin Traiteur", address: "2 boulevard de Cimiez", note: "Le traiteur du bas du boulevard, référence du quartier pour les plats préparés et les réceptions." },
      { kind: "restaurant", name: "Côté Sud", address: "2 rue du Professeur-Maurice-Sureau", note: "Cuisine méditerranéenne de marché, ouverte le midi en semaine et le vendredi soir : l'adresse de quartier." },
      { kind: "cafe", name: "Buvette des Arènes", address: "164 avenue des Arènes-de-Cimiez", note: "La buvette du parc, à côté du musée Matisse : simple, à l'ombre des oliviers." },
      { kind: "ecole", name: "École primaire Cimiez-Essling et collège Roland-Garros", address: "1 avenue Salonina / 10 boulevard de Cimiez", note: "Les établissements publics qui structurent la vie des familles du quartier." },
      { kind: "parc", name: "Parc des Arènes de Cimiez", address: "boulevard de Cimiez", note: "Oliviers centenaires, ruines romaines, jeux d'enfants ; le Nice Jazz Festival y a pris ses quartiers." },
      { kind: "culture", name: "Musée Matisse", address: "164 avenue des Arènes-de-Cimiez", note: "Dans la villa des Arènes du XVIIe siècle, l'une des grandes collections Matisse au monde." },
    ],
    advice: "À Cimiez, la vue mer depuis un immeuble de standing bien orienté fait passer un appartement au-delà de 8 000 €/m², quand la médiane du quartier est à 5 400. Le même appartement sans vue, ou dans une copropriété fatiguée, se vend au prix d'un bon quartier ordinaire. Nous distinguons les deux dès l'estimation.",
    seo: {
      title: "Cimiez, Nice — Prix immobilier, vivre à Cimiez, adresses | Sillage Immo",
      description: "Vivre et acheter à Cimiez (Nice) : prix au m² DVF, Régina, arènes, monastère, résidences avec piscine, écoles et bus. Le regard de Sillage Immo.",
    },
  },
  {
    slug: "fabron",
    name: "Fabron",
    locative: "à Fabron",
    tagline: {
      fr: "Les collines de l'ouest, la vue mer et le tram : le résidentiel familial de Nice",
      en: "The western hills, the sea view and the tram: Nice's family residential district",
      es: "Las colinas del oeste, la vista al mar y el tranvía: el barrio residencial familiar de Niza",
      ru: "Западные холмы, вид на море и трамвай: семейный жилой район Ниццы",
    },
    postalCodes: ["06200"],
    statsKey: "fabron",
    zoneSlugs: ["fabron"],
    titleHints: ["fabron", "terron", "carlone", "lanterne", "sainte marguerite", "archet", "gattamua", "petit fabron"],
    image: { src: "/quartiers/fabron.jpg", alt: "Un arbre penché sur la mer turquoise, sur la côte niçoise", credit: "Yash Shah / Unsplash" },
    center: { lat: 43.6935, lng: 7.226 },
    paragraphs: [
      "Fabron occupe les collines de l'ouest de Nice, entre la mer et la Corniche Fleurie. Villégiature de familles fortunées dès le XIXe siècle — le Palais de Marbre abrite aujourd'hui les Archives municipales —, le quartier s'est couvert après-guerre de résidences des années 60 à 80 avec piscine, parc et gardien, qui restent la signature du secteur, entre quelques villas anciennes et des maisons individuelles sur les hauteurs.",
      "L'arrivée de la ligne 2 du tramway, avec sa station Fabron, a changé la donne : le centre et l'aéroport sont à un quart d'heure, sans voiture. Le parc Carol-de-Roumanie, les écoles et le padel d'Ultra Fabron donnent au quartier une vie de famille que le bord de mer n'offre pas.",
    ],
    summary: {
      en: "Fabron is Nice's western hillside district: 1960s–80s residences with pools and gardens, sea views, family life, and tram line 2 that now links it to the centre and the airport in fifteen minutes.",
      es: "Fabron es el barrio de las colinas del oeste de Niza: residencias de los años 60-80 con piscina y jardín, vistas al mar, vida familiar y la línea 2 del tranvía, que lo une al centro y al aeropuerto en quince minutos.",
      ru: "Фаброн — район западных холмов Ниццы: резиденции 60–80-х с бассейнами и садами, вид на море, семейная жизнь и трамвай линии 2, соединяющий его с центром и аэропортом за пятнадцать минут.",
    },
    who: "Familles et cadres actifs séduits par la vue, le calme et les résidences avec piscine à un prix contenu, retraités propriétaires de longue date, et quelques acheteurs internationaux. Le trois ou quatre pièces avec terrasse, parking et piscine est le bien type.",
    transport: "Ligne 2 du tramway, station Fabron : un quart d'heure jusqu'au centre et jusqu'à l'aéroport ; bus vers les collines et Nice-Ouest.",
    places: [
      { kind: "restaurant", name: "Chez Cane", address: "317 avenue de Fabron", note: "Cuisine niçoise et méditerranéenne généreuse, institution familiale de l'avenue." },
      { kind: "restaurant", name: "La Pignata Côte d'Azur", address: "244 avenue de Fabron", note: "Table de quartier sur l'avenue, cuisine simple et régulière, pour les soirs de semaine." },
      { kind: "ecole", name: "École primaire Fabron – La Lanterne", address: "chemin de la Lanterne", note: "Maternelle et élémentaire publiques de secteur." },
      { kind: "parc", name: "Parc Carol-de-Roumanie", address: "avenue de Fabron", note: "2,3 hectares de pelouses et de pins, le lieu de promenade du quartier." },
      { kind: "sport", name: "Ultra Fabron", address: "279 avenue de Fabron", note: "Padel et foot à cinq : le rendez-vous des familles et des actifs des collines." },
    ],
    advice: "À Fabron, le prix se fait sur la résidence autant que sur l'appartement : charges, piscine, gardien, parking et surtout vue mer. Deux trois-pièces identiques sur le papier peuvent s'écarter de 30 % selon l'étage et l'orientation.",
    seo: {
      title: "Fabron, Nice — Prix immobilier, vivre à Fabron, adresses | Sillage Immo",
      description: "Vivre et acheter à Fabron (Nice 06200) : prix au m² DVF, résidences avec piscine et vue mer, tram ligne 2, écoles, parc. Le regard de Sillage Immo.",
    },
  },
  {
    slug: "gairaut",
    name: "Gairaut",
    locative: "à Gairaut",
    tagline: {
      fr: "Villas, oliviers et la cascade : la campagne à un quart d'heure du centre",
      en: "Villas, olive trees and the waterfall: countryside fifteen minutes from the centre",
      es: "Villas, olivos y la cascada: el campo a un cuarto de hora del centro",
      ru: "Виллы, оливы и водопад: сельская местность в пятнадцати минутах от центра",
    },
    postalCodes: ["06100"],
    statsKey: "gairaut",
    zoneSlugs: ["gairaut"],
    titleHints: ["gairaut", "rimiez", "corniche azur", "chateaurenard", "rosemont", "aspremont", "piol", "saint sylvestre"],
    image: { src: "/quartiers/gairaut.jpg", alt: "Les collines boisées au nord de Nice et les Préalpes", credit: "Jamie Street / Unsplash" },
    center: { lat: 43.737, lng: 7.265 },
    paragraphs: [
      "Gairaut est le quartier des collines nord de Nice, longtemps couvert d'oliveraies, qui a gardé un caractère de village malgré l'urbanisation en villas. Sa cascade, un bassin et une chute artificielle de style Belle Époque surmontés d'un chalet alpin, a été construite en 1883 pour célébrer l'arrivée de l'eau de la Vésubie ; l'église Saint-Sauveur et le vieux chemin de Gairaut complètent un patrimoine discret, à l'écart de l'agitation.",
      "Ici, on achète une maison avec un jardin et une vue sur la ville et la mer, à un quart d'heure de voiture du centre. Les appartements existent, dans des résidences des années 70 et 80 sur l'avenue de Rimiez ou à Saint-Sylvestre, mais le marché de Gairaut est d'abord celui de la villa familiale.",
    ],
    summary: {
      en: "Gairaut is Nice's northern hillside village: family villas with gardens and views over the city and the sea, olive trees, the Belle Époque waterfall, and the centre fifteen minutes away by car. A house market more than an apartment one.",
      es: "Gairaut es el pueblo de las colinas del norte de Niza: villas familiares con jardín y vistas a la ciudad y al mar, olivos, la cascada Belle Époque y el centro a quince minutos en coche. Un mercado de casas más que de pisos.",
      ru: "Гэро — деревня на северных холмах Ниццы: семейные виллы с садами и видом на город и море, оливы, водопад эпохи Бель-Эпок и центр в пятнадцати минутах на машине. Рынок скорее домов, чем квартир.",
    },
    who: "Familles qui veulent une maison et un jardin sans quitter Nice, et retraités en quête de calme et de vue. Les villas se vendent le plus souvent entre 700 000 et 1,5 million d'euros ; les plus belles, avec vue et terrain, bien au-delà.",
    transport: "Lignes de bus 11 et 63 vers Borriglione et le centre, une vingtaine de minutes ; la voiture reste indispensable au quotidien.",
    places: [
      { kind: "restaurant", name: "Au Rendez-Vous des Amis", address: "176 avenue de Rimiez", note: "Cuisine niçoise et provençale de famille, la référence des collines depuis des décennies." },
      { kind: "restaurant", name: "Restaurant Simon", address: "182 avenue de Rimiez", note: "Raviolis maison, daube, vue sur les collines : la table des familles du secteur." },
      { kind: "bouche", name: "Les commerces de l'avenue de Rimiez", address: "avenue de Rimiez", note: "Gairaut proprement dit n'a presque pas de commerce ; on descend à Rimiez pour le pain, le journal et le primeur." },
      { kind: "ecole", name: "École primaire La Gairautine", address: "190 avenue de Gairaut", note: "Maternelle et élémentaire publiques du quartier." },
      { kind: "parc", name: "Cascade de Gairaut", address: "avenue du Piol", note: "Le bassin, la chute et le chalet de 1883, en accès libre : la promenade du quartier." },
    ],
    advice: "À Gairaut, le prix au mètre carré ne veut rien dire : un terrain, une vue et un accès plat comptent plus que la surface bâtie. Nous estimons les maisons des collines comme des maisons, pas comme des appartements.",
    seo: {
      title: "Gairaut, Nice — Prix immobilier, vivre à Gairaut, villas | Sillage Immo",
      description: "Vivre et acheter à Gairaut (Nice 06100) : prix DVF des villas et appartements, cascade, école, accès. Le regard de Sillage Immo sur les collines nord.",
    },
  },
  {
    slug: "promenade-des-anglais",
    name: "Promenade des Anglais",
    locative: "sur la Promenade des Anglais",
    tagline: {
      fr: "Du Negresco à Magnan : le front de mer, ses palais et ses quartiers de vie",
      en: "From the Negresco to Magnan: the seafront, its palaces and its residential districts",
      es: "Del Negresco a Magnan: el paseo marítimo, sus palacios y sus barrios de vida",
      ru: "От «Негреско» до Маньяна: набережная, её дворцы и жилые кварталы",
    },
    postalCodes: ["06000", "06200"],
    statsKey: "promenade-des-anglais",
    zoneSlugs: ["promenade-des-anglais", "magnan", "californie", "carras"],
    titleHints: ["promenade des anglais", "promenade", "negresco", "magnan", "californie", "carras", "lenval", "rue de france", "baie des anges"],
    image: { src: "/quartiers/promenade-des-anglais.jpg", alt: "La Promenade des Anglais et la baie des Anges vers l'ouest", credit: "Danilo Pantalena / Unsplash" },
    center: { lat: 43.6905, lng: 7.245 },
    paragraphs: [
      "La Promenade des Anglais court sur sept kilomètres le long de la baie des Anges, du Negresco et des immeubles Belle Époque du centre jusqu'aux quartiers de Magnan, Lenval, la Californie et Carras à l'ouest. Le bâti raconte cette progression : palais et immeubles bourgeois du début du XXe siècle près du centre, résidences des années 60 et 70 face à la mer, programmes récents en s'éloignant. Le vallon obscur de Magnan, creusé dans la roche à deux pas du front de mer, rappelle que la ville s'est construite sur des collines.",
      "La Prom elle-même a été réaménagée pour les piétons et les vélos sur tout son linéaire, et le tramway ligne 2 a son terminus ouest à Magnan. Il faut lire ce quartier en deux marchés : le front de mer proprement dit, où les prix montent nettement, et les rues en retrait, où l'on retrouve des prix de quartier ordinaire, la plage en prime.",
    ],
    summary: {
      en: "The Promenade des Anglais district runs from the Negresco to Magnan and Carras: Belle Époque palaces and 1960s–70s residences facing the sea, with more ordinary prices one street back. Two markets in one: the seafront, and the neighbourhoods behind it.",
      es: "El barrio del Paseo de los Ingleses va del Negresco a Magnan y Carras: palacios Belle Époque y residencias de los años 60-70 frente al mar, con precios más corrientes una calle atrás. Dos mercados en uno: el frente marítimo y los barrios detrás.",
      ru: "Район Английской набережной тянется от «Негреско» до Маньяна и Карраса: дворцы Бель-Эпок и резиденции 60–70-х лицом к морю, а на улицу дальше — обычные цены. Два рынка в одном: первая линия и кварталы за ней.",
    },
    who: "Sur le front de mer, acheteurs de résidence secondaire et investisseurs, français et internationaux, pour la vue et l'adresse ; dans les rues en retrait, familles et actifs qui veulent la plage à pied à un prix de quartier. Le deux ou trois pièces avec balcon vue mer est le bien emblématique.",
    transport: "Ligne 2 du tramway, terminus Magnan, quinze minutes jusqu'au centre et jusqu'à l'aéroport ; bus tout le long de la Promenade ; vélo et marche sur le front de mer aménagé.",
    places: [
      { kind: "bouche", name: "Le Fournil de Magnan", address: "3 avenue de la Californie", note: "Boulangerie indépendante à l'angle de Magnan, le pain du quartier." },
      { kind: "restaurant", name: "Brasserie Le Magnan", address: "1 avenue de la Californie", note: "Tenue par la même famille niçoise depuis 1987, plats du jour à prix d'ami : l'adresse des habitants." },
      { kind: "restaurant", name: "Le Voilier Plage", address: "58 promenade des Anglais", note: "Restaurant de plage familial et abordable, loin des tarifs des établissements voisins." },
      { kind: "ecole", name: "École élémentaire Sainte-Hélène", address: "16 avenue Val-Marie", note: "L'école publique la plus proche du secteur Magnan – Californie." },
      { kind: "parc", name: "Plage publique de Magnan", address: "137 promenade des Anglais", note: "La plage libre et gratuite des riverains, avec ses terrains de volley et ses paddles." },
      { kind: "parc", name: "Parc Carol-de-Roumanie", address: "avenue de Fabron", note: "Le grand parc de l'ouest niçois, à dix minutes à pied des rues de Magnan." },
    ],
    advice: "Sur la Promenade, l'adresse sur la Prom se paie entre 30 et 50 % de plus que la même surface une rue derrière, et le tronçon Negresco – Albert-Ier vaut encore un cran au-dessus. Nous vérifions toujours le règlement de copropriété : certaines résidences du front de mer limitent la location courte durée, et cela change la valeur pour un investisseur.",
    seo: {
      title: "Promenade des Anglais, Nice — Prix immobilier, front de mer, Magnan | Sillage Immo",
      description: "Vivre et acheter sur la Promenade des Anglais et à Magnan, Californie, Carras : prix au m² DVF du front de mer et des rues en retrait, tram ligne 2, écoles, plages. Le regard de Sillage Immo.",
    },
  },
];

export const getQuartier = (slug: string) => QUARTIERS.find((q) => q.slug === slug) ?? null;

import { QUARTIER_TRANSLATIONS } from "./translations";

export type QuartierContent = {
  paragraphs: string[];
  who: string;
  transport: string;
  advice: string;
  places: (QuartierPlace & { mapsUrl: string })[];
};

/** Lien Google Maps de l'établissement (recherche nom + adresse, sans clé API). */
export const buildMapsUrl = (place: QuartierPlace) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}, Nice`)}`;

/** Contenu éditorial dans la langue demandée, avec repli sur le français. */
export const getQuartierContent = (quartier: Quartier, locale: AppLocale): QuartierContent => {
  const translated = locale === "fr" ? null : QUARTIER_TRANSLATIONS[locale]?.[quartier.slug] ?? null;
  return {
    paragraphs: translated?.paragraphs ?? quartier.paragraphs,
    who: translated?.who ?? quartier.who,
    transport: translated?.transport ?? quartier.transport,
    advice: translated?.advice ?? quartier.advice,
    places: quartier.places.map((place) => ({
      ...place,
      note: translated?.notes[place.name] ?? place.note,
      mapsUrl: buildMapsUrl(place),
    })),
  };
};
