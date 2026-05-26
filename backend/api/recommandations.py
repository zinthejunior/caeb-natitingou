"""
recommandations.py
==================
Module de recommandation de livres — prêt pour déploiement.

Utilisation
-----------
1. Entraîner et sauvegarder les composants depuis le notebook :

    import joblib
    joblib.dump({ 
        "modele_nmf":      modele_nmf,
        "vectorizer":      vectorizer,
        "similarite":      similarite,
        "item_sim_df":     item_sim_df,
        "pivot_pred":      pivot_pred,
        "pivot":           pivot,
        "features_livres": features_livres,
        "co_emprunts":     co_emprunts,
    }, "modele_sauvegarde/modele_fusion_complet.pkl")

2. Dans app.py (Flask) :

    import joblib
    import recommandations as reco

    composants = joblib.load("modele_sauvegarde/modele_fusion_complet.pkl")
    reco.charger(composants)

    @app.route("/recommend", methods=["POST"])
    def recommend():
        data    = request.get_json()
        user_id = data["user_id"]          # identifiant métier (ex: "0137133d7f6f")
        n       = data.get("n", 10)
        result  = reco.recommander_par_user_id(user_id, n=n)
        return jsonify(result)
"""

import re
import warnings
import numpy as np
import pandas as pd

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.stem.snowball import FrenchStemmer

    nltk.download("stopwords", quiet=True)
    _stemmer = FrenchStemmer()
    _stop_words = set(stopwords.words("french"))
except (ImportError, LookupError, OSError) as exc:
    warnings.warn(
        f"nltk unavailable or stopwords unavailable: {exc}. "
        "Le nettoyage de texte utilisera une version de secours.",
        UserWarning,
    )
    _stemmer = type("NoOpStemmer", (), {"stem": lambda self, mot: mot})()
    _stop_words = set()

# ---------------------------------------------------------------------------
# Variables globales — remplies par charger()
# ---------------------------------------------------------------------------
_modele_nmf      = None
_vectorizer      = None
_similarite      = None   # np.ndarray (nb_livres × nb_livres) — contenu TF-IDF
_item_sim_df     = None   # pd.DataFrame — similarité item-item cosinus
_pivot_pred      = None   # pd.DataFrame — matrice reconstruite NMF
_pivot           = None   # pd.DataFrame — matrice pivot utilisateurs × livres
_features_livres = None   # pd.DataFrame — catalogue livres
_co_emprunts     = None   # pd.DataFrame — co-emprunts avec score Jaccard

STANDARD_COLS = ["Code_barres", "Titre", "Section", "Cote", "Score"]


# ---------------------------------------------------------------------------
# Chargement
# ---------------------------------------------------------------------------

def charger(composants: dict) -> None:
    """
    Injecte les composants sauvegardés dans les variables globales du module.

    Paramètres
    ----------
    composants : dict
        Dictionnaire produit par joblib.load() contenant les clés :
        modele_nmf, vectorizer, similarite, item_sim_df,
        pivot_pred, pivot, features_livres, co_emprunts.
    """
    global _modele_nmf, _vectorizer, _similarite, _item_sim_df
    global _pivot_pred, _pivot, _features_livres, _co_emprunts

    _modele_nmf      = composants["modele_nmf"]
    _vectorizer      = composants["vectorizer"]
    _similarite      = composants["similarite"]
    _item_sim_df     = composants["item_sim_df"]
    _pivot_pred      = composants["pivot_pred"]
    _pivot           = composants["pivot"]
    _features_livres = composants["features_livres"]

    # Recalcul du score Jaccard (idempotent si déjà présent)
    co = composants["co_emprunts"].copy()
    if "jaccard" not in co.columns:
        nb_emprunteurs = (
            composants.get("matrice_interactions", pd.DataFrame())
            .groupby("Code_barres")["user_id"].nunique()
        )
        if not nb_emprunteurs.empty:
            co["nb_A"]   = co["Code_barres_A"].map(nb_emprunteurs)
            co["nb_B"]   = co["Code_barres_B"].map(nb_emprunteurs)
            co["jaccard"] = co["nb_co_emprunts"] / (
                co["nb_A"] + co["nb_B"] - co["nb_co_emprunts"]
            )
        else:
            co["jaccard"] = 0.0
    _co_emprunts = co


# ---------------------------------------------------------------------------
# Utilitaires internes
# ---------------------------------------------------------------------------

def _verifier_chargement() -> None:
    if _pivot is None:
        raise RuntimeError(
            "Les composants ne sont pas chargés. "
            "Appelez recommandations.charger(composants) au démarrage."
        )


def _nettoyer_texte(texte: str) -> str:
    texte = texte.lower()
    texte = re.sub(r"\s+", " ", texte).strip()
    mots  = texte.split()
    mots  = [_stemmer.stem(m) for m in mots if m not in _stop_words]
    return " ".join(mots)


# ---------------------------------------------------------------------------
# Filtrage par contenu (TF-IDF + cosinus)
# ---------------------------------------------------------------------------

def recommander_contenu(
    book_index: int,
    n: int = 5,
    seuil_contenu: float = 0.0,
    excluded_titles: list = None,
) -> pd.DataFrame:
    """
    Recommande des livres similaires à un livre donné (index dans features_livres).

    Paramètres
    ----------
    book_index      : index du livre de référence dans features_livres.
    n               : nombre maximum de recommandations.
    seuil_contenu   : similarité cosinus minimale (0–1).
    excluded_titles : titres à exclure (déjà lus par l'utilisateur).
    """
    _verifier_chargement()

    scores = list(enumerate(_similarite[book_index]))
    scores_tries = sorted(scores, key=lambda x: x[1], reverse=True)[1:]
    scores_tries = [(i, s) for i, s in scores_tries if s > seuil_contenu]

    titre_source  = _features_livres.loc[book_index, "Titre"]
    excluded_set  = set(excluded_titles or []) | {titre_source}

    resultats = []
    for i, score in scores_tries:
        titre = _features_livres.loc[i, "Titre"]
        if titre in excluded_set:
            continue
        resultats.append({
            "Code_barres": _features_livres.loc[i, "Code_barres"],
            "Titre":       titre,
            "Section":     _features_livres.loc[i, "Section"],
            "Cote":        _features_livres.loc[i, "Cote"],
            "Score":       round(score, 3),
        })
        if len(resultats) >= n:
            break

    return pd.DataFrame(resultats, columns=STANDARD_COLS) if resultats \
        else pd.DataFrame(columns=STANDARD_COLS)


# ---------------------------------------------------------------------------
# Filtrage collaboratif user-item (NMF)
# ---------------------------------------------------------------------------

def recommander_collaboratif(
    user_index: int,
    n: int = 5,
    seuil_collab: float = 0.2,
    excluded_titles: list = None,
) -> pd.DataFrame:
    """
    Recommande des livres via la matrice reconstruite par NMF.

    Paramètres
    ----------
    user_index      : index de l'utilisateur dans la matrice pivot.
    n               : nombre maximum de recommandations.
    seuil_collab    : score NMF minimal pour retenir un livre.
    excluded_titles : titres à exclure.
    """
    _verifier_chargement()

    scores         = _pivot_pred.iloc[user_index]
    deja_lus       = _pivot.iloc[user_index]
    deja_lus_codes = deja_lus[deja_lus > 0].index.tolist()

    scores = scores.drop(deja_lus_codes, errors="ignore")
    scores = scores[scores > seuil_collab]

    if scores.empty:
        return pd.DataFrame(columns=STANDARD_COLS)

    temp = pd.DataFrame({"Code_barres": scores.index, "Score": scores.values})
    temp = temp.merge(
        _features_livres[["Code_barres", "Titre"]], on="Code_barres", how="left"
    )

    if excluded_titles:
        temp = temp[~temp["Titre"].isin(excluded_titles)]

    top = temp.sort_values("Score", ascending=False).head(n)

    resultats = []
    for _, row in top.iterrows():
        cb   = row["Code_barres"]
        info = _features_livres[_features_livres["Code_barres"] == cb]
        if not info.empty:
            resultats.append({
                "Code_barres": int(cb),
                "Titre":       info.iloc[0]["Titre"],
                "Section":     info.iloc[0]["Section"],
                "Cote":        info.iloc[0]["Cote"],
                "Score":       round(row["Score"], 4),
            })

    return pd.DataFrame(resultats, columns=STANDARD_COLS) if resultats \
        else pd.DataFrame(columns=STANDARD_COLS)


# ---------------------------------------------------------------------------
# Filtrage collaboratif item-item (cosinus + Jaccard)
# ---------------------------------------------------------------------------

def recommander_co(
    user_index: int,
    n: int = 5,
    seuil_co: float = 0.2,
    excluded_titles: list = None,
) -> pd.DataFrame:
    """
    Recommande des livres via une approche item-item hybride
    (cosinus sur profils d'emprunt + indice de Jaccard sur co-emprunts).

    Paramètres
    ----------
    user_index      : index de l'utilisateur dans la matrice pivot.
    n               : nombre maximum de recommandations.
    seuil_co        : score minimal après fusion pour retenir un livre.
    excluded_titles : titres à exclure.
    """
    _verifier_chargement()

    lus_idx          = _pivot.iloc[user_index]
    livres_lus_codes = lus_idx[lus_idx > 0].index.tolist()

    if not livres_lus_codes:
        return pd.DataFrame(columns=STANDARD_COLS)

    # Signal 1 : cosinus moyen avec les livres lus
    scores_cosinus = _item_sim_df[livres_lus_codes].mean(axis=1)

    # Signal 2 : Jaccard agrégé via co-emprunts
    candidats = _co_emprunts[
        _co_emprunts["Code_barres_A"].isin(livres_lus_codes) |
        _co_emprunts["Code_barres_B"].isin(livres_lus_codes)
    ].copy()

    candidats["cb_partenaire"] = candidats.apply(
        lambda row: row["Code_barres_B"]
        if row["Code_barres_A"] in livres_lus_codes
        else row["Code_barres_A"],
        axis=1,
    )
    scores_jaccard = candidats.groupby("cb_partenaire")["jaccard"].sum()

    if not scores_jaccard.empty and scores_jaccard.max() > 0:
        scores_jaccard = scores_jaccard / scores_jaccard.max()
    else:
        scores_jaccard = pd.Series(dtype=float)

    scores_cosinus = scores_cosinus[scores_cosinus > 0.05]
    scores_jaccard = scores_jaccard[scores_jaccard > 0.1]

    scores = pd.concat([scores_cosinus, scores_jaccard], axis=1).max(axis=1)
    scores = scores.drop(livres_lus_codes, errors="ignore")
    scores = scores[scores > seuil_co]

    if scores.empty:
        return pd.DataFrame(columns=STANDARD_COLS)

    temp = pd.DataFrame({"Code_barres": scores.index, "Score": scores.values})
    temp = temp.merge(
        _features_livres[["Code_barres", "Titre"]], on="Code_barres", how="left"
    )
    if excluded_titles:
        temp = temp[~temp["Titre"].isin(excluded_titles)]

    top = temp.sort_values("Score", ascending=False).head(n)

    resultats = []
    for _, row in top.iterrows():
        cb   = row["Code_barres"]
        info = _features_livres[_features_livres["Code_barres"] == cb]
        if not info.empty:
            resultats.append({
                "Code_barres": int(cb),
                "Titre":       info.iloc[0]["Titre"],
                "Section":     info.iloc[0]["Section"],
                "Cote":        info.iloc[0]["Cote"],
                "Score":       round(row["Score"], 4),
            })

    return pd.DataFrame(resultats, columns=STANDARD_COLS) if resultats \
        else pd.DataFrame(columns=STANDARD_COLS)


# ---------------------------------------------------------------------------
# Baseline popularité (cold-start)
# ---------------------------------------------------------------------------

def top_populaires(n: int = 10) -> pd.DataFrame:
    """
    Retourne les n livres les plus empruntés (fallback cold-start).
    Critère : nombre d'emprunteurs uniques.
    """
    _verifier_chargement()

    livres_tries = (
        _features_livres
        .sort_values("nb_emprunteurs_uniq", ascending=False)
        .head(n)
    )
    return livres_tries[["Titre", "Section", "nb_emprunteurs_uniq"]].reset_index(drop=True)


# ---------------------------------------------------------------------------
# Modèle fusion hybride — fonction principale
# ---------------------------------------------------------------------------

def modele_fusion(
    user_index: int,
    n: int = 5,
    weights: dict = None,
) -> pd.DataFrame:
    """
    Combine les trois approches (contenu TF-IDF, NMF, item-item) en
    pondérant leurs scores. Retourne les n meilleures recommandations.
    Utilise la popularité comme fallback si l'utilisateur n'a pas d'historique.

    Paramètres
    ----------
    user_index : index de l'utilisateur dans la matrice pivot.
    n          : nombre de recommandations à retourner.
    weights    : dict avec clés "collaboratif", "co", "contenu" (somme = 1).
                 Défaut : {"collaboratif": 0.1, "co": 0.2, "contenu": 0.7}
    """
    _verifier_chargement()

    if weights is None:
        weights = {"collaboratif": 0.1, "co": 0.2, "contenu": 0.7}

    lus_idx          = _pivot.iloc[user_index]
    livres_lus_codes = lus_idx[lus_idx > 0].index.tolist()

    # Fallback cold-start
    if not livres_lus_codes:
        return top_populaires(n)[["Titre", "Section", "nb_emprunteurs_uniq"]].rename(
            columns={"nb_emprunteurs_uniq": "Score"}
        )

    titres_lus = _features_livres[
        _features_livres["Code_barres"].isin(livres_lus_codes)
    ]["Titre"].tolist()

    # Composante collaborative NMF
    df_coll = recommander_collaboratif(user_index, n=n * 2, excluded_titles=titres_lus)
    if not df_coll.empty:
        df_coll = df_coll.copy()
        df_coll["Score"] *= weights["collaboratif"]

    # Composante item-item
    df_co = recommander_co(user_index, n=n * 2, excluded_titles=titres_lus)
    if not df_co.empty:
        df_co = df_co.copy()
        df_co["Score"] *= weights["co"]

    # Composante contenu (agrégée sur tous les livres lus)
    dfs_contenu = []
    for code in livres_lus_codes:
        idx_match = _features_livres[_features_livres["Code_barres"] == code].index
        if not idx_match.empty:
            df_temp = recommander_contenu(
                idx_match[0], n=n, excluded_titles=titres_lus
            )
            if not df_temp.empty:
                dfs_contenu.append(df_temp)

    if dfs_contenu:
        df_cont = pd.concat(dfs_contenu, ignore_index=True)
        df_cont = df_cont.groupby("Code_barres", as_index=False).agg(
            {"Score": "max", "Titre": "first", "Section": "first", "Cote": "first"}
        )
        df_cont["Score"] *= weights["contenu"]
    else:
        df_cont = pd.DataFrame(columns=STANDARD_COLS)

    # Fusion par somme des scores
    frames = [df for df in [df_coll, df_co, df_cont] if not df.empty]
    if not frames:
        return top_populaires(n)[["Titre", "Section", "nb_emprunteurs_uniq"]].rename(
            columns={"nb_emprunteurs_uniq": "Score"}
        )

    fusion   = pd.concat(frames, ignore_index=True)
    resultat = fusion.groupby("Code_barres", as_index=False).agg(
        {"Score": "sum", "Titre": "first", "Section": "first", "Cote": "first"}
    )
    resultat = resultat[~resultat["Code_barres"].isin(livres_lus_codes)]

    return (
        resultat[["Code_barres", "Titre", "Section", "Cote", "Score"]]
        .sort_values("Score", ascending=False)
        .head(n)
        .reset_index(drop=True)
    )


# ---------------------------------------------------------------------------
# Fonctions d'accès par identifiant métier (user_id)
# ---------------------------------------------------------------------------

def recommander_par_user_id(
    user_id: str,
    n: int = 10,
    weights: dict = None,
) -> list[dict]:
    """
    Point d'entrée principal pour l'API.
    Prend un user_id métier (ex: "0137133d7f6f") et retourne une liste
    de recommandations sérialisable en JSON.

    Retourne [] si l'utilisateur est inconnu (nouveau visiteur).
    """
    _verifier_chargement()

    if user_id not in _pivot.index:
        # Nouvel utilisateur : retour popularité
        recs = top_populaires(n)
        return recs.rename(columns={"nb_emprunteurs_uniq": "Score"}).to_dict(
            orient="records"
        )

    user_index = _pivot.index.get_loc(user_id)
    recs       = modele_fusion(user_index, n=n, weights=weights)

    # Convertir les types numpy pour la sérialisation JSON
    records = []
    for row in recs.to_dict(orient="records"):
        records.append({
            "Code_barres": int(row["Code_barres"]) if pd.notna(row.get("Code_barres")) else None,
            "Titre":       str(row.get("Titre", "")),
            "Section":     str(row.get("Section", "")),
            "Cote":        str(row.get("Cote", "")),
            "Score":       round(float(row.get("Score", 0)), 4),
        })
    return records
