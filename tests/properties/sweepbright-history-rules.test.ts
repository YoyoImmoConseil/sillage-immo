import { describe, expect, it } from "vitest";
import {
  decidePriceContext,
  isFirstPublicTransition,
} from "@/services/properties/sweepbright-history.rules";

describe("isFirstPublicTransition", () => {
  it("fixe le prix de mandat quand un bien non public devient public", () => {
    expect(
      isFirstPublicTransition({
        isPublic: true,
        previousStatus: "prospect",
        hasFirstPublicEvent: false,
      })
    ).toBe(true);
  });

  it("fixe le prix de mandat pour un bien inconnu qui arrive deja public", () => {
    // `estate-added` se déclenche à la création côté SweepBright : le premier
    // prix constaté est bien celui de la mise en marché.
    expect(
      isFirstPublicTransition({
        isPublic: true,
        previousStatus: null,
        hasFirstPublicEvent: false,
      })
    ).toBe(true);
  });

  it("ne fixe RIEN pour un bien deja publie avant l'existence du journal", () => {
    // Le cas le plus dangereux : à la première synchronisation après la mise en
    // production, les 9 biens déjà disponibles ne doivent pas voir leur prix du
    // jour gelé comme prix de mandat. Ce serait un ratio flatté, publié.
    expect(
      isFirstPublicTransition({
        isPublic: true,
        previousStatus: "available",
        hasFirstPublicEvent: false,
      })
    ).toBe(false);
  });

  it("ne fixe qu'une fois : available puis agreement ne rejoue pas", () => {
    // `agreement` est un statut public : passer en compromis ne recrée pas une
    // première publication.
    expect(
      isFirstPublicTransition({
        isPublic: true,
        previousStatus: "available",
        hasFirstPublicEvent: true,
      })
    ).toBe(false);
  });

  it("ne fixe rien sur un statut non public", () => {
    for (const status of ["sold", "prospect", "withdrawn", "deleted"]) {
      expect(
        isFirstPublicTransition({
          isPublic: false,
          previousStatus: status,
          hasFirstPublicEvent: false,
        })
      ).toBe(false);
    }
  });

  it("ne rejoue pas si une premiere publication est deja journalisee", () => {
    // Compromis tombé : le bien repasse en Disponible. La référence ne doit pas
    // être réécrite, c'est précisément le moment où la négociation a été dure.
    expect(
      isFirstPublicTransition({
        isPublic: true,
        previousStatus: "agreement",
        hasFirstPublicEvent: true,
      })
    ).toBe(false);
  });
});

describe("decidePriceContext", () => {
  it("retourne mandate a la premiere publication", () => {
    expect(
      decidePriceContext({
        firstPublicTransition: true,
        lastPriceAmount: null,
        amount: 229000,
      })
    ).toBe("mandate");
  });

  it("retourne baseline pour un bien en cours sans historique", () => {
    expect(
      decidePriceContext({
        firstPublicTransition: false,
        lastPriceAmount: null,
        amount: 1050000,
      })
    ).toBe("baseline");
  });

  it("retourne listing_change sur une baisse de prix", () => {
    expect(
      decidePriceContext({
        firstPublicTransition: false,
        lastPriceAmount: 1050000,
        amount: 990000,
      })
    ).toBe("listing_change");
  });

  it("retourne listing_change sur une hausse de prix", () => {
    expect(
      decidePriceContext({
        firstPublicTransition: false,
        lastPriceAmount: 220000,
        amount: 229000,
      })
    ).toBe("listing_change");
  });

  it("retourne null quand le prix n'a pas bouge", () => {
    // Sans cette règle, le cron toutes les 10 minutes ajouterait une ligne
    // identique à chaque passage — 144 lignes de bruit par bien et par jour.
    expect(
      decidePriceContext({
        firstPublicTransition: false,
        lastPriceAmount: 229000,
        amount: 229000,
      })
    ).toBeNull();
  });

  it("privilegie mandate meme si un baseline existe deja", () => {
    // Un bien passé prospect → available après un premier constat : on garde le
    // baseline et on ajoute le mandat, les deux lignes sont légitimes.
    expect(
      decidePriceContext({
        firstPublicTransition: true,
        lastPriceAmount: 240000,
        amount: 229000,
      })
    ).toBe("mandate");
  });
});
