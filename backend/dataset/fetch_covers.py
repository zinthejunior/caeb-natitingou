"""
fetch_covers.py — Récupération automatique des couvertures manquantes
══════════════════════════════════════════════════════════════════════
Se connecte à la base SQLite, détecte les livres sans couverture,
cherche les images sur 5 sources (dans l'ordre) :

  1. Open Library Covers API  — via ISBN ou titre+auteur (gratuit, fiable)
  2. Google Books API          — via titre+auteur (optionnel, avec clé API)
  3. Anna's Archive            — scraping HTML, large catalogue francophone
                                 (nécessite beautifulsoup4 + lxml)
  4. Gutendex (Gutenberg)      — pour les classiques du domaine public

Met à jour la colonne couverture_url directement dans la base.

Prérequis :
    pip install aiohttp
    pip install beautifulsoup4 lxml   # pour Anna's Archive (optionnel)

Usage :
    python fetch_covers.py
    python fetch_covers.py --db data/livre_recommandation.db
    python fetch_covers.py --limit 500        # traiter seulement 500 livres
    python fetch_covers.py --workers 5        # nb de requêtes simultanées
    python fetch_covers.py --dry-run          # simuler sans écrire en base
    python fetch_covers.py --force            # refaire même les couvertures existantes
    python fetch_covers.py --skip-annas       # désactiver Anna's Archive
"""

import argparse
import asyncio
import json
import logging
import random
import re
import sqlite3
import time
import unicodedata
import urllib.parse
from pathlib import Path

import aiohttp

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False
    logging.getLogger(__name__).warning(
        "beautifulsoup4 non installé — Anna's Archive désactivé. "
        "Installez avec : pip install beautifulsoup4 lxml"
    )

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    handlers=[
        logging.FileHandler("fetch_covers.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────
DEFAULT_DB      = "livre_recommandation.db"
GOOGLE_API_KEY  = ""        # optionnel — augmente le quota Google Books
MAX_WORKERS     = 8         # requêtes simultanées (ne pas dépasser 10)
DELAY_SEC       = 0.3       # délai entre requêtes (secondes)
TIMEOUT_SEC     = 12        # timeout par requête
MAX_RETRIES     = 3         # tentatives en cas d'erreur réseau
BATCH_COMMIT    = 50        # commit SQLite tous les N livres traités
VERIFY_URL      = True      # vérifier que l'URL retourne bien une image

# Anna's Archive — délai plus long (site web, pas d'API officielle)
ANNAS_DELAY_MIN = 3.0       # délai minimum entre deux requêtes Anna's Archive
ANNAS_DELAY_MAX = 6.0       # délai maximum (jitter)


# ─── Normalisation ────────────────────────────────────────────────────────────

def normalize(s: str) -> str:
    """Supprime accents, ponctuation et met en minuscules."""
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w\s]", " ", s).strip()


def clean_isbn(isbn: str) -> str | None:
    """Nettoie et valide un ISBN-13 ou ISBN-10."""
    if not isbn:
        return None
    cleaned = re.sub(r"[^0-9X]", "", isbn.upper())
    if len(cleaned) in (10, 13):
        return cleaned
    return None


# ─── User-Agents navigateur (nécessaire pour Anna's Archive) ─────────────────

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

BROWSER_HEADERS = {
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control":   "max-age=0",
    "Sec-Fetch-Dest":  "document",
    "Sec-Fetch-Mode":  "navigate",
    "Sec-Fetch-Site":  "none",
    "Sec-Fetch-User":  "?1",
    "Connection":      "keep-alive",
}


def random_browser_headers(referer: str | None = None) -> dict:
    h = dict(BROWSER_HEADERS)
    h["User-Agent"] = random.choice(USER_AGENTS)
    if referer:
        h["Referer"]        = referer
        h["Sec-Fetch-Site"] = "same-origin"
    return h


# ─── Session HTTP ─────────────────────────────────────────────────────────────

def make_session(connector) -> aiohttp.ClientSession:
    return aiohttp.ClientSession(
        connector=connector,
        headers={
            "User-Agent": "BiblioRecoBot/2.0 (récupération couvertures; projet académique)",
            "Accept": "application/json, image/*, */*",
        },
        timeout=aiohttp.ClientTimeout(total=TIMEOUT_SEC),
    )


async def fetch_json(session: aiohttp.ClientSession, url: str,
                     params: dict | None = None) -> dict | None:
    """Requête GET avec retry exponentiel."""
    for attempt in range(MAX_RETRIES):
        try:
            await asyncio.sleep(DELAY_SEC + random.uniform(0, 0.2))
            async with session.get(url, params=params,
                                   allow_redirects=True) as resp:
                if resp.status == 200:
                    return await resp.json(content_type=None)
                if resp.status == 429:
                    wait = 2 ** (attempt + 1) + random.uniform(1, 3)
                    log.warning(f"Rate limit → attente {wait:.1f}s ({url[:60]})")
                    await asyncio.sleep(wait)
                    continue
                if resp.status in (404, 403):
                    return None
                log.debug(f"HTTP {resp.status} — {url[:60]}")
                return None
        except asyncio.TimeoutError:
            await asyncio.sleep(2 ** attempt)
        except aiohttp.ClientError as e:
            log.debug(f"Erreur réseau : {e}")
            await asyncio.sleep(2 ** attempt)
    return None


async def fetch_html(session: aiohttp.ClientSession, url: str,
                     params: dict | None = None,
                     referer: str | None = None) -> str | None:
    """
    Requête HTML avec headers navigateur complets.
    Utilisée pour Anna's Archive qui bloque les bots sans User-Agent réaliste.
    """
    headers = random_browser_headers(referer=referer)
    timeout = aiohttp.ClientTimeout(total=TIMEOUT_SEC + 5)

    for attempt in range(MAX_RETRIES):
        try:
            await asyncio.sleep(random.uniform(ANNAS_DELAY_MIN, ANNAS_DELAY_MAX))
            async with session.get(url, params=params, headers=headers,
                                   timeout=timeout, allow_redirects=True) as resp:
                if resp.status == 200:
                    return await resp.text()
                if resp.status == 429:
                    wait = 2 ** (attempt + 2) + random.uniform(2, 6)
                    log.warning(f"[Anna's] Rate limit → attente {wait:.1f}s")
                    await asyncio.sleep(wait)
                    headers = random_browser_headers(referer=referer)
                    continue
                if resp.status in (403, 503):
                    wait = 2 ** (attempt + 1) + random.uniform(3, 8)
                    log.warning(f"[Anna's] HTTP {resp.status} → retry #{attempt+1} dans {wait:.1f}s")
                    await asyncio.sleep(wait)
                    headers = random_browser_headers(referer=referer)
                    continue
                return None
        except asyncio.TimeoutError:
            await asyncio.sleep(2 ** attempt + 2)
        except aiohttp.ClientError as e:
            log.debug(f"[Anna's] Erreur réseau : {e}")
            await asyncio.sleep(2 ** attempt)
    return None


async def verify_image_url(session: aiohttp.ClientSession, url: str) -> bool:
    """
    Vérifie que l'URL pointe bien vers une image réelle (pas une image vide/placeholder).
    Open Library retourne parfois des GIF 1×1 pour les couvertures manquantes.
    """
    if not url:
        return False
    try:
        async with session.head(url, allow_redirects=True,
                                timeout=aiohttp.ClientTimeout(total=6)) as resp:
            if resp.status != 200:
                return False
            ct = resp.headers.get("Content-Type", "")
            size = int(resp.headers.get("Content-Length", "0") or "0")
            # Rejeter les images trop petites (placeholders < 1 Ko)
            if size > 0 and size < 1000:
                return False
            return "image" in ct
    except Exception:
        return False


# ─── Source 1 — Open Library ──────────────────────────────────────────────────

async def cover_from_openlibrary_isbn(
    session: aiohttp.ClientSession, isbn: str
) -> str | None:
    """Couverture OL via ISBN — la plus fiable si l'ISBN est correct."""
    url = f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"
    if VERIFY_URL:
        ok = await verify_image_url(session, url)
        return url if ok else None
    return url


async def cover_from_openlibrary_search(
    session: aiohttp.ClientSession, titre: str, auteur: str
) -> str | None:
    """
    Recherche OL par titre+auteur → récupère l'ID de couverture.
    Utilisé quand l'ISBN est absent ou invalide.
    """
    query = f"{normalize(titre)} {normalize(auteur)}".strip()
    if not query:
        return None

    data = await fetch_json(
        session,
        "https://openlibrary.org/search.json",
        params={
            "q": query,
            "limit": 5,
            "fields": "cover_i,title,author_name,isbn",
        },
    )
    if not data:
        return None

    for doc in data.get("docs", []):
        cover_id = doc.get("cover_i")
        if cover_id:
            url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
            if VERIFY_URL:
                ok = await verify_image_url(session, url)
                if ok:
                    return url
            else:
                return url

        # Essayer via ISBN trouvé dans les résultats OL
        for isbn_raw in (doc.get("isbn") or [])[:3]:
            isbn_c = clean_isbn(isbn_raw)
            if isbn_c:
                url = f"https://covers.openlibrary.org/b/isbn/{isbn_c}-L.jpg"
                if VERIFY_URL:
                    ok = await verify_image_url(session, url)
                    if ok:
                        return url
                else:
                    return url

    return None


# ─── Source 2 — Google Books ──────────────────────────────────────────────────

async def cover_from_google(
    session: aiohttp.ClientSession, titre: str, auteur: str,
    isbn: str | None = None
) -> str | None:
    """Couverture via Google Books API (avec ou sans clé)."""
    # Priorité : ISBN exact si disponible
    if isbn:
        query = f"isbn:{isbn}"
    else:
        t = normalize(titre)
        a = normalize(auteur)
        query = f'intitle:"{t}"'
        if a:
            query += f' inauthor:"{a}"'

    params: dict = {
        "q": query,
        "maxResults": 3,
        "printType": "books",
        "fields": "items(volumeInfo/imageLinks)",
    }
    if GOOGLE_API_KEY:
        params["key"] = GOOGLE_API_KEY

    data = await fetch_json(
        session, "https://www.googleapis.com/books/v1/volumes", params
    )
    if not data:
        return None

    for item in data.get("items", []):
        links = item.get("volumeInfo", {}).get("imageLinks", {})
        # Préférer la plus haute résolution disponible
        for size in ("extraLarge", "large", "medium", "thumbnail", "smallThumbnail"):
            url = links.get(size)
            if url:
                # Google Books renvoie parfois du HTTP — forcer HTTPS
                url = url.replace("http://", "https://")
                # Augmenter la résolution : zoom=1 → zoom=0
                url = re.sub(r"zoom=\d", "zoom=0", url)
                # Supprimer le paramètre edge=curl qui ajoute un effet de page
                url = re.sub(r"&edge=curl", "", url)
                if VERIFY_URL:
                    ok = await verify_image_url(session, url)
                    if ok:
                        return url
                else:
                    return url

    return None


# ─── Source 3 — Gutendex (classiques domaine public) ─────────────────────────

async def cover_from_gutenberg(
    session: aiohttp.ClientSession, titre: str, auteur: str
) -> str | None:
    """Couverture Gutenberg via Gutendex — utile pour les classiques."""
    query = f"{normalize(titre)} {normalize(auteur)}".strip()[:100]
    data  = await fetch_json(
        session,
        "https://gutendex.com/books/",
        params={"search": query, "languages": "fr"},
    )
    if not data:
        return None

    for book in data.get("results", [])[:3]:
        formats = book.get("formats", {})
        cover   = formats.get("image/jpeg")
        if cover:
            if VERIFY_URL:
                ok = await verify_image_url(session, cover)
                if ok:
                    return cover
            else:
                return cover

    return None


# ─── Source 4 — Anna's Archive ────────────────────────────────────────────────

# Semaphore dédié Anna's Archive — 1 seule requête à la fois pour éviter le ban
_annas_sem: asyncio.Semaphore | None = None

def get_annas_semaphore() -> asyncio.Semaphore:
    global _annas_sem
    if _annas_sem is None:
        _annas_sem = asyncio.Semaphore(1)   # strictement séquentiel
    return _annas_sem


async def cover_from_annas_archive(
    session: aiohttp.ClientSession, titre: str, auteur: str, isbn: str | None = None
) -> str | None:
    """
    Cherche une couverture sur Anna's Archive via scraping HTML.

    Stratégie :
    1. Recherche par ISBN si disponible (résultat exact)
    2. Recherche par titre+auteur sinon
    3. Extrait l'URL de la miniature depuis la fiche du premier résultat

    ⚠️  Anna's Archive n'a pas d'API officielle.
        - Délai 3-6s obligatoire entre requêtes (anti-ban)
        - Semaphore = 1 : une seule requête à la fois
        - beautifulsoup4 requis : pip install beautifulsoup4 lxml
    """
    if not BS4_AVAILABLE:
        return None

    sem = get_annas_semaphore()

    async with sem:
        # ── Étape 1 : page de résultats ───────────────────────────────────────
        if isbn:
            query = isbn
        else:
            query = f"{normalize(titre)} {normalize(auteur)}".strip()[:120]

        if not query:
            return None

        search_url = "https://annas-archive.org/search"
        html = await fetch_html(
            session, search_url,
            params={"q": query, "lang": "fr", "ext": "epub,pdf"},
        )
        if not html:
            return None

        try:
            soup    = BeautifulSoup(html, "lxml")
            # Premier résultat de la liste
            card    = soup.select_one("div.js-vim-focus")
            if not card:
                # Essai avec un sélecteur alternatif (layout peut varier)
                card = soup.select_one("div[class*='hover:bg']")
            if not card:
                return None

            # ── Étape 2 : extraire l'URL de la couverture depuis la card ──────
            # Anna's Archive affiche une miniature img dans la card
            img_el = card.select_one("img[src]")
            if img_el:
                src = img_el.get("src", "")
                # Les URLs de couvertures Anna's Archive commencent par /covers/
                if src and ("/covers/" in src or "cover" in src.lower()):
                    if src.startswith("/"):
                        src = "https://annas-archive.org" + src
                    if VERIFY_URL:
                        ok = await verify_image_url(session, src)
                        if ok:
                            return src
                    else:
                        return src

            # ── Étape 3 : suivre le lien de la fiche pour la couverture HD ────
            link_el = card.select_one("a[href]")
            if not link_el:
                return None

            fiche_path = link_el.get("href", "")
            if not fiche_path.startswith("/"):
                return None

            fiche_url = "https://annas-archive.org" + fiche_path
            fiche_html = await fetch_html(
                session, fiche_url, referer=search_url
            )
            if not fiche_html:
                return None

            fiche_soup = BeautifulSoup(fiche_html, "lxml")

            # Chercher l'image de couverture principale dans la fiche
            # (Anna's Archive met la couverture dans un <img> avec class cover)
            for selector in [
                "img.cover", "img[class*='cover']",
                "div.cover img", "div[class*='cover'] img",
                "img[alt*='cover']", "img[alt*='Cover']",
                "img[src*='/covers/']", "img[src*='cover']",
            ]:
                cover_img = fiche_soup.select_one(selector)
                if cover_img:
                    src = cover_img.get("src", "")
                    if src:
                        if src.startswith("/"):
                            src = "https://annas-archive.org" + src
                        if VERIFY_URL:
                            ok = await verify_image_url(session, src)
                            if ok:
                                return src
                        else:
                            return src

        except Exception as e:
            log.debug(f"[Anna's] Parse error ({titre[:30]}): {e}")

    return None


# ─── Orchestrateur par livre ──────────────────────────────────────────────────

async def find_cover(
    session: aiohttp.ClientSession,
    livre: dict,
    semaphore: asyncio.Semaphore,
    use_annas: bool = True,
) -> tuple[str, str | None]:
    """
    Cherche la couverture d'un livre sur 5 sources dans l'ordre.
    Retourne (livre_id, url_trouvée_ou_None).

    Ordre de priorité :
      1. Open Library ISBN  — le plus fiable, instantané
      2. Open Library Search — titre+auteur, très bonne couverture
      3. Google Books        — bon fallback, haute résolution
      4. Anna's Archive      — scraping HTML, lent mais large catalogue
      5. Gutenberg           — classiques domaine public uniquement
    """
    async with semaphore:
        lid    = livre["id"]
        titre  = livre.get("titre") or ""
        auteur = livre.get("auteur") or ""
        isbn   = clean_isbn(livre.get("ol_id") or "")

        # ── Source 1 : OL via ISBN ────────────────────────────────────────────
        if isbn:
            url = await cover_from_openlibrary_isbn(session, isbn)
            if url:
                log.debug(f"[OL-ISBN]   {titre[:40]} → trouvée")
                return lid, url

        # ── Source 2 : OL via titre+auteur ───────────────────────────────────
        url = await cover_from_openlibrary_search(session, titre, auteur)
        if url:
            log.debug(f"[OL-Search] {titre[:40]} → trouvée")
            return lid, url

        # ── Source 3 : Google Books ───────────────────────────────────────────
        url = await cover_from_google(session, titre, auteur, isbn)
        if url:
            log.debug(f"[Google]    {titre[:40]} → trouvée")
            return lid, url

        # ── Source 4 : Anna's Archive ─────────────────────────────────────────
        if use_annas:
            url = await cover_from_annas_archive(session, titre, auteur, isbn)
            if url:
                log.debug(f"[Anna's]    {titre[:40]} → trouvée")
                return lid, url

        # ── Source 5 : Gutenberg (classiques) ────────────────────────────────
        url = await cover_from_gutenberg(session, titre, auteur)
        if url:
            log.debug(f"[Gutenberg] {titre[:40]} → trouvée")
            return lid, url

        log.debug(f"[AUCUNE]    {titre[:40]} — aucune couverture trouvée")
        return lid, None


# ─── Base de données ──────────────────────────────────────────────────────────

def get_books_without_cover(db_path: str, limit: int, force: bool) -> list[dict]:
    """Retourne la liste des livres sans couverture depuis la base SQLite."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    if force:
        where = "WHERE titre IS NOT NULL AND auteur IS NOT NULL"
    else:
        where = """
            WHERE (couverture_url IS NULL OR couverture_url = '')
              AND titre IS NOT NULL
              AND auteur IS NOT NULL
        """

    limit_clause = f"LIMIT {limit}" if limit > 0 else ""
    rows = conn.execute(
        f"SELECT id, ol_id, titre, auteur, genre FROM livres {where} {limit_clause}"
    ).fetchall()
    conn.close()

    livres = [dict(r) for r in rows]
    log.info(f"📚 {len(livres):,} livres {'(tous)' if force else 'sans couverture'} trouvés en base")
    return livres


def update_covers_batch(db_path: str, updates: list[tuple[str, str]]):
    """Met à jour couverture_url pour une liste de (url, livre_id)."""
    if not updates:
        return
    conn = sqlite3.connect(db_path)
    conn.executemany(
        "UPDATE livres SET couverture_url = ? WHERE id = ?",
        updates,
    )
    conn.commit()
    conn.close()


# ─── Pipeline principal ───────────────────────────────────────────────────────

async def main_async(
    db_path: str,
    limit: int,
    workers: int,
    dry_run: bool,
    force: bool,
    skip_annas: bool = False,
):
    if not Path(db_path).exists():
        log.error(f"❌ Base de données introuvable : {db_path}")
        log.error("   Lance d'abord : python import_sqlite.py")
        return

    livres = get_books_without_cover(db_path, limit, force)
    if not livres:
        log.info("✅ Tous les livres ont déjà une couverture !")
        return

    log.info(f"🔍 Recherche des couvertures ({workers} workers simultanés)...")
    log.info(f"   Sources : Open Library → Google Books → Anna's Archive → Gutenberg")
    if not BS4_AVAILABLE:
        log.warning("   ⚠️  Anna's Archive désactivé (beautifulsoup4 non installé)")
        log.warning("       Installer avec : pip install beautifulsoup4 lxml")
    if not BS4_AVAILABLE:
        log.warning("   ⚠️  Anna's Archive désactivé (beautifulsoup4 non installé)")
        log.warning("       Installer avec : pip install beautifulsoup4 lxml")
    elif skip_annas:
        log.info("   ⚠️  Anna's Archive désactivé (--skip-annas)")

    if dry_run:
        log.info("   ⚠️  Mode --dry-run : aucune écriture en base")

    t0          = time.time()
    semaphore   = asyncio.Semaphore(workers)
    connector   = aiohttp.TCPConnector(limit=workers + 2, ssl=False)

    # Compteurs
    found       = 0
    not_found   = 0
    pending_updates: list[tuple[str, str]] = []

    # Désactiver Anna's Archive globalement si demandé
    use_annas = BS4_AVAILABLE and not skip_annas

    async with make_session(connector) as session:
        # Créer toutes les tâches
        tasks = [
            asyncio.create_task(find_cover(session, livre, semaphore, use_annas))
            for livre in livres
        ]

        total = len(tasks)
        done  = 0

        for coro in asyncio.as_completed(tasks):
            lid, url = await coro
            done += 1

            if url:
                found += 1
                if not dry_run:
                    pending_updates.append((url, lid))
                    # Commit par batch
                    if len(pending_updates) >= BATCH_COMMIT:
                        update_covers_batch(db_path, pending_updates)
                        log.info(
                            f"  💾 {done}/{total} traités — "
                            f"{found} trouvées / {not_found} non trouvées"
                        )
                        pending_updates = []
            else:
                not_found += 1

            # Log de progression tous les 100 livres
            if done % 100 == 0:
                elapsed = time.time() - t0
                rate    = done / elapsed if elapsed > 0 else 0
                eta     = (total - done) / rate if rate > 0 else 0
                log.info(
                    f"  [{done}/{total}] "
                    f"✅ {found} trouvées  ❌ {not_found} non trouvées  "
                    f"— {rate:.1f} livres/s  ETA {eta:.0f}s"
                )

        # Commit final
        if pending_updates and not dry_run:
            update_covers_batch(db_path, pending_updates)

    elapsed = time.time() - t0

    # ── Résumé final ─────────────────────────────────────────────────────────
    log.info("═" * 58)
    log.info("  📊 RÉSUMÉ FINAL")
    log.info("═" * 58)
    log.info(f"  Livres traités      : {total:,}")
    log.info(f"  Couvertures trouvées: {found:,}  ({found/total*100:.1f}%)")
    log.info(f"  Non trouvées        : {not_found:,}  ({not_found/total*100:.1f}%)")
    log.info(f"  Durée totale        : {elapsed:.1f}s")
    log.info(f"  Vitesse moyenne     : {total/elapsed:.1f} livres/s")
    if dry_run:
        log.info("  ⚠️  Mode dry-run — base non modifiée")
    else:
        log.info(f"  Base mise à jour    : {db_path}")

    # Vérification post-import dans la base
    if not dry_run:
        conn = sqlite3.connect(db_path)
        total_livres  = conn.execute("SELECT COUNT(*) FROM livres").fetchone()[0]
        avec_couv     = conn.execute(
            "SELECT COUNT(*) FROM livres WHERE couverture_url IS NOT NULL AND couverture_url != ''"
        ).fetchone()[0]
        sans_couv     = total_livres - avec_couv
        conn.close()
        log.info(f"\n  📚 État final de la base :")
        log.info(f"     Total livres        : {total_livres:,}")
        log.info(f"     Avec couverture     : {avec_couv:,}  ({avec_couv/total_livres*100:.1f}%)")
        log.info(f"     Sans couverture     : {sans_couv:,}  ({sans_couv/total_livres*100:.1f}%)")
    log.info("═" * 58)


def main():
    parser = argparse.ArgumentParser(
        description="Récupère les couvertures manquantes depuis Open Library / Google Books / Gutenberg"
    )
    parser.add_argument(
        "--db",
        default=DEFAULT_DB,
        help=f"Chemin vers la base SQLite (défaut : {DEFAULT_DB})",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Nombre max de livres à traiter (0 = tous, défaut : 0)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=MAX_WORKERS,
        help=f"Requêtes simultanées (défaut : {MAX_WORKERS})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simuler sans écrire en base (test)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Refaire la recherche même pour les livres ayant déjà une couverture",
    )
    parser.add_argument(
        "--no-verify",
        action="store_true",
        help="Ne pas vérifier que l'URL retourne bien une image (plus rapide mais moins fiable)",
    )
    parser.add_argument(
        "--skip-annas",
        action="store_true",
        help="Désactiver Anna's Archive (utile si le site est bloqué sur ton réseau)",
    )
    args = parser.parse_args()

    global VERIFY_URL
    if args.no_verify:
        VERIFY_URL = False
        log.info("⚠️  Vérification des images désactivée (--no-verify)")

    asyncio.run(main_async(
        db_path    = args.db,
        limit      = args.limit,
        workers    = args.workers,
        dry_run    = args.dry_run,
        force      = args.force,
        skip_annas = args.skip_annas,
    ))


if __name__ == "__main__":
    main()
