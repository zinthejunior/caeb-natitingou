"""
generate_synthetic_data.py — version complète
══════════════════════════════════════════════════════════════════════════════
Génère les données pour TOUTES les tables du schéma.

DONNÉES RÉELLES (si disponibles dans data/) :
  interactions (notes/avis) → injectées depuis data/raw_interactions.json
                              produit par scrapper.py (Babelio + Fnac)
  livres_similaires         → calculées par cosine similarity réelle sur
                              vecteur_livre (genre + mots_clés)

DONNÉES SYNTHÉTIQUES (toujours générées) :
  users        → date_naissance, niveau_etude, classe, genre_prefere,
                 sous_genre_prefere, profil_complet, vecteur_profil,
                 score_confiance (formule exacte du document)
  emprunts     → duree_emprunt, statut (en_cours/rendu/perdu)
  interactions → complétion synthétique si raw_interactions.json insuffisant
  sessions_ia  → vecteur_intention
  notifications→ 4 types : rappel_retour, retard, livre_disponible,
                            nouvelle_recommandation

Lance APRÈS scrapper.py (qui produit data/raw_livres.json et
                         data/raw_interactions.json).

Usage :
    python generate_synthetic_data.py
"""

import json
import math
import random
import re
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import logging

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s")

# ─── Config ───────────────────────────────────────────────────────────────────
NB_MEMBRES      = 50
NB_NON_MEMBRES  = 50
NB_EMPRUNTS_MOY = 15
NB_INTERACT_MOY = 12
TARGET_LIVRES   = 0        

HUMEURS = ["léger","intense","évasion","neutre","triste",
           "aventurier","romantique","curieux","nostalgique","stressé","détendu"]

PRENOMS = [
    "Alice","Bob","Camille","David","Emma","Fatou","Gabriel","Hugo",
    "Inès","Jean","Karim","Laura","Marie","Nicolas","Olivia","Pierre",
    "Rania","Sophie","Thomas","Yasmine","Amina","Benoit","Chloé",
    "Djamel","Elodie","Franck","Gaëlle","Hassan","Iris","Julien",
    "Kenza","Léa","Mathieu","Nadia","Omar","Pauline","Quentin","Rosa",
    "Samuel","Tania","Ugo","Valérie","William","Xénia","Yann","Zoé",
]

NOMS = [
    "Martin","Bernard","Thomas","Petit","Robert","Richard","Durand",
    "Leroy","Moreau","Simon","Laurent","Lefebvre","Michel","Garcia",
    "David","Bertrand","Roux","Vincent","Fournier","Morel","Ndiaye",
    "Diallo","Koné","Traoré","Mbaye","Bouchard","Gagnon","Tremblay",
    "Dupont","Rousseau","Chevalier","Fontaine","Renard","Lemaire","Masson",
]

GENRES_LITTERAIRES = [
    "Roman","Policier","Thriller","Romance","Science-Fiction","Fantastique",
    "Historique","Biographie","Développement personnel","Horreur","Aventure",
    "Philosophie","Poésie","Jeunesse","Cuisine","Voyage","Classique","Humour","Essai",
]

SOUS_GENRES_PAR_GENRE = {
    "Roman":              ["contemporain","famille","société","psychologique"],
    "Policier":           ["enquête","crime","détective","nordique"],
    "Thriller":           ["espionnage","psychologique","juridique","médical"],
    "Romance":            ["contemporaine","historique","fantastique","feel-good"],
    "Science-Fiction":    ["space opera","dystopie","cyberpunk","time travel"],
    "Fantastique":        ["epic fantasy","urban fantasy","dark fantasy","young adult"],
    "Historique":         ["Antiquité","Moyen Âge","Révolution","Guerre mondiale"],
    "Biographie":         ["politique","artistique","scientifique","sportif"],
    "Développement personnel":["confiance","productivité","bien-être","finances"],
    "Horreur":            ["surnaturel","psychologique","gore","survival"],
    "Aventure":           ["exploration","mer","jungle","montagne"],
    "Philosophie":        ["stoïcisme","existentialisme","éthique","politique"],
    "Poésie":             ["lyrique","engagée","contemporaine","haïku"],
    "Jeunesse":           ["enfant","ado","album","fantasy"],
    "Cuisine":            ["française","végétarienne","pâtisserie","monde"],
    "Voyage":             ["récit","guide","aventure","road trip"],
    "Classique":          ["XIXe","XVIIe","XVIIIe","XXe début"],
    "Humour":             ["absurde","satire","comédie","parodie"],
    "Essai":              ["politique","sociétal","littéraire","philosophique"],
}

# Niveaux et classes associées
NIVEAUX_CLASSES = {
    "école":         ["CP","CE1","CE2","CM1","CM2"],
    "lycée":         ["2nde","1ère","Tle"],
    "étudiant":      ["MI L1","MI L2","MI L3","MI M1","MI M2",
                      "Médecine 1","Médecine 3","Médecine 5",
                      "Droit L1","Droit L2","Droit L3",
                      "Éco L1","Éco L2","Lettres L1","Lettres L2","Philo L3"],
    "professionnel": ["Médecine","Droit","Ingénierie","Enseignement","Commerce","Autre"],
    "autre":         [],
}

# Commentaires types par type_action
COMMENTAIRES = {
    "note": [
        "Impossible à lâcher.", "Très prenant du début à la fin.",
        "Un peu lent au début mais excellent ensuite.",
        "Style magnifique, histoire bouleversante.",
        "Pas tout à fait à mon goût mais bien écrit.",
        "Coup de cœur absolu !", "Déçu(e), je m'attendais à mieux.",
        "Parfait pour les amateurs du genre.",
        "L'un des meilleurs que j'aie lus.",
        "Trop court, j'en voulais encore !",
        "Dense mais captivant.", "Effrayant et toujours actuel.",
        "Trop drôle, j'ai adoré !", "Excellent roman, très prenant.",
        "Une belle découverte.", "Un classique qui mérite sa réputation.",
    ],
    "like":     ["Ajouté à mes favoris.", "Je recommande chaudement."],
    "marquage": ["À lire absolument.", "Dans ma liste de lecture."],
    "chat_ia":  ["L'IA m'a bien orienté vers ce livre.",
                 "Découvert grâce au chat, pas déçu !"],
    "vue":      [],   # pas de commentaire pour une simple vue
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def gen_id(prefix: str, index: int) -> str:
    return f"{prefix}-{index:04d}"


def gen_email(prenom: str, nom: str, index: int) -> str:
    def clean(s: str) -> str:
        for src, dst in [("é","e"),("è","e"),("ê","e"),("ë","e"),("à","a"),
                          ("â","a"),("ç","c"),("ô","o"),("û","u"),("ù","u"),
                          ("î","i"),("ï","i"),(" ","")]:
            s = s.lower().replace(src, dst)
        return s
    domains = ["gmail.com","yahoo.fr","hotmail.fr","outlook.com","orange.fr","free.fr","laposte.net"]
    return f"{clean(prenom)}.{clean(nom)}{index}@{random.choice(domains)}"


def gen_date_naissance(niveau: str) -> str:
    """Génère une date de naissance cohérente avec le niveau d'étude."""
    today = datetime.now()
    age_ranges = {
        "école":         (6,  11),
        "lycée":         (14, 18),
        "étudiant":      (18, 28),
        "professionnel": (25, 65),
        "autre":         (18, 70),
    }
    min_age, max_age = age_ranges.get(niveau, (18, 50))
    age  = random.randint(min_age, max_age)
    born = today - timedelta(days=age * 365 + random.randint(0, 364))
    return born.strftime("%Y-%m-%d")


def calc_score_confiance(
    type_compte: str,
    profil_complet: int,
    nb_avis: int,
    nb_emprunts: int,
    nb_genres: int,
    anciennete_jours: int,
) -> float:
    """
    Formule exacte du document de recommandation.

    Non-membre : C = 0.20×profil_complet + 0.35×(nb_avis/5)
                   + 0.25×(nb_genres/3) + 0.20×(ancienneté/90j)
    Membre     : C = 0.20×profil_complet + 0.40×(nb_emprunts/5)
                   + 0.25×(nb_genres/3) + 0.15×(ancienneté/90j)
    """
    p  = float(profil_complet)
    g  = min(nb_genres / 3.0, 1.0)
    a  = min(anciennete_jours / 90.0, 1.0)

    if type_compte == "membre":
        e = min(nb_emprunts / 5.0, 1.0)
        c = 0.20 * p + 0.40 * e + 0.25 * g + 0.15 * a
    else:
        v = min(nb_avis / 5.0, 1.0)
        c = 0.20 * p + 0.35 * v + 0.25 * g + 0.20 * a

    return round(min(c, 1.0), 3)


def build_vecteur_profil(genre_prefere: str, sous_genre_prefere: str,
                          genres_vus: list[str], score_confiance: float) -> dict:
    """
    Vecteur profil JSON — représentation mathématique des goûts.
    Format : {"genres": {}, "sous_genres": {}, "mots_cles": {}, "auteurs": {}}
    Mis à jour post-session par le moteur de recommandation.
    """
    genres_poids: dict[str, float] = {}
    if genre_prefere:
        genres_poids[genre_prefere] = round(0.5 + score_confiance * 0.3, 3)
    for g in genres_vus:
        if g not in genres_poids:
            genres_poids[g] = round(0.2 + random.random() * 0.3, 3)

    sous_genres_poids: dict[str, float] = {}
    if sous_genre_prefere:
        sous_genres_poids[sous_genre_prefere] = round(0.4 + score_confiance * 0.2, 3)

    return {
        "genres":      genres_poids,
        "sous_genres": sous_genres_poids,
        "mots_cles":   {},    # enrichi après chaque session
        "auteurs":     {},    # enrichi après chaque session
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  GÉNÉRATEURS
# ═══════════════════════════════════════════════════════════════════════════════

def generate_users(nb_membres: int, nb_non_membres: int, livres: list[dict]) -> list[dict]:
    """
    Génère les utilisateurs avec TOUS les champs du schéma :
    date_naissance, niveau_etude, classe, genre_prefere, sous_genre_prefere,
    profil_complet, vecteur_profil, score_confiance (formule exacte).
    """
    users = []
    livre_genres = list({l.get("genre","Autre") for l in livres if l.get("genre")})

    for i in range(1, nb_membres + nb_non_membres + 1):
        prenom      = random.choice(PRENOMS)
        nom         = random.choice(NOMS)
        is_membre   = i <= nb_membres
        type_compte = "membre" if is_membre else "non_membre"

        # Niveau et classe cohérents
        # Les non-membres incluent plus d'élèves/étudiants
        if is_membre:
            niveau = random.choices(
                ["école","lycée","étudiant","professionnel","autre"],
                weights=[5, 10, 30, 45, 10],
            )[0]
        else:
            niveau = random.choices(
                ["école","lycée","étudiant","professionnel","autre"],
                weights=[10, 20, 40, 20, 10],
            )[0]

        classes      = NIVEAUX_CLASSES.get(niveau, [])
        classe       = random.choice(classes) if classes else None

        genre_pref   = random.choice(GENRES_LITTERAIRES)
        sg_list      = SOUS_GENRES_PAR_GENRE.get(genre_pref, [])
        sg_pref      = random.choice(sg_list) if sg_list else None

        # profil_complet = 1 si niveau + genre + sous_genre tous renseignés
        profil_complet = int(bool(niveau and genre_pref and sg_pref))

        date_inscription = datetime.now() - timedelta(days=random.randint(30, 1460))
        anciennete_jours = (datetime.now() - date_inscription).days

        # Simule les interactions passées pour calculer C
        nb_avis_sim    = random.randint(0, 15) if not is_membre else random.randint(0, 8)
        nb_emp_sim     = random.randint(1, 25) if is_membre else 0
        nb_genres_vus  = random.randint(1, min(6, len(livre_genres)))
        genres_vus     = random.sample(livre_genres, nb_genres_vus)

        score_c = calc_score_confiance(
            type_compte      = type_compte,
            profil_complet   = profil_complet,
            nb_avis          = nb_avis_sim,
            nb_emprunts      = nb_emp_sim,
            nb_genres        = nb_genres_vus,
            anciennete_jours = anciennete_jours,
        )

        vecteur = build_vecteur_profil(genre_pref, sg_pref, genres_vus, score_c)

        users.append({
            "id":                  gen_id("u", i),
            "nom":                 f"{prenom} {nom}",
            "email":               gen_email(prenom, nom, i),
            "type_compte":         type_compte,
            "date_naissance":      gen_date_naissance(niveau),
            "niveau_etude":        niveau,
            "classe":              classe,
            "genre_prefere":       genre_pref,
            "sous_genre_prefere":  sg_pref,
            "score_confiance":     score_c,
            "profil_complet":      profil_complet,
            "vecteur_profil":      json.dumps(vecteur, ensure_ascii=False),
            "date_inscription":    date_inscription.strftime("%Y-%m-%d %H:%M:%S"),
        })

    membres_count = sum(1 for u in users if u["type_compte"] == "membre")
    log.info(f"✅ {len(users)} utilisateurs générés ({membres_count} membres, {len(users)-membres_count} non-membres)")
    return users


def generate_emprunts(users: list[dict], livres: list[dict]) -> list[dict]:
    """
    Génère les emprunts avec duree_emprunt et statut (en_cours/rendu/perdu).
    """
    emprunts  = []
    membres   = [u for u in users if u["type_compte"] == "membre"]
    livre_ids = [l["id"] for l in livres]
    idx = 1

    for user in membres:
        # Nombre d'emprunts proportionnel au score de confiance
        nb = int(NB_EMPRUNTS_MOY * (0.5 + user["score_confiance"]))
        nb = max(1, min(nb, 40))
        livres_empruntes = random.sample(livre_ids, min(nb, len(livre_ids)))

        for livre_id in livres_empruntes:
            date_emprunt = datetime.now() - timedelta(days=random.randint(1, 730))
            date_prevue  = date_emprunt + timedelta(days=21)

            scenario = random.choices(
                ["rendu_avant","rendu_a_temps","rendu_en_retard","renouvele","en_cours","perdu"],
                weights=[18, 33, 18, 15, 12, 4],
            )[0]

            date_retour    = None
            renouvele      = 0
            poids          = 1.0
            duree_emprunt  = None
            statut         = "en_cours"

            if scenario == "rendu_avant":
                delta       = random.randint(1, 5)
                date_retour = (date_prevue - timedelta(days=delta)).strftime("%Y-%m-%d")
                duree_emprunt = 21 - delta
                statut      = "rendu"

            elif scenario == "rendu_a_temps":
                date_retour   = date_prevue.strftime("%Y-%m-%d")
                duree_emprunt = 21
                statut        = "rendu"

            elif scenario == "rendu_en_retard":
                retard        = random.randint(1, 21)
                date_retour   = (date_prevue + timedelta(days=retard)).strftime("%Y-%m-%d")
                duree_emprunt = 21 + retard
                poids         = round(1.0 + min(retard / 21 * 0.3, 0.3), 2)
                statut        = "rendu"

            elif scenario == "renouvele":
                renouvele    = 1
                poids        = 1.3
                date_prevue += timedelta(days=21)
                if random.random() > 0.3:
                    date_retour   = date_prevue.strftime("%Y-%m-%d")
                    duree_emprunt = 42
                    statut        = "rendu"
                else:
                    statut = "en_cours"

            elif scenario == "perdu":
                poids  = 1.0
                statut = "perdu"
                # date_retour reste NULL

            # en_cours : date_retour = NULL, duree = NULL

            emprunts.append({
                "id":           gen_id("e", idx),
                "user_id":      user["id"],
                "livre_id":     livre_id,
                "date_emprunt": date_emprunt.strftime("%Y-%m-%d"),
                "date_prevue":  date_prevue.strftime("%Y-%m-%d"),
                "date_retour":  date_retour,
                "renouvele":    renouvele,
                "duree_emprunt": duree_emprunt,
                "statut":       statut,
                "poids":        poids,
            })
            idx += 1

    log.info(f"✅ {len(emprunts)} emprunts générés")
    return emprunts


def generate_interactions(
    users: list[dict], livres: list[dict], emprunts: list[dict]
) -> list[dict]:
    """
    Génère les interactions avec TOUS les champs du schéma :
    notation, duree_secondes (séparés), livre_lu, commentaire,
    position, source (application/chat_ia/recherche).
    """
    interactions = []
    livre_ids    = [l["id"] for l in livres]

    emprunts_by_user: dict[str, list[str]] = {}
    for e in emprunts:
        emprunts_by_user.setdefault(e["user_id"], []).append(e["livre_id"])

    idx = 1
    for user in users:
        nb   = int(NB_INTERACT_MOY * (0.5 + user["score_confiance"] * 1.5))
        nb   = max(2, min(nb, 50))
        pool = emprunts_by_user.get(user["id"], [])
        pool += random.sample(livre_ids, min(nb * 2, len(livre_ids)))
        pool = list(set(pool))[:nb * 2]
        livres_interagis = random.sample(pool, min(nb, len(pool)))

        for pos, livre_id in enumerate(livres_interagis, 1):
            type_action = random.choices(
                ["vue","note","like","chat_ia","marquage"],
                weights=[40, 25, 15, 12, 8],
            )[0]

            # ── Champs séparés selon le type ──────────────────────────────
            notation       = None
            duree_secondes = None

            if type_action == "vue":
                # Temps de lecture du résumé — seuil d'intérêt : 30s
                duree_secondes = int(min(random.expovariate(1 / 45), 300))

            elif type_action == "note":
                # Notes biaisées vers le haut (réaliste)
                base     = random.choices([1,2,3,4,5], weights=[5,10,20,35,30])[0]
                notation = max(1, min(5, int(base + random.random() * 0.9)))
                # Souvent associé à une durée de lecture
                if random.random() > 0.3:
                    duree_secondes = int(random.uniform(30, 200))

            elif type_action in ("like","marquage"):
                duree_secondes = int(random.uniform(15, 120))

            elif type_action == "chat_ia":
                duree_secondes = int(random.uniform(10, 90))

            # livre_lu : l'utilisateur déclare avoir lu ce livre
            # Plus probable si note ou emprunté
            emprunte = livre_id in emprunts_by_user.get(user["id"], [])
            if type_action == "note":
                livre_lu = int(random.random() > 0.2)
            elif emprunte:
                livre_lu = int(random.random() > 0.3)
            else:
                livre_lu = int(random.random() > 0.8)

            # commentaire — uniquement si note, like, marquage ou chat_ia
            commentaire = None
            if type_action in COMMENTAIRES and COMMENTAIRES[type_action]:
                if random.random() > 0.4:
                    commentaire = random.choice(COMMENTAIRES[type_action])

            # source — 'application' remplace 'navigation' (conforme au schéma)
            source = random.choices(
                ["application","chat_ia","recherche"],
                weights=[60, 25, 15],
            )[0]

            ts = datetime.now() - timedelta(days=random.randint(0, 365))

            interactions.append({
                "id":             gen_id("a", idx),
                "user_id":        user["id"],
                "livre_id":       livre_id,
                "type_action":    type_action,
                "notation":       notation,
                "duree_secondes": duree_secondes,
                "livre_lu":       livre_lu,
                "commentaire":    commentaire,
                "position":       pos,
                "source":         source,
                "created_at":     ts.strftime("%Y-%m-%d %H:%M:%S"),
            })
            idx += 1

    log.info(f"✅ {len(interactions)} interactions générées")
    return interactions


def generate_similarites(livres: list[dict]) -> list[dict]:
    """
    Calcule les similarités entre livres par cosine similarity réelle sur
    vecteur_livre (genre + mots_clés).  Remplace les scores aléatoires.

    Optimisé pour de grands catalogues :
    - On n'indexe que les livres ayant un vecteur_livre valide
    - On calcule exactement les N voisins les plus proches par genre,
      puis on complète avec des livres d'autres genres (score faible)
    """
    log.info("⚙️  Calcul des similarités par cosine similarity...")
    similarites = []
    today_str   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ── 1. Construire les vecteurs numériques ──────────────────────────────────
    def parse_vecteur(l: dict) -> dict[str, float]:
        v = l.get("vecteur_livre")
        if not v:
            return {}
        if isinstance(v, str):
            try:
                v = json.loads(v) 
            except Exception:
                return {}
        mots = v.get("mots_cles", {})
        if isinstance(mots, list):
            mots = {m: 1.0 for m in mots}
        result: dict[str, float] = {}
        genre = v.get("genre", "")
        if genre:
            result[f"__genre__{genre}"] = 2.0      # poids fort sur le genre
        sg = v.get("sous_genre", "")
        if sg:
            result[f"__sg__{sg}"] = 1.0
        for mot, poids in mots.items():
            result[mot] = float(poids)
        return result

    def cosine(a: dict[str, float], b: dict[str, float]) -> float:
        if not a or not b:
            return 0.0
        common = set(a) & set(b)
        if not common:
            return 0.0
        dot  = sum(a[k] * b[k] for k in common)
        na   = math.sqrt(sum(v * v for v in a.values()))
        nb   = math.sqrt(sum(v * v for v in b.values()))
        if na == 0 or nb == 0:
            return 0.0
        return dot / (na * nb)

    # Indexer par genre pour accélérer
    by_genre: dict[str, list[tuple[str, dict]]] = {}   # genre → [(id, vecteur)]
    all_vecs: list[tuple[str, dict]] = []
    for l in livres:
        vid = l.get("id", "")
        vec = parse_vecteur(l)
        if not vec:
            continue
        genre = l.get("genre", "Autre")
        by_genre.setdefault(genre, []).append((vid, vec))
        all_vecs.append((vid, vec))

    log.info(f"  {len(all_vecs):,} livres avec vecteur valide sur {len(livres):,} total")

    # ── 2. Pour chaque livre : N plus proches dans son genre + 2 hors-genre ────
    N_SAME_GENRE  = 6    # voisins dans le même genre
    N_DIFF_GENRE  = 2    # voisins hors-genre (diversité)
    SAMPLE_DIFF   = 200  # nb de candidats hors-genre à évaluer (perf)

    vec_map = dict(all_vecs)   # id → vecteur (lookup O(1))
    genre_by_id = {l["id"]: l.get("genre", "") for l in livres}  # index O(1)

    for lid, lvec in all_vecs:
        genre = genre_by_id.get(lid, "")
        candidates_same  = [(sid, svec) for sid, svec in by_genre.get(genre, []) if sid != lid]
        diff_pop = [(sid, svec) for sid, svec in all_vecs if sid != lid and sid not in {c[0] for c in candidates_same}]
        candidates_diff  = random.sample(
            diff_pop,
            min(SAMPLE_DIFF, len(diff_pop)),
        )

        # Trier par score décroissant
        scored_same = sorted(
            [(sid, round(cosine(lvec, svec), 4)) for sid, svec in candidates_same],
            key=lambda x: -x[1]
        )[:N_SAME_GENRE]

        scored_diff = sorted(
            [(sid, round(cosine(lvec, svec), 4)) for sid, svec in candidates_diff],
            key=lambda x: -x[1]
        )[:N_DIFF_GENRE]

        already = {s for s, _ in scored_same}
        for sim_id, score in scored_same:
            similarites.append({"livre_id": lid, "similaire_id": sim_id,
                                 "score": score, "date_calcul": today_str})
        for sim_id, score in scored_diff:
            if sim_id not in already:
                similarites.append({"livre_id": lid, "similaire_id": sim_id,
                                     "score": score, "date_calcul": today_str})

    # Déduplication symétrique (évite (A,B) et (B,A) avec des scores différents)
    seen_pairs: set[tuple] = set()
    deduped: list[dict] = []
    for s in similarites:
        pair = tuple(sorted([s["livre_id"], s["similaire_id"]]))
        if pair not in seen_pairs:
            seen_pairs.add(pair)
            deduped.append(s)

    log.info(f"✅ {len(deduped):,} paires de similarités calculées (cosine similarity réelle)")
    return deduped




def inject_real_interactions(
    raw_avis: list[dict],
    livres: list[dict],
    users: list[dict],
    existing_interactions: list[dict],
) -> list[dict]:
    """
    Injecte les avis réels (Babelio/Fnac) dans la table interactions.

    Stratégie :
    - Matching livre : on cherche dans la table livres un titre dont la
      clé normalisée contient la clé normalisée de l'avis (sous-chaîne).
    - Attribution user : on assigne un user non-membre aléatoire (les avis
      de sites publics correspondent à des lecteurs non inscrits en bibliothèque).
    - Déduplication : on ne réinsère pas un avis déjà présent par
      (livre_id, commentaire[:80]).
    - Les interactions existantes (synthétiques) sont conservées.
    """
    if not raw_avis:
        return existing_interactions

    def norm(s: str) -> str:
        s = s.lower().strip()
        s = unicodedata.normalize("NFD", s)
        s = "".join(c for c in s if unicodedata.category(c) != "Mn")
        return re.sub(r"[^a-z0-9 ]", "", s)

    # Index livres : clé normalisée → id
    titre_index: dict[str, str] = {norm(l["titre"]): l["id"] for l in livres if l.get("titre")}

    # Non-membres disponibles pour attribution
    non_membres = [u for u in users if u["type_compte"] == "non_membre"]
    if not non_membres:
        non_membres = users

    # Clés déjà présentes dans les interactions existantes
    existing_keys: set[tuple] = set()
    for inter in existing_interactions:
        key = (inter.get("livre_id",""), (inter.get("commentaire") or "")[:80])
        existing_keys.add(key)

    new_interactions: list[dict] = []
    max_existing_idx = len(existing_interactions)

    def find_livre_id(titre_avis: str) -> Optional[str]:
        nk = norm(titre_avis)
        if nk in titre_index:
            return titre_index[nk]
        # Matching partiel : cherche si la clé de l'avis est sous-chaîne d'un titre
        for t, lid in titre_index.items():
            if nk in t or t in nk:
                return lid
        return None

    for i, avis in enumerate(raw_avis):
        livre_id = find_livre_id(avis.get("livre_titre", ""))
        if not livre_id:
            continue

        commentaire = avis.get("commentaire")
        note        = avis.get("note")
        key         = (livre_id, (commentaire or "")[:80])
        if key in existing_keys:
            continue
        existing_keys.add(key)

        user = random.choice(non_membres)
        type_action = "note" if note else "vue"

        date_str = avis.get("date")
        if not date_str:
            ts = datetime.now() - timedelta(days=random.randint(0, 730))
            date_str = ts.strftime("%Y-%m-%d %H:%M:%S")
        elif len(date_str) == 10:   # YYYY-MM-DD
            date_str += f" {random.randint(8,22):02d}:{random.randint(0,59):02d}:00"

        idx = max_existing_idx + len(new_interactions) + 1
        new_interactions.append({
            "id":             gen_id("a", idx),
            "user_id":        user["id"],
            "livre_id":       livre_id,
            "type_action":    type_action,
            "notation":       note,
            "duree_secondes": random.randint(30, 300) if type_action == "note" else None,
            "livre_lu":       1 if note else 0,
            "commentaire":    commentaire,
            "position":       random.randint(1, 10),
            "source":         "application",
            "source_avis":    avis.get("source", ""),   # "babelio" | "fnac"
            "created_at":     date_str,
        })

    log.info(f"✅ {len(new_interactions)} avis réels injectés dans interactions "
             f"(sur {len(raw_avis)} avis bruts — {len(raw_avis)-len(new_interactions)} non matchés ou doublons)")
    return existing_interactions + new_interactions



def generate_sessions_ia(users: list[dict]) -> list[dict]:
    """
    Génère les sessions IA avec vecteur_intention.
    """
    sessions = []
    idx      = 1
    sample   = random.sample(users, int(len(users) * 0.3))

    for user in sample:
        debut  = datetime.now() - timedelta(days=random.randint(0, 90))
        active = random.random() > 0.7
        fin    = None if active else (debut + timedelta(minutes=random.randint(5, 45))).strftime("%Y-%m-%d %H:%M:%S")
        humeur = random.choice(HUMEURS)

        # vecteur_intention — goûts détectés PENDANT la session
        genres_detectes = random.sample(GENRES_LITTERAIRES, random.randint(1, 3))
        contraintes     = random.choices(
            [["court"],["long"],["récent"],["classique"],[]],
            weights=[20, 10, 15, 10, 45],
        )[0]
        vecteur_intention = {
            "genres":      genres_detectes,
            "contraintes": contraintes,
            "humeur":      humeur,
        }

        sessions.append({
            "id":                 gen_id("s", idx),
            "user_id":            user["id"],
            "humeur_detectee":    humeur,
            "vecteur_intention":  json.dumps(vecteur_intention, ensure_ascii=False),
            "livres_rejetes":     json.dumps(random.sample(["l-001","l-002","l-003"], random.randint(0, 2))),
            "livres_acceptes":    json.dumps(random.sample(["l-004","l-005","l-006"], random.randint(0, 2))),
            "debut":              debut.strftime("%Y-%m-%d %H:%M:%S"),
            "fin":                fin,
            "active":             int(active),
        })
        idx += 1

    log.info(f"✅ {len(sessions)} sessions IA générées")
    return sessions


def generate_notifications(
    users: list[dict], emprunts: list[dict], livres: list[dict]
) -> list[dict]:
    """
    Génère les 4 types de notifications du schéma :
      - rappel_retour        : date de retour dans ≤ 2 jours
      - retard               : livre en retard
      - livre_disponible     : livre réservé de retour (simulé)
      - nouvelle_recommandation : profil mis à jour
    """
    notifications = []
    idx     = 1
    membres = {u["id"]: u for u in users if u["type_compte"] == "membre"}
    today   = datetime.now().date()
    livre_ids = [l["id"] for l in livres]

    # ── Types 1 & 2 : rappel_retour et retard ─────────────────────────────────
    for e in emprunts:
        if e["user_id"] not in membres or e["date_retour"] is not None:
            continue
        if e.get("statut") == "perdu":
            continue

        date_prevue    = datetime.strptime(e["date_prevue"], "%Y-%m-%d").date()
        jours_restants = (date_prevue - today).days

        if jours_restants <= 2:
            type_notif = "retard" if jours_restants < 0 else "rappel_retour"
            message    = (
                f"Votre livre est en retard de {-jours_restants} jour(s)."
                if jours_restants < 0
                else f"Rappel : retour prévu dans {jours_restants} jour(s)."
            )
            notifications.append({
                "id":          gen_id("n", idx),
                "user_id":     e["user_id"],
                "emprunt_id":  e["id"],
                "livre_id":    e["livre_id"],
                "type_notif":  type_notif,
                "message":     message,
                "envoyee_le":  datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "lue":         random.randint(0, 1),
            })
            idx += 1

    # ── Type 3 : livre_disponible (20% des membres) ────────────────────────────
    for user_id in random.sample(list(membres.keys()), max(1, len(membres) // 5)):
        livre_id = random.choice(livre_ids)
        notifications.append({
            "id":          gen_id("n", idx),
            "user_id":     user_id,
            "emprunt_id":  None,
            "livre_id":    livre_id,
            "type_notif":  "livre_disponible",
            "message":     "Le livre que vous avez réservé est de retour.",
            "envoyee_le":  (datetime.now() - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d %H:%M:%S"),
            "lue":         random.randint(0, 1),
        })
        idx += 1

    # ── Type 4 : nouvelle_recommandation (25% des membres) ────────────────────
    for user_id in random.sample(list(membres.keys()), max(1, len(membres) // 4)):
        notifications.append({
            "id":          gen_id("n", idx),
            "user_id":     user_id,
            "emprunt_id":  None,
            "livre_id":    None,
            "type_notif":  "nouvelle_recommandation",
            "message":     "Votre profil a été mis à jour. De nouvelles suggestions vous attendent.",
            "envoyee_le":  (datetime.now() - timedelta(days=random.randint(0, 7))).strftime("%Y-%m-%d %H:%M:%S"),
            "lue":         random.randint(0, 1),
        })
        idx += 1

    log.info(f"✅ {len(notifications)} notifications générées")
    return notifications


def generate_livres_synthetiques(existants: list[dict], cible: int) -> list[dict]:
    """
    Complète la liste de livres jusqu'à `cible` en générant des livres synthétiques
    si le scrapper n'a pas produit suffisamment d'entrées.
    """
    manquants = cible - len(existants)
    if manquants <= 0:
        log.info(f"✅ {len(existants):,} livres — objectif {cible:,} atteint, aucun ajout nécessaire.")
        return existants

    log.info(f"⚙️  {len(existants):,} livres scrappés — génération de {manquants:,} livres synthétiques pour atteindre {cible:,}...")

    TITRES_MOTS = [
        "Le","La","Les","Un","Une","Des","Mon","Ton","Son",
        "Secret","Ombre","Lumière","Feu","Nuit","Jour","Vie","Mort",
        "Chemin","Voyage","Rêve","Combat","Miroir","Voix","Silence",
        "Destin","Cœur","Monde","Temps","Terre","Mer","Ciel","Âme",
        "Château","Forêt","Rivière","Montagne","Île","Ville","Rue",
        "Héros","Homme","Femme","Enfant","Roi","Reine","Guerrier",
        "Dernier","Premier","Grand","Petit","Noir","Blanc","Rouge",
        "Mystère","Vérité","Mensonge","Justice","Liberté","Amour","Haine",
    ]
    LANGUES    = ["fr", "fr", "fr", "fr", "en", "es", "de", "it"]
    CATEGORIES = ["adulte", "adulte", "adulte", "adulte", "ado", "enfant"]  # ← conforme schéma SQL

    # IDs déjà utilisés
    existing_ids = {l["id"] for l in existants}
    offset = len(existants) + 1
    nouveaux: list[dict] = []

    for i in range(manquants):
        idx    = offset + i
        genre  = random.choice(GENRES_LITTERAIRES)
        sg_list = SOUS_GENRES_PAR_GENRE.get(genre, ["général"])
        sg     = random.choice(sg_list)
        annee  = random.randint(1900, 2024)
        nb_notes   = random.randint(0, 5000)
        note_moy   = round(random.uniform(1.0, 5.0), 2) if nb_notes > 0 else 0.0
        nb_emprunts = random.randint(0, 300)

        mots = random.sample(TITRES_MOTS, random.randint(2, 4))
        titre = " ".join(mots)

        prenom = random.choice(PRENOMS)
        nom    = random.choice(NOMS)
        auteur = f"{prenom} {nom}"

        livre_id = f"l-{idx:06d}"
        while livre_id in existing_ids:
            idx += 1
            livre_id = f"l-{idx:06d}"
        existing_ids.add(livre_id)

        from_genre_kw = {
            "Roman":["amour","famille","société","vie","destin"],
            "Policier":["enquête","crime","meurtre","détective","indice"],
            "Thriller":["suspense","danger","complot","tension","secret"],
            "Romance":["amour","passion","rencontre","couple","désir"],
            "Science-Fiction":["espace","futur","technologie","robot","dystopie"],
            "Fantastique":["magie","dragon","quête","héros","créature"],
            "Historique":["guerre","siècle","roi","empire","révolution"],
            "Biographie":["vie","portrait","succès","destin","mémoires"],
            "Développement personnel":["confiance","succès","habitude","objectif","bonheur"],
            "Horreur":["peur","monstre","nuit","mort","terreur"],
            "Aventure":["voyage","exploration","danger","découverte","trésor"],
            "Philosophie":["pensée","existence","vérité","morale","liberté"],
            "Poésie":["vers","âme","nature","beauté","silence"],
            "Jeunesse":["amitié","école","aventure","magie","famille"],
            "Cuisine":["recette","saveur","ingrédient","chef","plat"],
            "Voyage":["pays","culture","route","découverte","paysage"],
            "Classique":["destin","société","amour","honneur","tragédie"],
            "Humour":["absurde","satire","comédie","parodie","rire"],
            "Essai":["politique","sociétal","littéraire","philosophique","idées"],
        }.get(genre, ["livre","lecture","histoire","personnage","récit"])
        mots_cles = random.sample(from_genre_kw, min(3, len(from_genre_kw)))

        nouveaux.append({
            "id":            livre_id,
            "ol_id":         None,
            "titre":         titre,
            "auteur":        auteur,
            "genre":         genre,
            "sous_genre":    sg,
            "annee":         annee,
            "nb_pages":      random.randint(80, 900),
            "langue":        random.choice(LANGUES),
            "categorie_age": random.choice(CATEGORIES),
            "mots_cles":     json.dumps(mots_cles, ensure_ascii=False),
            "note_moyenne":  note_moy,
            "nb_notes":      nb_notes,
            "nb_emprunts":   nb_emprunts,
            "popularite":    0.0,   # recalculé après
            "vecteur_livre": None,
            "disponible":    random.randint(0, 1),
            "resume":        None,
            "couverture_url": None,
        })

    log.info(f"✅ {len(nouveaux):,} livres synthétiques générés")
    return existants + nouveaux


# ═══════════════════════════════════════════════════════════════════════════════
#  POINT D'ENTRÉE
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    Path("data").mkdir(exist_ok=True)

    raw_path = Path("data/raw_livres.json")
    if raw_path.exists():
        with open(raw_path, encoding="utf-8") as f:
            livres_raw = json.load(f)
        log.info(f"📚 {len(livres_raw):,} livres chargés depuis raw_livres.json")
    else:
        log.warning("⚠️  data/raw_livres.json introuvable — démarrage depuis zéro (0 livres scrappés)")
        livres_raw = []

    # Charger les avis réels (Babelio + Fnac) si disponibles
    avis_path = Path("data/raw_interactions.json")
    raw_avis: list[dict] = []
    if avis_path.exists():
        with open(avis_path, encoding="utf-8") as f:
            raw_avis = json.load(f)
        log.info(f"⭐ {len(raw_avis):,} avis réels chargés depuis raw_interactions.json")
    else:
        log.info("ℹ️  data/raw_interactions.json introuvable — interactions 100% synthétiques")

    # Assigner les IDs manquants aux livres scrappés
    for i, livre in enumerate(livres_raw, 1):
        if "id" not in livre:
            livre["id"] = f"l-{i:06d}"

    # On ne garde que les 500 premiers livres pour la démo
    livres_raw = livres_raw[:500]
    
    # ── Compléter jusqu'à TARGET_LIVRES ───────────────────────────────────────
    livres_raw = generate_livres_synthetiques(livres_raw, TARGET_LIVRES)

    # Recalcul popularité
    max_notes = max((l.get("nb_notes", 0) or 0 for l in livres_raw), default=1) or 1
    for l in livres_raw:
        n = l.get("nb_notes", 0) or 0
        l["popularite"] = round(math.log1p(n) / math.log1p(max_notes), 4)

    log.info(f"📚 Total livres après complétion : {len(livres_raw):,}")

    users         = generate_users(NB_MEMBRES, NB_NON_MEMBRES, livres_raw)
    emprunts      = generate_emprunts(users, livres_raw)
    interactions  = generate_interactions(users, livres_raw, emprunts)

    # Injecter les avis réels (Babelio / Fnac) — dédupliqués automatiquement
    interactions  = inject_real_interactions(raw_avis, livres_raw, users, interactions)

    similarites   = generate_similarites(livres_raw)
    sessions      = generate_sessions_ia(users)
    notifications = generate_notifications(users, emprunts, livres_raw)

    datasets = {
        "livres":            livres_raw,
        "users":             users,
        "emprunts":          emprunts,
        "interactions":      interactions,
        "livres_similaires": similarites,
        "sessions_ia":       sessions,
        "notifications":     notifications,
    }

    for name, data in datasets.items():
        path = f"data/{name}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        log.info(f"💾 {path} — {len(data):,} lignes")

    # Résumé
    membres    = sum(1 for u in users if u["type_compte"] == "membre")
    c_moyen    = sum(u["score_confiance"] for u in users) / len(users)
    c_membres  = sum(u["score_confiance"] for u in users if u["type_compte"] == "membre") / membres
    reels      = sum(1 for i in interactions if i.get("source_avis"))
    log.info(f"\n📊 Score C moyen (tous)    : {c_moyen:.3f}")
    log.info(f"   Score C moyen (membres) : {c_membres:.3f}")
    log.info(f"   Interactions réelles    : {reels:,} / {len(interactions):,}")
    log.info("\n🎉 Dataset complet généré dans data/")


if __name__ == "__main__":
    main()