/**
 * Classes à poser sur chaque carte d'un `HCarousel`.
 *
 * Volontairement isolé ici, hors du module `"use client"` du carrousel : une
 * constante exportée par un module client est remplacée par une référence
 * client quand un composant serveur l'importe, et se retrouve sérialisée telle
 * quelle dans l'attribut `class`. Les sections de l'accueil étant des
 * composants serveur, elles doivent importer depuis ce fichier.
 */
export const CAROUSEL_ITEM = "snap-start shrink-0 basis-[86%] md:basis-auto";
