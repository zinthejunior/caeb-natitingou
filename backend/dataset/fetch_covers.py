import argparse
import asyncio
import logging
import random
import re
import time
import unicodedata
from pathlib import Path

import aiohttp
import mysql.connector
from mysql.connector import Error

# ─── CONFIG MYSQL ─────────────────────────────────────────────
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "livre_recommandation",
    "charset": "utf8mb4"
}

# ─── Logging ─────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# ─── Config ──────────────────────────────────────────────────
MAX_WORKERS = 5
TIMEOUT_SEC = 10

# ─── Connexion MySQL ─────────────────────────────────────────
def get_mysql_connection():
    return mysql.connector.connect(**DB_CONFIG)

# ─── Normalisation ───────────────────────────────────────────
def normalize(s: str) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w\s]", " ", s).strip()

# ─── HTTP ────────────────────────────────────────────────────
async def fetch_json(session, url, params=None):
    try:
        async with session.get(url, params=params) as resp:
            if resp.status == 200:
                return await resp.json()
    except:
        return None

# ─── Sources ─────────────────────────────────────────────────
async def cover_from_openlibrary(session, titre, auteur):
    query = f"{normalize(titre)} {normalize(auteur)}"
    data = await fetch_json(session, "https://openlibrary.org/search.json", {"q": query})

    if not data:
        return None

    for doc in data.get("docs", []):
        if doc.get("cover_i"):
            return f"https://covers.openlibrary.org/b/id/{doc['cover_i']}-L.jpg"
    return None


async def cover_from_google(session, titre, auteur):
    query = f'intitle:"{titre}" inauthor:"{auteur}"'
    data = await fetch_json(session, "https://www.googleapis.com/books/v1/volumes", {"q": query})

    if not data:
        return None

    for item in data.get("items", []):
        links = item.get("volumeInfo", {}).get("imageLinks", {})
        if "thumbnail" in links:
            return links["thumbnail"].replace("http://", "https://")
    return None

# ─── DB: lire livres ─────────────────────────────────────────
def get_books_without_cover(limit=0, force=False):
    conn = get_mysql_connection()
    cursor = conn.cursor(dictionary=True)

    if force:
        where = "WHERE titre IS NOT NULL AND auteur IS NOT NULL"
    else:
        where = """
        WHERE (couverture_url IS NULL OR couverture_url = '')
        AND titre IS NOT NULL
        AND auteur IS NOT NULL
        """

    limit_clause = f"LIMIT {limit}" if limit else ""

    cursor.execute(f"""
        SELECT id, titre, auteur
        FROM livres
        {where}
        {limit_clause}
    """)

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return rows

# ─── DB: update ──────────────────────────────────────────────
def update_covers_batch(updates):
    if not updates:
        return

    conn = get_mysql_connection()
    cursor = conn.cursor()

    cursor.executemany(
        "UPDATE livres SET couverture_url = %s WHERE id = %s",
        updates
    )

    conn.commit()
    cursor.close()
    conn.close()

# ─── Traitement ──────────────────────────────────────────────
async def find_cover(session, livre):
    titre = livre["titre"]
    auteur = livre["auteur"]

    url = await cover_from_openlibrary(session, titre, auteur)
    if url:
        return livre["id"], url

    url = await cover_from_google(session, titre, auteur)
    if url:
        return livre["id"], url

    return livre["id"], None

# ─── MAIN ────────────────────────────────────────────────────
async def main_async(limit, workers, dry_run, force):
    livres = get_books_without_cover(limit, force)

    if not livres:
        log.info("Aucun livre à traiter")
        return

    semaphore = asyncio.Semaphore(workers)
    updates = []

    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=TIMEOUT_SEC)) as session:

        async def task(livre):
            async with semaphore:
                return await find_cover(session, livre)

        tasks = [asyncio.create_task(task(l)) for l in livres]

        for i, coro in enumerate(asyncio.as_completed(tasks), 1):
            lid, url = await coro

            if url:
                log.info(f"✔ {lid} trouvé")
                if not dry_run:
                    updates.append((url, lid))
            else:
                log.info(f"✘ {lid} non trouvé")

            if len(updates) >= 50:
                update_covers_batch(updates)
                updates = []

        if updates:
            update_covers_batch(updates)

    log.info("Terminé")

# ─── CLI ─────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--workers", type=int, default=MAX_WORKERS)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true")

    args = parser.parse_args()

    asyncio.run(main_async(
        limit=args.limit,
        workers=args.workers,
        dry_run=args.dry_run,
        force=args.force
    ))

if __name__ == "__main__":
    main()