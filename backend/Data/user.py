"""
Script d'injection des features utilisateurs depuis Excel vers PostgreSQL.
Fichier source : features_utilisateurs.xlsx
Table cible    : user_features (à créer si elle n'existe pas)

Usage :
    python inject_features_utilisateurs.py \
        --host localhost \
        --port 5432 \
        --dbname ma_base \
        --user mon_user \
        --password mon_mdp \
        --file features_utilisateurs.xlsx

Dépendances :
    pip install pandas openpyxl psycopg2-binary sqlalchemy
"""

import argparse
import sys
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError


# ──────────────────────────────────────────────
# 1. Schéma SQL de la table cible
#    (correspondance avec les colonnes du fichier Excel)
# ──────────────────────────────────────────────
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS user_features (
    user_id                VARCHAR(50)   PRIMARY KEY,
    nb_emprunts_total      INTEGER       NOT NULL DEFAULT 0,
    duree_moy_emprunt      FLOAT         NOT NULL DEFAULT 0.0,
    score_lecture_moy      FLOAT         NOT NULL DEFAULT 0.0,
    score_lecture_max      FLOAT         NOT NULL DEFAULT 0.0,
    nb_sections_lues       INTEGER       NOT NULL DEFAULT 0,
    section_principale     VARCHAR(200)  NULL,
    updated_at             TIMESTAMP     DEFAULT NOW()
);
"""

# ──────────────────────────────────────────────
# 2. Lecture et nettoyage du fichier Excel
# ──────────────────────────────────────────────
COLUMN_MAP = {
    "user_id":             "user_id",
    "nb_emprunts_total":   "nb_emprunts_total",
    "duree_moy_emprunt":   "duree_moy_emprunt",
    "score_lecture_moy":   "score_lecture_moy",
    "score_lecture_max":   "score_lecture_max",
    "nb_sections_lues":    "nb_sections_lues",
    "section_principale":  "section_principale",
}


def load_excel(filepath: str) -> pd.DataFrame:
    print(f"📂 Lecture du fichier : {filepath}")
    df = pd.read_excel(filepath, engine="openpyxl")

    # Vérification des colonnes attendues
    missing = [col for col in COLUMN_MAP.keys() if col not in df.columns]
    if missing:
        print(f"❌ Colonnes manquantes dans le fichier Excel : {missing}")
        sys.exit(1)

    df = df[list(COLUMN_MAP.keys())].rename(columns=COLUMN_MAP)

    # Nettoyage des types
    df["user_id"]            = df["user_id"].astype(str).str.strip()
    df["nb_emprunts_total"]  = pd.to_numeric(df["nb_emprunts_total"],  errors="coerce").fillna(0).astype(int)
    df["duree_moy_emprunt"]  = pd.to_numeric(df["duree_moy_emprunt"],  errors="coerce").fillna(0.0)
    df["score_lecture_moy"]  = pd.to_numeric(df["score_lecture_moy"],  errors="coerce").fillna(0.0)
    df["score_lecture_max"]  = pd.to_numeric(df["score_lecture_max"],  errors="coerce").fillna(0.0)
    df["nb_sections_lues"]   = pd.to_numeric(df["nb_sections_lues"],   errors="coerce").fillna(0).astype(int)
    df["section_principale"] = df["section_principale"].astype(str).str.strip().replace("nan", None)

    # Suppression des doublons sur user_id (garde la dernière occurrence)
    df = df.drop_duplicates(subset="user_id", keep="last")

    print(f"✅ {len(df)} lignes valides chargées.")
    return df


# ──────────────────────────────────────────────
# 3. Injection en base (UPSERT)
# ──────────────────────────────────────────────
UPSERT_SQL = """
INSERT INTO user_features (
    user_id, nb_emprunts_total, duree_moy_emprunt,
    score_lecture_moy, score_lecture_max,
    nb_sections_lues, section_principale, updated_at
)
VALUES (
    :user_id, :nb_emprunts_total, :duree_moy_emprunt,
    :score_lecture_moy, :score_lecture_max,
    :nb_sections_lues, :section_principale, NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    nb_emprunts_total  = EXCLUDED.nb_emprunts_total,
    duree_moy_emprunt  = EXCLUDED.duree_moy_emprunt,
    score_lecture_moy  = EXCLUDED.score_lecture_moy,
    score_lecture_max  = EXCLUDED.score_lecture_max,
    nb_sections_lues   = EXCLUDED.nb_sections_lues,
    section_principale = EXCLUDED.section_principale,
    updated_at         = NOW();
"""


def inject(df: pd.DataFrame, engine) -> None:
    records = df.to_dict(orient="records")

    with engine.begin() as conn:
        # Création de la table si nécessaire
        conn.execute(text(CREATE_TABLE_SQL))
        print("🗄️  Table user_features prête.")

        # Injection par lots de 500
        batch_size = 500
        total = len(records)
        inserted = 0

        for i in range(0, total, batch_size):
            batch = records[i : i + batch_size]
            conn.execute(text(UPSERT_SQL), batch)
            inserted += len(batch)
            print(f"   ↳ {inserted}/{total} lignes injectées…")

    print(f"\n🎉 Injection terminée : {total} enregistrements insérés/mis à jour.")


# ──────────────────────────────────────────────
# 4. Point d'entrée
# ──────────────────────────────────────────────
def parse_args():
    p = argparse.ArgumentParser(description="Injecteur features_utilisateurs → PostgreSQL")
    p.add_argument("--host",     default="localhost",            help="Hôte PostgreSQL")
    p.add_argument("--port",     default=5432,     type=int,     help="Port PostgreSQL")
    p.add_argument("--dbname",   required=True,                  help="Nom de la base de données")
    p.add_argument("--user",     required=True,                  help="Nom d'utilisateur PostgreSQL")
    p.add_argument("--password", required=True,                  help="Mot de passe PostgreSQL")
    p.add_argument("--file",     default="features_utilisateurs.xlsx",
                                                                  help="Chemin vers le fichier Excel")
    return p.parse_args()


def main():
    args = parse_args()

    # Connexion SQLAlchemy
    url = (
        f"postgresql+psycopg2://{args.user}:{args.password}"
        f"@{args.host}:{args.port}/{args.dbname}"
    )

    print(f"🔌 Connexion à PostgreSQL ({args.host}:{args.port}/{args.dbname})…")
    try:
        engine = create_engine(url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Connexion réussie.\n")
    except SQLAlchemyError as e:
        print(f"❌ Impossible de se connecter : {e}")
        sys.exit(1)

    df = load_excel(args.file)
    inject(df, engine)


if __name__ == "__main__":
    main()