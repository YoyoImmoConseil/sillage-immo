# Ateliers champs admin

Ce document sert de base de travail pour finaliser ensemble les champs des modules `biens` et `acquereurs` sans bloquer la premiere mise en service du back-office.

## 1. Socle deja implemente

### Acquereurs

Les champs structures actuellement en place couvrent :

- identite : nom, email, telephone
- pilotage commercial : statut, delai, financement, canal prefere, notes
- recherche : achat/location
- localisation : texte libre + villes ciblees
- typologie : types de biens
- budget : min/max
- capacite : pieces min/max, chambres min
- surface : min/max
- etage : min/max
- equipements : terrasse, ascenseur

Les champs restants peuvent etre ajoutes ensuite sans casser le modele actuel via `buyer_search_profiles.criteria`.

### Biens

Les champs manuels actuellement exposes dans le back-office couvrent :

- titre
- description
- type de bien
- ville
- code postal
- vente/location
- prix
- surface
- pieces
- chambres
- etage
- terrasse
- ascenseur
- image de couverture
- publication oui/non

Le modele peut ensuite etre enrichi sans rupture via `properties.metadata` et `property_listings.listing_metadata`.

## 2. Atelier acquereurs a mener

Questions a trancher :

- Faut-il distinguer `acquereur`, `investisseur`, `locataire`, `preneur professionnel` ?
- Faut-il gerer plusieurs projets de recherche par contact ?
- Quels statuts commerciaux faut-il normaliser exactement ?
- Comment veut-on modeliser le financement ?
  - finance
  - a financer
  - pre-accord
  - cash
- La geographie doit-elle reposer sur :
  - ville
  - quartier
  - zone interne Sillage
  - rayon autour d'un point
- Quels criteres deviennent bloquants dans le matching, et lesquels restent preferentiels ?
- Quels champs doivent etre exploitables pour relance / alertes mail futures ?

## 3. Atelier biens a mener

Questions a trancher :

- Quels champs sont strictement obligatoires pour publier un bien manuel ?
- Quels champs doivent etre publics, et quels champs restent internes ?
- Veut-on une gestion manuelle de :
  - diagnostics
  - DPE / GES
  - copropriete
  - honoraires
  - disponibilite
  - parking / garage / cave
  - exterieurs (balcon, jardin, terrasse)
  - vue / exposition
  - ascenseur / gardien / standing
  - regime juridique
- Faut-il differencier appartement, maison, villa, terrain, immeuble, commerce, bureau avec des sous-champs specifiques ?
- Veut-on autoriser une surcouche locale sur les biens SweepBright pour certains champs marketing ?

## 4. Recommandation de methode

Pour avancer proprement :

1. Valider d'abord la grille minimum viable `acquereurs`.
2. Valider ensuite la grille minimum viable `biens manuels`.
3. Classer chaque champ dans une des 3 categories :
   - obligatoire au lot 1
   - utile mais non bloquant
   - futur lot
4. Distinguer a chaque fois :
   - filtre de recherche
   - critere de matching
   - information d'affichage
   - information strictement interne

## 5. Extension technique prevue

Le socle implemente a ete pense pour accepter ces enrichissements sans refonte :

- extension des criteres acquereurs via `buyer_search_profiles.criteria`
- extension des biens via `properties.metadata` et `property_listings.listing_metadata`
- extension des regles de matching via `buyer_property_matches.matched_criteria`
