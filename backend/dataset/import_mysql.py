"""
import_mysql.py — version complète
══════════════════════════════════════════════════════════════════════════════
Importe toutes les données JSON dans MySQL.
Lance APRÈS : schema.sql → scrapper.py → generate_synthetic_data.py

Prérequis :
    pip install mysql-connector-python

Usage :
    python import_mysql.py
    python import_mysql.py --host 127.0.0.1 --user root --password secret
"""

import argparse
import json
import logging
from pathlib import Path

try:
    import mysql.connector
except ImportError:
    print("❌ Installe d'abord : pip install mysql-connector-python")
    exit(1)

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s")

# ─── Config par défaut ────────────────────────────────────────────────────────
DEFAULT_CONFIG = {
    "host":     "localhost",
    "port":     3306,
    "user":     "root",
    "password": " ",
    "database": "livre_recommandation",
    "charset":  "utf8mb4",
}
BATCH_SIZE = 500


def get_connection(cfg: dict):
    return mysql.connector.connect(**cfg)


def load_json(name: str) -> list[dict]:
    path = Path(f"data/{name}.json")
    if not path.exists():
        log.warning(f"  ⚠️  {path} introuvable — table ignorée")
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def batch_insert(cursor, table: str, rows: list[dict], ignore: bool = True) -> int:
    if not rows:
        return 0
    cols         = list(rows[0].keys())
    placeholders = ", ".join(["%s"] * len(cols))
    col_names    = ", ".join(f"`{c}`" for c in cols)
    verb         = "INSERT IGNORE" if ignore else "INSERT"
    sql          = f"{verb} INTO `{table}` ({col_names}) VALUES ({placeholders})"
    total        = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch  = rows[i : i + BATCH_SIZE]
        values = [tuple(row.get(c) for c in cols) for row in batch]
        try:
            cursor.executemany(sql, values)
            total += cursor.rowcount
        except mysql.connector.Error as e:
            log.error(f"  Erreur batch [{table}] offset {i} : {e}")
    return total


# ─── Colonnes attendues par chaque table ──────────────────────────────────────

LIVRES_COLS = [
    "id","ol_id","titre","auteur","genre","sous_genre","annee","nb_pages","langue",
    "categorie_age","mots_cles","note_moyenne","nb_notes","nb_emprunts","popularite",
    "vecteur_livre","disponible","resume","couverture_url",
]

USERS_COLS = [
    "id","nom","email","type_compte","date_naissance","niveau_etude","classe",
    "genre_prefere","sous_genre_prefere","score_confiance","profil_complet",
    "vecteur_profil","date_inscription",
]

LIVRES_SIM_COLS = ["livre_id","similaire_id","score","date_calcul"]

EMPRUNTS_COLS = [
    "id","user_id","livre_id","date_emprunt","date_prevue","date_retour",
    "renouvele","duree_emprunt","statut","poids",
]

INTERACTIONS_COLS = [
    "id","user_id","livre_id","type_action","notation","duree_secondes",
    "livre_lu","commentaire","position","source","created_at",
]

SESSIONS_IA_COLS = [
    "id","user_id","humeur_detectee","vecteur_intention",
    "livres_rejetes","livres_acceptes","debut","fin","active",
]

NOTIFICATIONS_COLS = [
    "id","user_id","emprunt_id","livre_id","type_notif","message","envoyee_le","lue",
]


# ─── Mappers ──────────────────────────────────────────────────────────────────

def map_livres(livres: list[dict]) -> list[dict]:
    rows = []
    for l in livres:
        row = {c: l.get(c) for c in LIVRES_COLS}
        row["langue"]        = row.get("langue") or "fr"
        row["note_moyenne"]  = round(min(float(row.get("note_moyenne") or 0), 5.0), 2)
        row["nb_notes"]      = int(row.get("nb_notes") or 0)
        row["nb_emprunts"]   = int(row.get("nb_emprunts") or 0)
        row["popularite"]    = float(row.get("popularite") or 0)
        row["disponible"]    = int(row.get("disponible") or 1)
        row["categorie_age"] = row.get("categorie_age") or "adulte"

        # mots_cles et vecteur_livre doivent être des strings JSON pour MySQL
        for json_field in ("mots_cles","vecteur_livre"):
            val = row.get(json_field)
            if val is None:
                row[json_field] = None
            elif isinstance(val, (list, dict)):
                row[json_field] = json.dumps(val, ensure_ascii=False)
            # sinon c'est déjà une string JSON — OK
        rows.append(row)
    return rows


def map_users(users: list[dict]) -> list[dict]:
    rows = []
    for u in users:
        row = {c: u.get(c) for c in USERS_COLS}
        # vecteur_profil — doit être string JSON
        val = row.get("vecteur_profil")
        if val is not None and isinstance(val, dict):
            row["vecteur_profil"] = json.dumps(val, ensure_ascii=False)
        row["profil_complet"]   = int(row.get("profil_complet") or 0)
        row["score_confiance"]  = float(row.get("score_confiance") or 0)
        rows.append(row)
    return rows


def map_similarites(sims: list[dict]) -> list[dict]:
    return [{c: s.get(c) for c in LIVRES_SIM_COLS} for s in sims]


def map_emprunts(emprunts: list[dict]) -> list[dict]:
    rows = []
    for e in emprunts:
        row           = {c: e.get(c) for c in EMPRUNTS_COLS}
        row["poids"]  = float(row.get("poids") or 1.0)
        row["statut"] = row.get("statut") or "en_cours"
        rows.append(row)
    return rows


def map_interactions(interactions: list[dict]) -> list[dict]:
    rows = []
    for i in interactions:
        row = {c: i.get(c) for c in INTERACTIONS_COLS}
        # Validation source
        valid_sources = {"application","chat_ia","recherche"}
        if row.get("source") not in valid_sources:
            row["source"] = "application"
        row["livre_lu"] = int(row.get("livre_lu") or 0)
        rows.append(row)
    return rows


def map_sessions_ia(sessions: list[dict]) -> list[dict]:
    rows = []
    for s in sessions:
        row = {c: s.get(c) for c in SESSIONS_IA_COLS}
        # Sérialiser les JSON si nécessaire
        for jf in ("vecteur_intention","livres_rejetes","livres_acceptes"):
            val = row.get(jf)
            if val is not None and isinstance(val, (dict, list)):
                row[jf] = json.dumps(val, ensure_ascii=False)
        row["active"] = int(row.get("active") or 0)
        rows.append(row)
    return rows


def map_notifications(notifs: list[dict]) -> list[dict]:
    # Mapping des anciens types vers les nouveaux
    type_map = {
        "rappel":         "rappel_retour",
        "retard":         "retard",
        "disponibilite":  "livre_disponible",
        # types déjà corrects passent tels quels
    }
    rows = []
    for n in notifs:
        row = {c: n.get(c) for c in NOTIFICATIONS_COLS}
        row["lue"] = int(row.get("lue") or 0)
        t = row.get("type_notif","")
        row["type_notif"] = type_map.get(t, t)
        rows.append(row)
    return rows


# ─── Pipeline principal ───────────────────────────────────────────────────────

def main(cfg: dict):
    log.info("🔌 Connexion à MySQL...")
    conn   = get_connection(cfg)
    cursor = conn.cursor()
    cursor.execute(f"USE `{cfg['database']}`")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
    cursor.execute("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'")
    conn.commit()

    # ── 1. livres ─────────────────────────────────────────────────────────────
    log.info("📚 Import des livres...")
    n = batch_insert(cursor, "livres", map_livres(load_json("livres")))
    log.info(f"  livres               → {n:,} lignes insérées")
    conn.commit()

    # ── 2. users ──────────────────────────────────────────────────────────────
    log.info("👤 Import des utilisateurs...")
    n = batch_insert(cursor, "users", map_users(load_json("users")))
    log.info(f"  users                → {n:,} lignes insérées")
    conn.commit()

    # ── 3. livres_similaires ──────────────────────────────────────────────────
    log.info("🔗 Import des similarités...")
    n = batch_insert(cursor, "livres_similaires", map_similarites(load_json("livres_similaires")))
    log.info(f"  livres_similaires    → {n:,} lignes insérées")
    conn.commit()

    # ── 4. emprunts ───────────────────────────────────────────────────────────
    log.info("📖 Import des emprunts...")
    n = batch_insert(cursor, "emprunts", map_emprunts(load_json("emprunts")))
    log.info(f"  emprunts             → {n:,} lignes insérées")
    conn.commit()

    # ── 5. interactions ───────────────────────────────────────────────────────
    log.info("👆 Import des interactions...")
    n = batch_insert(cursor, "interactions", map_interactions(load_json("interactions")))
    log.info(f"  interactions         → {n:,} lignes insérées")
    conn.commit()

    # ── 6. sessions_ia ────────────────────────────────────────────────────────
    log.info("🤖 Import des sessions IA...")
    n = batch_insert(cursor, "sessions_ia", map_sessions_ia(load_json("sessions_ia")))
    log.info(f"  sessions_ia          → {n:,} lignes insérées")
    conn.commit()

    # ── 7. notifications ──────────────────────────────────────────────────────
    log.info("🔔 Import des notifications...")
    n = batch_insert(cursor, "notifications", map_notifications(load_json("notifications")))
    log.info(f"  notifications        → {n:,} lignes insérées")
    conn.commit()

    cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
    conn.commit()

    # ── Résumé ────────────────────────────────────────────────────────────────
    log.info("\n📊 Vérification des comptages :")
    tables = ["livres","users","emprunts","interactions",
              "livres_similaires","sessions_ia","notifications"]
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM `{table}`")
        count = cursor.fetchone()[0]
        log.info(f"   {table:<25} {count:>10,} lignes")

    # Quelques stats utiles
    log.info("\n📈 Statistiques :")
    cursor.execute("SELECT type_compte, COUNT(*), ROUND(AVG(score_confiance),3) FROM users GROUP BY type_compte")
    for row in cursor.fetchall():
        log.info(f"   {row[0]:<15} {row[1]:>7,} users  |  C moyen = {row[2]}")

    cursor.execute("SELECT statut, COUNT(*) FROM emprunts GROUP BY statut")
    for row in cursor.fetchall():
        log.info(f"   emprunts [{row[0]}] : {row[1]:,}")

    cursor.execute("SELECT type_notif, COUNT(*) FROM notifications GROUP BY type_notif")
    for row in cursor.fetchall():
        log.info(f"   notif [{row[0]}] : {row[1]:,}")

    cursor.close()
    conn.close()
    log.info("\n✅ Import terminé avec succès !")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import JSON → MySQL (schéma complet)")
    parser.add_argument("--host",     default=DEFAULT_CONFIG["host"])
    parser.add_argument("--port",     default=DEFAULT_CONFIG["port"],     type=int)
    parser.add_argument("--user",     default=DEFAULT_CONFIG["user"])
    parser.add_argument("--password", default=DEFAULT_CONFIG["password"])
    parser.add_argument("--database", default=DEFAULT_CONFIG["database"])
    args = parser.parse_args()

    main({
        "host":     args.host,
        "port":     args.port,
        "user":     args.user,
        "password": args.password,
        "database": args.database,
        "charset":  "utf8mb4",
    })
