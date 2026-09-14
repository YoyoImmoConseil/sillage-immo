#!/usr/bin/env python3
"""
Prix DVF par quartier de Nice → lib/quartiers-dvf-stats.json

Usage : python3 scripts/dvf/compute-quartiers.py [dossier_de_travail]
Télécharge les fichiers DVF géolocalisés (Etalab) 2024 et 2025 de la commune
de Nice (06088) et les contours IRIS (INSEE, via opendatasoft), puis calcule
par quartier : ventes, prix médian au m² des appartements (2025 et 24-25),
fourchette Q1-Q3, haut de marché (P90), prix médian des maisons.

Règles : ventes uniquement, appartements et maisons, une seule unité
d'habitation par mutation (dépendances seules, lots multiples et immeubles
exclus), prix au m² entre 1 500 et 30 000 €. Rattachement par contour IRIS ;
Cap de Nice par nom de rue. Pour les maisons, le prix au m² DVF (surface
bâtie seule, terrain ignoré) n'est pas significatif : on publie un prix médian.
"""
import csv, json, os, statistics, sys, urllib.request
from collections import defaultdict
from datetime import date

WORK = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/dvf-work")
os.makedirs(WORK, exist_ok=True)
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(REPO, "lib", "quartiers-dvf-stats.json")
YEARS = ["2024", "2025"]
MAIN_YEAR = "2025"

Q = {
    "riquier": ["Riquier", "Riquier-Arson", "Riquier-Fontaine de la Ville", "Barla", "TNL-Beaumont", "République"],
    "saint-roch": ["Saint-Roch-Jean XXIII", "Saint-Roch-Ricolfi", "Saint-Jean d'Angély", "Vauban", "Roquebillière", "Route de Turin"],
    "le-port": ["Port", "Bonaparte", "Garibaldi", "Cassini", "Carnot"],
    "carre-dor": ["Victor Hugo-Buffa", "Liberti-Albert 1er", "Musiciens", "Rossini"],
    "mont-boron": ["Mont Boron", "Mont Alban"],
    "cimiez": ["Cimiez", "Cimiez-Monastère", "Cimiez-Valrose", "Brancolar-Régina", "Brancolar-Scudéri", "Cap de Croix", "Carabacel", "Desambrois", "Paschetta"],
    "wilson": ["Sasserno", "Raimbaldi", "Hôpital Saint-Roch", "Marceau", "Jean Médecin"],
    "liberation": ["Borriglione-Saint Lambert", "Michel-Ange", "Garnier-Gare de Provence", "Thiole", "Jeanne d'Arc-Fuon-Cauda", "Michelet", "Évêché"],
    "fabron": ["Fabron-Terron-Archet", "Gattamua", "Carlone", "Faculté de Lettres", "Lanterne"],
    "gairaut": ["Gairaut"],
    "promenade-des-anglais": ["France-Negresco", "Magnan", "Lenval", "La Californie", "Carras"],
}
CAP_STREETS = ["MAETERLINCK", "CAP DE NICE", "JEAN LORRAIN", "FRANCK PILATTE", "MALAUSSENA"]


def fetch(url, path):
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        print("téléchargement", url)
        urllib.request.urlretrieve(url, path)
    return path


def pip(pt, ring):
    x, y = pt
    inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xi = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < xi:
                inside = not inside
    return inside


def inpoly(pt, geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return any(pip(pt, poly[0]) and not any(pip(pt, h) for h in poly[1:]) for poly in polys)


def pct(values, p):
    v = sorted(values)
    return round(v[min(len(v) - 1, int(len(v) * p))]) if v else None


def main():
    iris_path = fetch(
        "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/georef-france-iris/exports/geojson?where=com_code%3D%2206088%22&limit=-1",
        os.path.join(WORK, "iris_nice.geojson"),
    )
    name2geom = {}
    for f in json.load(open(iris_path))["features"]:
        n = f["properties"]["iris_name"]
        name2geom[n[0] if isinstance(n, list) else n] = f["geometry"]
    iris2q = {}
    for q, names in Q.items():
        for n in names:
            assert n in name2geom, f"IRIS inconnu : {n}"
            iris2q[n] = q

    def zone_of(lon, lat, street):
        if any(k in street.upper() for k in CAP_STREETS):
            return "cap-de-nice"
        for n, g in name2geom.items():
            if n in iris2q and inpoly((lon, lat), g):
                return iris2q[n]
        return None

    rows = []
    for year in YEARS:
        path = fetch(f"https://files.data.gouv.fr/geo-dvf/latest/csv/{year}/communes/06/06088.csv", os.path.join(WORK, f"{year}.csv"))
        muts = defaultdict(list)
        for r in csv.DictReader(open(path, newline="")):
            muts[r["id_mutation"]].append(r)
        for rs in muts.values():
            if rs[0]["nature_mutation"] != "Vente":
                continue
            homes = [r for r in rs if r["type_local"] in ("Appartement", "Maison")]
            keys = {(r["id_parcelle"], r["lot1_numero"], r["type_local"], r["surface_reelle_bati"]) for r in homes}
            if not homes or len(keys) != 1:
                continue
            h = homes[0]
            try:
                price = float(h["valeur_fonciere"]); surf = float(h["surface_reelle_bati"])
                lon = float(h["longitude"]); lat = float(h["latitude"])
            except ValueError:
                continue
            if surf < 9 or price <= 0:
                continue
            ppm = price / surf
            if not 1500 <= ppm <= 30000:
                continue
            rows.append(dict(year=year, zone=zone_of(lon, lat, h["adresse_nom_voie"]), type=h["type_local"], price=price, surf=surf, ppm=ppm, street=h["adresse_nom_voie"].upper(), num=h["adresse_numero"]))

    out = {}
    for z in list(Q) + ["cap-de-nice", "nice"]:
        rs = [r for r in rows if z == "nice" or r["zone"] == z]
        a = [r for r in rs if r["type"] == "Appartement"]
        h = [r for r in rs if r["type"] == "Maison"]
        a_main = [r for r in a if r["year"] == MAIN_YEAR]
        out[z] = {
            "sales": {"mainYear": len([r for r in rs if r["year"] == MAIN_YEAR]), "period": len(rs)},
            "apartments": {
                "n": len(a), "nMainYear": len(a_main),
                "medianPpmMainYear": round(statistics.median(r["ppm"] for r in a_main)) if a_main else None,
                "medianPpm": round(statistics.median(r["ppm"] for r in a)) if a else None,
                "q1Ppm": pct([r["ppm"] for r in a], .25), "q3Ppm": pct([r["ppm"] for r in a], .75), "p90Ppm": pct([r["ppm"] for r in a], .9),
                "medianSurface": round(statistics.median(r["surf"] for r in a)) if a else None,
                "medianPrice": round(statistics.median(r["price"] for r in a)) if a else None,
            },
            "houses": {
                "n": len(h),
                "medianPrice": round(statistics.median(r["price"] for r in h)) if len(h) >= 10 else None,
                "medianSurface": round(statistics.median(r["surf"] for r in h)) if len(h) >= 10 else None,
            },
        }
    prom = [r for r in rows if r["type"] == "Appartement" and ("PROM DES ANGLAIS" in r["street"] or "PROMENADE DES ANGLAIS" in r["street"])]
    centre = [r for r in prom if r["num"].isdigit() and int(r["num"]) <= 60]
    out["promenade-des-anglais"]["seafront"] = {
        "n": len(prom), "medianPpm": round(statistics.median(r["ppm"] for r in prom)), "p90Ppm": pct([r["ppm"] for r in prom], .9),
        "centre": {"n": len(centre), "medianPpm": round(statistics.median(r["ppm"] for r in centre)), "p90Ppm": pct([r["ppm"] for r in centre], .9)},
    }
    meta = {
        "source": "DVF (Demandes de valeurs foncières), Etalab / DGFiP, fichiers géolocalisés, commune de Nice",
        "years": YEARS, "mainYear": MAIN_YEAR, "computedAt": date.today().isoformat(),
        "method": "Ventes uniquement, appartements et maisons, une seule unité d'habitation par mutation (dépendances seules, lots multiples et immeubles exclus), prix au m² entre 1 500 et 30 000 €. Rattachement au quartier par contours IRIS (INSEE), Cap de Nice par rue. Maisons : prix médian (le prix au m² DVF ignore le terrain).",
        "zones": out,
    }
    json.dump(meta, open(OUT, "w"), ensure_ascii=False, indent=1)
    for z, d in out.items():
        print(f"{z:22s} ventes={d['sales']['period']:5d} appart méd={d['apartments']['medianPpm']} p90={d['apartments']['p90Ppm']} maisons n={d['houses']['n']} méd={d['houses']['medianPrice']}")
    print("→", OUT)


if __name__ == "__main__":
    main()
