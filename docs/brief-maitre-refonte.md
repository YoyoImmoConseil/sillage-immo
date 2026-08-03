# Brief maître — Refonte marketing sillage-immo

**Version 2 — consolidée. Remplace `BRIEF-REFONTE-SILLAGE.md` et `BRIEF-REFONTE-SILLAGE-AMENDEMENTS-01.md`.**

**Date** : 31 juillet 2026
**Décideur** : Yoann Uzzan, directeur, Sillage Immo
**Priorité business** : rentrer des mandats vendeurs
**Stack** : Next.js 16.1.6 (App Router), React 19.2.3, Supabase, Tailwind 4, i18n maison `fr|en|es|ru`

---

## Sommaire

1. [Mode d'emploi et répartition des rôles](#1-mode-demploi-et-répartition-des-rôles)
2. [Le positionnement](#2-le-positionnement)
3. [Arbitrages tranchés](#3-arbitrages-tranchés)
4. [Diagnostic du site actuel et architecture cible](#4-diagnostic-du-site-actuel-et-architecture-cible)
5. [État technique vérifié](#5-état-technique-vérifié)
6. [Règles de non-régression](#6-règles-de-non-régression)
7. [Spécifications techniques](#7-spécifications-techniques)
8. [Séquence des lots](#8-séquence-des-lots)
9. [Vérifications en attente](#9-vérifications-en-attente)
10. [Question de modélisation ouverte](#10-question-de-modélisation-ouverte)

---

## 1. Mode d'emploi et répartition des rôles

Ce brief a été produit dans une session de stratégie marketing sans accès au dépôt ni à la base. Cursor a les deux.

- **Ce document décide** : positionnement, contenu, arbitrages commerciaux, ordre des chantiers, règles de non-régression.
- **Cursor vérifie et exécute** : tout fait technique énoncé ici doit être re-vérifié dans le code et en base. Les points marqués « À VÉRIFIER » sont explicitement non confirmés.
- **En cas de contradiction** entre ce document et le code : le code gagne sur les faits, ce document gagne sur les intentions. Signaler la contradiction plutôt que de trancher seul.

### Consigne explicite : contredire

L'échafaudage d'un assistant de code pousse à produire un diff plutôt qu'à discuter une décision. **Ce n'est pas le comportement attendu ici.**

Si une décision technique dégrade le positionnement — par exemple simplifier un affichage d'une manière qui affaiblit un engagement, ou proposer une métrique qui expose l'entreprise — **le signaler avant d'implémenter**. Une objection argumentée a plus de valeur qu'un lot livré vite.

De même : ne jamais trancher seul un point juridique, tarifaire ou éditorial. Ils remontent à Yoann.

### Règle de livraison

Un lot = une branche = un commit. **Avant de coder : lister les fichiers à créer et à modifier, et attendre validation.**

---

## 2. Le positionnement

### 2.1 Le problème concurrentiel

Sillage est une agence indépendante récente. Elle ne peut vendre ni un réseau, ni l'ancienneté, ni un maillage d'agences.

| Concurrent | Ce qu'il vend | Non copiable |
|---|---|---|
| **Orpi Agerim** | Réseau 1300 agences, SEO massif, 231 avis certifiés, créée 1993 | Le volume, le budget média |
| **Century 21 Lafage** (french-riviera-property) | 10 agences, 75 collaborateurs, magazine papier *Your Stories* | L'échelle |
| **Nice Properties** | Inventaire prestige, 4 agences, FR/EN/RU sur 3 TLD | Le stock |
| **Agentniçois** | Direction artistique, ton éditorial | Rien — rival de positionnement direct |

**Orpi vend déjà « mandat exclusif sans engagement de durée » (OrpiMax).** L'argument reste valide contre les trois autres, mais il ne peut pas être le titre : Orpi a 1300 agences de budget média derrière ce message. Sillage ne gagnera jamais la bataille de mémorisation sur ce terrain.

→ **Le sans-engagement n'est pas le titre. C'est la preuve n°1.**

### 2.2 Le pivot : l'engagement inversé

> Orpi dit : « vous êtes libre de tout engagement. » — passif, retire une objection.
> **Sillage dit : « vous n'êtes engagé à rien. Nous, si — et c'est chiffré, public et opposable. »**

Quatre choses qu'un réseau ne peut **structurellement** pas faire :

1. **Publier ses résultats réels** — exposerait ses agences faibles, communication verrouillée au national.
2. **Limiter son portefeuille** — modèle fondé sur le volume et le fichier commun.
3. **Afficher ses honoraires en clair en page d'accueil** — barème franchisé, planqué en PDF.
4. **Vendre un homme** — le réseau dilue les individus dans la marque.

Le point 4 règle le problème d'ancienneté. **Deux horloges, jamais mélangées** :

- **L'agence** est jeune, son registre de ventes part de zéro.
- **L'équipe** a dix ans, argument porté par la page équipe, vérifiable personne par personne.

Réponse au contradictoire : *« L'agence a un an, l'équipe en a dix, et voici nos cinq dernières ventes. »* Trois affirmations vraies séparément qui se renforcent sans se contaminer.

⚠️ **Le track record (« 350+ vendeurs accompagnés », « 10 ans ») doit être attribué nominativement à Yoann Uzzan et à l'équipe, jamais à l'entité.** Un prospect qui vérifie le RCS verrait l'écart : risque réputationnel.

### 2.3 Le H1

**« Vous ne signez aucun engagement. Nous en prenons cinq. »**

Alternatives écartées mais utilisables en variantes de campagne : « La seule agence de Nice qui publie ses résultats », « Notre méthode est publique. Nos chiffres aussi. »

Le H1 actuel (« L'immobilier à Nice, piloté par la data et l'humain ») est abandonné : deux abstractions, aucune tension.

### 2.4 Le Mandat Sillage — les cinq engagements

Exclusif, sans engagement de durée. **C'est le seul produit vendu sur le site.** Pas de grille comparative à deux offres : une page de conversion qui présente deux formules invite à négocier vers la moins chère. Le mandat simple n'est ni nommé, ni affiché, ni promu ; le contraste ne se manie qu'en rendez-vous.

Un seul nom de marque : le Mandat Sillage **est** le pacte. Ne pas ajouter un second terme par-dessus.

> **1. Une estimation argumentée, comparables affichés.**
> Pas un chiffre : le raisonnement et les biens qui le fondent.
>
> **2. Aucun engagement de durée — 15 jours de préavis.**
> Le minimum légal. Personne ne peut faire mieux.
>
> **3. Douze mandats maximum en simultané.**
> Soit trois par conseiller actif.
>
> **4. Des honoraires publics, connus avant le premier rendez-vous.**
> Barème en clair et simulateur sur le site.
>
> **5. Nous tenons nos délais, ou vous partez sans préavis.**
> · Reportage photo et Matterport réalisés sous **5 jours ouvrés** après signature
> · Annonce en ligne sur l'ensemble des supports sous **48 heures ouvrées** après validation des visuels
> · Compte rendu écrit tous les **15 jours**, chiffres de consultation à l'appui
> · Chaque visite consignée dans votre espace client sous **24 heures ouvrées** : qui est venu, ce qui s'est dit sur place, notre lecture. Le retour de l'acquéreur y est ajouté dès qu'il nous parvient.
>
> Si l'un de ces engagements n'est pas tenu, le mandat prend fin à votre simple demande, sans préavis ni justification.

**Articulation 2 ↔ 5, à écrire explicitement** : quinze jours dans le cas normal, zéro si Sillage n'a pas tenu. C'est l'engagement inversé rendu littéral — le seul cas où le vendeur perd son préavis est celui où l'agence a failli.

**Règle de construction : quatre lignes au n°5, pas six.** Chaque engagement ajouté est un point de rupture, et la sanction est identique quel que soit le manquement. Le dispositif est d'autant plus solide qu'il promet peu de choses très fermes.

**Le mot « ouvrées » est obligatoire.** Sans lui, une visite le samedi soir ou une validation de visuels le vendredi à 18 h crée un manquement mécanique le week-end — dont la sanction est la libération du mandat.

### 2.5 Le delta d'exclusivité

Réservé au Mandat Sillage, **absent du mandat simple, sans version dégradée** :

- Matterport, systématique et sans condition
- Shooting photo dédié (Nikon, conditions de prise de vue maîtrisées)
- Budget publicitaire engagé et chiffré, canaux nommés
- Espace client avec analytics de consultation
- Les cinq engagements ci-dessus
- Inscription au registre public des ventes
- Une place dans les douze

L'exclusivité n'est pas un verrou imposé au vendeur, c'est **la contrepartie d'un investissement** : un Matterport, un shooting et un budget pub ne sont pas amortissables sur un mandat qu'une autre agence peut vendre. Ça résout aussi la tension « diffusion massive » / « sans banaliser le bien » : ce n'est pas le nombre de canaux qui banalise, c'est l'absence d'exclusivité.

> *Le même budget de diffusion qu'un réseau national. Ce qu'on y met n'a rien à voir.*

### 2.6 Le Journal de bord — un registre, pas une médiane

**Forme : registre en relatif, à fenêtre glissante de 5.**

**Aucun montant absolu, jamais.** Chaque ligne en pourcentage : *3 pièces, Cimiez — vendu à −2,1 % du prix de mandat, en 41 jours.*

Raison : le barème d'honoraires étant publié, des prix absolus rendraient le **chiffre d'affaires calculable à la ligne près**. Deux décisions défendables isolément qui, combinées, exposeraient l'entreprise. Le relatif supprime le risque sans affaiblir l'argument — un vendeur se demande « est-ce que j'aurai mon prix », qui est une question de ratio.

**Fenêtre glissante, jamais de cumul.** « Nos cinq dernières ventes », toujours cinq. Aucun compteur cumulé, aucun « depuis notre création » : le volume total ne se déduit pas. Le critère de sélection étant la date et non la performance, il n'y a aucun biais — une mauvaise vente y apparaît.

**Règle publique et sans exception, à écrire sur la page** : la fenêtre est chronologique, aucune ligne n'est retirée. *Risque accepté par Yoann le 31/07/2026.* Une exception, même unique, tue le dispositif — et le tuera au pire moment, la page ayant été archivée par quelqu'un.

**Le cap remplace le `n`.** Pas d'échantillon affiché : le plafond de douze donne l'ordre de grandeur, explique la petitesse des chiffres et la transforme en preuve du modèle boutique. Une agence qui annonce douze mandats simultanés et publie quarante ventes médianisées se contredit.

**Trois indicateurs, zéro valeur absolue** :
1. Taux de mandats menés à la vente
2. Écart médian prix de mandat / prix d'acte
3. Délai médian

Le premier est le plus défavorable au réseau : une boutique sélective qui prend 12 mandats bien estimés et en vend 10 affiche 83 % ; un réseau qui en rentre 80 surestimés pour occuper le fichier et en vend 30 affiche 37 %. **Il perd par construction**, parce que son modèle repose sur le volume de mandats et non sur leur qualité.

**Périmètre : mandats Sillage uniquement.** À écrire noir sur blanc sous les chiffres. Non dit, c'est du cherry-picking qui revient au premier contradictoire ; dit franchement, c'est un argument de plus — ces résultats sont ceux de la méthode complète, et c'est pourquoi elle est indissociable.

**Distinction à ne jamais perdre** : *prix de mandat initial → prix d'acte* mesure la négociation totale, baisses comprises. *Prix affiché au moment de l'offre → prix d'acte* ne mesure que la dernière négociation et flatte mécaniquement. Le second est celui que les réseaux mettent en avant. **Pour que « vite ET au prix » soit inattaquable, il faut le premier.**

⚠️ **Le délai ne s'affiche jamais seul.** Délai + écart de prix toujours ensemble : le délai isolé se retourne en « ils vendent vite parce qu'ils bradent ». La paire est indéfendable à attaquer.

### 2.7 Deux natures d'engagements

Distinction structurante, qui permet de lancer sans échantillon :

- **Moyens garantis** — vérifiables immédiatement, sans dépendance aux données : Matterport systématique, portails nommés, budget pub engagé, nombre de photos, délais du n°5. Aucun concurrent ne chiffre ses moyens (Orpi écrit « portails immobiliers, fichier commun, communication locale, réseaux sociaux » — quatre mots, zéro chiffre).
- **Résultats mesurés** — montent en puissance avec le volume.

**Avec 3 biens `sold` en base, la Phase 1 « moyens garantis » n'est pas transitoire : c'est le régime de croisière pour plusieurs trimestres.** Les moyens chiffrés doivent porter seuls l'argument bien plus longtemps que prévu.

**Deux métriques d'activité publiables immédiatement**, insensibles à l'échantillon :
- Visites physiques organisées par mandat (38 visites en base — personne ne publie cette métrique)
- Taux de Matterport (11/23 aujourd'hui, 100 % dès que l'engagement s'applique aux seuls Mandats Sillage)

### 2.8 Ce qu'on ne fait PAS

❌ **Pas de compteur « X acquéreurs cherchent un bien comme le vôtre »** dans le tunnel d'estimation.
Asymétrie de gains défavorable : un compteur à 23 fait gagner un peu, un compteur à 0 éjecte le prospect au moment exact où il donnait ses coordonnées. Tant que zéro est atteignable, l'espérance est négative — **et les 74 recherches en base ne changent rien à ce raisonnement**.

✅ **À la place, un indicateur de tension de marché** : délai médian, écart médian, nombre de biens comparables en concurrence sur le secteur. Ne peut pas retourner zéro, répond à une question plus dure (« à quoi ressemble mon marché ? »), sert directement l'argument prix.

✅ **Et, hors ligne, l'outil de rendez-vous** : les acquéreurs réels, nommément, sur un écran admin (cf. §7.3). Trois fiches posées sur la table battent un compteur affiché. Si le nombre est faible, un humain le retourne en argument (« votre bien est rare, on ne le diffuse pas comme les autres ») — ce qu'une interface ne peut pas faire sans sonner faux.

❌ **Pas de compteur de disponibilité en temps réel sur le cap.** Avec douze places, un cycle de vente de l'ordre de deux mois et un objectif de volume très inférieur à la capacité, le plafond ne sera presque jamais atteint. Un compteur affichant en permanence douze places libres détruit l'effet et frôle la fausse rareté. Le cap est **une règle de service**, jamais un décompte.

---

## 3. Arbitrages tranchés

Tous datés du 31/07/2026.

### A — Départ au bout de 15 jours : rien facturé, livrables conservés par Sillage

Le vendeur ne doit rien. Matterport, photos et vidéo restent la propriété de Sillage.

- **Juridiquement peu coûteux** : en droit français le droit d'auteur sur les photographies appartient par défaut à leur auteur. La clause formalise une situation acquise.
- **Opérationnel** : prévoir la révocation du lien Matterport et le retrait des visuels des portails à la fin du mandat, sinon la clause est théorique.
- **Ton de la copy** : mettre en avant « vous ne nous devez rien ». La conservation des livrables est un point de contrat et une ligne de FAQ, **pas un argument de vente** — brandie, elle sonne mesquine et annule l'effet de générosité.
- **Le site doit répondre explicitement à la question « et si vous partez ? »**. Aucun concurrent ne l'aborde ; poser la question à voix haute fait plus pour la crédibilité que trois paragraphes sur l'exigence.

### B — Tarif unique : même taux que le mandat simple, périmètre incomparable

Un rabais dirait implicitement « l'exclusivité est une concession que je vous compense » et détruirait le récit de l'investissement. **L'exclusivité ne donne pas droit à moins cher, elle donne accès à plus.**

- `/honoraires` n'affiche **qu'un seul barème**, celui du Mandat Sillage.
- Le simulateur repose sur une grille unique et doit produire un **net vendeur**, pas un pourcentage.
- Argument de rendez-vous, à « pourquoi le même prix pour l'exclusivité ? » : la liste du delta (§2.5).

### C — Plafond public : 12 mandats simultanés

Règle affichée : **3 mandats par conseiller actif**, soit 12 pour l'équipe actuelle (Yoann, Jordan, Laura, Julien). Le chiffre monte avec l'équipe sans que l'engagement se déjuge.

### D — Engagement n°5 : moyens garantis, sanction = libération immédiate

Trois raisons : aucun risque exogène (le délai de vente dépend du prix, donc du vendeur ; les moyens ne dépendent que de Sillage) ; **aucune grille d'honoraires variable**, donc aucune complication Hoguet et aucune contradiction avec le tarif unique ; et un engagement qu'un réseau ne peut pas prendre, faute de garantir l'exécution sur 1300 agences.

**Pourquoi le 4e délai a été reformulé** : la version initiale (« chaque visite débriefée sous 24 h ») dépendait d'un acquéreur qui ne rappelle pas. La reformulation sépare **ce qui s'est passé à la visite** (sous contrôle total de Sillage) du **positionnement de l'acquéreur** (exogène, non engageable).

Gain non évident : **la douleur du vendeur n'est pas la maigreur du retour, c'est le silence.** Personne ne se plaint qu'un compte rendu manque de substance ; tout le monde se plaint que l'agence ne rappelle pas. S'engager à écrire dans les 24 h *y compris pour dire que l'acquéreur ne s'est pas encore prononcé* répond au vrai grief, et aucune agence ne le fait.

Copy utilisable : *« Vous aurez de nos nouvelles après chaque visite, même quand nous n'en avons pas encore. »*

### E — Consentement à la publication : allégé, non bloquant

Le registre ne publiant ni montant ni adresse précise, l'identification des biens est faible. Une clause au mandat reste souhaitable par prudence, mais elle ne bloque pas la spécification ni la construction de la page.

### F — Uniquement le préavis de 15 jours

Le mandat ne prévoit que la dénonciation avec préavis de 15 jours. **Un seul argument, pas deux** — la copy ne doit pas évoquer de droit de rétractation.

⚠️ **À faire vérifier par un conseil juridique, hors périmètre marketing.** Un mandat signé au domicile du vendeur, avec un particulier, relève du démarchage hors établissement, auquel le Code de la consommation attache un droit de rétractation de 14 jours non optionnel. Si la mention est absente du mandat, l'enjeu dépasse la communication : il touche à la recouvrabilité des honoraires. **À vérifier avant toute publication sur le sujet.**

---

## 4. Diagnostic du site actuel et architecture cible

### 4.1 Le texte : trop, et surtout pas le bon type

Ratio actuel estimé : **90 % promissoire / 10 % probatoire.** Cible : **40/60.**

Le texte n'est pas mauvais — il est bon, et mal placé. Le long-form convertit là où l'intention est haute (page méthode, tunnel, landing quartier), pas en haut d'entonnoir où on scanne. **On déplace, on ne supprime pas.**

Occurrences relevées sur la home : « sur-mesure » ×4, « premium » ×5, « interlocuteur unique » ×3, CTA estimation ×6. Passé le deuxième rappel, le lecteur ne lit plus une affirmation mais une insistance — et l'insistance sur le premium est l'inverse du premium.

Un positionnement premium se signale **visuellement**, pas verbalement. La home actuelle est un mur de titres et de paragraphes. C'est le seul point où les quatre concurrents gagnent tous les quatre.

### 4.2 Défauts à corriger

| # | Défaut | Correction |
|---|---|---|
| 1 | La home ne montre **aucun bien réel** (2 boutons de catégorie) | 6 biens dont exclusivités badgées, prix + quartier + surface |
| 2 | Les 10 quartiers sont du **texte non lié** | Landing pages `/quartiers/[slug]` |
| 3 | `<title>` = « Sillage Immo » | Title localisé avec mots-clés |
| 4 | « 4,9/5 », « 350+ vendeurs » **sans lien ni preuve** | **Retirer la note Google** — le profil Sillage n'a pas assez d'avis pour la sourcer (décision Yoann). Attribution nominative du track record. La charge de preuve bascule sur les moyens chiffrés et le registre. |
| 5 | **Placeholders en production** : 2× « Portrait à venir », Julien sans intitulé | Page équipe complète |
| 6 | Numéro issu de `admin_profiles` **rendu brut** à côté du numéro d'agence formaté | Formatage à l'affichage dans `HomeTeamSection`. *Le code est correct — ce n'est pas un bug de rendu multiple mais un défaut de formatage. Le maintien du portable personnel est une décision éditoriale de Yoann.* |
| 7 | Hero à **4 CTA** | 1 primaire + 1 secondaire |
| 8 | Matterport hedgé : « lorsque c'est pertinent », « lorsque disponible » | Engagement dur : 100 % des Mandats Sillage |
| 9 | Bio de Yoann **en bas de page** | Remontée — c'est l'actif principal |
| 10 | Russe présent, italien absent | **Écarté (décision Yoann).** On reste à 4 locales `fr\|en\|es\|ru`. L'acquéreur italien est servi en `en`. Ne pas rouvrir sans décision explicite : une 5e locale casse le build tant que tous les `Record<AppLocale, T>` ne sont pas complétés. |

### 4.3 Nouvelle home — 7 blocs, pas 15

1. **Hero** — H1 de §2.3, 1 CTA primaire + 1 secondaire
2. **Preuve immédiate** — 3 chiffres sourcés et cliquables + 6 biens réels
3. **Le Mandat Sillage** — les 5 engagements
4. **Journal de bord** — extrait, lien vers la page complète
5. **Nos quartiers** — tuiles cliquables
6. **L'outil** — recherche dessinée + espace client, démo visuelle, zéro paragraphe explicatif
7. **Yoann** — visage, track record, téléphone

Sections actuelles à **migrer** vers `/methode`, pas à supprimer : `PositioningSection`, `MethodSection`, `ComparisonSection`, `InternationalSection`.

**`ComparisonSection` est à réécrire** : le comparatif actuel oppose « vendre seul / vendre avec Sillage » — il combat le PAP. Le vrai combat est « pourquoi Sillage plutôt qu'une enseigne de réseau » : interlocuteur unique vs rotation de conseillers, honoraires lisibles, pas de fichier commun qui banalise le bien.

### 4.4 Nouvelles pages

- **`/mandat-sillage`** — le manifeste, les 5 engagements, la section « Et si vous partez ? », et une section **« Ce que nous refusons »** : les mandats simples, la surestimation pour capter le mandat, le fichier commun, plus de douze mandats. L'anti-marketing crée plus de confiance que la promesse.
- **`/honoraires`** — barème en clair + simulateur (net vendeur)
- **`/journal-de-bord`** — le registre
- **`/quartiers/[slug]`** — 6 pages prioritaires, pas 10
- **`/methode`** — destination du texte long retiré de la home

### 4.5 Livrable hors code

**Une refonte convertit, elle ne génère pas de trafic.** Le SEO quartiers met des mois à ranker. Sur la fenêtre courte, le site est alimenté par la base existante, la fiche Google Business et la prospection physique.

D'où : **le Mandat Sillage en version imprimée**, remis au rendez-vous d'estimation. C'est la réponse au magazine papier de Lafage — moins cher, plus utile, directement branché sur la cible.

---

## 5. État technique vérifié

> Audit du 31/07/2026 + vérifications indépendantes par Cursor (script `scripts/diagnostic-refonte.mjs`, non commité).

### 5.1 Volumétrie réelle

| Table | Lignes | Note |
|---|---|---|
| `transactions` | **0** | Schéma complet et bien conçu, jamais alimenté |
| `honoraires_history` | **0** | |
| `market_observations` | **0** | Aucun raccourci quartier possible |
| `valuations` | **2** | Pour 18 `seller_leads` — cf. §5.4 |
| `properties` | 23 | dont **3 `sold`**, 1 `agreement`, 9 `available`, 5 `deleted`, 3 `prospect`, 2 `null` |
| `property_listings` | 20 | 20 avec un prix |
| `property_visits` | 38 | via 22 livraisons Zapier, 5 `ignored` (biens non rattachables) |
| `buyer_search_profiles` | **74** | tous actifs — **seul actif de données mature** |
| `buyer_leads` | 72 | |
| `seller_leads` | 18 | |
| `zone_catalog` | 116 | tous actifs, alias sur 100 % |
| `properties.virtual_tour_url` | 11 / 23 | Matterport à ~48 % |
| `crm_webhook_deliveries` | 102 SweepBright | toutes `processed`, du 16 mars au 30 juillet 2026 |

### 5.2 Les faits structurants

**a. `transactions` est vide.** Le schéma contient tout : `property_id`, `seller_project_id`, `mandate_price_amount`, `agreed_price_amount`, `deed_price_amount`, `honoraires_amount`, `mandate_signed_at`, `offer_received_at`, `preliminary_sale_signed_at`, `deed_signed_at`, `cancelled_at`, `metadata` (dont `mandateType`), `external_id`. Le canal existe (`/api/integrations/v1/transactions`, auth `sk_mcp_…`, app Zapier publiée). **Ce qui manque, c'est le Zap : jamais créé ou éteint.**

**b. Le prix est écrasé à chaque sync.** Le webhook direct ne transporte qu'une notification (`event`, `estate_id`, `company_id`, `happened_at`) — **vérifié sur les données réelles**. L'estate est ensuite récupéré par API REST, puis `property_listings.price_amount` est mis à jour par upsert sur `(property_id, business_type)` et `properties.raw_payload` écrasé, non versionné. SweepBright *envoie* bien les prix de mandat, compromis et vente ; l'app ne conserve que le dernier état.

**c. Le backfill des prix par `crm_webhook_deliveries` est impossible.** Le payload ne contient que la notification. **La table reste utile pour les dates** : 102 `happened_at` sur 4 mois et demi, exploitables pour reconstituer les délais.

**d. Aucune colonne `neighborhood`** sur `properties` ni `property_listings`. `properties.latitude` / `longitude` existent. `zone_catalog` est une **nomenclature sans géométrie**, mais avec des **alias de matching textuel** et un **score de désirabilité de 0 à 15** (Mont Boron / Cap de Nice / Promenade = 15 ; Cimiez / Carré d'Or = 12 ; Ariane = 1 ; îles de Lérins = 0). PostGIS absent.
⚠️ **`zone_catalog` couvre toute la Côte d'Azur** (Cannes, Antibes, Menton, Cagnes, Saint-Jean-Cap-Ferrat). **Filtrer sur `city = 'nice'`**, sinon les six meilleurs scores emmènent à Cannes.

**e. RLS : 48 tables, 48 avec RLS activé, 29 sans aucune policy** — dont `properties`, `property_listings`, `transactions`, `valuations`, `market_observations`. Muettes pour `anon` / `authenticated`. **La protection effective ne repose pas sur RLS mais sur le fait que tout passe par `service_role`** (seule écriture applicative hors service_role : `leads`).
→ **Ne PAS exposer le Journal de bord par une vue Supabase publique.** Route API Next.js en `service_role` renvoyant des agrégats pré-calculés, avec cache.

**f. Aucun mécanisme de feature flags.** Deux toggles ponctuels : `MCP_WRITE_ENABLED`, et `isClientPortalDirectAccessEnabled` activé **par nom d'hôte** (hack à ne pas toucher).

### 5.3 SEO — quasi tout est absent

`sitemap`, `robots`, `hreflang` / `alternates.languages`, `canonical`, `metadataBase`, `openGraph`, `twitter`, JSON-LD : **tous absents**. `generateMetadata` sur 6 pages sur 43 ; les 36 autres héritent d'un metadata racine **figé en français**. Pas de `not-found.tsx` alors que 5 pages appellent `notFound()`.

### 5.4 Le trou de conversion du tunnel

**2 `valuations` pour 18 `seller_leads`.** `estimate-and-create` crée le lead **et** la valuation dans la même chaîne : 2 valuations = 2 parcours complétés, les 16 autres leads viennent d'ailleurs.

Rien n'étant persisté avant `send-otp`, les abandons sur le formulaire sont **invisibles en base**. Premier point de mesure : `seller_email_verifications`.

| Résultat | Diagnostic | Correctif |
|---|---|---|
| OTP demandés ≈ 2 | Personne n'atteint la fin du formulaire, ou la page | Trafic ou formulaire — **pas** le tunnel |
| OTP demandés élevé, vérifiés faible | L'OTP tue le parcours | Repenser le moment de la vérification |
| Vérifiés élevé, valuations = 2 | Échec dans `estimate-and-create` (Loupe, timeout) | Le plus grave et le plus silencieux |

**Donnée manquante : le trafic.** `NEXT_PUBLIC_GTM_ID` existe → GA4 ou Vercel Analytics. Sans lui, impossible de distinguer un problème de conversion d'un problème d'audience — et on risque de refondre un tunnel que personne ne voit.

**Aucun correctif du tunnel ne se code avant ce diagnostic.**

### 5.5 Dette connue — à ne pas corriger dans ce chantier

- `db/install.sql` (28 tables) et `db/schema.sql` (~20) sont **périmés**. La référence : les **51 migrations** de `db/migrations/`. Numéro `024` dupliqué → toute nouvelle migration prend un numéro libre.
- `proxy.ts` l. 24 déclare `/api/estimation` qui **n'existe pas** (routes sous `/api/seller/`).
- Code mort : `CtaButton`, `SectionContainer` (`app/_home/shared/`), `app/estimation/seller-estimation-form.tsx`. **Ne pas supprimer.**
- Textes en dur non traduits : `language-switcher.tsx` (l. 28, 43, anglais figé), `seller-event-copy.ts` (l. 43-48, 68-76, français quelle que soit la locale), `valuation-widget.tsx` (l. 53-64).

---

## 6. Règles de non-régression

**Doctrine : additif, jamais destructif. On n'enlève rien avant que le remplaçant soit vérifié en production.**

### Code gelé

| Fonctionnalité | Risque |
|---|---|
| `proxy.ts`, `lib/i18n/routing.ts` | 404 ou fallback silencieux sur 3 locales |
| Chaîne magic link (`client-portal-magic-link.service.ts`, `/espace-client/auth/confirm`) | Liens déjà envoyés par mail qui meurent |
| Ingestion webhooks (`lib/ingestion/`, `services/properties/sweepbright-*`) | Perte de données de mandats, silencieuse |
| Tunnel d'estimation (`app/estimation/`, `/api/seller/*`) | Source de leads vendeurs pendant les travaux |
| Recherche dessinée (`buyer_search_profiles.criteria.zonePolygon`) | Alertes acquéreurs qui cessent de matcher |
| Clients Supabase (`lib/supabase/*`) | Sessions cassées |

### Routes gelées — un renommage casse des liens déjà envoyés ou des systèmes tiers

`/espace-client/auth/confirm` · `/espace-client/invitation?token=` · `/api/buyer-searches/unsubscribe` · `/espace-client/recherches/{id}` · `/espace-client/biens/{id}` · `/merci-vendeur?access=` · `/api/webhooks/{sweepbright,sweepbright-zapier,mynotary}` · `/api/integrations/v1/*` · `/api/internal/cron/*` · `/api/mcp` · `/biens/[slug]` · `/[postalCode]/[propertyId]`

### Contraintes structurantes

1. **`/[postalCode]/[propertyId]` est un catch-all de premier niveau.** Toute page racine entre en concurrence avec ce segment. Les quartiers vivent sous `/quartiers/[slug]`, **jamais** `/cimiez`. Toute page racine (`/honoraires`, `/mandat-sillage`, `/journal-de-bord`) doit être testée explicitement contre lui.
2. **Tout nouveau texte visible s'exporte en `Record<AppLocale, T>`** pour que `tsc` casse si une locale manque. **Aucun ternaire `locale === "en"`.**
3. **Toute entrée de navigation** exige de compléter `SiteHeaderCopy` (type fermé) → 4 traductions, sinon build cassé.
4. **Nouvelle table = nouvelle migration à numéro libre.** Jamais d'`ALTER` sur les tables alimentées par SweepBright.
5. **La nouvelle home se construit en composant parallèle derrière un feature flag**, pas en chirurgie sur `app/page.tsx`.

---

## 7. Spécifications techniques

### 7.1 Journal de prix unifié — `property_price_events`

**Deux problèmes distincts, deux remèdes** :

| Problème | Nature | Remède |
|---|---|---|
| Le prix d'annonce n'est pas versionné (upsert) | Code | Table ci-dessous |
| Les tables d'historique ne sont pas alimentées (`transactions` 0, `honoraires_history` 0, `market_observations` 0) | Configuration | Activation des canaux Zapier |

**Le second est le plus grave** : c'est lui qui explique que le MCP n'ait rien à analyser. Aucun correctif de code ne réglera ça.

Un journal unique par bien plutôt qu'une table par type de prix : un seul fil chronologique, une seule requête pour toute l'histoire, une source unique pour le MCP.

```sql
create table public.property_price_events (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties(id) on delete cascade,
  amount       integer not null,
  currency     text not null default 'EUR',
  context      text not null check (context in (
                 'estimation','mandate','listing_change',
                 'offer','agreement','deed','withdrawn')),
  occurred_at  timestamptz not null,
  recorded_at  timestamptz not null default now(),
  source       text not null check (source in (
                 'sweepbright_webhook','zapier','admin',
                 'valuation','estimation_tunnel')),
  source_ref   text,
  metadata     jsonb not null default '{}'::jsonb,
  unique (property_id, context, occurred_at, amount)
);
create index on property_price_events (property_id, occurred_at);
```

**Quatre règles non négociables** :

1. **`occurred_at` ≠ `recorded_at`.** Date de l'événement vs date d'enregistrement. Sans cette séparation, tout backfill fausse l'analyse temporelle.
2. **Append-only, jamais d'upsert.** Écriture **avant** l'upsert existant dans `sweepbright-sync.service.ts`, et **uniquement si le montant diffère du dernier événement du même contexte** — sinon chaque passage du cron (`*/10 * * * *`) génère du bruit.
3. **La contrainte unique porte l'idempotence** des webhooks rejoués (la file autorise 5 tentatives).
4. **Le contexte `estimation` exige une entrée admin.** Les estimations se font en rendez-vous, pas seulement via le tunnel. Ce sont les points de donnée les plus précieux — ils précèdent le mandat et mesurent l'écart estimation → prix obtenu. Rien ne les capte aujourd'hui.

**Ce que ça débloque pour le MCP** : écart estimation → mandat, écart mandat → acte, nombre et amplitude des baisses, délai entre jalons, taux de transformation des offres. Aucune n'est calculable aujourd'hui.

### 7.2 Espace client — registre de preuve de l'engagement n°5

Une sanction ne vaut que si le manquement est **constatable**. Chaque engagement doit être horodaté et visible côté vendeur : signature du mandat, shooting et Matterport, mise en ligne, comptes rendus périodiques, consignations de visite.

L'espace client cesse d'être un endroit où « suivre les étapes » : **il devient le registre de preuve**, consultable par celui qui pourrait s'en prévaloir. C'est ce qui lui donne sa raison d'être dans le discours commercial.

**L'infrastructure existe** : table `client_project_events`, fonction `emitClientProjectEvent`, affichage via `seller-event-copy.ts`. Manquent les quatre types d'événements et leur horodatage. Corriger au passage le bug i18n de `seller-event-copy.ts`.

⚠️ **Ce lot passe avant `/mandat-sillage`.** Publier l'engagement sans pouvoir le prouver serait le pire des scénarios.

### 7.3 Outil acquéreurs pour le rendez-vous (non public)

Écran admin qui, sur une adresse + typologie + fourchette de prix, sort les acquéreurs correspondants : profil, budget, critères, date de création de la recherche.

Pourquoi il passe devant les landing pages : sert **directement** la priorité mandats vendeurs, s'appuie sur la seule donnée mûre (74 recherches), `buildMatchScore` existe déjà, aucun risque public, ne dépend d'aucun arbitrage.

Note : `buildMatchScore` ignore `criteria.zonePolygon` et ne compare que les critères tabulaires, alors que `properties.latitude` / `longitude` existent. L'intégration de la zone dessinée est un plus, pas un prérequis.

### 7.4 Rattachement quartier

Table additive `property_neighborhoods` (`property_id`, `neighborhood_slug`, `method`, `computed_at`), alimentée par **matching sur les alias de `zone_catalog`** (pas de point-dans-polygone : PostGIS absent, et les alias couvrent 100 % des zones), avec écran de correction manuelle en admin.

**Filtrer sur `city = 'nice'`.** Prioriser par score : les 6 qui pèsent, pas les 10.

### 7.5 Journal de bord — exposition

Route API Next.js en `service_role` renvoyant **uniquement des agrégats et des lignes en relatif** (§2.6), avec cache. Aucune policy RLS modifiée, aucun montant absolu, aucune donnée nominative.

---

## 8. Séquence des lots

L'ordre n'est pas arbitraire : ce qui perd de la donnée chaque jour passe avant tout le reste.

| # | Lot | Nature | Statut |
|---|---|---|---|
| 1 | **0 ter-a — `property_price_events` + écriture depuis le webhook SweepBright** | Code | 🔴 Arrête le saignement. Chaque sync détruit définitivement. |
| 2 | **0 bis — Activer le canal Zapier `transactions`** | Config | 🔴 Sans lui, `mandate`, `agreement`, `deed` ne se rempliront jamais |
| 3 | **Question à SweepBright** | Externe | 🔴 Historique de prix ou deals exposés par l'API ? Débloque le registre chiffré. |
| 4 | **Diagnostic tunnel (§5.4)** | Requêtes + GA4 | Pas de code |
| 5 | **0 ter-b — Autres sources + entrée admin estimation** | Code | |
| 6 | **0 ter-c — Backfill des offres depuis `property_visits`** | Code | 38 visites avec montant et date |
| 7 | **Outil acquéreurs RDV (§7.3)** | Code | Meilleur rendement sur l'objectif mandats |
| 8 | **Espace client — événements de l'engagement n°5 (§7.2)** | Code | Prérequis de `/mandat-sillage` |
| 9 | **Socle SEO (§5.3)** | Code | Zéro risque, zéro dépendance |
| 10 | **Feature flags** | Code | Prérequis de la bascule home |
| 11 | **Correctif tunnel** | Code | Selon le diagnostic |
| 12 | **Rattachement quartier (§7.4)** | Code | |
| 13 | **`/mandat-sillage` et `/honoraires`** | Contenu + code | 4 locales |
| 14 | **Journal de bord (§7.5)** | Code | Version « moyens » d'abord |
| 15 | **Nouvelle home** | Code | Derrière feature flag |
| 16 | **Simulateur d'honoraires** | Code | Net vendeur |
| 17 | **Indicateur de tension dans le tunnel** | Code | Flag dédié |
| 18 | **Analytics Matterport dans l'espace client** | Code | Identifiant parsable depuis `virtual_tour_url` |

**Sur le lot 18** : en rendez-vous d'estimation, « 312 visites virtuelles, durée médiane 4 min 20, 68 % vont jusqu'à la terrasse » ferme le mandat. En cours de commercialisation, 300 visites virtuelles et zéro visite physique fait accepter une baisse de prix sans conflit — l'agent passe de négociateur contre son client à lecteur du marché avec lui.

---

## 9. Vérifications en attente

Aucune n'est une décision. Toutes conditionnent un lot.

| Vérification | Qui | Bloque |
|---|---|---|
| SweepBright expose-t-il un historique de prix ou des deals par API ? | Yoann → support SB | Registre chiffré |
| Le mandat doit-il mentionner un droit de rétractation de 14 jours ? | Conseil juridique | Toute publication sur les 15 jours |
| Trafic du tunnel d'estimation (GA4 / Vercel Analytics) | Yoann | Correctif tunnel |
| L'abonnement Matterport expose-t-il les analytics par modèle ? | Yoann | Lot 18 |
| Le Zap `transactions` existe-t-il ? | Yoann | Lot 2 |

---

## 10. Question de modélisation ouverte

**Faut-il historiser les changements de statut au même titre que les prix ?**

Le journal de prix donne les écarts et les délais. Mais les métriques de conversion — combien d'estimations deviennent des mandats, combien de mandats deviennent des ventes — dépendent d'objets qui ne sont pas des prix.

Deux options : étendre `property_price_events` avec un contexte de statut (`amount` devient nullable, ce qui alourdit la table), ou créer un journal parallèle `property_status_events`.

C'est un choix de modélisation, pas une décision stratégique — mais **il est beaucoup plus coûteux à rattraper après coup qu'à trancher maintenant**, et il conditionne ce que le MCP saura répondre.

À arbitrer avant le lot 1.

---

## 11. Registre des options écartées

> Chaque ligne est une piste sérieusement envisagée puis abandonnée. **Si l'une d'elles réapparaît comme « évidente » en cours de route, c'est qu'elle a déjà été tranchée.** Toute proposition de la réintroduire doit citer un fait nouveau, pas une intuition.

### Positionnement

| Option écartée | Motif |
|---|---|
| « Mandat sans engagement » en H1 | Orpi le vend déjà sous OrpiMax avec 1300 agences de budget média. Sillage serait lu comme copieur même en l'ayant eu avant. Rétrogradé en preuve n°1. |
| Vendre l'ancienneté de l'agence | Impossible, entité récente. Remplacé par les deux horloges (agence jeune / équipe dix ans). |
| Attribuer « 350+ vendeurs » et « 10 ans » à l'agence | Un prospect qui vérifie le RCS voit l'écart. Risque réputationnel. Attribution nominative obligatoire. |
| Mélanger le track record antérieur et le registre de ventes | Recrée le problème ci-dessus. Deux blocs séparés, jamais fusionnés. |
| Comparatif « vendre seul / vendre avec Sillage » | Combat le PAP alors que la bataille réelle est contre l'enseigne de réseau. À réécrire, pas à garder. |

### Journal de bord

| Option écartée | Motif |
|---|---|
| Médiane avec seuil de publication n=10 | 3 biens `sold` en base : hors d'atteinte plusieurs trimestres. Et le dilemme est insoluble — afficher `n` divulgue le volume, masquer `n` reproduit exactement le défaut reproché au « 4,9/5 » non sourcé. |
| Registre avec montants absolus | Barème d'honoraires public **+** prix absolus = chiffre d'affaires calculable à la ligne près. Deux décisions défendables isolément qui, combinées, exposent l'entreprise. |
| « Nous publions **toutes** nos ventes » | Le mot « toutes » est un engagement d'exhaustivité, et l'exhaustivité ne sert qu'à rendre le volume lisible. Ce qui crée la confiance n'est pas l'exhaustivité mais **l'absence de sélection** — obtenue par la fenêtre glissante chronologique. |
| Compteur cumulé, « depuis notre création » | Le volume total se déduit. |
| Afficher la taille de l'échantillon | Le cap de douze le remplace : il donne l'ordre de grandeur et transforme la petitesse en preuve du modèle. |
| Publier le délai seul | Se retourne immédiatement en « ils vendent vite parce qu'ils bradent ». Délai et écart de prix vont toujours ensemble. |
| Mesurer l'écart depuis le prix affiché au moment de l'offre | Ne mesure que la dernière négociation et flatte mécaniquement. C'est la métrique des réseaux. Non défendable en contradictoire. |
| Se réserver le droit de retirer une ligne gênante | Tue le dispositif, et le tuera au pire moment — quelqu'un aura archivé la page. Risque assumé par Yoann. |

### Tunnel d'estimation

| Option écartée | Motif |
|---|---|
| Compteur public « X acquéreurs cherchent un bien comme le vôtre » | Asymétrie de gains : un compteur à 23 fait gagner un peu, un compteur à 0 éjecte le prospect au moment où il donne ses coordonnées. **Les 74 recherches en base ne changent rien à ce raisonnement** — il suffit qu'un zéro soit atteignable. |
| Élargir la maille de matching pour éviter le zéro | Repousse le problème sans le supprimer (villa à 3,5 M€, local commercial). Et impose d'afficher la règle de comptage, sous peine d'inflation silencieuse. |

### Mandat et tarification

| Option écartée | Motif |
|---|---|
| Rabais d'honoraires sur l'exclusivité | Dit implicitement « l'exclusivité est une concession que je vous compense » et détruit le récit de l'investissement. L'exclusivité donne accès à plus, pas à moins cher. |
| Majoration sur l'exclusivité | Écartée au profit du tarif unique (arbitrage B). |
| Facturer les frais engagés en cas de départ à 15 jours | Vide le message de sa substance : le vendeur comprend qu'il n'est libre que sur le papier. |
| Laisser Matterport et photos au vendeur qui part | Il repartirait avec les livrables chez un confrère. |
| Mettre en avant « les livrables restent à nous » | Sonne mesquin et annule l'effet de générosité du « vous ne nous devez rien ». Point de contrat et ligne de FAQ, pas argument de vente. |
| Engagement de délai avec sanction tarifaire | Le délai dépend du prix, donc du vendeur : une surestimation imposée fait porter le risque à Sillage. La condition « au prix estimé » protège mais affaiblit le message. |
| Sanction en honoraires réduits | Crée une grille variable qui doit figurer à l'identique au barème et au mandat — complication Hoguet, et frottement avec le tarif unique. |
| Engagements déclaratifs sans sanction | Le H1 « nous en prenons cinq » tombe : quatre engagements sur cinq ne coûteraient rien s'ils n'étaient pas tenus. |
| « Chaque visite débriefée sous 24 heures » | Dépend d'un acquéreur qui ne rappelle pas. Manquement mécanique. Remplacé par la consignation, qui ne dépend que de Sillage. |
| Délais exprimés en heures calendaires | Une visite le samedi soir crée un manquement automatique. « Ouvrées » partout. |
| Cinq ou six lignes au n°5 | Chaque ligne est un point de rupture, pour une sanction identique. Quatre. |
| Matterport « lorsque c'est pertinent » | Le hedge détruit l'actif : le vendeur lit « peut-être ». Engagement dur ou rien. |
| Compteur de disponibilité du cap en temps réel | Avec douze places et un cycle de deux mois, le plafond ne sera presque jamais atteint. Un compteur affichant en permanence douze places libres frôle la fausse rareté. |

### Technique

| Option écartée | Motif |
|---|---|
| Exposer le Journal de bord par une vue Supabase publique | 29 tables ont RLS activé sans policy ; la sécurité effective repose sur `service_role`, pas sur RLS. Ouvrir une policy sur `transactions` exposerait prix, honoraires et vendeurs. Route API agrégée à la place. |
| `property_price_history` limité aux prix d'annonce | Trop étroit. Élargi en `property_price_events` avec contexte complet (estimation, mandat, baisse, offre, compromis, acte) — un seul fil chronologique, une seule source pour le MCP. |
| Point-dans-polygone pour le rattachement quartier | PostGIS absent, et `zone_catalog` n'a pas de géométrie. Les alias couvrent 100 % des zones : matching textuel, moins cher et suffisant. |
| Backfill des prix depuis `crm_webhook_deliveries` | **Impossible** : le payload ne contient que la notification (`event`, `estate_id`, `company_id`, `happened_at`). Vérifié dans le code et sur les données. Reste exploitable pour les dates. |
| `market_observations` comme raccourci quartier | Table vide (0 ligne). Le raccourci n'existe pas. |
| Statifier les routes / toucher au rendu dynamique global | `app/layout.tsx` appelle `getRequestLocale()` et `getRequestPlatform()`. Le rendu dynamique est un acquis, pas un défaut à corriger dans ce chantier. |
| Supprimer le code mort identifié à l'audit | Hors périmètre. Doctrine additive. |
| Chirurgie directe sur `app/page.tsx` pour la nouvelle home | Composant parallèle derrière feature flag, bascule réversible par variable d'environnement. |

---

## 12. Posture attendue

Ce chantier n'est pas une refonte technique avec du contenu dedans. C'est une opération marketing dont le livrable est du code. La posture à tenir est celle d'un **directeur marketing et directeur artistique**, pas celle d'un exécutant technique.

Concrètement, trois obligations :

**Refuser de livrer une section qui affirme sans prouver.** Le défaut central du site actuel est un ratio de 90 % de promesses pour 10 % de preuves. Toute section qui dit « nous sommes exigeants » sans artefact attaché (un chiffre, une photo, un bien, une date, un nom) reproduit le défaut qu'on corrige. Signaler, ne pas livrer.

**Traiter la hiérarchie visuelle comme un livrable, pas comme une finition.** Une page dont tous les blocs ont le même poids typographique n'a pas de message. Le choix de ce qui est gros, de ce qui est petit et de ce qui est absent *est* la décision marketing.

**Signaler les dégradations de positionnement.** Si une contrainte technique conduit à affaiblir un engagement, à masquer un chiffre ou à simplifier une preuve, le dire avant d'implémenter. Une objection argumentée vaut mieux qu'un lot livré vite.

---

## 13. Référentiel concurrentiel détaillé

> Analyse des quatre sites au 31/07/2026. Sert à calibrer le niveau attendu et à identifier les vides à occuper.

### 13.1 Orpi Agerim — `orpi.com/agerim`

**À prendre** : l'architecture SEO locale, qui est la meilleure des quatre — plus de cinquante pages quartiers et villes, chacune autonome. La preuve sociale tierce, datée et nominative (Opinion System, 231 avis vérifiés, certificat cliquable, verbatims avec dates). Une FAQ structurée. Une équipe de douze personnes avec photos et lignes directes.

**À exploiter** : aucune personnalité de marque — c'est un gabarit réseau, identique à 1300 autres. Aucun signal premium malgré une adresse de prestige. Les honoraires sont relégués dans un PDF statique en pied de page. Et surtout : **OrpiMax promet un accompagnement supérieur sans jamais le chiffrer ni le prouver.** C'est exactement le vide que le Mandat Sillage occupe.

### 13.2 Nice Properties — `nice-properties.fr`

**À prendre** : le moteur de recherche en page d'accueil, riche et orienté usage (vue mer, dernier étage, à rénover) plutôt qu'orienté fichier. Les dispositifs de rareté éditorialisés — « Sélection du Mois », « Nos Exclusivités ». Les guides de quartier. C'est la référence locale sur la présentation d'inventaire.

**À exploiter** : design daté, contenu éditorial mort depuis mai 2021, bloc « Notre engagement » copié-collé dans « Notre équipe », aucune preuve sociale, aucune individualisation des collaborateurs. Une vitrine sans habitants.

### 13.3 Agentniçois — `agentnicois.com`

**Le rival de positionnement direct.** Même créneau : humain, moderne, contre l'immobilier traditionnel.

**À prendre** : le courage éditorial — une vidéo en hero, un ton assumé, une voix reconnaissable. Et la recherche par atout (bourgeois, vue mer, terrasse), qui parle le langage de l'acheteur au lieu de celui du fichier.

**À exploiter** : des fautes en dur dans le site, des tuiles avec des placeholders « empty picture », un service à peine expliqué, zéro preuve de résultat. **Ils ont l'image, Sillage a la substance.** Le combat se gagne sur la substance — mais à condition de ne pas leur laisser tout l'écart esthétique.

### 13.4 Century 21 Lafage — `french-riviera-property.com`

**À prendre** : l'actif éditorial physique — un magazine papier en septième édition. Sur un marché où le vendeur haut de gamme reste sensible à l'objet tangible, c'est un différenciant que le digital ne compense pas. D'où le Mandat Sillage imprimé (§4.5).

**À exploiter** : une technologie ancienne (.cfm), des titres en capitales bourrés de mots-clés, un site qui bloque les robots d'indexation. Une marque forte sur un socle numérique dépassé.

### 13.5 La synthèse qui fonde toute la stratégie

**Aucun des quatre ne publie de chiffres de performance. Aucun n'affiche ses honoraires en clair. Aucun ne chiffre ses moyens. Aucun n'a d'outil produit.**

C'est un quadruple vide, et il n'est pas accidentel : trois d'entre eux sont des réseaux ou des groupes, structurellement empêchés de le faire (§2.2). C'est l'espace exact dans lequel Sillage s'installe, et la raison pour laquelle la stratégie ne peut pas être copiée par les plus gros.

**Corollaire à ne jamais perdre de vue** : le seul terrain où Sillage perd contre les quatre, c'est le rendu visuel. Le rattraper n'est pas un supplément d'âme, c'est la condition pour que le reste soit crédible.

---

## 14. Direction artistique

### 14.1 Le principe directeur

**Ce site n'est pas une brochure de luxe, c'est un dossier de preuves.**

Le premium visé ici est **éditorial et institutionnel**, pas décoratif. La référence n'est pas la plaquette immobilière glacée — c'est le document bien fait : rapport annuel soigné, acte notarié, registre. Cette direction découle directement du positionnement : on vend de la transparence opposable, donc l'objet doit avoir l'air d'une pièce qu'on peut produire, pas d'une publicité.

Conséquence immédiate : **proscrire les codes du luxe immobilier générique** — dorures, italiques cursives, superlatifs, dégradés, images de coucher de soleil sur la baie. Ils disent « comme tout le monde, en plus cher ».

### 14.2 Règles

**La photographie porte le premium, jamais les adjectifs.** Photos réelles de mandats réels, en grand format. Les prises de vue de nuit — signature photographique de Yoann — sont un actif de différenciation : personne à Nice ne le fait systématiquement.

**Aucune photo de banque d'images, jamais.** Une agence qui publie ses résultats réels ne peut pas illustrer sa page avec une famille souriante achetée en ligne. La contradiction est fatale et immédiatement perceptible.

**La typographie fait la hiérarchie.** Une police de titrage, une police de texte, pas davantage. Les échelles doivent être franches : si le lecteur hésite sur ce qui est important, la hiérarchie a échoué.

**Les chiffres sont le produit — ils reçoivent le poids typographique.** Les quatre délais du n°5, les douze mandats, les quinze jours, les pourcentages du registre. Ce sont eux qui portent l'argument, pas les phrases qui les entourent.

**Le blanc est le signal de premium.** La densité est l'ennemi. Toute section qui a besoin d'être serrée pour tenir contient trop de choses.

**Retenue chromatique.** L'indigo profond (#141446) et le beige chaud (#F4ECE4) de la charte suffisent. Une couleur d'accent au maximum, réservée aux actions et aux chiffres clés. Pas de palette.

### 14.3 Deux traitements spécifiques

**La page `/mandat-sillage` doit ressembler à un document, pas à une page de vente.** Les cinq engagements se présentent comme des clauses numérotées : numérotation apparente, alignement strict, aucun pictogramme, aucune carte arrondie avec ombre portée. L'objet doit donner l'impression qu'on pourrait le signer. C'est ce qui rend le mot « opposable » crédible visuellement.

**Le Journal de bord doit ressembler à un registre, pas à un tableau de bord.** Lignes datées, chiffres alignés, aucune courbe, aucun graphique, aucune animation. Un graphique dit « marketing » ; un registre aligné dit « comptabilité ». La sobriété est ici l'argument même — et elle protège au passage du travers qui consisterait à faire paraître trois lignes plus impressionnantes qu'elles ne sont.

### 14.4 Les tests avant de livrer une page

1. **Le test du vendeur** : après lecture, qu'est-ce que la personne fait ? Si la réponse est « elle comprend mieux notre approche », la page n'a pas fonctionné.
2. **Le test de l'artefact** : chaque section contient-elle au moins un élément vérifiable — chiffre, date, nom, photo, bien réel ? Sinon, elle est promissoire.
3. **Le test du concurrent** : cette section pourrait-elle figurer telle quelle sur le site d'Orpi ou de Nice Properties ? Si oui, elle ne différencie rien.
4. **Le test de la hiérarchie** : en plissant les yeux, voit-on immédiatement ce qui compte dans le bloc ?
5. **Le test de la répétition** : cette idée est-elle déjà exprimée ailleurs dans la page ? La redite affaiblit au lieu de renforcer.

---

## 15. Compléments

> Points relevés lors d'une relecture critique du brief. Plusieurs comblent des angles morts qui auraient fait dérailler l'exécution.

### 15.1 Mobile — traitement de premier rang, pas d'adaptation

La direction artistique du §14 a été pensée pour un grand écran. **Sur l'immobilier, la majorité du trafic vendeur est mobile.** Le code a déjà un chemin dédié : `getRequestPlatform()`, `HomeMobileCtaBar`, `HCarousel` sur six sections.

- **Chaque bloc du §4.3 a une version mobile spécifiée**, pas seulement un comportement responsive hérité.
- **Le registre ne tient pas en colonnes sur 380 px.** Passer en cartes empilées : une vente par carte, les deux chiffres (écart, délai) en gros, le reste en petit.
- **Les cinq engagements ne se replient pas en accordéon.** Masquer un engagement contredit sa nature. La mise en page « clause » tient en mobile si la numérotation reste apparente et l'alignement à gauche strict.
- **Réutiliser `HCarousel`** plutôt que d'inventer un composant.
- **`HomeMobileCtaBar` ne porte qu'un seul CTA** : l'estimation.
- **Test de recette** : les quatre délais du n°5 et les pourcentages du registre doivent être lisibles sans zoom.

### 15.2 Provenance de la copy

**Cursor n'écrit aucun texte visible par un utilisateur final.**

- La copy vient de Yoann. Cursor peut signaler qu'un texte manque, proposer un emplacement, poser une question — jamais rédiger un texte définitif.
- Les textes existants qu'on migre (`PositioningSection`, `MethodSection`, `InternationalSection`) sont **déplacés à l'identique**, pas réécrits.
- Motif : la formulation *est* le positionnement. Une reformulation « d'amélioration » le dilue sans que personne ne s'en aperçoive.

### 15.3 Règles anti-page-vide

Décision Yoann : **les 6 quartiers prioritaires sont publiés même sans bien en portefeuille.** Avec 23 biens dont 9 disponibles, la contrepartie est stricte.

- **Une page quartier ne rend jamais une grille de biens vide.** Si le quartier n'a aucun bien, le bloc **disparaît** et cède la place à une capture d'acquéreurs (« être prévenu des prochaines opportunités sur Cimiez ») qui alimente `buyer_search_profiles` — le seul actif de données mature. **L'état vide devient un dispositif d'acquisition.**
- **Une page quartier sans bien doit être substantielle par elle-même** : texte éditorial, prix au m², typologies dominantes, ventes réalisées quand il y en aura. Sinon on construit six coquilles qui dégradent le SEO au lieu de l'améliorer.
- ⚠️ **Dépendance non résolue** : le prix au m² n'existe pas en base (`market_observations` = 0). Deux sources à évaluer avant le lot 12 — les **DVF** en open data (data.gouv.fr) ou l'**API Loupe** déjà intégrée au tunnel (`LOUPE_*`, `computeLoupeValuation`). Vérifier si Loupe expose de la donnée de marché au niveau quartier.
- **Bloc « 6 biens » de la home** : afficher ce qui existe, jamais de remplissage. En dessous de 3 biens disponibles, le bloc bascule sur les dernières ventes ou disparaît.
- **Règle générale : mieux vaut un bloc absent qu'un bloc vide.** Un état vide dit « nous n'avons rien ».

### 15.4 Indicateur de tension — recalibré sur les données disponibles

La formulation initiale incluait « nombre de biens comparables actuellement en concurrence », ce qui suppose l'inventaire des concurrents. **Cette donnée n'existe pas chez Sillage : abandonnée.**

Restent, sur les seules données Sillage plus une source de prix publique :
- délai médian sur le secteur
- écart médian prix de mandat / prix d'acte
- prix au m² du secteur et sa tendance

**Si aucune des trois n'est calculable au moment du lot 17, le lot est reporté, pas dégradé.** Un indicateur affiché sur une donnée fragile est pire que pas d'indicateur.

### 15.5 Ligne de base à relever avant la bascule

Avant le lot 15, relever et archiver : **trafic** (GA4 / Vercel Analytics), **taux de conversion du tunnel**, **répartition des sources de leads vendeurs**, **positions SEO sur les 6 quartiers prioritaires**.

Sans cette photographie, aucune attribution ne sera possible et personne ne saura si la refonte a fonctionné. C'est le minimum sur un projet dont l'argument central est la publication des chiffres.

### 15.6 Accès à l'espace client au moment du mandat

Le registre de preuve de l'engagement n°5 (§7.2) ne vaut que si le vendeur y accède.

- Le parcours automatique existe pour le tunnel d'estimation (`ensureSellerPortalAccessFromLead`), **pas pour un mandat signé en rendez-vous physique**.
- À spécifier : à la création du mandat côté admin, déclencher l'invitation espace client.
- Sans ça, l'engagement est invisible pour celui qu'il protège — et la sanction inopposable en pratique.

### 15.7 Détails de spécification

- **`metadata.mandateType`** : figer la convention de valeur (par exemple `sillage` / `simple`) **et la documenter côté Zap**, sinon le filtre du registre ne fonctionnera pas.
- **Registre** : afficher ce qui existe, ne jamais compléter. La fenêtre de cinq est un **maximum, pas un quota**.
- **Preuve sociale** : la note Google est retirée du site jusqu'à nouvel ordre. Mettre en place une sollicitation d'avis systématique après chaque vente — action d'exploitation, pas de code — pour pouvoir rebrancher un widget plus tard.

### 15.8 Ce qui manque encore

**Les moyens chiffrés ne sont pas chiffrés.** Le brief promet « budget publicitaire engagé et chiffré, canaux nommés, nombre de photos » comme piliers de la Phase 1, puis ne donne aucun nombre.

À obtenir de Yoann, au même titre que les quatre délais du n°5 :
- le budget publicitaire engagé par mandat
- la liste nominative des supports de diffusion
- le nombre de photos livrées

⚠️ La formule d'accroche « le même budget de diffusion qu'un réseau national » (§2.5) n'est utilisable **que si elle est vraie**. À vérifier avant publication.

**Ces moyens portent seuls l'argument pendant plusieurs trimestres** (§2.7). Sans eux, la Phase 1 n'a rien à afficher.
