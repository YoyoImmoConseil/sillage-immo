import type { AppLocale } from "@/lib/i18n/config";

/**
 * Traductions du contenu éditorial des pages quartiers (source : lib/quartiers/data.ts, en français).
 * `notes` est indexé par le nom du lieu.
 */
export type QuartierTranslation = {
  paragraphs: string[];
  who: string;
  transport: string;
  advice: string;
  notes: Record<string, string>;
};

export const QUARTIER_TRANSLATIONS: Record<Exclude<AppLocale, "fr">, Record<string, QuartierTranslation>> = {
  "en": {
    "riquier": {
      "paragraphs": [
        "Riquier was once a suburb of kitchen gardens and workshops, built up when Nice's port began to thrive in the 18th century. The buildings that dominate today date from the 1920s and 1930s: four- to six-storey Niçois blocks, ochre or beige façades, running balconies, with a few more ambitious ensembles such as the Palais de l'Esplanade. The neighbourhood is organised around Place Max-Barel, Boulevard Risso and Rue Arson, and runs up against Nice-Riquier station to the north-east.",
        "This is a neighbourhood that lives at street level: bakeries, greengrocers, corner cafés, schools within walking distance. Long very built-up and busy with traffic, it is changing with the green walkway extended from the Paillon and the gradual return of shops to the ground floors. You're a quarter of an hour's walk from the port and Place Garibaldi, ten minutes by tram from the centre, and a step from the trains to Monaco and Menton.",
        "Sillage Immo is based on Rue Arson, in the heart of the neighbourhood. We sell and let here all year round, and we know what a ground-floor flat on the street is worth compared with a top floor over the courtyard, in the same building."
      ],
      "who": "Families and young professionals who want the centre without paying centre prices, and investors banking on the station, the nearby port and the ongoing renovation. The typical property is a two- or three-room 1930s flat with a balcony; family-sized homes are scarcer.",
      "transport": "Tramway Line 1, Vauban and Garibaldi stops, a few minutes' walk; Nice-Riquier railway station (regional trains to Monaco, Menton and Cannes); the sea at the port fifteen minutes on foot.",
      "advice": "In Riquier, everything comes down to the building: two addresses fifty metres apart can differ by €1,500/m² depending on the state of the common areas, the lift and the aspect. We sell what we know, street by street.",
      "notes": {
        "Panification de Riquier": "The neighbourhood bakery, two doors from the agency. Sourdough bread, queues in the morning.",
        "La Table à Julie": "Unfussy market cooking, a short chalkboard menu, neighbourhood prices. Where the locals go for lunch.",
        "Le Niçois": "A family table on the boulevard: Niçois dishes, generous portions, no-frills service.",
        "Nicéa Café": "The terrace on the square, between the school run and the way to the station.",
        "École élémentaire Risso et collège Antoine-Risso": "The area's state primary and secondary school, adjoining, on the neighbourhood's historic axis.",
        "Coulée verte de Riquier": "The recent extension of the Paillon promenade: 6,000 m² of planting, the neighbourhood's first proper green space."
      }
    },
    "saint-roch": {
      "paragraphs": [
        "Saint-Roch was a plain of orange groves and kitchen gardens along the Paillon before the railway and the gasworks turned it, at the turn of the 20th century, into a working-class quarter. Its boulevard, cut through in 1936 at thirty metres wide and planted with plane trees, remains the widest in Nice. The neighbourhood was heavily bombed in May 1944 and then rebuilt: the buildings mix 1950s-70s blocks, a handful of older low-rise buildings, and recent developments around the tramway.",
        "This is the part of eastern Nice that has changed most since Line 1 arrived: Saint-Roch and Vauban stops, the university at Saint-Jean-d'Angély, the green walkway, and the municipal pool and stadium. It remains a working-class, lively quarter, with a real boulevard life and prices that stay, by some distance, the most accessible ten minutes by tram from the centre."
      ],
      "who": "First-time buyers and young professionals who work in the town centre, families looking for more space for the same budget, and investors drawn by student demand around Saint-Jean-d'Angély. The typical property is a 1960s three-room flat with a balcony and a cellar.",
      "transport": "Tramway Line 1, Saint-Roch and Vauban stops: ten minutes to Nice-Ville station, a quarter of an hour to Masséna and the sea.",
      "advice": "Saint-Roch is the neighbourhood where the gap between a well-kept building and a neglected one shows up most clearly in the price. Check the render, the shared boiler and the AGM minutes before the asking price: that's where the good deal is made, or the bad one.",
      "notes": {
        "Les Délices de Saint-Roch": "A neighbourhood bakery known for its signature loaf; people come from the surrounding streets for it.",
        "L'Espresso": "Daube, gnocchi, ravioli: Niçois cooking at neighbourhood prices, with specials that change daily.",
        "Ma Cave": "Family cooking with set dishes depending on the day — paella, couscous, aïoli. A boulevard institution.",
        "L'Entre Nous": "A tea room and neighbourhood café, homemade produce, the local stopping point.",
        "Écoles Saint-Roch 1 et 2 (élémentaires) et maternelle Saint-Roch": "The neighbourhood's state schools, adjoining, within walking distance of the whole area.",
        "Piscine Saint-Roch": "A municipal facility left over from the post-war rebuilding, still very well used."
      }
    },
    "le-port": {
      "paragraphs": [
        "Port Lympia was dug from 1748 under Charles Emmanuel III, and its basin remains the departure point for ferries to Corsica. It is lined with Ligurian-style buildings with ochre-red façades and ornate balconies, in a symmetrical composition overlooked by the church of Notre-Dame-du-Port. Behind it, Place Garibaldi, the oldest of Nice's great squares, was fully renovated when the tramway arrived; Rue Bonaparte, Rue Cassini and Place du Pin form what locals call the Petit Marais, with its terraces, cellar bars and antique dealers.",
        "In ten years the neighbourhood has gained what others take thirty to achieve: a young clientele, an evening scene, restaurants that count, and prices that have followed. Yet it remains a real neighbourhood, with its schools, its Monday flea market on Place Garibaldi towards Cours Saleya, its fishing boats in the basin, and Vieux-Nice and the sea five minutes' walk away."
      ],
      "who": "Young professionals and couples after character and neighbourhood life, pied-à-terre buyers, and investors in small flats to renovate. A two-room flat with a balcony in a Ligurian building is the property that moves fastest, provided it is priced right from day one.",
      "transport": "Tramway Line 1, Garibaldi stop; Vieux-Nice and the Promenade five to ten minutes' walk away; Nice-Ville station ten minutes by tram.",
      "advice": "At the Port, a view over the basin comes at a price, but aspect matters just as much: a south-facing flat on the quay with double glazing has nothing to do with an equivalent on a narrow street behind it. We've sold here in ten days; it's a neighbourhood where the right price gets known fast.",
      "notes": {
        "Fromagerie Bonaparte": "The neighbourhood's cheese cellar, supplier to several nearby tables.",
        "La Socca d'Or": "Socca, pissaladière, pan-bagnat, salade niçoise: a wholly Niçois institution, at institution prices.",
        "Brasserie Le Garibaldi": "The square's brasserie, traditional cooking and reasonable prices under the arcades.",
        "Café de la Place": "The square's popular terrace, favoured by residents more than tourists.",
        "Groupe scolaire Jousé-Garibaldi – Port": "The area's state nursery and primary school, closest to the port's buildings.",
        "Théâtre National de Nice – Les Franciscains": "The national theatre, a stone's throw from the Garibaldi stop."
      }
    },
    "carre-dor": {
      "paragraphs": [
        "The Carré d'Or was built between 1880 and 1930, when Nice was Europe's winter resort of choice: grand Belle Époque bourgeois buildings, a few Art Deco façades, mosaic-floored entrance halls and period lifts. It sits between Boulevard Victor-Hugo, Boulevard Gambetta, Avenue Jean-Médecin and the Promenade des Anglais. Rue Paradis and Rue de France concentrate the shops, the Masséna museum and its garden offer a breathing space, and the Musiciens quarter, around Avenue Auber and Rue Berlioz, keeps a quieter, more residential life.",
        "This is the most liquid neighbourhood in Nice: local, French and international demand all year round, professional practices on the ground floor, and a genuine scarcity of large dual-aspect flats. In the evening, away from the main streets, it turns surprisingly quiet."
      ],
      "who": "Executives, professionals, well-off retirees and an international clientele, both as a main residence and a pied-à-terre. A bourgeois three-room flat with high ceilings is the sought-after property; a large renovated dual-aspect flat sells before it's even listed.",
      "transport": "Tramway Line 1, Masséna and Jean-Médecin stops; Nice-Ville station and the Promenade under ten minutes' walk away.",
      "advice": "In the Carré d'Or, the floor and the light make the price, not the street. A first floor over a dark courtyard and a fourth-floor dual-aspect flat can differ by half within the same building. It's also the neighbourhood where an over-ambitious valuation costs the most: buyers compare everything.",
      "notes": {
        "Café des Musiciens": "Bib Gourmand 2026, unpretentious market cooking: the Musiciens quarter's table, book ahead.",
        "Casa Nissa": "Niçois and Mediterranean cooking, a shaded terrace, a few steps from Place Masséna.",
        "École maternelle et élémentaire Auber": "The state school serving the Musiciens – Carré d'Or area, with a canteen.",
        "Jardin du musée Masséna": "The Belle Époque garden open to the public, the neighbourhood's only real green space; the museum is free."
      }
    },
    "wilson": {
      "paragraphs": [
        "Around Place Wilson and Rue Pertinax, Rue Assalit and Rue Gubernatis, the neighbourhood forms the link between the shopping centre around Jean-Médecin and the slopes of Carabacel. The buildings are classic Niçois, 1900-1930, denser and plainer than in the neighbouring Carré d'Or: four to six storeys, stone staircases, narrow courtyards, ground floors occupied by local shops, wine merchants and small brasseries.",
        "The square itself has been redone, with its garden and play area enlarged, and it has once again become the heart of a tight-knit neighbourhood life. You're ten minutes' walk from the station, Place Masséna and the green walkway, without the tourist pressure of the seafront. It's the compromise many buyers are after: the centre, on foot, for less."
      ],
      "who": "First-time buyers and young professionals who want the centre on foot, families who find affordable three-room flats here, and investors in small flats for students and young professionals.",
      "transport": "Between the Jean-Médecin and Gare Thiers stops on Line 1, five to ten minutes' walk away; Nice-Ville station ten minutes on foot, the sea in fifteen.",
      "advice": "In Wilson, you're buying the location more than the building, so the building needs a second look: common areas, façade, roof. A well-kept flat in a sound building sells here without difficulty; the opposite gets negotiated down.",
      "notes": {
        "Boulangerie La Niçoise": "A neighbourhood bakery, Niçois specialities to take away at lunchtime.",
        "Les Épicuriens": "Slow-cooked Niçois dishes, an institution on the square for years, reliably good value.",
        "Brasserie Wilson": "Opened in autumn 2025 by a fourth-generation Niçois: bistro spirit, a set menu around €18.",
        "La Cave Wilson": "A neighbourhood wine bar, a glass at the counter, a regulars' atmosphere.",
        "École maternelle et élémentaire Auber": "The state school closest to the square, a few minutes' walk away.",
        "Jardin de la place Wilson": "A garden and play area recently enlarged: the neighbourhood's meeting place."
      }
    },
    "liberation": {
      "paragraphs": [
        "Libération developed between 1880 and 1945 as a resort quarter around Avenue Malausséna and what is now Place du Général-de-Gaulle, and extends towards Avenue Borriglione and the Gare du Sud. The buildings are a mixed bag, and that's its strength: handsome bourgeois buildings at gentler prices than in the Carré d'Or, plainer Niçois blocks, a few villas on the edge of Cimiez. Everything is organised around the daily market, one of the largest in Nice, drawing people from across the city.",
        "The old Gare du Sud, long abandoned, became a food hall in 2019; the tramway stops at the foot of the market; the neighbourhood has kept its accent and gained cafés. It now draws young households after a real neighbourhood life, five minutes by tram from Nice-Ville station."
      ],
      "who": "Young families and young professionals who want the market on their doorstep, students for the proximity to Valrose, and retirees attached to the neighbourhood's character. A three-room flat with a balcony in a 1930s bourgeois building is the most sought-after property.",
      "transport": "Tramway Line 1, Libération stop on Avenue Malausséna: two stops from Nice-Ville station, three from Jean-Médecin.",
      "advice": "Libération is the neighbourhood where buyers come looking for neighbourhood life, and they want a balcony or a terrace to enjoy it. Outdoor space, even a small one, changes the time it takes to sell here more than an extra ten square metres does.",
      "notes": {
        "Marché de la Libération": "A food market every morning except Monday: fruit, vegetables, fish, local producers. The real heart of the neighbourhood.",
        "Le Kiosque Tintin": "The benchmark pan-bagnat in Nice, to take away at the market.",
        "La Gauloise": "Fish and seafood, long established on the avenue, reasonable prices.",
        "Brasserie de l'Union": "Daube, homemade ravioli, traditional Niçois cooking: a well-known neighbourhood table.",
        "L'Altra Casa": "A terrace on the square, in the heart of the market; the Saturday-morning meeting point.",
        "École élémentaire Von Derwies": "The state school for the Libération – Borriglione area.",
        "Halle de la Gare du Sud": "The old Chemins de fer de Provence station, converted into a food hall and evening spot."
      }
    },
    "mont-boron": {
      "paragraphs": [
        "Mont Boron is a wooded hill of 57 hectares closing off the east side of the port, rising to almost 200 metres. The summit still has an 1887 gun battery and, further north, the Fort du Mont Alban has watched over the bay since the 16th century; both are now natural areas crossed by some ten kilometres of trails. The buildings mix Belle Époque villas on Avenue des Hespérides and Boulevard du Mont-Boron, upscale 1960s-70s residences built for the view, and contemporary villas on the eastern slope.",
        "This is an almost entirely residential neighbourhood: no shopping street, with errands done on Boulevard Carnot or at the port. Here you're buying silence, forest, and a view over two bays, the Baie des Anges and Villefranche, priced at what it's worth."
      ],
      "who": "Families after a villa, international executives, and second-home buyers who want the view without the noise. Flats with a terrace and sea view in the 1960s-70s residences are the heart of the market; villas mostly sell between €1.5 and €3 million.",
      "transport": "Bus line 14 to the port and the centre; the port ten minutes by car. The terrain makes walking impractical for daily errands.",
      "advice": "On Mont Boron, two flats of the same size in the same residence can be worth twice as much as each other: it's all in the view, the floor and the terrace. A serious valuation is done on site, never from a floor plan.",
      "notes": {
        "Oceanosa": "The fishmonger at the foot of Mont Boron, on the road the whole neighbourhood takes for its shopping.",
        "Le Bistrot du Port": "Solid Mediterranean cooking facing the boats, the port address for the hill's residents.",
        "L'Escale": "Seafood at fair prices, reliable, no frills.",
        "École élémentaire Péglion": "The only state school actually located on the hill.",
        "Parc forestier du Mont Boron": "57 hectares of pines and holm oaks, waymarked trails and viewpoints over both bays.",
        "Musée de Terra Amata": "The prehistoric site at the foot of the hill, with hearths 400,000 years old."
      }
    },
    "cap-de-nice": {
      "paragraphs": [
        "Cap de Nice extends Mont Boron towards Villefranche, between Boulevard Franck-Pilatte, which follows the sea along the corniche, Avenue Jean-Lorrain and Boulevard Maeterlinck, named after the writer, once the owner of the 1920s palace now a private residence. This is the most exclusive part of the city: contemporary villas with direct sea access, and grand upscale 1960s-70s residences with a pool and a full view over the bay.",
        "There is practically no shopping: the neighbourhood is purely residential and relies on the foot of Mont Boron and the port for everyday needs. In return, the coastal path, the rocky coves and the Réserve offer swimming that few addresses in Nice can claim right from their doorstep."
      ],
      "who": "Nice's most high-end clientele, French and international, after a villa with direct sea access or a flat in a residence with a pool: a prestige main residence or a pied-à-terre. Sales are few and often happen off-market.",
      "transport": "Limited bus service (line 14 via Boulevard du Mont-Boron); the port ten to fifteen minutes by car along the corniche. A neighbourhood built around the car.",
      "advice": "At Cap de Nice, sales can be counted on one hand each year and public reference points are rare: value is built on comparables that only an agency following this market closely can gather.",
      "notes": {
        "Sentier du littoral et criques du Cap de Nice": "The coastal path towards Coco Beach and the rocks of the Réserve: the neighbourhood's beach, without sand and without crowds.",
        "Le Bistrot du Port": "The nearest address for unfussy Mediterranean cooking, at the port.",
        "L'Escale": "Seafood at fair prices, the habit of residents who go down to the port.",
        "Oceanosa": "The Cap has no shops of its own: the go-to fishmonger is at the foot of Mont Boron.",
        "École élémentaire Péglion": "The Cap falls under the same state school catchment as Mont Boron."
      }
    },
    "cimiez": {
      "paragraphs": [
        "Cimiez occupies the hill north of the centre, on the site of Cemenelum, Roman capital of the Alpes-Maritimes, of which the arena and baths survive in a park planted with century-old olive trees. The neighbourhood took its present form in the Belle Époque, when the European aristocracy — Queen Victoria foremost among them — made it their winter resort: the Excelsior Régina palace hotel, now divided into flats, and dozens of villas and bourgeois buildings line Boulevard de Cimiez. The Franciscan monastery, its gardens and the Matisse museum complete an ensemble few cities can offer.",
        "This is a residential, family neighbourhood, set back a little from the sea, with good schools, old buildings with high ceilings and often well-kept 1960s-70s residences with grounds and a pool. The upper part of Cimiez and the boulevard on the Régina side have the best views and the highest prices."
      ],
      "who": "Families, professionals and retirees drawn to heritage and quiet more than to the seafront itself. The most sought-after properties are large old flats with high ceilings, or three- to four-room flats in a residence with a pool and parking.",
      "transport": "Bus lines 5, 15, 25 and 37 on Boulevard de Cimiez (Arènes and Musée Matisse stops), a quarter of an hour to Masséna; the sea ten to fifteen minutes by car.",
      "advice": "In Cimiez, a sea view from a well-oriented, upscale building can take a flat above €8,000/m², against a neighbourhood median of €5,400. The same flat without a view, or in a tired building, sells at the price of a good ordinary neighbourhood. We distinguish between the two from the very first valuation.",
      "notes": {
        "Morin Traiteur": "The caterer at the bottom of the boulevard, the neighbourhood's go-to for prepared dishes and receptions.",
        "Côté Sud": "Mediterranean market cooking, open for lunch on weekdays and Friday evening: the local address.",
        "Buvette des Arènes": "The park's refreshment kiosk, next to the Matisse museum: simple, in the shade of the olive trees.",
        "École primaire Cimiez-Essling et collège Roland-Garros": "The state schools that anchor family life in the neighbourhood.",
        "Parc des Arènes de Cimiez": "Century-old olive trees, Roman ruins, a children's play area; home to the Nice Jazz Festival.",
        "Musée Matisse": "In the 17th-century Villa des Arènes, one of the world's great Matisse collections."
      }
    },
    "fabron": {
      "paragraphs": [
        "Fabron occupies the hills of western Nice, between the sea and the Corniche Fleurie. A resort for wealthy families from the 19th century onwards — the Palais de Marbre now houses the municipal archives — the neighbourhood filled up after the war with 1960s-80s residences with a pool, grounds and a caretaker, which remain the area's hallmark, alongside a few older villas and detached houses on the heights.",
        "The arrival of tramway Line 2, with its Fabron stop, has changed things: the centre and the airport are a quarter of an hour away, without a car. Parc Carol-de-Roumanie, the schools and the padel courts at Ultra Fabron give the neighbourhood a family life the seafront doesn't offer."
      ],
      "who": "Families and working professionals drawn by the view, the quiet and residences with a pool at a contained price, long-standing retired owners, and a few international buyers. A three- or four-room flat with a terrace, parking and a pool is the typical property.",
      "transport": "Tramway Line 2, Fabron stop: a quarter of an hour to the centre and to the airport; buses towards the hills and western Nice.",
      "advice": "In Fabron, the price is made by the residence as much as by the flat: service charges, pool, caretaker, parking and, above all, sea view. Two three-room flats identical on paper can differ by 30% depending on the floor and the aspect.",
      "notes": {
        "Chez Cane": "Generous Niçois and Mediterranean cooking, a family institution on the avenue.",
        "La Pignata Côte d'Azur": "A neighbourhood table on the avenue, simple, reliable cooking, for weeknight dinners.",
        "École primaire Fabron – La Lanterne": "The area's state nursery and primary school.",
        "Parc Carol-de-Roumanie": "2.3 hectares of lawns and pines, the neighbourhood's walking spot.",
        "Ultra Fabron": "Padel and five-a-side football: the meeting point for families and working residents of the hills."
      }
    },
    "gairaut": {
      "paragraphs": [
        "Gairaut is the neighbourhood of the northern hills of Nice, long covered in olive groves, which has kept a village character despite the spread of villas. Its cascade, a Belle Époque basin and artificial waterfall topped with an alpine chalet, was built in 1883 to celebrate the arrival of water from the Vésubie; the church of Saint-Sauveur and the old Chemin de Gairaut round off a quiet heritage, away from the bustle.",
        "Here, you buy a house with a garden and a view over the city and the sea, a quarter of an hour by car from the centre. Flats exist, in 1970s-80s residences on Avenue de Rimiez or in Saint-Sylvestre, but the Gairaut market is first and foremost that of the family villa."
      ],
      "who": "Families who want a house and a garden without leaving Nice, and retirees seeking quiet and a view. Villas most often sell between €700,000 and €1.5 million; the finest, with a view and land, well beyond that.",
      "transport": "Bus lines 11 and 63 towards Borriglione and the centre, around twenty minutes; a car remains essential day to day.",
      "advice": "In Gairaut, the price per square metre means little: land, a view and level access count for more than the floor area built. We value hillside houses as houses, not as flats.",
      "notes": {
        "Au Rendez-Vous des Amis": "Family Niçois and Provençal cooking, the reference address in the hills for decades.",
        "Restaurant Simon": "Homemade ravioli, daube, a view over the hills: the local families' table.",
        "Les commerces de l'avenue de Rimiez": "Gairaut proper has almost no shops; people go down to Rimiez for bread, the newspaper and the greengrocer.",
        "École primaire La Gairautine": "The neighbourhood's state nursery and primary school.",
        "Cascade de Gairaut": "The basin, the waterfall and the 1883 chalet, freely accessible: the neighbourhood's walk."
      }
    },
    "promenade-des-anglais": {
      "paragraphs": [
        "The Promenade des Anglais runs for seven kilometres along the Baie des Anges, from the Negresco and the Belle Époque buildings of the centre to the neighbourhoods of Magnan, Lenval, La Californie and Carras to the west. The buildings tell this story as you go: palaces and bourgeois buildings from the early 20th century near the centre, 1960s-70s residences facing the sea, more recent developments further out. The vallon obscur of Magnan, cut into the rock a stone's throw from the seafront, is a reminder that the city was built on hills.",
        "The Prom itself has been redesigned for pedestrians and cyclists along its entire length, and tramway Line 2 has its western terminus at Magnan. This neighbourhood is best read as two markets: the seafront proper, where prices climb noticeably, and the streets set back, where prices return to those of an ordinary neighbourhood, with the beach thrown in."
      ],
      "who": "On the seafront, second-home buyers and investors, French and international, after the view and the address; in the streets set back, families and working residents who want the beach on foot at a neighbourhood price. A two- or three-room flat with a balcony and sea view is the emblematic property.",
      "transport": "Tramway Line 2, Magnan terminus, fifteen minutes to the centre and to the airport; buses all along the Promenade; cycling and walking on the redesigned seafront.",
      "advice": "On the Promenade, an address right on the Prom costs 30 to 50% more than the same floor area one street back, and the Negresco–Albert-Ier stretch is worth another notch above that. We always check the co-ownership rules: some seafront residences restrict short-term letting, and that changes the value for an investor.",
      "notes": {
        "Le Fournil de Magnan": "An independent bakery on the corner of Magnan, the neighbourhood's bread.",
        "Brasserie Le Magnan": "Run by the same Niçois family since 1987, daily specials at friendly prices: the residents' address.",
        "Le Voilier Plage": "A family-friendly, affordable beach restaurant, well below the prices of its neighbours.",
        "École élémentaire Sainte-Hélène": "The nearest state school to the Magnan – Californie area.",
        "Plage publique de Magnan": "The free public beach used by residents, with its volleyball courts and paddleboards.",
        "Parc Carol-de-Roumanie": "The great park of western Nice, ten minutes' walk from the streets of Magnan."
      }
    }
  },
  "es": {
    "riquier": {
      "paragraphs": [
        "Riquier es un antiguo arrabal de huertos y talleres, urbanizado cuando el puerto de Niza tomó impulso en el siglo XVIII. El caserío que hoy predomina data de los años 1920 y 1930: edificios niceos de cuatro a seis plantas, fachadas ocre o beige, balcones corridos, con algunos conjuntos más ambiciosos como el Palais de l'Esplanade. El barrio se organiza en torno a la place Max-Barel, el boulevard Risso y la rue Arson, y topa al noreste con la estación de Nice-Riquier.",
        "Es un barrio que se vive a ras de calle: panaderías, fruterías, cafés de plaza, colegios a distancia de paseo. Durante mucho tiempo muy mineral y transitado, cambia ahora con la prolongación de la coulée verte desde el Paillon y la recuperación progresiva de los bajos comerciales. Se está a un cuarto de hora a pie del puerto y de la place Garibaldi, a diez minutos de tranvía del centro, y a un paso de los trenes hacia Mónaco y Menton.",
        "Sillage Immo está instalada en la rue Arson, en el corazón del barrio. Vendemos y alquilamos aquí todo el año, y sabemos lo que vale un bajo a la calle frente a un último piso a patio, en un mismo edificio."
      ],
      "who": "Familias y jóvenes activos que quieren el centro sin el precio del centro, e inversores que apuestan por la estación, el puerto cercano y la renovación en marcha. El piso de dos o tres habitaciones de los años 30 con balcón es el tipo de propiedad más habitual; las superficies familiares escasean más.",
      "transport": "Línea 1 del tranvía en las paradas Vauban y Garibaldi, a pocos minutos a pie; estación de tren de Nice-Riquier (TER hacia Mónaco, Menton y Cannes); el mar en el puerto a quince minutos a pie.",
      "advice": "En Riquier todo se juega en el edificio: dos direcciones a cincuenta metros una de otra pueden diferir en 1.500 €/m² según el estado de las zonas comunes, el ascensor y la orientación. Vendemos lo que conocemos, calle por calle.",
      "notes": {
        "Panification de Riquier": "La panadería del barrio, a dos puertas de la agencia. Pan de masa madre, colas por la mañana.",
        "La Table à Julie": "Cocina de mercado sin pretensiones, pizarra corta, precios de barrio. El almuerzo de los vecinos.",
        "Le Niçois": "Restaurante familiar del boulevard: platos niceos, raciones generosas, servicio sin remilgos.",
        "Nicéa Café": "La terraza de la plaza, entre la salida del colegio y el paso hacia la estación.",
        "École élémentaire Risso et collège Antoine-Risso": "El centro escolar público de la zona, colindante, sobre el eje histórico del barrio.",
        "Coulée verte de Riquier": "La reciente prolongación del paseo del Paillon: 6.000 m² ajardinados, el primer espacio verde real del barrio."
      }
    },
    "saint-roch": {
      "paragraphs": [
        "Saint-Roch era una llanura de naranjos y huertos junto al Paillon antes de que el ferrocarril y la fábrica de gas lo convirtieran, a principios del siglo XX, en un barrio obrero. Su boulevard, trazado en 1936 con treinta metros de ancho y plantado de plátanos, sigue siendo el más ancho de Niza. El barrio fue duramente bombardeado en mayo de 1944 y después reconstruido: el caserío mezcla edificios de los años 1950 a 1970, algunas construcciones bajas más antiguas y operaciones recientes en torno al tranvía.",
        "Es el barrio que más ha cambiado del este niceo desde la llegada de la línea 1: paradas de Saint-Roch y Vauban, universidad en Saint-Jean-d'Angély, coulée verte, piscina y estadio municipales. Sigue siendo popular, vivo, con una auténtica vida de boulevard y precios que continúan siendo, con diferencia, los más accesibles a diez minutos de tranvía del centro."
      ],
      "who": "Compradores de primera vivienda y jóvenes activos que trabajan en el centro, familias que buscan más superficie por el mismo presupuesto, e inversores atentos a la demanda estudiantil de Saint-Jean-d'Angély. El piso de tres habitaciones de los años 60 con balcón y trastero es el tipo de propiedad más habitual.",
      "transport": "Línea 1 del tranvía, paradas Saint-Roch y Vauban: diez minutos hasta la estación de Nice-Ville, un cuarto de hora hasta Masséna y el mar.",
      "advice": "Saint-Roch es el barrio donde la diferencia entre un edificio cuidado y uno descuidado se nota más en el precio. Fíjese en el revoco de la fachada, la caldera colectiva y las actas de la junta antes que en el precio anunciado: ahí está la buena operación, o la mala.",
      "notes": {
        "Les Délices de Saint-Roch": "Panadería de barrio conocida por su pan de autor; acuden desde las calles vecinas.",
        "L'Espresso": "Daube, ñoquis, raviolis: cocina niceña a precio de barrio, con sugerencias que cambian cada día.",
        "Ma Cave": "Cocina casera con sus platos fijos según el día: paella, cuscús, aïoli. Una institución del boulevard.",
        "L'Entre Nous": "Salón de té y café de plaza, productos caseros, la parada del barrio.",
        "Écoles Saint-Roch 1 et 2 (élémentaires) et maternelle Saint-Roch": "El centro escolar público del barrio, contiguo, a distancia de paseo de toda la zona.",
        "Piscine Saint-Roch": "Instalación municipal heredada de la reconstrucción, siempre muy concurrida."
      }
    },
    "le-port": {
      "paragraphs": [
        "El puerto Lympia se excavó a partir de 1748 bajo Carlos Manuel III, y su dársena sigue siendo el punto de partida de los ferris hacia Córcega. Está bordeado de edificios de estilo ligur, con fachadas ocre-rojizo y balcones trabajados, en una composición simétrica presidida por la iglesia Notre-Dame-du-Port. Detrás, la place Garibaldi, la plaza mayor más antigua de Niza, fue renovada por completo con la llegada del tranvía; las calles Bonaparte, Cassini y la place du Pin forman lo que los niceos llaman el Petit Marais, con sus terrazas, sus bodegas y sus anticuarios.",
        "El barrio ha ganado en diez años lo que a otros les cuesta treinta: una clientela joven, vida nocturna, restaurantes que cuentan, y precios que han seguido el mismo camino. Con todo, sigue siendo un barrio de verdad, con sus colegios, su rastro de los lunes en la place Garibaldi lado cours Saleya, sus pointus en la dársena, y el Vieux-Nice y el mar a cinco minutos a pie."
      ],
      "who": "Jóvenes activos y parejas que buscan carácter y vida de barrio, compradores de pied-à-terre, e inversores en pisos pequeños para reformar. El piso de dos habitaciones con balcón en un edificio ligur es la propiedad que más rápido se vende, siempre que el precio sea el correcto desde el primer día.",
      "transport": "Línea 1 del tranvía, parada Garibaldi; el Vieux-Nice y la Promenade a cinco o diez minutos a pie; la estación de Nice-Ville a diez minutos en tranvía.",
      "advice": "En el Port, la vista a la dársena se paga, pero la orientación cuenta tanto como la vista: un piso frente al muelle, orientado al sur y con doble acristalamiento, no tiene nada que ver con el mismo piso en una calle estrecha. Aquí hemos vendido en diez días; es el barrio donde el precio justo se sabe enseguida.",
      "notes": {
        "Fromagerie Bonaparte": "La quesería del barrio, proveedora de varios restaurantes cercanos.",
        "La Socca d'Or": "Socca, pissaladière, pan-bagnat, ensalada niceña: una institución cien por cien niceña, a precio de institución niceña.",
        "Brasserie Le Garibaldi": "La brasserie de la plaza, cocina tradicional y precios razonables bajo los arcos.",
        "Café de la Place": "La terraza popular de la plaza, más de vecinos que de turistas.",
        "Groupe scolaire Jousé-Garibaldi – Port": "Guardería y escuela primaria públicas de la zona, muy cerca de los edificios del puerto.",
        "Théâtre National de Nice – Les Franciscains": "El teatro nacional, a dos pasos de la parada Garibaldi."
      }
    },
    "carre-dor": {
      "paragraphs": [
        "El Carré d'Or se edificó entre 1880 y 1930, cuando Niza era el lugar de veraneo invernal de Europa: grandes edificios burgueses Belle Époque, alguna fachada Art déco, vestíbulos con mosaicos y ascensores de época. Se extiende entre el boulevard Victor-Hugo, el boulevard Gambetta, la avenue Jean-Médecin y la Promenade des Anglais. La rue Paradis y la rue de France concentran los comercios, el museo Masséna y su jardín ofrecen un respiro, y el barrio de los Musiciens, en torno a la avenue Auber y la rue Berlioz, conserva una vida más residencial y tranquila.",
        "Es el barrio más líquido de Niza: demanda local, francesa e internacional durante todo el año, profesiones liberales instaladas en los bajos, y una escasez real de los grandes pisos pasantes. Por la noche, fuera de las grandes avenidas, vuelve a ser sorprendentemente tranquilo."
      ],
      "who": "Directivos, profesiones liberales, jubilados acomodados y clientela internacional, tanto en residencia principal como en pied-à-terre. El piso burgués de tres habitaciones con techos altos es la propiedad más buscada; el gran pasante reformado se vende antes de publicarse.",
      "transport": "Línea 1 del tranvía, paradas Masséna y Jean-Médecin; la estación de Nice-Ville y la Promenade a menos de diez minutos a pie.",
      "advice": "En el Carré d'Or, la altura y la luz determinan el precio, no la calle. Un primer piso a patio oscuro y un cuarto piso pasante pueden diferir al doble dentro de un mismo edificio. Es también el barrio donde una tasación demasiado alta sale más cara: los compradores lo comparan todo.",
      "notes": {
        "Café des Musiciens": "Bib Gourmand 2026, cocina de mercado sin pretensiones: el restaurante del barrio de los Musiciens, hay que reservar.",
        "Casa Nissa": "Cocina niceña y mediterránea, terraza con sombra, a pocos pasos de la place Masséna.",
        "École maternelle et élémentaire Auber": "El colegio público de la zona Musiciens – Carré d'Or, con comedor.",
        "Jardin du musée Masséna": "El jardín Belle Époque abierto al público, el único espacio verde real del barrio; el museo es gratuito."
      }
    },
    "wilson": {
      "paragraphs": [
        "En torno a la place Wilson y las calles Pertinax, Assalit y Gubernatis, el barrio hace de enlace entre el centro comercial de Jean-Médecin y las laderas de Carabacel. El caserío es niceo, de 1900-1930, más denso y más sencillo que en el vecino Carré d'Or: cuatro a seis plantas, escaleras de piedra, patios estrechos, bajos ocupados por comercios de proximidad, tiendas de vinos y pequeñas brasseries.",
        "La plaza en sí ha sido remodelada, con el jardín y el área de juegos ampliados, y ha vuelto a ser el corazón de una vida de barrio compacta. Aquí se está a diez minutos a pie de la estación, de la place Masséna y de la coulée verte, sin la presión turística de la costa. Es el compromiso que buscan muchos compradores: el centro, a pie, por menos dinero."
      ],
      "who": "Compradores de primera vivienda y jóvenes activos que quieren el centro a pie, familias que encuentran aquí pisos de tres habitaciones a precio asequible, e inversores en pisos pequeños para estudiantes y jóvenes profesionales.",
      "transport": "Entre las paradas Jean-Médecin y Gare Thiers de la línea 1, a cinco o diez minutos a pie; la estación de Nice-Ville a diez minutos a pie, el mar a quince.",
      "advice": "En Wilson se compra la ubicación más que el edificio, así que hay que mirar el edificio dos veces: zonas comunes, fachada, tejado. Un piso bien mantenido en una comunidad sana se revende aquí sin dificultad; lo contrario se negocia.",
      "notes": {
        "Boulangerie La Niçoise": "Panadería de barrio, especialidades niceñas para llevar al mediodía.",
        "Les Épicuriens": "Cocina niceña a fuego lento, institución de la plaza desde hace años, relación calidad-precio segura.",
        "Brasserie Wilson": "Abierta en otoño de 2025 por un niceo de cuarta generación: espíritu bistrot, menú del día en torno a 18 €.",
        "La Cave Wilson": "Bar de vinos de barrio, copa en la barra, ambiente de habituales.",
        "École maternelle et élémentaire Auber": "El colegio público más cercano a la plaza, a pocos minutos a pie.",
        "Jardin de la place Wilson": "Jardín y área de juegos ampliados recientemente: el punto de encuentro del barrio."
      }
    },
    "liberation": {
      "paragraphs": [
        "Libération se desarrolló entre 1880 y 1945 como barrio de veraneo en torno a la avenue Malausséna y a la actual place du Général-de-Gaulle, y se extiende hacia la avenue Borriglione y la Gare du Sud. El caserío es heterogéneo, y esa es su ventaja: edificios burgueses de buena factura a precios más suaves que en el Carré d'Or, edificios niceos más sencillos, alguna villa en el límite de Cimiez. Todo gira en torno al mercado diario, uno de los más grandes de Niza, al que se acude desde toda la ciudad.",
        "La antigua Gare du Sud, abandonada durante mucho tiempo, se convirtió en 2019 en una halle gourmande; el tranvía se detiene a los pies del mercado; el barrio ha conservado su acento y ha ganado cafés. Hoy atrae a familias jóvenes que quieren una auténtica vida de barrio, a cinco minutos de tranvía de la estación de Nice-Ville."
      ],
      "who": "Familias jóvenes y jóvenes activos que quieren el mercado al pie de casa, estudiantes por la cercanía de Valrose, y jubilados apegados al carácter del barrio. El piso de tres habitaciones con balcón en un edificio burgués de los años 30 es la propiedad que más gusta.",
      "transport": "Línea 1 del tranvía, parada Libération en la avenue Malausséna: dos paradas de la estación de Nice-Ville, tres de Jean-Médecin.",
      "advice": "Libération es el barrio donde los compradores buscan vida de barrio, y quieren un balcón o una terraza para disfrutarla. Un exterior, aunque sea pequeño, cambia aquí el plazo de venta más que diez metros cuadrados de más.",
      "notes": {
        "Marché de la Libération": "Mercado de alimentación todas las mañanas salvo los lunes: frutas, verduras, pescado, productores locales. El verdadero centro del barrio.",
        "Le Kiosque Tintin": "El pan-bagnat de referencia en Niza, para llevar en pleno mercado.",
        "La Gauloise": "Pescados y mariscos, instalado desde hace mucho en la avenida, cuenta razonable.",
        "Brasserie de l'Union": "Daube, raviolis caseros, cocina niceña de tradición: un restaurante de barrio reconocido.",
        "L'Altra Casa": "Terraza en la plaza, en pleno mercado; la cita del sábado por la mañana.",
        "École élémentaire Von Derwies": "El colegio público de la zona Libération – Borriglione.",
        "Halle de la Gare du Sud": "La antigua estación de los Chemins de fer de Provence, reconvertida en halle gourmande y lugar de ocio."
      }
    },
    "mont-boron": {
      "paragraphs": [
        "El Mont Boron es una colina boscosa de 57 hectáreas que cierra el este del puerto, con una cota cercana a los 200 metros. La cima conserva una batería de 1887 y, más al norte, el fuerte del Mont Alban vigila la rada desde el siglo XVI; ambos son hoy espacios naturales recorridos por una decena de kilómetros de senderos. El caserío mezcla villas Belle Époque en la avenue des Hespérides y el boulevard du Mont-Boron, residencias de categoría de los años 60 y 70 construidas por la vista, y villas contemporáneas en la vertiente este.",
        "Es un barrio casi exclusivamente residencial: no hay calle comercial, las compras se hacen en el boulevard Carnot o en el puerto. Aquí se compra silencio, bosque y una vista a dos bahías, la de los Ángeles y la de Villefranche, que se paga a la altura de lo que es."
      ],
      "who": "Familias que buscan una villa, directivos internacionales, y compradores de segunda residencia que quieren la vista sin el ruido. Los pisos con terraza y vista al mar en las residencias de los años 60-70 son el núcleo del mercado; las villas se venden en su mayoría entre 1,5 y 3 millones de euros.",
      "transport": "Línea de autobús 14 hacia el puerto y el centro; el puerto a diez minutos en coche. El desnivel hace que caminar resulte poco práctico para las compras diarias.",
      "advice": "En el Mont Boron, dos pisos de igual superficie en la misma residencia pueden valer al doble: todo está en la vista, la planta y la terraza. Una tasación seria se hace in situ, nunca sobre plano.",
      "notes": {
        "Oceanosa": "La pescadería de la parte baja del Mont Boron, en el eje que todo el barrio recorre para hacer sus compras.",
        "Le Bistrot du Port": "Cocina mediterránea de buen nivel frente a los barcos, la dirección del puerto para los vecinos de la colina.",
        "L'Escale": "Productos del mar a precio correcto, regular, sin escenografía.",
        "École élémentaire Péglion": "El único colegio público realmente situado en la colina.",
        "Parc forestier du Mont Boron": "57 hectáreas de pinos y encinas, senderos señalizados y miradores sobre las dos bahías.",
        "Musée de Terra Amata": "El yacimiento prehistórico al pie de la colina, con sus hogares de 400.000 años de antigüedad."
      }
    },
    "cap-de-nice": {
      "paragraphs": [
        "El Cap de Nice prolonga el Mont Boron hacia Villefranche, entre el boulevard Franck-Pilatte, que bordea el mar en corniche, la avenue Jean-Lorrain y el boulevard Maeterlinck, que debe su nombre al escritor, antiguo propietario del palacete de los años 1920 convertido en residencia privada. Es el sector más exclusivo de la ciudad: villas contemporáneas con acceso directo al mar, y grandes residencias de categoría de los años 60 y 70, con piscina y vista frontal a la bahía.",
        "Prácticamente no hay comercios: el barrio es puramente residencial y depende de la parte baja del Mont Boron y del puerto para el día a día. A cambio, el sentier del littoral, las calas rocosas y la Réserve ofrecen un baño que pocas direcciones niceas pueden reclamar desde su propia casa."
      ],
      "who": "La clientela más alta de Niza, francesa e internacional, para una villa con los pies en el agua o un piso en una residencia con piscina: residencia principal de prestigio o pied-à-terre. Las ventas son escasas y a menudo se realizan fuera de mercado.",
      "transport": "Servicio de autobús limitado (línea 14 por el boulevard du Mont-Boron); el puerto a diez o quince minutos en coche por la corniche. Un barrio pensado para el coche.",
      "advice": "En el Cap de Nice, las ventas se cuentan con los dedos de una mano cada año y las referencias públicas son escasas: el valor se construye sobre comparables que solo una agencia que sigue de cerca este mercado puede reunir.",
      "notes": {
        "Sentier du littoral et criques du Cap de Nice": "El camino costero hacia Coco Beach y las rocas de la Réserve: la playa del barrio, sin arena y sin multitudes.",
        "Le Bistrot du Port": "La dirección más cercana para una cocina mediterránea sin pretensiones, en el puerto.",
        "L'Escale": "Productos del mar a precio correcto, la costumbre de los residentes que bajan al puerto.",
        "Oceanosa": "El Cap no tiene comercios: la pescadería de referencia está en la parte baja del Mont Boron.",
        "École élémentaire Péglion": "El Cap depende del mismo distrito escolar público que el Mont Boron."
      }
    },
    "cimiez": {
      "paragraphs": [
        "Cimiez ocupa la colina al norte del centro, en el emplazamiento de Cemenelum, capital romana de los Alpes-Maritimes de la que subsisten las arenas y las termas en un parque plantado de olivos centenarios. El barrio tomó forma en la Belle Époque, cuando la aristocracia europea —con la reina Victoria a la cabeza— lo convirtió en su lugar de veraneo invernal: el palace Excelsior Régina, hoy en régimen de propiedad horizontal, y decenas de villas y edificios burgueses bordean el boulevard de Cimiez. El monasterio franciscano, sus jardines y el museo Matisse completan un conjunto que pocas ciudades pueden ofrecer.",
        "Es un barrio residencial y familiar, algo alejado del mar, con buenos colegios, edificios antiguos de techos altos y residencias de los años 60 y 70 a menudo bien cuidadas, con parque y piscina. La parte alta de Cimiez y el boulevard del lado Régina concentran las mejores vistas y los precios más elevados."
      ],
      "who": "Familias, profesiones liberales y jubilados apegados al patrimonio y a la tranquilidad, más que al frente marítimo directo. El gran piso antiguo con techos altos, o el de tres-cuatro habitaciones en residencia con piscina y aparcamiento, son las propiedades más demandadas.",
      "transport": "Líneas de autobús 5, 15, 25 y 37 por el boulevard de Cimiez (paradas Arènes y Musée Matisse), un cuarto de hora hasta Masséna; el mar a diez o quince minutos en coche.",
      "advice": "En Cimiez, la vista al mar desde un edificio de categoría bien orientado lleva un piso más allá de los 8.000 €/m², cuando la mediana del barrio está en 5.400. El mismo piso sin vista, o en una comunidad descuidada, se vende al precio de un buen barrio corriente. Distinguimos ambos casos desde la tasación.",
      "notes": {
        "Morin Traiteur": "La charcutería-traiteur de la parte baja del boulevard, referencia del barrio para platos preparados y celebraciones.",
        "Côté Sud": "Cocina mediterránea de mercado, abierta al mediodía entre semana y el viernes por la noche: la dirección de barrio.",
        "Buvette des Arènes": "El chiringuito del parque, junto al museo Matisse: sencillo, a la sombra de los olivos.",
        "École primaire Cimiez-Essling et collège Roland-Garros": "Los centros públicos que estructuran la vida de las familias del barrio.",
        "Parc des Arènes de Cimiez": "Olivos centenarios, ruinas romanas, zona de juegos infantiles; el Nice Jazz Festival se celebra aquí.",
        "Musée Matisse": "En la villa des Arènes del siglo XVII, una de las grandes colecciones de Matisse del mundo."
      }
    },
    "fabron": {
      "paragraphs": [
        "Fabron ocupa las colinas del oeste de Niza, entre el mar y la Corniche Fleurie. Lugar de veraneo de familias adineradas desde el siglo XIX —el Palais de Marbre alberga hoy los Archives municipales—, el barrio se cubrió tras la guerra de residencias de los años 60 a 80 con piscina, parque y portero, que siguen siendo la seña de identidad del sector, entre algunas villas antiguas y casas individuales en las alturas.",
        "La llegada de la línea 2 del tranvía, con su parada Fabron, ha cambiado las cosas: el centro y el aeropuerto quedan a un cuarto de hora, sin coche. El parc Carol-de-Roumanie, los colegios y el pádel de Ultra Fabron dan al barrio una vida familiar que la costa no ofrece."
      ],
      "who": "Familias y directivos en activo seducidos por la vista, la tranquilidad y las residencias con piscina a precio contenido, jubilados propietarios desde hace tiempo, y algunos compradores internacionales. El piso de tres o cuatro habitaciones con terraza, aparcamiento y piscina es el tipo de propiedad más habitual.",
      "transport": "Línea 2 del tranvía, parada Fabron: un cuarto de hora hasta el centro y hasta el aeropuerto; autobuses hacia las colinas y Nice-Ouest.",
      "advice": "En Fabron, el precio se decide tanto en la residencia como en el piso: gastos comunes, piscina, portero, aparcamiento y, sobre todo, vista al mar. Dos pisos de tres habitaciones idénticos sobre el papel pueden diferir en un 30 % según la planta y la orientación.",
      "notes": {
        "Chez Cane": "Cocina niceña y mediterránea generosa, institución familiar de la avenida.",
        "La Pignata Côte d'Azur": "Restaurante de barrio en la avenida, cocina sencilla y constante, para las noches entre semana.",
        "École primaire Fabron – La Lanterne": "Guardería y escuela primaria públicas de la zona.",
        "Parc Carol-de-Roumanie": "2,3 hectáreas de césped y pinos, el lugar de paseo del barrio.",
        "Ultra Fabron": "Pádel y fútbol sala: la cita de las familias y de los activos de las colinas."
      }
    },
    "gairaut": {
      "paragraphs": [
        "Gairaut es el barrio de las colinas norte de Niza, cubierto durante mucho tiempo de olivares, que ha conservado un carácter de pueblo pese a la urbanización en villas. Su cascada, un estanque y una caída artificial de estilo Belle Époque coronados por un chalet alpino, se construyó en 1883 para celebrar la llegada del agua de la Vésubie; la iglesia Saint-Sauveur y el antiguo camino de Gairaut completan un patrimonio discreto, alejado del bullicio.",
        "Aquí se compra una casa con jardín y vista a la ciudad y al mar, a un cuarto de hora en coche del centro. Existen pisos, en residencias de los años 70 y 80 en la avenue de Rimiez o en Saint-Sylvestre, pero el mercado de Gairaut es ante todo el de la villa familiar."
      ],
      "who": "Familias que quieren una casa con jardín sin salir de Niza, y jubilados en busca de tranquilidad y vistas. Las villas se venden la mayoría de las veces entre 700.000 y 1,5 millones de euros; las más bonitas, con vistas y terreno, muy por encima.",
      "transport": "Líneas de autobús 11 y 63 hacia Borriglione y el centro, una veintena de minutos; el coche sigue siendo indispensable en el día a día.",
      "advice": "En Gairaut, el precio por metro cuadrado no dice nada: un terreno, una vista y un acceso llano cuentan más que la superficie construida. Tasamos las casas de las colinas como casas, no como pisos.",
      "notes": {
        "Au Rendez-Vous des Amis": "Cocina niceña y provenzal casera, la referencia de las colinas desde hace décadas.",
        "Restaurant Simon": "Raviolis caseros, daube, vista a las colinas: el restaurante de las familias del sector.",
        "Les commerces de l'avenue de Rimiez": "Gairaut propiamente dicho apenas tiene comercios; se baja a Rimiez a por el pan, el periódico y la fruta.",
        "École primaire La Gairautine": "Guardería y escuela primaria públicas del barrio.",
        "Cascade de Gairaut": "El estanque, la caída de agua y el chalet de 1883, de acceso libre: el paseo del barrio."
      }
    },
    "promenade-des-anglais": {
      "paragraphs": [
        "La Promenade des Anglais discurre a lo largo de siete kilómetros por la baie des Anges, desde el Negresco y los edificios Belle Époque del centro hasta los barrios de Magnan, Lenval, la Californie y Carras al oeste. El caserío narra esa progresión: palacetes y edificios burgueses de principios del siglo XX cerca del centro, residencias de los años 60 y 70 frente al mar, promociones recientes a medida que uno se aleja. El vallon obscur de Magnan, excavado en la roca a dos pasos del frente marítimo, recuerda que la ciudad se construyó sobre colinas.",
        "La propia Prom ha sido remodelada para peatones y bicicletas en todo su recorrido, y la línea 2 del tranvía tiene su término oeste en Magnan. Hay que leer este barrio como dos mercados: el frente marítimo propiamente dicho, donde los precios suben con claridad, y las calles interiores, donde se encuentran precios de barrio corriente, con la playa de propina."
      ],
      "who": "En el frente marítimo, compradores de segunda residencia e inversores, franceses e internacionales, por la vista y la dirección; en las calles interiores, familias y activos que quieren la playa a pie a precio de barrio. El piso de dos o tres habitaciones con balcón y vista al mar es la propiedad emblemática.",
      "transport": "Línea 2 del tranvía, término Magnan, quince minutos hasta el centro y hasta el aeropuerto; autobuses a lo largo de toda la Promenade; bicicleta y paseo por el frente marítimo acondicionado.",
      "advice": "En la Promenade, la dirección sobre la Prom se paga entre un 30 y un 50 % más que la misma superficie una calle atrás, y el tramo Negresco – Albert-Ier vale todavía un escalón más. Siempre comprobamos el reglamento de la comunidad: algunas residencias del frente marítimo limitan el alquiler de corta duración, y eso cambia el valor para un inversor.",
      "notes": {
        "Le Fournil de Magnan": "Panadería independiente en la esquina de Magnan, el pan del barrio.",
        "Brasserie Le Magnan": "Regentada por la misma familia niceña desde 1987, platos del día a precio amigo: la dirección de los vecinos.",
        "Le Voilier Plage": "Restaurante de playa familiar y asequible, lejos de las tarifas de los establecimientos vecinos.",
        "École élémentaire Sainte-Hélène": "El colegio público más cercano a la zona Magnan – Californie.",
        "Plage publique de Magnan": "La playa libre y gratuita de los vecinos, con sus pistas de vóley y sus paddles.",
        "Parc Carol-de-Roumanie": "El gran parque del oeste niceo, a diez minutos a pie de las calles de Magnan."
      }
    }
  },
  "ru": {
    "riquier": {
      "paragraphs": [
        "Riquier — бывшее предместье огородов и мастерских, застроенное, когда порт Ниццы начал бурно развиваться в XVIII веке. Застройка, которую видно сегодня, относится к 1920-м и 1930-м годам: ниццские дома в четыре-шесть этажей, охристые или бежевые фасады, сплошные балконы, и несколько более амбициозных ансамблей, таких как Palais de l'Esplanade. Квартал организован вокруг площади place Max-Barel, бульвара boulevard Risso и улицы rue Arson, а на северо-востоке упирается в вокзал Nice-Riquier.",
        "Это квартал, который живёт на уровне улицы: булочные, зеленные лавки, кафе на площади, школы в шаговой доступности. Долго остававшийся очень «каменным» и проезжим, он меняется благодаря зелёной аллее, продлённой от русла Paillon, и постепенному оживлению первых этажей. Отсюда четверть часа пешком до порта и площади place Garibaldi, десять минут на трамвае до центра и рукой подать до поездов в сторону Монако и Ментоны.",
        "Sillage Immo находится на rue Arson, в самом сердце квартала. Мы продаём и сдаём здесь круглый год и хорошо знаем, сколько стоит первый этаж окнами на улицу по сравнению с последним этажом окнами во двор — в одном и том же доме."
      ],
      "who": "Семьи и молодые работающие люди, которые хотят жить в центре, не платя цену центра, а также инвесторы, делающие ставку на вокзал, близкий порт и идущую реновацию. Типичный объект — двух- или трёхкомнатная квартира 1930-х годов с балконом; семейные по метражу квартиры встречаются реже.",
      "transport": "Линия 1 трамвая, станции Vauban и Garibaldi, в нескольких минутах ходьбы; вокзал SNCF Nice-Riquier (региональные поезда TER в сторону Монако, Ментоны и Канн); море у порта в пятнадцати минутах ходьбы.",
      "advice": "В Riquier всё решает дом: два адреса в пятидесяти метрах друг от друга могут отличаться на 1500 €/м² в зависимости от состояния мест общего пользования, наличия лифта и ориентации по сторонам света. Мы продаём то, что знаем улица за улицей.",
      "notes": {
        "Panification de Riquier": "Квартальная булочная, в двух шагах от агентства. Хлеб на закваске, утром — очередь.",
        "La Table à Julie": "Простая рыночная кухня, короткое меню на грифельной доске, цены по-соседски. Обеденное место для местных.",
        "Le Niçois": "Семейное заведение на бульваре: ниццские блюда, щедрые порции, обслуживание без затей.",
        "Nicéa Café": "Терраса на площади, между выходом из школы и дорогой к вокзалу.",
        "École élémentaire Risso et collège Antoine-Risso": "Государственный школьный комплекс района, расположенный на исторической оси квартала.",
        "Coulée verte de Riquier": "Недавнее продолжение променада вдоль Paillon: 6000 м² зелени, первое настоящее зелёное пространство квартала."
      }
    },
    "saint-roch": {
      "paragraphs": [
        "Saint-Roch (Сен-Рок) был равниной апельсиновых садов и огородов вдоль русла Paillon, пока железная дорога и газовый завод не превратили его в начале XX века в рабочий квартал. Его бульвар, проложенный в 1936 году шириной в тридцать метров и обсаженный платанами, остаётся самым широким в Ницце. Квартал был сильно разрушен бомбардировками в мае 1944 года и затем восстановлен: застройка сочетает дома 1950–1970-х годов, несколько более старых невысоких построек и недавние проекты вокруг трамвайной линии.",
        "Это квартал восточной части Ниццы, который больше всего изменился с приходом линии 1 трамвая: станции Saint-Roch и Vauban, университет в Saint-Jean-d'Angély, зелёная аллея, муниципальные бассейн и стадион. Он остаётся народным, живым, с настоящей жизнью на бульваре и ценами, которые пока — и с большим отрывом — самые доступные в десяти минутах на трамвае от центра."
      ],
      "who": "Покупатели первого жилья и молодые работающие люди, работающие в центре города, семьи, ищущие метраж побольше за тот же бюджет, и инвесторы, рассчитывающие на студенческий спрос Saint-Jean-d'Angély. Типичный объект — трёхкомнатная квартира 1960-х годов с балконом и подвалом.",
      "transport": "Линия 1 трамвая, станции Saint-Roch и Vauban: десять минут до вокзала Nice-Ville, четверть часа до площади Masséna и моря.",
      "advice": "Saint-Roch — квартал, где разница между ухоженным и запущенным домом сильнее всего видна в цене. Смотрите на состояние фасада, коллективный котёл отопления и протоколы общих собраний ещё до объявленной цены: именно здесь рождается удачная сделка — или неудачная.",
      "notes": {
        "Les Délices de Saint-Roch": "Квартальная булочная, известная своим фирменным хлебом; сюда приходят и с соседних улиц.",
        "L'Espresso": "Добы, ньокки, равиоли: ниццская кухня по квартальным ценам, предложения дня меняются каждый день.",
        "Ma Cave": "Семейная кухня с фиксированными блюдами по дням недели — паэлья, кускус, айоли. Институция бульвара.",
        "L'Entre Nous": "Чайный салон и кафе на площади, домашняя выпечка, привал квартала.",
        "Écoles Saint-Roch 1 et 2 (élémentaires) et maternelle Saint-Roch": "Государственный школьный комплекс квартала, расположенный рядом, в шаговой доступности от всего района.",
        "Piscine Saint-Roch": "Муниципальный бассейн, доставшийся в наследство от послевоенной реконструкции, по-прежнему очень посещаемый."
      }
    },
    "le-port": {
      "paragraphs": [
        "Порт Lympia начали рыть с 1748 года при Карле-Эммануиле III, и его бассейн остаётся отправной точкой паромов на Корсику. Его окружают дома в лигурийском стиле с охристо-красными фасадами и резными балконами, выстроенные симметричной композицией, над которой возвышается церковь Notre-Dame-du-Port. За ней — площадь place Garibaldi, старейшая большая площадь Ниццы, полностью обновлённая с приходом трамвая; улицы rue Bonaparte, rue Cassini и площадь place du Pin образуют то, что ниццары называют Petit Marais, с его террасами, винными погребками и антикварными лавками.",
        "За десять лет квартал приобрёл то, на что другим требуется тридцать: молодую публику, вечернюю жизнь, значимые рестораны и выросшие вслед за этим цены. И всё же это остаётся настоящим кварталом со своими школами, блошиным рынком по понедельникам на площади place Garibaldi со стороны cours Saleya, лодками-«пуэнту» в бассейне, а Vieux-Nice и море — в пяти минутах ходьбы."
      ],
      "who": "Молодые работающие люди и пары, которым нужны колорит и квартальная жизнь, покупатели квартир для наездов в город, и инвесторы, делающие ставку на небольшие площади под ремонт. Двухкомнатная квартира с балконом в лигурийском доме уходит быстрее всего — при условии правильной цены с первого дня.",
      "transport": "Линия 1 трамвая, станция Garibaldi; Vieux-Nice и Promenade в пяти-десяти минутах ходьбы; вокзал Nice-Ville в десяти минутах на трамвае.",
      "advice": "В Le Port за вид на бассейн приходится платить, но ориентация по сторонам света важна не меньше: квартира со стороны набережной, южная, со стеклопакетами, — это совсем не то же самое, что такая же квартира на узкой улочке. Мы продавали здесь за десять дней; это квартал, где верная цена быстро становится известна.",
      "notes": {
        "Fromagerie Bonaparte": "Сырный погребок квартала, поставщик нескольких соседних заведений.",
        "La Socca d'Or": "Socca, pissaladière, pan-bagnat, ниццский салат: стопроцентно ниццская институция по институционным ниццским ценам.",
        "Brasserie Le Garibaldi": "Брассери на площади, традиционная кухня и разумные цены под аркадами.",
        "Café de la Place": "Народная терраса на площади, скорее для местных жителей, чем для туристов.",
        "Groupe scolaire Jousé-Garibaldi – Port": "Государственные детский сад и начальная школа района, ближе всего к домам порта.",
        "Théâtre National de Nice – Les Franciscains": "Национальный театр, в двух шагах от станции Garibaldi."
      }
    },
    "carre-dor": {
      "paragraphs": [
        "Carré d'Or (Карре д'Ор, «Золотой квадрат») застраивался между 1880 и 1930 годами, когда Ницца была зимним курортом всей Европы: большие буржуазные дома в стиле Belle Époque, отдельные фасады в стиле ар-деко, холлы с мозаикой и лифты эпохи постройки. Квартал занимает пространство между boulevard Victor-Hugo, boulevard Gambetta, avenue Jean-Médecin и Promenade des Anglais. На rue Paradis и rue de France сосредоточены магазины, музей Masséna с садом дарит глоток воздуха, а квартал Musiciens, вокруг avenue Auber и rue Berlioz, сохраняет более спокойную, жилую атмосферу.",
        "Это самый ликвидный квартал Ниццы: спрос местный, французский и международный круглый год, свободные профессии занимают первые этажи, а большие сквозные квартиры — настоящая редкость. Вечером, вдали от крупных магистралей, здесь на удивление тихо."
      ],
      "who": "Руководители, представители свободных профессий, состоятельные пенсионеры и международная клиентура — как для основного жилья, так и для квартиры «на выезд». Искомый объект — буржуазная трёхкомнатная квартира с высокими потолками; большая отремонтированная сквозная квартира продаётся ещё до публикации объявления.",
      "transport": "Линия 1 трамвая, станции Masséna и Jean-Médecin; вокзал Nice-Ville и Promenade менее чем в десяти минутах ходьбы.",
      "advice": "В Carré d'Or цену определяют этаж и свет, а не улица. Первый этаж с тёмным двором и четвёртый сквозной этаж в одном и том же доме могут отличаться по цене вдвое. Это же квартал, где завышенная оценка обходится дороже всего: покупатели здесь сравнивают всё.",
      "notes": {
        "Café des Musiciens": "Bib Gourmand 2026, непритязательная рыночная кухня: заведение квартала Musiciens, столик нужно бронировать.",
        "Casa Nissa": "Ниццская и средиземноморская кухня, тенистая терраса, в нескольких шагах от площади Masséna.",
        "École maternelle et élémentaire Auber": "Государственная школа сектора Musiciens – Carré d'Or, со столовой.",
        "Jardin du musée Masséna": "Сад в стиле Belle Époque, открытый для публики, единственное настоящее зелёное пространство квартала; музей бесплатный."
      }
    },
    "wilson": {
      "paragraphs": [
        "Вокруг площади place Wilson и улиц rue Pertinax, rue Assalit и rue Gubernatis квартал служит связующим звеном между торговым центром вокруг Jean-Médecin и склонами Carabacel. Застройка ниццская, 1900–1930 годов, более плотная и простая, чем в соседнем Carré d'Or: четыре-шесть этажей, каменные лестницы, узкие дворы, первые этажи заняты магазинами повседневного спроса, винными лавками и небольшими брассери.",
        "Саму площадь обновили, расширив сад и детскую площадку, и она вновь стала сердцем компактной квартальной жизни. Отсюда десять минут пешком до вокзала, площади Masséna и зелёной аллеи, но без туристического давления побережья. Это и есть компромисс, который ищут многие покупатели: центр пешком — за меньшие деньги."
      ],
      "who": "Покупатели первого жилья и молодые работающие люди, желающие жить в центре пешей доступности, семьи, находящие здесь трёхкомнатные квартиры по посильной цене, и инвесторы, делающие ставку на небольшие площади для студентов и молодых специалистов.",
      "transport": "Между станциями Jean-Médecin и Gare Thiers линии 1, в пяти-десяти минутах ходьбы; вокзал Nice-Ville в десяти минутах пешком, море — в пятнадцати.",
      "advice": "В Wilson покупают скорее расположение, чем сам дом, и поэтому дом стоит проверить дважды: места общего пользования, фасад, кровлю. Ухоженная квартира в здоровом кондоминиуме перепродаётся здесь без труда; обратный случай — предмет торга.",
      "notes": {
        "Boulangerie La Niçoise": "Квартальная булочная, ниццские деликатесы навынос на обед.",
        "Les Épicuriens": "Ниццская кухня медленного приготовления, институция площади уже много лет, надёжное соотношение цены и качества.",
        "Brasserie Wilson": "Открыта осенью 2025 года ниццаром в четвёртом поколении: бистро-дух, дневное меню около 18 €.",
        "La Cave Wilson": "Квартальный винный бар, бокал у стойки, атмосфера завсегдатаев.",
        "École maternelle et élémentaire Auber": "Государственная школа, ближайшая к площади, в нескольких минутах ходьбы.",
        "Jardin de la place Wilson": "Недавно расширенные сад и детская площадка: место квартальной жизни."
      }
    },
    "liberation": {
      "paragraphs": [
        "Libération (Либерасьон) формировался между 1880 и 1945 годами как курортный квартал вокруг avenue Malausséna и нынешней площади place du Général-de-Gaulle, простираясь к avenue Borriglione и Gare du Sud. Застройка здесь разношёрстная, и в этом его удача: изящные буржуазные дома по ценам мягче, чем в Carré d'Or, более простые ниццские дома, несколько вилл на границе с Cimiez. Всё организовано вокруг ежедневного рынка — одного из крупнейших в Ницце, куда приезжают со всего города.",
        "Старый вокзал Gare du Sud, долго стоявший заброшенным, в 2019 году превратился в гастрономический рынок-халле; трамвай останавливается у подножия рынка; квартал сохранил свой акцент и приобрёл кафе. Сегодня он привлекает молодые семьи, которые хотят настоящей квартальной жизни, в пяти минутах на трамвае от вокзала Nice-Ville."
      ],
      "who": "Молодые семьи и молодые работающие люди, для которых рынок под окнами — весомый плюс, студенты из-за близости к Valrose, и пенсионеры, привязанные к характеру квартала. Наиболее востребован трёхкомнатная квартира с балконом в буржуазном доме 1930-х годов.",
      "transport": "Линия 1 трамвая, станция Libération на avenue Malausséna: две остановки до вокзала Nice-Ville, три до Jean-Médecin.",
      "advice": "Libération — квартал, куда покупатели приходят за квартальной жизнью, и им нужен балкон или терраса, чтобы ею пользоваться. Даже небольшое внешнее пространство здесь сокращает срок продажи сильнее, чем лишние десять квадратных метров.",
      "notes": {
        "Marché de la Libération": "Продуктовый рынок каждое утро, кроме понедельника: фрукты, овощи, рыба, местные производители. Настоящий центр квартала.",
        "Le Kiosque Tintin": "Эталонный pan-bagnat Ниццы, навынос прямо на рынке.",
        "La Gauloise": "Рыба и морепродукты, давно на этой авеню, разумный счёт.",
        "Brasserie de l'Union": "Доба, домашние равиоли, традиционная ниццская кухня: признанное квартальное заведение.",
        "L'Altra Casa": "Терраса на площади, в самом сердце рынка; место встречи субботним утром.",
        "École élémentaire Von Derwies": "Государственная школа сектора Libération – Borriglione.",
        "Halle de la Gare du Sud": "Бывший вокзал провансальской железной дороги, переоборудованный в гастрономический рынок-халле и место для выхода в свет."
      }
    },
    "mont-boron": {
      "paragraphs": [
        "Mont Boron (Мон-Борон) — лесистый холм площадью 57 гектаров, замыкающий порт с востока, высотой почти 200 метров. На вершине сохранилась батарея 1887 года, а севернее форт Mont Alban с XVI века охраняет рейд; сегодня оба объекта — природные территории, по которым проложено около десяти километров троп. Застройка сочетает виллы в стиле Belle Époque на avenue des Hespérides и boulevard du Mont-Boron, престижные резиденции 1960–70-х годов, построенные ради вида, и современные виллы на восточном склоне.",
        "Это почти исключительно жилой квартал: торговой улицы нет, за покупками ездят на boulevard Carnot или в порт. Здесь покупают тишину, лес и вид сразу на две бухты — Baie des Anges и бухту Villefranche, — и платят соответственно тому, чего этот вид стоит."
      ],
      "who": "Семьи, желающие виллу, международные руководители и покупатели второго жилья, которым нужен вид без шума. Квартиры с террасой и видом на море в резиденциях 1960–70-х годов составляют ядро рынка; виллы в основном продаются от 1,5 до 3 миллионов евро.",
      "transport": "Автобусный маршрут 14 до порта и центра; порт в десяти минутах на машине. Рельеф делает пешие ежедневные покупки непрактичными.",
      "advice": "В Mont Boron две квартиры одинаковой площади в одной и той же резиденции могут отличаться по цене вдвое: всё дело в виде, этаже и террасе. Серьёзная оценка делается на месте, а не по плану.",
      "notes": {
        "Oceanosa": "Рыбная лавка у подножия Mont Boron, на пути, которым весь квартал ходит за покупками.",
        "Le Bistrot du Port": "Достойная средиземноморская кухня напротив лодок, адрес в порту для жителей холма.",
        "L'Escale": "Морепродукты по справедливым ценам, стабильно, без показухи.",
        "École élémentaire Péglion": "Единственная государственная школа, действительно расположенная на холме.",
        "Parc forestier du Mont Boron": "57 гектаров сосен и каменных дубов, размеченные тропы и смотровые площадки над двумя бухтами.",
        "Musée de Terra Amata": "Доисторическая стоянка у подножия холма, с очагами возрастом 400 000 лет."
      }
    },
    "cap-de-nice": {
      "paragraphs": [
        "Cap de Nice продолжает Mont Boron в сторону Villefranche, между boulevard Franck-Pilatte, идущим вдоль моря по корнишу, avenue Jean-Lorrain и boulevard Maeterlinck, названным в честь писателя — бывшего владельца дворца 1920-х годов, ставшего частной резиденцией. Это самый эксклюзивный сектор города: современные виллы с прямым выходом к морю и крупные престижные резиденции 1960–70-х годов с бассейном и видом на бухту анфас.",
        "Торговли здесь практически нет: квартал чисто жилой и зависит от нижней части Mont Boron и порта в повседневных нуждах. Взамен прибрежная тропа, скалистые бухточки и заповедник La Réserve дают возможность купаться прямо у дома — редкость для Ниццы."
      ],
      "who": "Самая высокая по статусу клиентура Ниццы, французская и международная, ищущая виллу у самой воды или квартиру в резиденции с бассейном: как престижное основное жильё, так и жильё «на выезд». Продаж немного, и часто они проходят вне открытого рынка.",
      "transport": "Ограниченное автобусное сообщение (маршрут 14 через boulevard du Mont-Boron); порт в десяти-пятнадцати минутах на машине по корнишу. Квартал, рассчитанный на автомобиль.",
      "advice": "В Cap de Nice продажи можно пересчитать по пальцам одной руки в год, а публичных ориентиров мало: стоимость выстраивается на сравнимых сделках, которые способно собрать только агентство, пристально следящее за этим рынком.",
      "notes": {
        "Sentier du littoral et criques du Cap de Nice": "Прибрежная тропа к Coco Beach и скалам La Réserve: пляж квартала — без песка и без толпы.",
        "Le Bistrot du Port": "Ближайший адрес для непритязательной средиземноморской кухни, в порту.",
        "L'Escale": "Морепродукты по справедливым ценам, привычный маршрут жителей, спускающихся в порт.",
        "Oceanosa": "На Cap своей торговли нет: рыбная лавка-ориентир находится у подножия Mont Boron.",
        "École élémentaire Péglion": "Cap относится к тому же государственному школьному сектору, что и Mont Boron."
      }
    },
    "cimiez": {
      "paragraphs": [
        "Cimiez (Симьез) занимает холм к северу от центра, на месте Cemenelum — римской столицы Приморских Альп, от которой сохранились арены и термы в парке, засаженном столетними оливами. Квартал сложился в эпоху Belle Époque, когда европейская аристократия — во главе с королевой Викторией — сделала его своим зимним курортом: дворец Excelsior Régina, ставший кондоминиумом, и десятки вилл и буржуазных домов обрамляют boulevard de Cimiez. Францисканский монастырь с садами и Музей Матисса довершают ансамбль, каким мало какой город может похвастаться.",
        "Это жилой, семейный квартал, немного удалённый от моря, с хорошими школами, старыми домами с высокими потолками и часто ухоженными резиденциями 1960–70-х годов с парком и бассейном. Верхняя часть Cimiez и бульвар со стороны Régina сосредотачивают лучшие виды и самые высокие цены."
      ],
      "who": "Семьи, представители свободных профессий и пенсионеры, ценящие наследие и спокойствие больше, чем близость к морю. Наиболее востребованы большая старая квартира с высокими потолками либо трёх-четырёхкомнатная в резиденции с бассейном и парковкой.",
      "transport": "Автобусные маршруты 5, 15, 25 и 37 по boulevard de Cimiez (остановки Arènes и Musée Matisse), четверть часа до Masséna; море в десяти-пятнадцати минутах на машине.",
      "advice": "В Cimiez вид на море из хорошо ориентированного престижного дома выводит квартиру за отметку 8000 €/м², тогда как медиана по кварталу — 5400. Та же квартира без вида или в уставшем кондоминиуме продаётся по цене обычного хорошего квартала. Мы различаем эти два случая уже на этапе оценки.",
      "notes": {
        "Morin Traiteur": "Кулинария в нижней части бульвара, эталон квартала для готовых блюд и приёмов.",
        "Côté Sud": "Средиземноморская рыночная кухня, открыта на обед по будням и вечером в пятницу: квартальный адрес.",
        "Buvette des Arènes": "Буфет парка, рядом с Музеем Матисса: просто, в тени олив.",
        "École primaire Cimiez-Essling et collège Roland-Garros": "Государственные учреждения, вокруг которых строится жизнь семей квартала.",
        "Parc des Arènes de Cimiez": "Столетние оливы, римские руины, детские площадки; здесь же проходит Nice Jazz Festival.",
        "Musée Matisse": "В вилле Arènes XVII века — одно из крупнейших в мире собраний Матисса."
      }
    },
    "fabron": {
      "paragraphs": [
        "Fabron занимает холмы западной Ниццы, между морем и Corniche Fleurie. Курортный квартал состоятельных семей с XIX века — Palais de Marbre сегодня занимают муниципальные архивы — он после войны покрылся резиденциями 1960–80-х годов с бассейном, парком и консьержем, которые остаются визитной карточкой сектора, наряду с несколькими старыми виллами и отдельными домами на возвышенностях.",
        "Приход линии 2 трамвая со станцией Fabron изменил расклад: центр и аэропорт теперь в четверти часа без машины. Parc Carol-de-Roumanie, школы и падел-корты Ultra Fabron придают кварталу семейную жизнь, которой не предложит побережье."
      ],
      "who": "Семьи и работающие руководители, которых привлекают вид, тишина и резиденции с бассейном по сдержанной цене, давние владельцы-пенсионеры и отдельные международные покупатели. Типичный объект — трёх- или четырёхкомнатная квартира с террасой, парковкой и бассейном.",
      "transport": "Линия 2 трамвая, станция Fabron: четверть часа до центра и до аэропорта; автобусы в сторону холмов и Ницца-Уэст.",
      "advice": "В Fabron цену определяет резиденция не меньше, чем сама квартира: расходы на содержание, бассейн, консьерж, парковка и, прежде всего, вид на море. Две на бумаге одинаковые трёхкомнатные квартиры могут отличаться на 30 % в зависимости от этажа и ориентации.",
      "notes": {
        "Chez Cane": "Щедрая ниццская и средиземноморская кухня, семейная институция авеню.",
        "La Pignata Côte d'Azur": "Квартальное заведение на авеню, простая и стабильная кухня для будних вечеров.",
        "École primaire Fabron – La Lanterne": "Государственные детский сад и начальная школа сектора.",
        "Parc Carol-de-Roumanie": "2,3 гектара газонов и сосен, место прогулок квартала.",
        "Ultra Fabron": "Падел и футбол пять на пять: место встречи семей и работающих жителей холмов."
      }
    },
    "gairaut": {
      "paragraphs": [
        "Gairaut (Гэро) — квартал северных холмов Ниццы, долго покрытых оливковыми рощами, сохранивший деревенский характер, несмотря на застройку виллами. Его водопад — бассейн и искусственный каскад в стиле Belle Époque, увенчанные альпийским шале, — был построен в 1883 году в честь прихода воды из реки Vésubie; церковь Saint-Sauveur и старая дорога vieux chemin de Gairaut дополняют скромное, но подлинное наследие вдали от суеты.",
        "Здесь покупают дом с садом и видом на город и море, в четверти часа на машине от центра. Квартиры тоже есть — в резиденциях 1970–80-х годов на avenue de Rimiez или в Saint-Sylvestre, — но рынок Gairaut прежде всего это рынок семейной виллы."
      ],
      "who": "Семьи, желающие дом с садом, не покидая Ниццу, и пенсионеры в поисках тишины и вида. Виллы чаще всего продаются между 700 000 и 1,5 миллиона евро; самые красивые, с видом и участком, — значительно дороже.",
      "transport": "Автобусные маршруты 11 и 63 в сторону Borriglione и центра, около двадцати минут; автомобиль остаётся необходимым для повседневной жизни.",
      "advice": "В Gairaut цена за квадратный метр мало о чём говорит: участок, вид и удобный подъезд значат больше, чем площадь застройки. Мы оцениваем дома на холмах как дома, а не как квартиры.",
      "notes": {
        "Au Rendez-Vous des Amis": "Семейная ниццская и провансальская кухня, ориентир холмов на протяжении десятилетий.",
        "Restaurant Simon": "Домашние равиоли, доба, вид на холмы: заведение для семей сектора.",
        "Les commerces de l'avenue de Rimiez": "В самом Gairaut торговли почти нет; за хлебом, газетой и овощами спускаются в Rimiez.",
        "École primaire La Gairautine": "Государственные детский сад и начальная школа квартала.",
        "Cascade de Gairaut": "Бассейн, каскад и шале 1883 года, вход свободный: прогулочное место квартала."
      }
    },
    "promenade-des-anglais": {
      "paragraphs": [
        "Promenade des Anglais тянется на семь километров вдоль Baie des Anges, от отеля Negresco и домов в стиле Belle Époque в центре до кварталов Magnan, Lenval, la Californie и Carras на западе. Застройка рассказывает об этом движении: дворцы и буржуазные дома начала XX века у центра, резиденции 1960–70-х годов у самого моря, более поздние проекты по мере удаления. Тёмное ущелье vallon obscur de Magnan, прорезанное в скале в двух шагах от набережной, напоминает, что город был построен на холмах.",
        "Сама Prom была полностью переустроена для пешеходов и велосипедистов на всём протяжении, а западный конечный пункт линии 2 трамвая находится в Magnan. Этот квартал стоит читать как два рынка: собственно набережную, где цены заметно растут, и улицы в глубине, где сохраняются цены обычного квартала — с пляжем в придачу."
      ],
      "who": "На набережной — покупатели второго жилья и инвесторы, французские и международные, ради вида и адреса; на улицах в глубине — семьи и работающие жители, которым нужен пляж пешком по квартальной цене. Символичный объект — двух- или трёхкомнатная квартира с балконом и видом на море.",
      "transport": "Линия 2 трамвая, конечная станция Magnan, пятнадцать минут до центра и до аэропорта; автобусы по всей Promenade; велосипед и пешие прогулки по благоустроенной набережной.",
      "advice": "На Promenade адрес прямо на Prom обходится на 30–50 % дороже той же площади на улице позади, а участок между Negresco и Albert-Ier стоит ещё ступенью выше. Мы всегда проверяем регламент кондоминиума: некоторые резиденции на набережной ограничивают краткосрочную аренду, и это меняет ценность объекта для инвестора.",
      "notes": {
        "Le Fournil de Magnan": "Независимая булочная на углу Magnan, хлеб квартала.",
        "Brasserie Le Magnan": "В руках одной ниццской семьи с 1987 года, дневные блюда по-дружески доступной цене: адрес для местных.",
        "Le Voilier Plage": "Семейный и доступный пляжный ресторан, вдали от цен соседних заведений.",
        "École élémentaire Sainte-Hélène": "Государственная школа, ближайшая к сектору Magnan – Californie.",
        "Plage publique de Magnan": "Свободный и бесплатный пляж местных жителей, с волейбольными площадками и сапбордами.",
        "Parc Carol-de-Roumanie": "Большой парк западной Ниццы, в десяти минутах ходьбы от улиц Magnan."
      }
    }
  }
};
