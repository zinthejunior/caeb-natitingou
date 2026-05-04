"""
scrapper.py  —  version multi-sources complète
══════════════════════════════════════════════════════════════════════════════
Collecte livres réels en français + avis réels depuis SIX sources :

  LIVRES (table `livres`)
  1. Google Books API   – meilleure couverture, notes fiables
  2. Open Library API   – catalogue ouvert, nombreux classiques
  3. BNF               – Bibliothèque Nationale de France (SRU/XML)
  4. Anna's Archive API – métadonnées complètes, livres africains/francophones

  AVIS RÉELS (table `interactions` — notes et commentaires en français)
  5. Babelio            – référence française, avis en français
  6. Fnac.com           – avis français, notes fiables
  (SensCritique scraping désactivé par défaut — Babelio + Fnac suffisent)

  SIMILARITÉS
  → Calculées par cosine similarity sur vecteur_livre (genre + mots_clés)
    dans generate_synthetic_data.py — pas de scraping nécessaire.

Champs produits (conformes au schéma complet) :
  id, ol_id, titre, auteur, genre, sous_genre, annee, nb_pages, langue,
  categorie_age, mots_cles (JSON), note_moyenne, nb_notes, nb_emprunts,
  popularite, vecteur_livre (JSON), disponible, resume, couverture_url

Fichiers produits :
  data/raw_livres.json       — livres dédupliqués
  data/raw_interactions.json — avis réels (Babelio + Fnac)

Prérequis :
    pip install aiohttp aiofiles beautifulsoup4 lxml

Usage :
    python scrapper.py
    python scrapper.py --target 3000 --workers 20
    python scrapper.py --skip-reviews   # sauter le scraping des avis
"""

import asyncio
import aiohttp
import json
import logging
import re
import time
import argparse
import math
import random
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False
    logging.getLogger(__name__).warning(
        "beautifulsoup4 non installé — scraping Babelio/Fnac désactivé. "
        "Installez avec : pip install beautifulsoup4 lxml"
    )

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    handlers=[
        logging.FileHandler("scraper.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────
OUTPUT_FILE          = "data/raw_livres.json"
OUTPUT_INTERACTIONS  = "data/raw_interactions.json"
TARGET_BOOKS         = 500_000
TIMEOUT_SEC          = 20
GOOGLE_API_KEY       = ""   # optionnel

# ── Rate limiting PAR DOMAINE ─────────────────────────────────────────────────
# Chaque domaine a son propre semaphore + délai min entre requêtes.
# Règle générale : rester en-dessous du seuil de détection bot de chaque site.
#
#  Google Books API  → avec clé : 1 000 req/jour, sans clé : ~10/s global
#  Open Library      → API publique, ~2 req/s recommandé
#  BNF SRU           → API institutionnelle, ~1 req/s max
#  Anna's Archive    → pas d'API officielle, très prudent (2-4s entre pages)
#  Babelio           → site web, très sensible, 3-6s + jitter indispensable
#  Fnac              → site web, CDN Cloudflare, 2-5s + jitter
#
# WORKERS = nb de requêtes simultanées MAX vers ce domaine
# DELAY   = délai minimum en secondes entre deux requêtes (avant jitter)
# JITTER  = intervalle du jitter aléatoire ajouté au délai (en secondes)

DOMAIN_CFG: dict[str, dict] = {
    "google":      {"workers": 5,  "delay": 0.5,  "jitter": (0.1, 0.5)},
    "openlibrary": {"workers": 4,  "delay": 0.5,  "jitter": (0.1, 0.4)},
    "bnf":         {"workers": 3,  "delay": 1.0,  "jitter": (0.2, 0.8)},
    "gutenberg":   {"workers": 3,  "delay": 0.3,  "jitter": (0.1, 0.3)},
    "annas":       {"workers": 2,  "delay": 3.0,  "jitter": (1.0, 3.0)},
    "babelio":     {"workers": 2,  "delay": 4.0,  "jitter": (1.5, 4.0)},
    "fnac":        {"workers": 2,  "delay": 3.0,  "jitter": (1.0, 3.0)},
}

# Nombre total de workers — valeur par défaut argparse
MAX_WORKERS = sum(c["workers"] for c in DOMAIN_CFG.values())

# Nombre max de pages d'avis à scraper par livre
# (20 avis/page en moyenne)
MAX_BABELIO_PAGES = 5    # ~100 avis par livre × 20 livres = ~2 000 avis réels
MAX_FNAC_PAGES    = 4    # ~80 avis par livre × 15 livres  = ~1 200 avis réels

# Retry
MAX_RETRIES   = 4        # nombre de tentatives en cas d'erreur
BACKOFF_BASE  = 2.0      # secondes — multiplié × 2 à chaque retry (exponentiel)
RETRY_ON      = {429, 503, 502, 504, 520, 521, 522, 524}  # codes HTTP à retry

# ── Pool de User-Agents réalistes ─────────────────────────────────────────────
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

# Headers complets simulant un navigateur Chrome récent
BROWSER_HEADERS_BASE = {
    "Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language":           "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding":           "gzip, deflate, br, zstd",
    "Cache-Control":             "max-age=0",
    "Sec-Ch-Ua":                 '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile":          "?0",
    "Sec-Ch-Ua-Platform":        '"Windows"',
    "Sec-Fetch-Dest":            "document",
    "Sec-Fetch-Mode":            "navigate",
    "Sec-Fetch-Site":            "none",
    "Sec-Fetch-User":            "?1",
    "Upgrade-Insecure-Requests": "1",
    "Connection":                "keep-alive",
}

# Headers légers pour les APIs publiques (Google, OL, BNF)
API_HEADERS = {
    "User-Agent": "BiblioRecoBot/1.0 (projet académique; contact@biblio.fr)",
    "Accept":     "application/json, application/xml, */*",
}


def browser_headers(referer: str | None = None) -> dict:
    """
    Headers navigateur cohérents avec User-Agent aléatoire.
    - Sec-CH-UA adapté au navigateur (Firefox ne l'envoie pas)
    - Platform cohérente (Windows / macOS / Linux)
    - Referer simulant une navigation interne au site
    """
    ua = random.choice(USER_AGENTS)
    h  = dict(BROWSER_HEADERS_BASE)
    h["User-Agent"] = ua

    if "Edg/" in ua:
        h["Sec-Ch-Ua"]          = '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"'
        h["Sec-Ch-Ua-Platform"] = '"Windows"'
    elif "Firefox/" in ua:
        h.pop("Sec-Ch-Ua", None)
        h.pop("Sec-Ch-Ua-Mobile", None)
        h.pop("Sec-Ch-Ua-Platform", None)
        h["Accept"]          = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        h["Accept-Encoding"] = "gzip, deflate, br"
    elif "Macintosh" in ua:
        h["Sec-Ch-Ua-Platform"] = '"macOS"'
    elif "X11" in ua:
        h["Sec-Ch-Ua-Platform"] = '"Linux"'

    if random.random() > 0.6:
        h["Accept-Language"] = "fr-FR,fr;q=0.8,en-US;q=0.6,en;q=0.4"

    if referer:
        h["Referer"]        = referer
        h["Sec-Fetch-Site"] = "same-origin"

    return h


# ─── Semaphores par domaine (créés au démarrage de main_async) ────────────────
_semaphores: dict[str, asyncio.Semaphore] = {}

def get_sem(domain: str) -> asyncio.Semaphore:
    """Retourne (ou crée) le semaphore du domaine."""
    if domain not in _semaphores:
        _semaphores[domain] = asyncio.Semaphore(DOMAIN_CFG[domain]["workers"])
    return _semaphores[domain]


async def _jitter_sleep(domain: str):
    """Délai min + jitter aléatoire — imite le comportement humain."""
    cfg = DOMAIN_CFG[domain]
    lo, hi = cfg["jitter"]
    total = cfg["delay"] + random.uniform(lo, hi)
    await asyncio.sleep(total)


async def fetch_with_retry(
    session: aiohttp.ClientSession,
    url: str,
    domain: str,
    *,
    params: dict | None = None,
    use_browser_headers: bool = False,
    response_type: str = "json",   # "json" | "text"
    referer: str | None = None,
) -> tuple[int, any]:
    """
    Requête HTTP avec :
    - semaphore par domaine (limite la concurrence)
    - jitter aléatoire avant chaque requête
    - retry exponentiel sur 429 / 5xx / 403 (bot détecté)
    - rotation de User-Agent + Sec-CH-UA cohérent à chaque retry
    - Referer interne simulant une navigation humaine
    Retourne (status_code, data) — data est None en cas d'échec définitif.
    """
    sem = get_sem(domain)
    headers = browser_headers(referer=referer) if use_browser_headers else API_HEADERS
    timeout = aiohttp.ClientTimeout(total=TIMEOUT_SEC)

    for attempt in range(MAX_RETRIES):
        # ⚠️  Sleep HORS du semaphore — libère le slot pendant l'attente
        await _jitter_sleep(domain)
        async with sem:
            try:
                async with session.get(url, params=params, headers=headers,
                                       timeout=timeout, allow_redirects=True) as resp:
                    status = resp.status

                    if status in RETRY_ON:
                        wait = BACKOFF_BASE * (2 ** attempt) + random.uniform(1, 4)
                        log.warning(f"[{domain}] HTTP {status} → retry #{attempt+1} dans {wait:.1f}s ({url[:60]})")
                        await asyncio.sleep(wait)
                        if use_browser_headers:
                            headers = browser_headers(referer=referer)
                        continue

                    if status == 403 and use_browser_headers:
                        wait = BACKOFF_BASE * (2 ** attempt) + random.uniform(3, 8)
                        log.warning(f"[{domain}] HTTP 403 (bot détecté?) → retry #{attempt+1} dans {wait:.1f}s")
                        await asyncio.sleep(wait)
                        headers = browser_headers(referer=referer)
                        continue

                    if status == 200:
                        if response_type == "json":
                            try:
                                return status, await resp.json(content_type=None)
                            except Exception:
                                return status, None
                        else:
                            return status, await resp.text()

                    log.debug(f"[{domain}] HTTP {status} — abandon ({url[:60]})")
                    return status, None

            except asyncio.TimeoutError:
                wait = BACKOFF_BASE * (2 ** attempt)
                log.warning(f"[{domain}] Timeout → retry #{attempt+1} dans {wait:.1f}s")
                await asyncio.sleep(wait)
            except aiohttp.ClientError as e:
                log.warning(f"[{domain}] Erreur réseau : {e}")
                await asyncio.sleep(BACKOFF_BASE * (2 ** attempt))

    log.warning(f"[{domain}] Abandon après {MAX_RETRIES} tentatives ({url[:60]})")
    return 0, None


# ─── Mots-clés thématiques par genre ──────────────────────────────────────────
# Utilisés pour construire mots_cles et vecteur_livre
GENRE_KEYWORDS: dict[str, list[str]] = {
    "Roman":                 ["amour","famille","société","vie","destin","identité","mémoire"],
    "Policier":              ["enquête","crime","meurtre","détective","indice","suspect","justice"],
    "Thriller":              ["suspense","danger","complot","course","tension","secret","fuite"],
    "Romance":               ["amour","passion","rencontre","cœur","séduction","couple","désir"],
    "Science-Fiction":       ["espace","futur","technologie","robot","alien","dystopie","clonage"],
    "Fantastique":           ["magie","dragon","quête","héros","monde","sort","créature"],
    "Historique":            ["guerre","siècle","roi","empire","révolution","chevalier","château"],
    "Biographie":            ["vie","portrait","succès","destin","témoignage","mémoires","carrière"],
    "Développement personnel":["confiance","succès","habitude","mindset","objectif","bonheur","bien-être"],
    "Horreur":               ["peur","monstre","nuit","mort","malédiction","terreur","fantôme"],
    "Aventure":              ["voyage","exploration","danger","découverte","héros","jungle","trésor"],
    "Philosophie":           ["pensée","existence","vérité","morale","liberté","raison","sens"],
    "Psychologie":           ["esprit","comportement","trauma","inconscient","émotion","thérapie","identité"],
    "Histoire":              ["guerre","empire","révolution","siècle","peuple","pouvoir","civilisation"],
    "Poésie":                ["vers","âme","nature","beauté","silence","lumière","rêve"],
    "Jeunesse":              ["amitié","école","aventure","magie","famille","découverte","courage"],
    "Cuisine":               ["recette","saveur","ingrédient","chef","plat","goût","tradition"],
    "Voyage":                ["pays","culture","route","découverte","paysage","aventure","monde"],
    "Sciences":              ["expérience","nature","univers","biologie","physique","découverte","théorie"],
    "Technologie":           ["numérique","intelligence","réseau","code","innovation","données","algorithme"],
    "Art":                   ["couleur","forme","création","peinture","sculpture","esthétique","musée"],
    "Classique":             ["destin","société","amour","honneur","tragédie","vertu","passion"],
    "Drame":                 ["conflit","famille","perte","larmes","tragédie","trahison","sacrifice"],
    "Littérature française": ["France","Paris","liberté","amour","révolution","style","langage"],
    "Roman contemporain":    ["identité","modernité","solitude","ville","numérique","famille","société"],
    "BD / Roman graphique":  ["dessin","héros","aventure","couleur","humour","super","image"],
    "Humour":                ["rire","absurde","ironie","satire","comédie","blague","décalé"],
    "Essai":                 ["analyse","société","politique","réflexion","argument","idée","critique"],
    "Autre":                 ["lecture","livre","histoire","texte","récit","monde","vie"],
}

# ─── Catégorie d'âge ──────────────────────────────────────────────────────────
ADULT_GENRES   = {"Philosophie","Psychologie","Histoire","Développement personnel","Essai",
                  "Sciences","Technologie","Art","Biographie","Thriller","Horreur",
                  "Littérature française","Roman contemporain","Classique","Drame","Humour"}
ADO_GENRES     = {"Jeunesse","Fantastique","Aventure","Science-Fiction","BD / Roman graphique",
                  "Romance","Policier"}
CHILD_SUBJECTS = {"children","jeunesse enfant","contes","albums","maternelle","primaire"}
ADO_SUBJECTS   = {"young_adult","young adult","ado","adolescent","collège","lycée","jeunesse"}


def infer_categorie_age(genre: str, sous_genre: str, categories_raw: list[str]) -> str:
    combined = " ".join(categories_raw + [sous_genre]).lower()
    if any(k in combined for k in CHILD_SUBJECTS):
        return "enfant"
    if any(k in combined for k in ADO_SUBJECTS):
        return "ado"
    if genre in ADULT_GENRES:
        return "adulte"
    if genre in ADO_GENRES:
        return "ado"
    return "adulte"


# ─── Modèle de données ────────────────────────────────────────────────────────
@dataclass
class Livre:
    ol_id:          Optional[str]   = None
    isbn:           Optional[str]   = None
    titre:          str             = "Sans titre"
    auteur:         str             = "Inconnu"
    genre:          str             = "Autre"
    sous_genre:     str             = ""
    annee:          Optional[int]   = None
    nb_pages:       Optional[int]   = None
    langue:         str             = "fr"
    categorie_age:  str             = "adulte"
    mots_cles:      list            = field(default_factory=list)
    note_moyenne:   Optional[float] = None   # None si pas de notes réelles
    nb_notes:       int             = 0
    nb_emprunts:    int             = 0      # initialisé à 0, mis à jour par le système
    popularite:     float           = 0.0
    vecteur_livre:  dict            = field(default_factory=dict)
    disponible:     int             = 1
    resume:         Optional[str]   = None
    couverture_url: Optional[str]   = None
    source:         str             = ""


# ─── Construction du vecteur_livre ────────────────────────────────────────────
def build_vecteur_livre(genre: str, sous_genre: str, mots_cles: list[str]) -> dict:
    """
    Vecteur JSON représentant le contenu du livre.
    Utilisé par le moteur IB (similarité entre livres) et CB (contenu vs profil).
    Format : {"genre": str, "sous_genre": str, "mots_cles": {mot: poids}}
    Les poids sont normalisés L2 (norme = 1) pour que la cosine similarity
    soit correcte et non biaisée par la longueur des résumés.
    """
    kw_poids: dict[str, float] = {}
    if mots_cles:
        for mot in mots_cles:
            kw_poids[mot] = 1.0 / len(mots_cles)

    # Mots-clés du genre (poids 0.5× pour ne pas écraser le contenu réel)
    genre_kw = GENRE_KEYWORDS.get(genre, GENRE_KEYWORDS["Autre"])
    for mot in genre_kw:
        if mot not in kw_poids:
            kw_poids[mot] = 0.5 / len(genre_kw)

    # Normalisation L2 — indispensable pour cosine similarity non biaisée
    norme = math.sqrt(sum(v * v for v in kw_poids.values()))
    if norme > 0:
        kw_poids = {k: round(v / norme, 4) for k, v in kw_poids.items()}

    return {
        "genre":      genre,
        "sous_genre": sous_genre,
        "mots_cles":  kw_poids,
    }


# ─── Genres normalisés ────────────────────────────────────────────────────────
GENRE_MAP = {
    "fiction":                    "Roman",
    "literary fiction":           "Roman",
    "roman":                      "Roman",
    "littérature":                "Roman",
    "littérature française":      "Littérature française",
    "french literature":          "Littérature française",
    "mystery & detective":        "Policier",
    "thrillers":                  "Thriller",
    "thriller":                   "Thriller",
    "policier":                   "Policier",
    "crime":                      "Policier",
    "romance":                    "Romance",
    "science fiction":            "Science-Fiction",
    "fantasy":                    "Fantastique",
    "fantastique":                "Fantastique",
    "horror":                     "Horreur",
    "horreur":                    "Horreur",
    "historical fiction":         "Historique",
    "history":                    "Histoire",
    "biography & autobiography":  "Biographie",
    "biographie":                 "Biographie",
    "self-help":                  "Développement personnel",
    "philosophy":                 "Philosophie",
    "philosophie":                "Philosophie",
    "psychology":                 "Psychologie",
    "adventure":                  "Aventure",
    "poetry":                     "Poésie",
    "poésie":                     "Poésie",
    "young adult fiction":        "Jeunesse",
    "juvenile fiction":           "Jeunesse",
    "jeunesse":                   "Jeunesse",
    "cooking":                    "Cuisine",
    "travel":                     "Voyage",
    "science":                    "Sciences",
    "technology":                 "Technologie",
    "art":                        "Art",
    "classic":                    "Classique",
    "classique":                  "Classique",
    "drama":                      "Drame",
    "graphic novels":             "BD / Roman graphique",
    "bande dessinée":             "BD / Roman graphique",
    "humor":                      "Humour",
    "humour":                     "Humour",
    "essays":                     "Essai",
    "essai":                      "Essai",
}

OL_SUBJECT_MAP = {
    # Fiction générale
    "fiction":                  ("Roman",                    "fiction"),
    "literary_fiction":         ("Roman",                    "literary_fiction"),
    "contemporary_fiction":     ("Roman contemporain",       "contemporary_fiction"),
    "french_literature":        ("Littérature française",    "french_literature"),
    "francophone_literature":   ("Littérature française",    "francophone_literature"),
    "classic_literature":       ("Classique",                "classic_literature"),
    # Genres populaires
    "mystery":                  ("Policier",                 "mystery"),
    "detective_fiction":        ("Policier",                 "detective_fiction"),
    "crime_fiction":            ("Policier",                 "crime_fiction"),
    "thriller":                 ("Thriller",                 "thriller"),
    "suspense":                 ("Thriller",                 "suspense"),
    "espionage":                ("Thriller",                 "espionage"),
    "romance":                  ("Romance",                  "romance"),
    "love_stories":             ("Romance",                  "love_stories"),
    "historical_romance":       ("Romance",                  "historical_romance"),
    "science_fiction":          ("Science-Fiction",          "science_fiction"),
    "dystopian_fiction":        ("Science-Fiction",          "dystopian_fiction"),
    "space_opera":              ("Science-Fiction",          "space_opera"),
    "fantasy":                  ("Fantastique",              "fantasy"),
    "epic_fantasy":             ("Fantastique",              "epic_fantasy"),
    "urban_fantasy":            ("Fantastique",              "urban_fantasy"),
    "horror":                   ("Horreur",                  "horror"),
    "gothic_fiction":           ("Horreur",                  "gothic_fiction"),
    "historical_fiction":       ("Historique",               "historical_fiction"),
    "adventure":                ("Aventure",                 "adventure"),
    "drama":                    ("Drame",                    "drama"),
    # Non-fiction
    "biography":                ("Biographie",               "biography"),
    "autobiography":            ("Biographie",               "autobiography"),
    "memoirs":                  ("Biographie",               "memoirs"),
    "self_help":                ("Développement personnel",  "self_help"),
    "personal_development":     ("Développement personnel",  "personal_development"),
    "philosophy":               ("Philosophie",              "philosophy"),
    "ethics":                   ("Philosophie",              "ethics"),
    "psychology":               ("Psychologie",              "psychology"),
    "history":                  ("Histoire",                 "history"),
    "world_history":            ("Histoire",                 "world_history"),
    "social_sciences":          ("Essai",                    "social_sciences"),
    "political_science":        ("Essai",                    "political_science"),
    "economics":                ("Essai",                    "economics"),
    "essays":                   ("Essai",                    "essays"),
    # Culture & arts
    "poetry":                   ("Poésie",                   "poetry"),
    "art":                      ("Art",                      "art"),
    "music":                    ("Art",                      "music"),
    "cinema":                   ("Art",                      "cinema"),
    "graphic_novels":           ("BD / Roman graphique",     "graphic_novels"),
    "comics":                   ("BD / Roman graphique",     "comics"),
    # Sciences & nature
    "science":                  ("Sciences",                 "science"),
    "natural_history":          ("Sciences",                 "natural_history"),
    "technology":               ("Technologie",              "technology"),
    # Jeunesse
    "young_adult":              ("Jeunesse",                 "young_adult"),
    "childrens_literature":     ("Jeunesse",                 "childrens_literature"),
    # Divers
    "cooking":                  ("Cuisine",                  "cooking"),
    "travel":                   ("Voyage",                   "travel"),
    "humor":                    ("Humour",                   "humor"),
    "crime":                    ("Policier",                 "crime"),
}

GOOGLE_QUERIES = [
    # ── Grands éditeurs français ──────────────────────────────────────────────
    ("inpublisher:gallimard",                        "Roman",                     "gallimard"),
    ("inpublisher:hachette",                         "Roman",                     "hachette"),
    ("inpublisher:flammarion",                       "Roman",                     "flammarion"),
    ("inpublisher:albin+michel",                     "Roman",                     "albin_michel"),
    ("inpublisher:fayard",                           "Roman",                     "fayard"),
    ("inpublisher:grasset",                          "Roman",                     "grasset"),
    ("inpublisher:seuil",                            "Roman",                     "seuil"),
    ("inpublisher:actes+sud",                        "Roman",                     "actes_sud"),
    ("inpublisher:minuit",                           "Roman",                     "minuit"),
    ("inpublisher:stock",                            "Roman",                     "stock"),
    ("inpublisher:laffont",                          "Roman",                     "laffont"),
    ("inpublisher:plon",                             "Roman",                     "plon"),
    ("inpublisher:julliard",                         "Roman",                     "julliard"),
    ("inpublisher:calmann-lévy",                     "Roman",                     "calmann"),
    ("inpublisher:pocket",                           "Roman",                     "pocket"),
    ("inpublisher:folio",                            "Roman",                     "folio"),
    ("inpublisher:points",                           "Roman",                     "points"),
    ("inpublisher:babel",                            "Roman",                     "babel"),
    ("inpublisher:payot",                            "Essai",                     "payot"),
    ("inpublisher:denoël",                           "Roman",                     "denoel"),
    ("inpublisher:puf",                              "Philosophie",               "puf"),
    ("inpublisher:gallimard+jeunesse",               "Jeunesse",                  "gallimard_jeunesse"),
    ("inpublisher:bayard",                           "Jeunesse",                  "bayard"),
    ("inpublisher:milan",                            "Jeunesse",                  "milan"),
    # ── Sujets étendus ───────────────────────────────────────────────────────
    ("subject:policier+language:fr",                 "Policier",                  "policier"),
    ("subject:thriller+language:fr",                 "Thriller",                  "thriller"),
    ("subject:romance+language:fr",                  "Romance",                   "romance"),
    ("subject:fantasy+language:fr",                  "Fantastique",               "fantastique"),
    ("subject:science+fiction+language:fr",          "Science-Fiction",           "sf"),
    ("subject:biographie+language:fr",               "Biographie",                "biographie"),
    ("subject:histoire+language:fr",                 "Histoire",                  "histoire"),
    ("subject:philosophie+language:fr",              "Philosophie",               "philosophie"),
    ("subject:développement+personnel+language:fr",  "Développement personnel",   "dev_perso"),
    ("subject:jeunesse+language:fr",                 "Jeunesse",                  "jeunesse"),
    ("subject:poésie+language:fr",                   "Poésie",                    "poesie"),
    ("subject:cuisine+language:fr",                  "Cuisine",                   "cuisine"),
    ("subject:voyage+language:fr",                   "Voyage",                    "voyage"),
    ("subject:humour+language:fr",                   "Humour",                    "humour"),
    ("subject:bande+dessinée+language:fr",           "BD / Roman graphique",      "bd"),
    ("subject:essai+language:fr",                    "Essai",                     "essai"),
    ("subject:psychologie+language:fr",              "Psychologie",               "psychologie"),
    ("subject:art+language:fr",                      "Art",                       "art"),
    ("subject:sciences+language:fr",                 "Sciences",                  "sciences"),
    ("subject:roman+historique+language:fr",         "Historique",                "historique"),
    ("subject:aventure+language:fr",                 "Aventure",                  "aventure"),
    ("subject:horreur+language:fr",                  "Horreur",                   "horreur"),
    ("subject:classique+language:fr",                "Classique",                 "classique"),
    ("subject:drame+language:fr",                    "Drame",                     "drame"),
    ("subject:technologie+language:fr",              "Technologie",               "technologie"),
    ("subject:économie+language:fr",                 "Essai",                     "economie"),
    ("subject:politique+language:fr",                "Essai",                     "politique"),
    ("subject:religion+language:fr",                 "Essai",                     "religion"),
    ("subject:sport+language:fr",                    "Essai",                     "sport"),
    ("subject:nature+language:fr",                   "Sciences",                  "nature"),
    ("subject:médecine+language:fr",                 "Sciences",                  "medecine"),
    # ── Auteurs classiques ───────────────────────────────────────────────────
    ("inauthor:zola+language:fr",                    "Roman",                     "zola"),
    ("inauthor:hugo+language:fr",                    "Roman",                     "hugo"),
    ("inauthor:flaubert+language:fr",                "Classique",                 "flaubert"),
    ("inauthor:balzac+language:fr",                  "Classique",                 "balzac"),
    ("inauthor:camus+language:fr",                   "Roman",                     "camus"),
    ("inauthor:sartre+language:fr",                  "Philosophie",               "sartre"),
    ("inauthor:proust+language:fr",                  "Classique",                 "proust"),
    ("inauthor:dumas+language:fr",                   "Historique",                "dumas"),
    ("inauthor:voltaire+language:fr",                "Classique",                 "voltaire"),
    ("inauthor:molière+language:fr",                 "Drame",                     "moliere"),
    ("inauthor:maupassant+language:fr",              "Classique",                 "maupassant"),
    ("inauthor:stendhal+language:fr",                "Classique",                 "stendhal"),
    ("inauthor:verne+language:fr",                   "Aventure",                  "verne"),
    ("inauthor:baudelaire+language:fr",              "Poésie",                    "baudelaire"),
    ("inauthor:rimbaud+language:fr",                 "Poésie",                    "rimbaud"),
    ("inauthor:verlaine+language:fr",                "Poésie",                    "verlaine"),
    ("inauthor:racine+language:fr",                  "Drame",                     "racine"),
    ("inauthor:corneille+language:fr",               "Drame",                     "corneille"),
    ("inauthor:rousseau+language:fr",                "Philosophie",               "rousseau"),
    ("inauthor:montaigne+language:fr",               "Essai",                     "montaigne"),
    ("inauthor:descartes+language:fr",               "Philosophie",               "descartes"),
    ("inauthor:pascal+language:fr",                  "Philosophie",               "pascal"),
    ("inauthor:lamartine+language:fr",               "Poésie",                    "lamartine"),
    ("inauthor:sand+language:fr",                    "Roman",                     "sand"),
    ("inauthor:mérimée+language:fr",                 "Classique",                 "merimee"),
    # ── Auteurs contemporains ────────────────────────────────────────────────
    ("inauthor:houellebecq+language:fr",             "Roman",                     "houellebecq"),
    ("inauthor:pennac+language:fr",                  "Roman",                     "pennac"),
    ("inauthor:modiano+language:fr",                 "Roman",                     "modiano"),
    ("inauthor:nothomb+language:fr",                 "Roman",                     "nothomb"),
    ("inauthor:grangé+language:fr",                  "Thriller",                  "grange"),
    ("inauthor:chattam+language:fr",                 "Thriller",                  "chattam"),
    ("inauthor:vargas+language:fr",                  "Policier",                  "vargas"),
    ("inauthor:bussi+language:fr",                   "Policier",                  "bussi"),
    ("inauthor:lévy+language:fr",                    "Roman",                     "levy"),
    ("inauthor:musso+language:fr",                   "Roman",                     "musso"),
    ("inauthor:gavalda+language:fr",                 "Roman",                     "gavalda"),
    ("inauthor:pancol+language:fr",                  "Romance",                   "pancol"),
    ("inauthor:beigbeder+language:fr",               "Roman",                     "beigbeder"),
    ("inauthor:djian+language:fr",                   "Roman",                     "djian"),
    ("inauthor:darrieussecq+language:fr",            "Roman",                     "darrieussecq"),
    ("inauthor:ernaux+language:fr",                  "Roman",                     "ernaux"),
    ("inauthor:angot+language:fr",                   "Roman",                     "angot"),
    ("inauthor:echenoz+language:fr",                 "Roman",                     "echenoz"),
    ("inauthor:enard+language:fr",                   "Roman",                     "enard"),
    ("inauthor:ferrari+language:fr",                 "Roman",                     "ferrari"),
    ("inauthor:mbougar+sarr+language:fr",            "Roman",                     "mbougar"),
    ("inauthor:slimani+language:fr",                 "Roman",                     "slimani"),
    ("inauthor:diome+language:fr",                   "Roman",                     "diome"),
    ("inauthor:makine+language:fr",                  "Roman",                     "makine"),
    ("inauthor:werber+language:fr",                  "Science-Fiction",           "werber"),
    ("inauthor:bordage+language:fr",                 "Science-Fiction",           "bordage"),
    ("inauthor:jaworski+language:fr",                "Fantastique",               "jaworski"),
    ("inauthor:bottero+language:fr",                 "Fantastique",               "bottero"),
    ("inauthor:levy+marc+language:fr",               "Thriller",                  "levy_marc"),
    ("inauthor:minier+language:fr",                  "Thriller",                  "minier"),
    ("inauthor:french+tana+language:fr",             "Policier",                  "french"),
    ("inauthor:camilleri+language:fr",               "Policier",                  "camilleri"),
    ("inauthor:indridason+language:fr",              "Policier",                  "indridason"),
    ("inauthor:mankell+language:fr",                 "Policier",                  "mankell"),
    # ── Prix littéraires ─────────────────────────────────────────────────────
    ("prix+goncourt+language:fr",                    "Roman",                     "goncourt"),
    ("prix+renaudot+language:fr",                    "Roman",                     "renaudot"),
    ("prix+femina+language:fr",                      "Roman",                     "femina"),
    ("prix+médicis+language:fr",                     "Roman",                     "medicis"),
    ("prix+nobel+littérature+language:fr",           "Roman",                     "nobel"),
    ("prix+booker+language:fr",                      "Roman",                     "booker"),
    ("prix+pulitzer+language:fr",                    "Roman",                     "pulitzer"),
    ("prix+académie+française+language:fr",          "Roman",                     "academie_fr"),
    ("meilleur+roman+français+language:fr",          "Roman",                     "best_roman"),
    # ── Décennies (enrichissement historique) ────────────────────────────────
    ("roman+français+language:fr+after:2020",        "Roman",                     "roman_2020s"),
    ("roman+français+language:fr+after:2015+before:2021", "Roman",               "roman_2015"),
    ("roman+français+language:fr+after:2010+before:2016", "Roman",               "roman_2010"),
    ("roman+français+language:fr+after:2000+before:2011", "Roman",               "roman_2000"),
    ("roman+français+language:fr+after:1990+before:2001", "Roman",               "roman_1990"),
    ("roman+français+language:fr+before:1990",       "Classique",                "roman_classic"),
    ("policier+français+language:fr+after:2015",     "Policier",                 "policier_recent"),
    ("thriller+français+language:fr+after:2015",     "Thriller",                 "thriller_recent"),
    ("sf+français+language:fr+after:2010",           "Science-Fiction",          "sf_recent"),
]

BNF_QUERIES = [
    # Romans & fiction
    "roman français", "roman contemporain français", "roman noir français",
    "littérature française contemporaine", "littérature française 20e siècle",
    "littérature française 19e siècle", "littérature africaine francophone",
    "littérature antillaise", "littérature québécoise", "littérature belge francophone",
    "littérature suisse romande",
    # Genres
    "policier français", "thriller français", "roman historique français",
    "roman policier", "roman d'espionnage", "roman noir",
    "science-fiction française", "fantastique français", "fantasy française",
    "horreur littérature", "roman d'aventure",
    # Classiques
    "classiques français", "classiques littérature française",
    "romantisme français", "réalisme français", "naturalisme français",
    "surréalisme français", "existentialisme français",
    # Non-fiction
    "biographie française", "autobiographie française", "mémoires",
    "essai littéraire", "essai philosophique français",
    "philosophie française", "philosophie contemporaine",
    "psychologie populaire", "développement personnel",
    "histoire france", "histoire contemporaine", "histoire médiévale",
    "histoire ancienne", "histoire moderne",
    # Poésie & théâtre
    "poésie française", "poésie contemporaine", "théâtre français",
    "dramaturgie française",
    # Sciences & savoir
    "sciences humaines", "sociologie française",
    "économie française", "politique française",
    "sciences naturelles vulgarisation", "astronomie vulgarisation",
    "mathématiques vulgarisation", "médecine grand public",
    # Art & culture
    "art français", "peinture française", "musique française",
    "cinéma français", "architecture française",
    # Jeunesse
    "roman jeunesse", "littérature jeunesse", "albums jeunesse",
    "contes français", "bande dessinee",
    # Voyages & gastronomie
    "voyage récit", "exploration géographique",
    "cuisine française", "gastronomie",
    # Religion & spiritualité
    "religion christianisme", "spiritualité",
]

GENRE_KEYWORDS_FR = {
    "roman":             "Roman",
    "littérature":       "Littérature française",
    "poésie":            "Poésie",
    "policier":          "Policier",
    "thriller":          "Thriller",
    "fantastique":       "Fantastique",
    "science-fiction":   "Science-Fiction",
    "histoire":          "Histoire",
    "biographie":        "Biographie",
    "philosophie":       "Philosophie",
    "jeunesse":          "Jeunesse",
    "cuisine":           "Cuisine",
    "essai":             "Essai",
    "bande dessinée":    "BD / Roman graphique",
    "humour":            "Humour",
    "développement":     "Développement personnel",
    "voyage":            "Voyage",
}

BNF_NS = {
    "srw": "http://www.loc.gov/zing/srw/",
    "dc":  "http://purl.org/dc/elements/1.1/",
    "oai": "http://www.openarchives.org/OAI/2.0/oai_dc/",
}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def normalize_key(titre: str, auteur: str, annee: Optional[int] = None) -> str:
    """
    Clé de déduplication normalisée.
    - Titre tronqué à 80 chars (évite de fusionner les tomes d'une série)
    - Auteur tronqué à 40 chars
    - Année incluse si disponible (distingue rééditions et tomes)
    """
    def clean(s: str) -> str:
        s = unicodedata.normalize("NFD", s.lower())
        s = "".join(c for c in s if unicodedata.category(c) != "Mn")
        return re.sub(r"[^a-z0-9]", "", s)
    titre_safe  = (titre  or "")[:80]
    auteur_safe = (auteur or "")[:40]
    annee_part  = str(annee) if annee else ""
    return f"{clean(titre_safe)}|{clean(auteur_safe)}|{annee_part}"


def map_genre(raw: str) -> str:
    """Correspondance genre API → genre interne.
    Tri par longueur décroissante : 'literary fiction' matche avant 'fiction',
    'mystery & detective' avant 'mystery', etc.  Évite les faux positifs courts.
    """
    raw_lower = raw.strip().lower()
    for key in sorted(GENRE_MAP, key=len, reverse=True):
        if key in raw_lower:
            return GENRE_MAP[key]
    return "Roman"


def truncate(s: Optional[str], n: int) -> Optional[str]:
    return s[:n] if s else None


def _parse_year(s: str) -> Optional[int]:
    if not s:
        return None
    m = re.search(r"\b(1[5-9]\d{2}|20[0-2]\d)\b", s)
    return int(m.group(1)) if m else None


# Mots parasites issus des catégories API (ne doivent pas polluer les vecteurs ML)
_CATEG_NOISE = {
    "fiction","juvenile","nonfiction","general","literature","books","novel",
    "french","language","type","other","subject","adult","young","literary",
    "livres","livre","roman","texte","lecture","edition","volume","tome",
}

# Stopwords français enrichis pour l'extraction du résumé
_STOPWORDS_FR = {
    "le","la","les","un","une","des","de","du","et","en","il","elle","ils","elles",
    "son","sa","ses","mon","ma","mes","ton","ta","tes","leur","leurs",
    "est","sont","était","être","avoir","faire","dit","dire","aller",
    "dans","sur","pour","par","que","qui","avec","aux","au","ce","se","si",
    "mais","ou","donc","car","ni","or","dont","car","quand","alors","ainsi",
    "ne","pas","plus","très","tout","cette","ces","même","aussi","bien",
    "comme","plus","après","avant","lors","sous","vers","entre","depuis",
    "nous","vous","eux","elle","celui","celle","ceux","celles","dont","où",
    "quoi","quel","quelle","quels","quelles","rien","tout","tous","toute","toutes",
    "faire","prend","peut","doit","veut","veux","vient","vont","font","sont",
}


def extract_mots_cles(categories: list[str], genre: str, resume: Optional[str]) -> list[str]:
    """
    Construit la liste de mots-clés thématiques du livre.
    Combine : catégories API (filtrées) + mots-clés de genre + top-fréquence résumé.
    Résultat : liste triée, max 15 mots, sans bruit de catégorie API.
    """
    mots: set[str] = set()

    # Mots-clés par genre (base thématique)
    for mot in GENRE_KEYWORDS.get(genre, []):
        mots.add(mot)

    # Catégories brutes — filtrer les mots parasites API
    for cat in categories:
        for word in re.split(r"[,/&\s\-_]+", cat.lower()):
            word = word.strip()
            if (len(word) >= 4
                    and word.isalpha()
                    and word not in _CATEG_NOISE
                    and word not in _STOPWORDS_FR):
                mots.add(word)

    # Extraction top-fréquence depuis le résumé
    if resume:
        words = re.findall(r"\b[a-zéèêëàâùûîïôç]{4,}\b", resume.lower())
        freq: dict[str, int] = {}
        for w in words:
            if w not in _STOPWORDS_FR and w not in _CATEG_NOISE:
                freq[w] = freq.get(w, 0) + 1
        # Prendre les 8 mots les plus fréquents (tf brut)
        top = sorted(freq, key=lambda x: -freq[x])[:8]
        mots.update(top)

    return sorted(mots)[:15]   # max 15 mots-clés


# ═══════════════════════════════════════════════════════════════════════════════
#  SOURCE 1 — GOOGLE BOOKS
# ═══════════════════════════════════════════════════════════════════════════════

async def fetch_google_page(
    session: aiohttp.ClientSession,
    query: str, genre: str, sous_genre: str, start_index: int = 0,
) -> list[Livre]:
    params = {
        "q": query, "langRestrict": "fr",
        "maxResults": 40, "startIndex": start_index,
        "printType": "books", "orderBy": "relevance",
    }
    if GOOGLE_API_KEY:
        params["key"] = GOOGLE_API_KEY

    livres: list[Livre] = []
    status, data = await fetch_with_retry(
        session, "https://www.googleapis.com/books/v1/volumes",
        "google", params=params, response_type="json"
    )
    if not data:
        return livres

    # ── Arrêt anticipé si le total de résultats ne dépasse pas start_index ──
    total = int(data.get("totalItems", 0) or 0)
    if total == 0 or start_index >= total:
        return livres

    try:
        for item in data.get("items", []):
            info = item.get("volumeInfo", {})
            if info.get("language", "") not in ("fr", ""):
                continue

            isbn = None
            for ident in info.get("industryIdentifiers", []):
                if ident.get("type") in ("ISBN_13", "ISBN_10"):
                    isbn = ident.get("identifier")
                    break

            categories_raw = info.get("categories", [])
            livre_genre    = map_genre(categories_raw[0]) if categories_raw else genre

            images  = info.get("imageLinks", {})
            cover   = (images.get("thumbnail") or images.get("smallThumbnail") or "")
            cover   = cover.replace("http://", "https://") or None

            resume  = truncate(info.get("description"), 1000)
            mots_cles = extract_mots_cles(categories_raw, livre_genre, resume)
            vecteur   = build_vecteur_livre(livre_genre, sous_genre, mots_cles)
            cat_age   = infer_categorie_age(livre_genre, sous_genre, categories_raw)

            livres.append(Livre(
                ol_id          = f"google_{item.get('id','')}",
                isbn           = isbn,
                titre          = truncate(info.get("title", ""), 300) or "Sans titre",
                auteur         = truncate(", ".join(info.get("authors", ["Inconnu"])), 200) or "Inconnu",
                genre          = livre_genre,
                sous_genre     = sous_genre,
                annee          = _parse_year(info.get("publishedDate", "")),
                nb_pages       = info.get("pageCount"),
                langue         = "fr",
                categorie_age  = cat_age,
                mots_cles      = mots_cles,
                note_moyenne   = round(min(float(info.get("averageRating", 0) or 0), 5.0), 2),
                nb_notes       = int(info.get("ratingsCount", 0) or 0),
                nb_emprunts    = 0,
                vecteur_livre  = vecteur,
                disponible     = 1,
                resume         = resume,
                couverture_url = cover,
                source         = "google",
            ))
    except Exception as e:
        log.debug(f"Google parse error ({query}): {e}")

    return livres


async def scrape_google(session) -> list[Livre]:
    # 10 pages × 40 résultats = 400 par requête (plafond API Google)
    tasks = [(q, g, sg, s) for q, g, sg in GOOGLE_QUERIES for s in range(0, 400, 40)]
    log.info(f"[Google] {len(tasks)} requêtes planifiées ({DOMAIN_CFG['google']['workers']} workers, "
             f"délai {DOMAIN_CFG['google']['delay']}s + jitter)")

    completed = 0
    all_livres: list[Livre] = []

    # Traitement par batch de 50 pour afficher la progression
    batch_size = 50
    for i in range(0, len(tasks), batch_size):
        batch = tasks[i:i + batch_size]
        results = await asyncio.gather(
            *[fetch_google_page(session, q, g, sg, s) for q, g, sg, s in batch],
            return_exceptions=True
        )
        for r in results:
            if isinstance(r, list):
                all_livres.extend(r)
        completed += len(batch)
        if completed % 100 == 0 or completed == len(tasks):
            log.info(f"[Google] Progression : {completed}/{len(tasks)} requêtes — {len(all_livres)} livres bruts")

    all_livres = dedup_within_source(all_livres)
    log.info(f"[Google] {len(all_livres)} livres collectés (avant dédup)")
    return all_livres


# ═══════════════════════════════════════════════════════════════════════════════
#  SOURCE 2 — OPEN LIBRARY
# ═══════════════════════════════════════════════════════════════════════════════

async def fetch_ol_subject(session, subject, genre, sous_genre, offset: int = 0) -> list[Livre]:
    livres: list[Livre] = []
    status, data = await fetch_with_retry(
        session,
        f"https://openlibrary.org/subjects/{subject}.json",
        "openlibrary",
        params={"limit": 1000, "offset": offset},
        response_type="json",
    )
    if not data:
        return livres

    try:
        for work in data.get("works", []):
            authors  = work.get("authors", [])
            auteur   = authors[0].get("name", "Inconnu") if authors else "Inconnu"
            cover_id = work.get("cover_id")
            cover    = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None

            mots_cles = extract_mots_cles([], genre, None)
            vecteur   = build_vecteur_livre(genre, sous_genre, mots_cles)
            cat_age   = infer_categorie_age(genre, sous_genre, [sous_genre])

            livres.append(Livre(
                ol_id          = work.get("key", "").replace("/works/", ""),
                titre          = truncate(work.get("title", ""), 300) or "Sans titre",
                auteur         = truncate(auteur, 200),
                genre          = genre,
                sous_genre     = sous_genre,
                annee          = work.get("first_publish_year"),
                langue         = "fr",
                categorie_age  = cat_age,
                mots_cles      = mots_cles,
                note_moyenne   = round(min(float(work.get("ratings_average", 0) or 0), 5.0), 2)
                               if int(work.get("ratings_count", 0) or 0) > 0 else None,
                nb_notes       = int(work.get("ratings_count", 0) or 0),
                nb_emprunts    = 0,
                vecteur_livre  = vecteur,
                disponible     = 1,
                couverture_url = cover,
                source         = "openlibrary",
            ))
    except Exception as e:
        log.debug(f"OL parse error ({subject}): {e}")

    return livres


async def scrape_openlibrary(session) -> list[Livre]:
    tasks = [(subject, val, offset)
             for subject, val in OL_SUBJECT_MAP.items()
             for offset in (0, 1000)]
    log.info(f"[OpenLibrary] {len(tasks)} requêtes planifiées ({DOMAIN_CFG['openlibrary']['workers']} workers, "
             f"délai {DOMAIN_CFG['openlibrary']['delay']}s + jitter)")

    results = await asyncio.gather(
        *[fetch_ol_subject(session, subj, val[0], val[1], off) for subj, val, off in tasks],
        return_exceptions=True,
    )
    all_livres = [l for r in results if isinstance(r, list) for l in r]

    # ── API Search OL (support language:fre, beaucoup plus de résultats) ─────
    ol_search_results = await scrape_openlibrary_search(session)
    all_livres.extend(ol_search_results)

    all_livres = dedup_within_source(all_livres)
    log.info(f"[OpenLibrary] {len(all_livres)} livres collectés (avant dédup)")
    return all_livres


# Requêtes pour l'API Search OL (plus puissante que l'API Subjects)
OL_SEARCH_QUERIES = [
    ("roman français",          "Roman"),
    ("policier français",       "Policier"),
    ("thriller français",       "Thriller"),
    ("romance française",       "Romance"),
    ("fantasy française",       "Fantastique"),
    ("science fiction française","Science-Fiction"),
    ("histoire france",         "Histoire"),
    ("philosophie française",   "Philosophie"),
    ("biographie française",    "Biographie"),
    ("poésie française",        "Poésie"),
    ("littérature africaine",   "Roman"),
    ("littérature québécoise",  "Roman"),
    ("classiques français",     "Classique"),
    ("bande dessinée franco-belge", "BD / Roman graphique"),
    ("cuisine française",       "Cuisine"),
    ("développement personnel", "Développement personnel"),
    ("essai français",          "Essai"),
    ("roman contemporain",      "Roman contemporain"),
    ("aventure jeunesse",       "Aventure"),
    ("horreur littérature",     "Horreur"),
]


async def fetch_ol_search(session, query: str, genre: str, page: int = 1) -> list[Livre]:
    """API Search Open Library — supporte language:fre, beaucoup plus complète."""
    livres: list[Livre] = []
    status, data = await fetch_with_retry(
        session,
        "https://openlibrary.org/search.json",
        "openlibrary",
        params={
            "q": query,
            "language": "fre",
            "limit": 100,
            "offset": (page - 1) * 100,
            "fields": "key,title,author_name,first_publish_year,number_of_pages_median,"
                      "subject,isbn,cover_i,ratings_average,ratings_count,description",
        },
        response_type="json",
    )
    if not data:
        return livres

    try:
        for doc in data.get("docs", []):
            authors  = doc.get("author_name", [])
            auteur   = authors[0] if authors else "Inconnu"
            cover_id = doc.get("cover_i")
            cover    = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None

            subjects = doc.get("subject", [])
            sous_genre_inf = query
            mots_cles = extract_mots_cles(subjects[:10], genre, None)
            vecteur   = build_vecteur_livre(genre, sous_genre_inf, mots_cles)
            cat_age   = infer_categorie_age(genre, sous_genre_inf, subjects[:10])

            nb_pages_raw = doc.get("number_of_pages_median")
            nb_pages = int(nb_pages_raw) if nb_pages_raw and str(nb_pages_raw).isdigit() else None

            isbn = None
            for i in (doc.get("isbn") or []):
                if len(i) in (10, 13):
                    isbn = i
                    break

            nb_notes = int(doc.get("ratings_count", 0) or 0)
            note_moy = round(min(float(doc.get("ratings_average", 0) or 0), 5.0), 2) if nb_notes > 0 else None

            livres.append(Livre(
                ol_id         = (doc.get("key") or "").replace("/works/", "ol_search_"),
                isbn          = isbn,
                titre         = truncate(doc.get("title", ""), 300) or "Sans titre",
                auteur        = truncate(auteur, 200),
                genre         = genre,
                sous_genre    = sous_genre_inf,
                annee         = doc.get("first_publish_year"),
                nb_pages      = nb_pages,
                langue        = "fr",
                categorie_age = cat_age,
                mots_cles     = mots_cles,
                note_moyenne  = note_moy,
                nb_notes      = nb_notes,
                nb_emprunts   = 0,
                vecteur_livre = vecteur,
                disponible    = 1,
                couverture_url= cover,
                source        = "openlibrary",
            ))
    except Exception as e:
        log.debug(f"OL Search parse error ({query} p{page}): {e}")

    return livres


async def scrape_openlibrary_search(session) -> list[Livre]:
    """Scrape l'API Search OL sur 5 pages par requête."""
    tasks = [(q, g, p) for q, g in OL_SEARCH_QUERIES for p in range(1, 6)]
    log.info(f"[OpenLibrary Search] {len(tasks)} requêtes planifiées")

    results = await asyncio.gather(
        *[fetch_ol_search(session, q, g, p) for q, g, p in tasks],
        return_exceptions=True,
    )
    livres = [l for r in results if isinstance(r, list) for l in r]
    log.info(f"[OpenLibrary Search] {len(livres)} livres collectés")
    return livres


# ═══════════════════════════════════════════════════════════════════════════════
#  SOURCE 3 — BNF
# ═══════════════════════════════════════════════════════════════════════════════

def _guess_genre_bnf(subjects: list[str], title: str) -> str:
    combined = " ".join(subjects + [title]).lower()
    for kw, genre in GENRE_KEYWORDS_FR.items():
        if kw in combined:
            return genre
    return "Roman"


async def fetch_bnf_query(session, query, start=1, max_records=100) -> list[Livre]:
    params = {
        "version": "1.2", "operation": "searchRetrieve",
        "query": f'bib.anywhere all "{query}" and bib.doctype any "a" and bib.language any "fre"',
        "recordSchema": "dublincore",
        "maximumRecords": max_records, "startRecord": start,
    }
    livres: list[Livre] = []

    # Essayer HTTPS puis HTTP en fallback (certains réseaux bloquent le certificat BNF)
    for bnf_url in ("https://catalogue.bnf.fr/api/SRU", "http://catalogue.bnf.fr/api/SRU"):
        status, text = await fetch_with_retry(
            session, bnf_url,
            "bnf", params=params, response_type="text",
        )
        if text:
            break

    if not text:
        log.debug(f"[BNF] Pas de réponse pour : {query!r} (start={start})")
        return livres

    try:
        # Nettoyage éventuel du BOM ou d'espaces parasites en tête
        text_clean = text.lstrip("\ufeff").strip()
        if not text_clean.startswith("<"):
            log.debug(f"[BNF] Réponse non-XML pour {query!r} : {text_clean[:80]}")
            return livres

        root = ET.fromstring(text_clean)

        # Diagnostiquer les messages d'erreur SRU
        diag_ns = "http://www.loc.gov/zing/srw/diagnostic/"
        for diag in root.findall(f".//{{{diag_ns}}}diagnostic") or []:
            msg_el = root.find(f".//{{{diag_ns}}}message")
            if msg_el is not None:
                log.debug(f"[BNF] Diagnostic SRU {query!r} : {msg_el.text}")
            return livres

        for record in root.findall(".//srw:recordData/oai:dc", BNF_NS):
            def get_all(tag):
                return [e.text.strip() for e in record.findall(f"dc:{tag}", BNF_NS) if e.text]

            titles   = get_all("title")
            creators = get_all("creator")
            subjects = get_all("subject")
            descs    = get_all("description")
            dates    = get_all("date")
            ids      = get_all("identifier")

            if not titles:
                continue

            titre  = titles[0][:300]
            auteur = creators[0][:200] if creators else "Inconnu"
            if "," in auteur:
                parts  = auteur.split(",", 1)
                auteur = f"{parts[1].strip()} {parts[0].strip()}"

            annee = None
            for d in dates:
                m = re.search(r"\b(1[5-9]\d{2}|20[0-2]\d)\b", d)
                if m:
                    annee = int(m.group(1))
                    break

            isbn = None
            for id_val in ids:
                clean_id = id_val.replace("-", "")
                if re.match(r"978[0-9]{10}|[0-9]{13}", clean_id):
                    isbn = clean_id
                    break

            genre     = _guess_genre_bnf(subjects, titre)
            resume    = truncate(descs[0] if descs else None, 1000)
            mots_cles = extract_mots_cles(subjects, genre, resume)
            vecteur   = build_vecteur_livre(genre, query, mots_cles)
            cat_age   = infer_categorie_age(genre, query, subjects)

            livres.append(Livre(
                ol_id          = f"bnf_{isbn or titre[:20].replace(' ','_')}",
                isbn           = isbn,
                titre          = titre,
                auteur         = auteur,
                genre          = genre,
                sous_genre     = query,
                annee          = annee,
                langue         = "fr",
                categorie_age  = cat_age,
                mots_cles      = mots_cles,
                nb_emprunts    = 0,
                vecteur_livre  = vecteur,
                resume         = resume,
                disponible     = 1,
                source         = "bnf",
            ))

    except Exception as e:
        log.debug(f"BNF parse error ({query}): {e}")

    return livres


async def scrape_bnf(session) -> list[Livre]:
    tasks = [(q, s) for q in BNF_QUERIES for s in range(1, 1001, 100)]
    log.info(f"[BNF] {len(tasks)} requêtes planifiées ({DOMAIN_CFG['bnf']['workers']} workers, "
             f"délai {DOMAIN_CFG['bnf']['delay']}s + jitter)")

    # Traitement par batch de 20 pour afficher la progression
    all_livres: list[Livre] = []
    batch_size = 20
    for i in range(0, len(tasks), batch_size):
        batch = tasks[i:i + batch_size]
        results = await asyncio.gather(
            *[fetch_bnf_query(session, q, s) for q, s in batch],
            return_exceptions=True,
        )
        for r in results:
            if isinstance(r, list):
                all_livres.extend(r)
        log.info(f"[BNF] Progression : {min(i+batch_size, len(tasks))}/{len(tasks)} — {len(all_livres)} livres")

    if len(all_livres) == 0:
        log.warning("[BNF] 0 livre collecté — vérifier la connectivité réseau vers catalogue.bnf.fr")
        log.warning("      (le proxy/pare-feu bloque peut-être les requêtes SRU — utiliser --skip-bnf)")

    all_livres = dedup_within_source(all_livres)
    log.info(f"[BNF] {len(all_livres)} livres collectés (avant dédup global)")
    return all_livres


# ═══════════════════════════════════════════════════════════════════════════════
#  SOURCE — PROJECT GUTENBERG  (classiques français domaine public, très fiable)
# ═══════════════════════════════════════════════════════════════════════════════

GUTENBERG_SEARCH_QUERIES = [
    ("language=fr&topic=roman",         "Roman",        "classique"),
    ("language=fr&topic=poésie",        "Poésie",       "poesie"),
    ("language=fr&topic=philosophie",   "Philosophie",  "philosophie"),
    ("language=fr&topic=theatre",       "Drame",        "theatre"),
    ("language=fr&topic=histoire",      "Histoire",     "histoire"),
    ("language=fr&topic=conte",         "Jeunesse",     "conte"),
    ("language=fr&topic=science",       "Sciences",     "sciences"),
    ("language=fr&topic=aventure",      "Aventure",     "aventure"),
]


async def fetch_gutenberg_page(session, query_params: str, genre: str, sous_genre: str,
                                page: int = 1) -> list[Livre]:
    livres: list[Livre] = []
    status, data = await fetch_with_retry(
        session,
        f"https://gutendex.com/books/?{query_params}&page={page}",
        "gutenberg",   # réutilise le domaine OL (même profil de rate-limit)
        response_type="json",
    )
    if not data:
        return livres

    try:
        for book in data.get("results", []):
            # Vérifier que le livre est en français
            langs = book.get("languages", [])
            if "fr" not in langs:
                continue

            authors_raw = book.get("authors", [])
            auteur = authors_raw[0].get("name", "Inconnu") if authors_raw else "Inconnu"
            # Gutenberg stocke "Nom, Prénom" — inverser
            if "," in auteur:
                parts = auteur.split(",", 1)
                auteur = f"{parts[1].strip()} {parts[0].strip()}"

            titre   = truncate(book.get("title", ""), 300) or "Sans titre"
            subjects_raw = [s for s in book.get("subjects", []) if isinstance(s, str)]
            mots_cles = extract_mots_cles(subjects_raw[:8], genre, None)
            vecteur   = build_vecteur_livre(genre, sous_genre, mots_cles)
            cat_age   = infer_categorie_age(genre, sous_genre, subjects_raw)

            # Couverture : Gutenberg fournit parfois un lien image
            formats    = book.get("formats", {})
            cover      = formats.get("image/jpeg") or None

            livres.append(Livre(
                ol_id         = f"gutenberg_{book.get('id','')}",
                titre         = titre,
                auteur        = truncate(auteur, 200),
                genre         = genre,
                sous_genre    = sous_genre,
                langue        = "fr",
                categorie_age = cat_age,
                mots_cles     = mots_cles,
                nb_emprunts   = 0,
                vecteur_livre = vecteur,
                disponible    = 1,
                couverture_url= cover,
                source        = "gutenberg",
            ))
    except Exception as e:
        log.debug(f"Gutenberg parse error ({query_params} p{page}): {e}")

    return livres


async def scrape_gutenberg(session) -> list[Livre]:
    """Scrape l'API Gutendex (Gutenberg) — livres français du domaine public."""
    tasks = [(qp, g, sg, p)
             for qp, g, sg in GUTENBERG_SEARCH_QUERIES
             for p in range(1, 6)]   # ~32 livres/page × 5 pages = ~160 par requête
    log.info(f"[Gutenberg] {len(tasks)} requêtes planifiées")

    results = await asyncio.gather(
        *[fetch_gutenberg_page(session, qp, g, sg, p) for qp, g, sg, p in tasks],
        return_exceptions=True,
    )
    livres = [l for r in results if isinstance(r, list) for l in r]
    livres = dedup_within_source(livres)
    log.info(f"[Gutenberg] {len(livres)} classiques collectés (avant dédup global)")
    return livres




def dedup_within_source(livres: list[Livre]) -> list[Livre]:
    """Déduplication légère à l'intérieur d'une même source (évite doublons avant fusion)."""
    seen: dict[str, Livre] = {}
    for l in livres:
        if not (l.titre and l.titre.strip() and l.titre != "Sans titre"):
            continue
        key = normalize_key(l.titre, l.auteur, l.annee)
        if key not in seen:
            seen[key] = l
        elif l.isbn and not seen[key].isbn:
            seen[key] = l
        elif l.couverture_url and not seen[key].couverture_url:
            seen[key] = l
    return list(seen.values())


def deduplicate(livres: list[Livre]) -> list[Livre]:
    SOURCE_PRIO = {"google": 4, "bnf": 3, "annas": 2, "openlibrary": 1}

    def score(l: Livre) -> int:
        return (
            SOURCE_PRIO.get(l.source, 0) * 10
            + (5 if l.resume else 0)
            + (3 if l.couverture_url else 0)
            + (2 if l.nb_pages else 0)
            + (2 if l.mots_cles else 0)
            + (1 if l.annee else 0)
            + (1 if l.nb_notes > 0 else 0)
        )

    def best(a: Livre, b: Livre) -> Livre:
        return a if score(a) >= score(b) else b

    by_isbn: dict[str, Livre] = {}
    for l in livres:
        if l.isbn:
            by_isbn[l.isbn] = best(l, by_isbn[l.isbn]) if l.isbn in by_isbn else l

    by_key: dict[str, Livre] = {}
    for l in list(by_isbn.values()) + [x for x in livres if not x.isbn]:
        key = normalize_key(l.titre, l.auteur, l.annee)
        by_key[key] = best(l, by_key[key]) if key in by_key else l

    result = list(by_key.values())
    log.info(f"Déduplication : {len(livres):,} → {len(result):,} livres uniques")
    return result


def compute_popularite(livres: list[Livre]) -> list[Livre]:
    """
    Popularité normalisée log(1 + nb_notes) / log(1 + max_notes).
    On calcule max_notes uniquement sur les livres qui ont des notes réelles
    (BNF et OL n'ont souvent aucune note — les inclure dans le max forcerait
    tous les livres bien notés vers popularite=1 artificiellement).
    """
    notes_reelles = [l.nb_notes for l in livres if l.nb_notes > 0]
    max_notes = max(notes_reelles, default=1) or 1
    for l in livres:
        l.popularite = round(math.log1p(l.nb_notes) / math.log1p(max_notes), 4)
    return livres


def assign_ids(livres: list[Livre], quota_par_genre: int = 5000) -> list[dict]:
    """
    Attribue les IDs finaux avec :
    - Quota par genre (évite la sur-représentation des romans classiques)
    - Champ 'epoch' normalisé [0,1] pour les modèles ML
    - Sérialisation JSON des champs mots_cles et vecteur_livre
    """
    # ── Quota par genre : équilibrer le dataset pour le modèle de reco ──────────
    from collections import defaultdict
    par_genre: dict[str, list] = defaultdict(list)
    for l in livres:
        par_genre[l.genre].append(l)

    equilibres: list[Livre] = []
    for genre, groupe in par_genre.items():
        equilibres.extend(groupe[:quota_par_genre])

    # Trier de façon déterministe pour reproductibilité
    equilibres.sort(key=lambda l: (l.genre, l.titre or ""))

    log.info(f"Quota genre : {len(livres):,} → {len(equilibres):,} livres après équilibrage")
    for g, gr in sorted(par_genre.items(), key=lambda x: -len(x[1]))[:10]:
        pris = min(len(gr), quota_par_genre)
        log.info(f"  {g:<35} {len(gr):>5} brut → {pris:>5} retenus")

    result = []
    for i, l in enumerate(equilibres, 1):
        d = asdict(l)
        d["id"] = f"l-{i:04d}"
        d.pop("source", None)
        d.pop("isbn",   None)
        # Champ epoch normalisé [0,1] pour les features ML (1500→0.0, 2024→1.0)
        if d.get("annee"):
            d["epoch"] = round((d["annee"] - 1500) / (2024 - 1500), 4)
        else:
            d["epoch"] = None
        # mots_cles et vecteur_livre restent des objets Python (list/dict) —
        # json.dump() les sérialisera correctement dans le fichier final.
        # Ne PAS faire json.dumps() ici : cela créerait des strings dans du JSON
        # et forcerait un json.loads() supplémentaire à chaque lecture.
        result.append(d)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
#  POINT D'ENTRÉE
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════════
#  SOURCE 4 — ANNA'S ARCHIVE  (métadonnées JSON, pas de contenu protégé)
# ═══════════════════════════════════════════════════════════════════════════════
# Anna's Archive expose une API de recherche de métadonnées (titre, auteur,
# ISBN, résumé, nb_pages, genre) — aucun fichier protégé n'est téléchargé.

ANNAS_QUERIES = [
    # Littérature africaine francophone (souvent absente de Google Books / OL)
    ("littérature africaine", "Roman"),
    ("roman africain francophone", "Roman"),
    ("roman sénégalais", "Roman"),
    ("roman ivoirien", "Roman"),
    ("roman congolais", "Roman"),
    ("roman camerounais", "Roman"),
    ("roman malgache", "Roman"),
    ("roman maghrébin", "Roman"),
    ("roman antillais", "Roman"),
    ("roman québécois", "Roman"),
    ("roman belge francophone", "Roman"),
    ("roman suisse romand", "Roman"),
    # Francophones primés moins référencés
    ("prix renaudot francophone", "Roman"),
    ("prix goncourt du premier roman", "Roman"),
    ("prix orange du livre", "Roman"),
]


async def fetch_annas_page(session, query: str, genre: str, page: int = 1) -> list[Livre]:
    """
    Interroge Anna's Archive via scraping HTML (pas d'API officielle).
    Utilise des headers navigateur complets + délai important entre requêtes.
    Ne télécharge aucun fichier — métadonnées uniquement.
    """
    livres: list[Livre] = []
    if not BS4_AVAILABLE:
        return livres

    status, html = await fetch_with_retry(
        session, "https://annas-archive.org/search",
        "annas",
        params={"q": query, "lang": "fr", "ext": "epub,pdf", "page": page},
        use_browser_headers=True,
        response_type="text",
    )
    if not html:
        return livres

    try:
        soup  = BeautifulSoup(html, "lxml")
        cards = soup.select("div.js-vim-focus")

        for card in cards:
            title_el = card.select_one("h3") or card.select_one(".italic")
            if not title_el:
                continue
            titre = title_el.get_text(strip=True)[:300]
            if not titre:
                continue

            author_el = card.select_one(".text-sm.italic") or card.select_one("div.italic")
            auteur = author_el.get_text(strip=True)[:200] if author_el else "Inconnu"

            annee, nb_pages = None, None
            meta_text = card.get_text(" ", strip=True)
            year_m = re.search(r"\b(19[0-9]{2}|20[0-2][0-9])\b", meta_text)
            if year_m:
                annee = int(year_m.group(1))
            pages_m = re.search(r"(\d{2,4})\s*p(?:ages?)?", meta_text, re.I)
            if pages_m:
                nb_pages = int(pages_m.group(1))

            desc_el = card.select_one("div.line-clamp-\\[4\\]") or card.select_one(".text-xs")
            resume = desc_el.get_text(strip=True)[:1000] if desc_el else None

            mots_cles = extract_mots_cles([], genre, resume)
            vecteur   = build_vecteur_livre(genre, query, mots_cles)
            cat_age   = infer_categorie_age(genre, query, [])

            livres.append(Livre(
                ol_id          = f"annas_{normalize_key(titre, auteur)[:30]}",
                titre          = titre,
                auteur         = auteur,
                genre          = genre,
                sous_genre     = query,
                annee          = annee,
                nb_pages       = nb_pages,
                langue         = "fr",
                categorie_age  = cat_age,
                mots_cles      = mots_cles,
                vecteur_livre  = vecteur,
                resume         = resume,
                disponible     = 1,
                source         = "annas",
            ))
    except Exception as e:
        log.debug(f"Anna's Archive parse error ({query} p{page}): {e}")

    return livres


async def scrape_annas(session) -> list[Livre]:
    if not BS4_AVAILABLE:
        log.warning("[Anna's Archive] beautifulsoup4 non disponible — source ignorée")
        return []

    tasks = [(q, g, p) for q, g in ANNAS_QUERIES for p in range(1, 4)]
    log.info(f"[Anna's Archive] {len(tasks)} requêtes planifiées ({DOMAIN_CFG['annas']['workers']} workers, "
             f"délai {DOMAIN_CFG['annas']['delay']}s + jitter {DOMAIN_CFG['annas']['jitter']})")

    results    = await asyncio.gather(
        *[fetch_annas_page(session, q, g, p) for q, g, p in tasks],
        return_exceptions=True,
    )
    all_livres = [l for r in results if isinstance(r, list) for l in r]
    all_livres = dedup_within_source(all_livres)
    log.info(f"[Anna's Archive] {len(all_livres)} livres collectés (avant dédup)")
    return all_livres


# ═══════════════════════════════════════════════════════════════════════════════
#  SOURCE 5 — BABELIO  (avis réels en français)
# ═══════════════════════════════════════════════════════════════════════════════

# Titres populaires sur Babelio dont on extrait les avis (IDs Babelio stables)
BABELIO_BOOKS = [
    # (slug-url, titre approximatif pour log)
    ("le-comte-de-monte-cristo", "Le Comte de Monte-Cristo"),
    ("les-miserables", "Les Misérables"),
    ("le-petit-prince", "Le Petit Prince"),
    ("harry-potter-lecole-des-sorciers", "Harry Potter T1"),
    ("da-vinci-code", "Da Vinci Code"),
    ("millenium-les-hommes-qui-naimaient-pas-les-femmes", "Millénium T1"),
    ("le-nom-de-la-rose", "Le Nom de la Rose"),
    ("lelegance-du-herisson", "L'Élégance du hérisson"),
    ("americanah", "Americanah"),
    ("la-liste-de-mes-envies", "La Liste de mes envies"),
    ("au-revoir-la-haut", "Au revoir là-haut"),
    ("les-fleurs-du-mal", "Les Fleurs du Mal"),
    ("madame-bovary", "Madame Bovary"),
    ("germinal", "Germinal"),
    ("lassommoir", "L'Assommoir"),
    ("le-rouge-et-le-noir", "Le Rouge et le Noir"),
    ("candide", "Candide"),
    ("bel-ami", "Bel-Ami"),
    ("voyage-au-bout-de-la-nuit", "Voyage au bout de la nuit"),
    ("la-nausee", "La Nausée"),
]


@dataclass
class RawAvis:
    """Avis brut scrapé — sera converti en interaction dans generate_synthetic_data.py."""
    source:      str   = ""   # "babelio" | "fnac"
    livre_titre: str   = ""   # titre du livre pour le matching avec la table livres
    auteur:      str   = ""
    note:        Optional[int]  = None    # 1-5
    commentaire: Optional[str] = None
    date:        Optional[str] = None    # YYYY-MM-DD si disponible


async def fetch_babelio_reviews(session, slug: str, titre: str, page: int = 1) -> list[RawAvis]:
    """
    Scrape les avis d'une fiche Babelio.
    - Referer = page livre (simule navigation interne)
    - Headers navigateur complets — Babelio détecte les bots aggressivement
    """
    avis: list[RawAvis] = []
    if not BS4_AVAILABLE:
        return avis

    base_url = f"https://www.babelio.com/livres/{slug}"
    referer  = base_url if page > 1 else None

    status, html = await fetch_with_retry(
        session,
        f"{base_url}/critiques",
        "babelio",
        params={"pageN": page},
        use_browser_headers=True,
        response_type="text",
        referer=referer,
    )
    if not html:
        return avis

    try:
        soup = BeautifulSoup(html, "lxml")

        for critique in soup.select("div.post_con"):
            note = None
            note_el = critique.select_one("span[data-note]")
            if note_el:
                try:
                    raw_note = float(note_el["data-note"])
                    note = max(1, min(5, round(raw_note)))
                except (ValueError, KeyError):
                    pass

            text_el = critique.select_one("div.text_com")
            commentaire = None
            if text_el:
                commentaire = text_el.get_text(" ", strip=True)[:2000]
                if len(commentaire) < 10:
                    commentaire = None

            date_el  = critique.select_one("span.date")
            date_str = None
            if date_el:
                raw_date = date_el.get_text(strip=True)
                m = re.search(r"(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})", raw_date)
                if m:
                    date_str = f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"

            if note or commentaire:
                avis.append(RawAvis(
                    source      = "babelio",
                    livre_titre = titre,
                    note        = note,
                    commentaire = commentaire,
                    date        = date_str,
                ))
    except Exception as e:
        log.debug(f"Babelio parse error ({slug} p{page}): {e}")

    return avis


async def scrape_babelio(session) -> list[RawAvis]:
    if not BS4_AVAILABLE:
        log.warning("[Babelio] beautifulsoup4 non disponible — source ignorée")
        return []

    log.info(f"[Babelio] {len(BABELIO_BOOKS)} livres × {MAX_BABELIO_PAGES} pages "
             f"({DOMAIN_CFG['babelio']['workers']} workers, "
             f"délai {DOMAIN_CFG['babelio']['delay']}s + jitter {DOMAIN_CFG['babelio']['jitter']})")

    all_avis: list[RawAvis] = []
    # ── Séquentiel livre par livre — évite la rafale qui déclenche le blocage ───
    for slug, titre in BABELIO_BOOKS:
        await asyncio.sleep(random.uniform(2.0, 5.0))
        for page in range(1, MAX_BABELIO_PAGES + 1):
            page_avis = await fetch_babelio_reviews(session, slug, titre, page)
            all_avis.extend(page_avis)
            if not page_avis:   # page vide = inutile de continuer
                break

    seen: set[tuple] = set()
    unique: list[RawAvis] = []
    for a in all_avis:
        key = (a.livre_titre, (a.commentaire or "")[:100])
        if key not in seen:
            seen.add(key)
            unique.append(a)
    log.info(f"[Babelio] {len(unique)} avis uniques collectés")
    return unique



# ═══════════════════════════════════════════════════════════════════════════════
#  SOURCE 6 — FNAC.COM  (avis réels en français)
# ═══════════════════════════════════════════════════════════════════════════════

FNAC_BOOKS = [
    # (isbn ou ean, titre pour log) — les ISBNs permettent un URL stable
    ("9782253004226", "Les Misérables"),
    ("9782070360024", "L'Étranger"),
    ("9782070411351", "Le Petit Prince"),
    ("9782253151098", "Germinal"),
    ("9782072843778", "Au revoir là-haut"),
    ("9782021066487", "Americanah"),
    ("9782070369218", "Madame Bovary"),
    ("9782253005841", "Bel-Ami"),
    ("9782072458637", "La Liste de mes envies"),
    ("9782707156501", "Voyage au bout de la nuit"),
    ("9782072986055", "Le comte de Monte-Cristo"),
    ("9782818702673", "Millénium T1"),
    ("9782290349229", "Da Vinci Code"),
    ("9782226052957", "L'Élégance du hérisson"),
    ("9782742720460", "Bonjour tristesse"),
]


async def fetch_fnac_reviews(session, isbn: str, titre: str, page: int = 1) -> list[RawAvis]:
    """
    Scrape les avis d'une fiche Fnac.
    - Referer = page produit (simule navigation interne, contourne Cloudflare)
    - Headers navigateur complets avec Sec-CH-UA cohérent
    """
    avis: list[RawAvis] = []
    if not BS4_AVAILABLE:
        return avis

    base_url = f"https://www.fnac.com/livre/a{isbn}"
    referer  = base_url if page > 1 else "https://www.fnac.com/"

    status, html = await fetch_with_retry(
        session,
        f"{base_url}/avis",
        "fnac",
        params={"page": page},
        use_browser_headers=True,
        response_type="text",
        referer=referer,
    )
    if not html:
        return avis

    try:
        soup = BeautifulSoup(html, "lxml")

        for review in soup.select("article.Review"):
            note = None
            rating_el = review.select_one("[class*='star'][aria-label]") or \
                        review.select_one("[class*='Rating']")
            if rating_el:
                aria = rating_el.get("aria-label", "")
                m = re.search(r"(\d)[,.]?\d*\s*(?:sur|/|étoile)", aria, re.I)
                if m:
                    note = max(1, min(5, int(m.group(1))))
                else:
                    filled = len(review.select("[class*='star--filled'], [class*='star--full']"))
                    if filled:
                        note = max(1, min(5, filled))

            text_el = review.select_one("[class*='ReviewBody'], [class*='review-body'], p.Review-body")
            commentaire = None
            if text_el:
                commentaire = text_el.get_text(" ", strip=True)[:2000]
                if len(commentaire) < 10:
                    commentaire = None

            date_el  = review.select_one("time[datetime]")
            date_str = None
            if date_el:
                raw = date_el.get("datetime", "")
                m2  = re.match(r"(\d{4}-\d{2}-\d{2})", raw)
                if m2:
                    date_str = m2.group(1)

            if note or commentaire:
                avis.append(RawAvis(
                    source      = "fnac",
                    livre_titre = titre,
                    note        = note,
                    commentaire = commentaire,
                    date        = date_str,
                ))
    except Exception as e:
        log.debug(f"Fnac parse error ({isbn} p{page}): {e}")

    return avis


async def scrape_fnac(session) -> list[RawAvis]:
    if not BS4_AVAILABLE:
        log.warning("[Fnac] beautifulsoup4 non disponible — source ignorée")
        return []

    log.info(f"[Fnac] {len(FNAC_BOOKS)} livres × {MAX_FNAC_PAGES} pages "
             f"({DOMAIN_CFG['fnac']['workers']} workers, "
             f"délai {DOMAIN_CFG['fnac']['delay']}s + jitter {DOMAIN_CFG['fnac']['jitter']})")

    all_avis: list[RawAvis] = []
    # ── Séquentiel livre par livre — Cloudflare détecte les rafales parallèles ──
    for isbn, titre in FNAC_BOOKS:
        await asyncio.sleep(random.uniform(3.0, 7.0))
        for page in range(1, MAX_FNAC_PAGES + 1):
            page_avis = await fetch_fnac_reviews(session, isbn, titre, page)
            all_avis.extend(page_avis)
            if not page_avis:   # page vide = plus d'avis
                break

    seen: set[tuple] = set()
    unique: list[RawAvis] = []
    for a in all_avis:
        key = (a.livre_titre, (a.commentaire or "")[:100])
        if key not in seen:
            seen.add(key)
            unique.append(a)
    log.info(f"[Fnac] {len(unique)} avis uniques collectés")
    return unique


def merge_avis(babelio: list[RawAvis], fnac: list[RawAvis]) -> list[dict]:
    """
    Fusionne les avis des deux sources en dédupliquant sur (livre_titre, commentaire[:80]).
    Produit des dicts prêts pour data/raw_interactions.json.
    """
    all_avis = babelio + fnac
    seen: set[tuple] = set()
    result: list[dict] = []
    for a in all_avis:
        key = (a.livre_titre.lower().strip(), (a.commentaire or "")[:80].lower())
        if key in seen:
            continue
        seen.add(key)
        result.append({
            "source":      a.source,
            "livre_titre": a.livre_titre,
            "note":        a.note,
            "commentaire": a.commentaire,
            "date":        a.date,
        })
    log.info(f"Avis fusionnés : {len(result)} uniques ({len(babelio)} Babelio + {len(fnac)} Fnac)")
    return result


async def _test_reseau(session: aiohttp.ClientSession) -> bool:
    """
    Teste la connectivite en essayant 3 URLs en parallele.
    Retourne True des qu une seule repond — evite les faux-negatifs
    si Google est bloque depuis ce reseau.
    """
    urls = [
        ("https://openlibrary.org/",                   None),
        ("https://catalogue.bnf.fr/",                  None),
        ("https://www.googleapis.com/books/v1/volumes", {"q": "test", "maxResults": 1}),
    ]
    timeout = aiohttp.ClientTimeout(total=10)

    async def _try(url, params):
        try:
            async with session.get(url, params=params,
                                   timeout=timeout, allow_redirects=True) as r:
                return r.status < 600
        except Exception:
            return False

    results = await asyncio.gather(*[_try(u, p) for u, p in urls])
    return any(results)


async def _test_annas(session: aiohttp.ClientSession) -> bool:
    """Vérifie si Anna's Archive est accessible (souvent bloqué selon le FAI/pays)."""
    try:
        async with session.get(
            "https://annas-archive.org/",
            headers={"User-Agent": USER_AGENTS[0]},
            timeout=aiohttp.ClientTimeout(total=8),
            allow_redirects=True,
        ) as resp:
            return resp.status in (200, 301, 302, 403)
    except Exception:
        return False


def _load_checkpoint(path: str) -> list[Livre] | None:
    """Charge un checkpoint JSON si disponible (reprise après interruption)."""
    p = Path(path)
    if p.exists():
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
            log.info(f"  ♻️  Checkpoint trouvé : {path} ({len(data)} entrées) — source ignorée")
            return data   # liste de dicts, pas de Livre
        except Exception:
            pass
    return None


def _save_checkpoint(livres: list[Livre], path: str):
    """Sauvegarde un checkpoint brut après chaque source."""
    try:
        Path(path).write_text(
            json.dumps([asdict(l) for l in livres], ensure_ascii=False, indent=1),
            encoding="utf-8"
        )
        log.info(f"  💾 Checkpoint sauvegardé : {path} ({len(livres)} livres)")
    except Exception as e:
        log.warning(f"  ⚠️  Impossible de sauvegarder le checkpoint {path} : {e}")


async def main_async(target: int = TARGET_BOOKS, workers: int = MAX_WORKERS,
                     skip_reviews: bool = False, seed: int = 42,
                     skip_bnf: bool = False, skip_annas: bool = False):
    Path("data").mkdir(exist_ok=True)

    # ── Reproductibilité : seed fixe ─────────────────────────────────────────
    random.seed(seed)
    log.info(f"  Seed aléatoire : {seed} (reproductibilité garantie)")

    # Initialiser les semaphores par domaine
    for domain, cfg in DOMAIN_CFG.items():
        _semaphores[domain] = asyncio.Semaphore(cfg["workers"])

    t0 = time.time()
    connector = aiohttp.TCPConnector(
        limit=sum(c["workers"] for c in DOMAIN_CFG.values()),
        ssl=False,
        ttl_dns_cache=300,
        enable_cleanup_closed=True,
    )
    cookie_jar = aiohttp.CookieJar(unsafe=True)

    async with aiohttp.ClientSession(connector=connector, cookie_jar=cookie_jar) as session:
        # ── Test réseau préliminaire ──────────────────────────────────────────
        log.info("🔌 Test de connexion réseau...")
        reseau_ok = await _test_reseau(session)
        if not reseau_ok:
            log.error("═" * 54)
            log.error("  ❌ RÉSEAU INDISPONIBLE")
            log.error("  Le scraper ne peut pas accéder à Internet.")
            log.error("")
            log.error("  Causes possibles :")
            log.error("    • Proxy d'entreprise ou scolaire bloquant HTTPS")
            log.error("    • VPN actif avec filtrage DNS")
            log.error("    • Pare-feu Windows bloquant Python")
            log.error("    • Pas de connexion Internet")
            log.error("")
            log.error("  Solutions :")
            log.error("    1. Désactiver temporairement le VPN/proxy")
            log.error("    2. Autoriser python.exe dans le pare-feu Windows")
            log.error("    3. Utiliser : python generate_synthetic_data.py")
            log.error("       (génère des données sans Internet)")
            log.error("═" * 54)
            await connector.close()
            return []

        # ── Test Anna's Archive (souvent bloqué par FAI/géolocalisation) ─────
        annas_ok = False
        if not skip_annas:
            log.info("🔌 Test Anna's Archive...")
            annas_ok = await _test_annas(session)
            if not annas_ok:
                log.warning("⚠️  Anna's Archive inaccessible depuis ce réseau — source désactivée.")
                log.warning("    (Normal si votre FAI ou pays bloque ce domaine)")

        log.info("✅ Réseau OK — démarrage du scraping")
        log.info("══════════════════════════════════════════════════════")
        log.info("  SCRAPING MULTI-SOURCES — démarrage")
        log.info(f"  Cible : {target:,} livres  |  Seed : {seed}")
        log.info(f"  Rate limiting par domaine :")
        for dom, cfg in DOMAIN_CFG.items():
            log.info(f"    {dom:<14} {cfg['workers']} workers | "
                     f"délai {cfg['delay']}s | jitter {cfg['jitter']}")
        sources_actives = "Google + OpenLibrary + OpenLibrary Search + Gutenberg"
        if not skip_bnf:
            sources_actives += " + BNF"
        if annas_ok:
            sources_actives += " + Anna's Archive"
        log.info(f"  Sources actives : {sources_actives}")
        log.info(f"  Avis réels : {'désactivés (--skip-reviews)' if skip_reviews else 'activés (Babelio + Fnac)'}")
        log.info(f"  Checkpoints : data/ckpt_*.json (reprise automatique si présents)")
        log.info("══════════════════════════════════════════════════════")

        # ── Livres : sources en parallèle avec checkpoints ────────────────────
        ckpt_google    = "data/ckpt_google.json"
        ckpt_ol        = "data/ckpt_openlibrary.json"
        ckpt_bnf       = "data/ckpt_bnf.json"
        ckpt_annas     = "data/ckpt_annas.json"
        ckpt_gutenberg = "data/ckpt_gutenberg.json"

        tasks_livres = {}

        if not Path(ckpt_google).exists():
            tasks_livres["google"] = asyncio.create_task(scrape_google(session))
        if not Path(ckpt_ol).exists():
            tasks_livres["openlibrary"] = asyncio.create_task(scrape_openlibrary(session))
        if not skip_bnf and not Path(ckpt_bnf).exists():
            tasks_livres["bnf"] = asyncio.create_task(scrape_bnf(session))
        if annas_ok and not Path(ckpt_annas).exists():
            tasks_livres["annas"] = asyncio.create_task(scrape_annas(session))
        if not Path(ckpt_gutenberg).exists():
            tasks_livres["gutenberg"] = asyncio.create_task(scrape_gutenberg(session))

        resultats = {}
        if tasks_livres:
            done = await asyncio.gather(*tasks_livres.values(), return_exceptions=True)
            for key, res in zip(tasks_livres.keys(), done):
                if isinstance(res, list):
                    resultats[key] = res
                    _save_checkpoint(res, f"data/ckpt_{key}.json")
                else:
                    log.warning(f"[{key}] Erreur lors du scraping : {res}")
                    resultats[key] = []

        # Charger depuis les checkpoints si déjà scrapés
        def load_ckpt_dicts(path: str) -> list:
            p = Path(path)
            if p.exists():
                try:
                    return json.loads(p.read_text(encoding="utf-8"))
                except Exception:
                    return []
            return []

        def dicts_to_livres(dicts: list) -> list[Livre]:
            livres = []
            for d in dicts:
                try:
                    if isinstance(d.get("vecteur_livre"), str):
                        d["vecteur_livre"] = json.loads(d["vecteur_livre"])
                    if isinstance(d.get("mots_cles"), str):
                        d["mots_cles"] = json.loads(d["mots_cles"])
                    livres.append(Livre(**{k: v for k, v in d.items() if k in Livre.__dataclass_fields__}))
                except Exception:
                    pass
            return livres

        google_livres    = resultats.get("google")    or dicts_to_livres(load_ckpt_dicts(ckpt_google))
        ol_livres        = resultats.get("openlibrary") or dicts_to_livres(load_ckpt_dicts(ckpt_ol))
        bnf_livres       = resultats.get("bnf")       or (dicts_to_livres(load_ckpt_dicts(ckpt_bnf)) if not skip_bnf else [])
        annas_livres     = resultats.get("annas")     or (dicts_to_livres(load_ckpt_dicts(ckpt_annas)) if annas_ok else [])
        gutenberg_livres = resultats.get("gutenberg") or dicts_to_livres(load_ckpt_dicts(ckpt_gutenberg))

        # ── Avis réels : Babelio + Fnac (optionnel) ───────────────────────────
        if skip_reviews:
            babelio_avis, fnac_avis = [], []
        else:
            babelio_avis, fnac_avis = await asyncio.gather(
                asyncio.create_task(scrape_babelio(session)),
                asyncio.create_task(scrape_fnac(session)),
            )

    # ── Post-traitement livres ────────────────────────────────────────────────
    all_livres = google_livres + bnf_livres + annas_livres + gutenberg_livres + ol_livres

    # Tri déterministe avant déduplication pour reproductibilité
    all_livres.sort(key=lambda l: (l.source or "", l.titre or "", l.auteur or ""))

    uniq   = deduplicate(all_livres)
    uniq   = [l for l in uniq if (l.titre or "").strip() and (l.auteur or "").strip()]
    uniq   = compute_popularite(uniq)
    final  = assign_ids(uniq, quota_par_genre=max(200, target // len(GENRE_KEYWORDS)))

    # Limiter au target demandé après équilibrage
    final  = final[:target]

    elapsed = time.time() - t0
    sources: dict[str, int] = {}
    genres:  dict[str, int] = {}
    ages:    dict[str, int] = {}
    for l in all_livres:
        sources[l.source] = sources.get(l.source, 0) + 1
        genres[l.genre]   = genres.get(l.genre, 0) + 1
        ages[l.categorie_age] = ages.get(l.categorie_age, 0) + 1

    log.info(f"\n  ✅ {len(final):,} livres dans le dataset final  ({elapsed:.1f}s)")
    log.info(f"\n  Sources brutes : {sources}")
    log.info(f"\n  Catégories d'âge : {ages}")
    log.info(f"\n  Top genres :")
    for g, c in sorted(genres.items(), key=lambda x: -x[1])[:12]:
        log.info(f"    {g:<35} {c:>5}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)
    log.info(f"\n💾 Livres sauvegardés → {OUTPUT_FILE}")

    # ── Post-traitement avis ──────────────────────────────────────────────────
    if not skip_reviews:
        avis_final = merge_avis(babelio_avis, fnac_avis)
        with open(OUTPUT_INTERACTIONS, "w", encoding="utf-8") as f:
            json.dump(avis_final, f, ensure_ascii=False, indent=2)
        log.info(f"💾 Avis sauvegardés → {OUTPUT_INTERACTIONS}  ({len(avis_final):,} avis)")
    else:
        log.info("ℹ️  Avis ignorés (--skip-reviews)")

    return final


def main():
    parser = argparse.ArgumentParser(description="Scraper multi-sources de livres français")
    parser.add_argument("--target",       type=int,  default=TARGET_BOOKS,
                        help="Nombre de livres cibles dans le dataset final")
    parser.add_argument("--workers",      type=int,  default=MAX_WORKERS,
                        help="Nombre de workers concurrents (remplace DOMAIN_CFG si spécifié)")
    parser.add_argument("--skip-reviews", action="store_true",
                        help="Ne pas scraper les avis Babelio/Fnac")
    parser.add_argument("--skip-bnf",     action="store_true",
                        help="Ignorer la source BNF (utile si catalogue.bnf.fr est bloqué)")
    parser.add_argument("--skip-annas",   action="store_true",
                        help="Ignorer Anna's Archive sans tenter la connexion")
    parser.add_argument("--seed",         type=int,  default=42,
                        help="Seed aléatoire pour la reproductibilité (défaut: 42)")
    parser.add_argument("--reset",        action="store_true",
                        help="Ignorer les checkpoints existants et tout re-scraper")
    args = parser.parse_args()

    if args.reset:
        for ckpt in Path("data").glob("ckpt_*.json"):
            ckpt.unlink()
            log.info(f"  Checkpoint supprimé : {ckpt}")

    asyncio.run(main_async(
        args.target, args.workers,
        args.skip_reviews, args.seed,
        skip_bnf=args.skip_bnf,
        skip_annas=args.skip_annas,
    ))


if __name__ == "__main__":
    main()