"""
recommandations.py
==================
Module de recommandation de livres — prêt pour déploiement.

Utilisation
-----------

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

_matrice_tfidf   = None   # sparse matrix — TF-IDF features of books (nb_livres x nb_mots)

STANDARD_COLS = ["Code_barres", "Titre", "Section", "Cote", "Score"]

def recommander_par_user_id(
    user_id: str,
    n: int = 10,
    weights: dict = None,
    user_profile: dict = None,
    profile_weight: float = 0.3,
) -> list[dict]:
    """
    Point d'entrée principal pour l'API.
    
    Deux régimes automatiques :
    
    RÉGIME 1 — COLD-START (nouvel utilisateur, pas d'historique)
        → Similarité cosinus entre le profil utilisateur et la matrice TF-IDF.
        → Fallback popularité si profil vide.
    
    RÉGIME 2 — COLLABORATIF (utilisateur avec historique)
        → NMF prioritaire (60%) + KNN (25%) + Contenu (15%)
        → Si user_profile fourni : fusion avec le profil (profile_weight)
        → Si user_profile fourni : boost post-fusion sur genres/âge/niveau
    
    Paramètres
    ----------
    user_id : str
        Identifiant métier de l'utilisateur.
    n : int
        Nombre de recommandations.
    weights : dict
        Poids pour modele_fusion (conservé pour compatibilité).
    user_profile : dict
        Informations du profil utilisateur pour fusion/boost.
    profile_weight : float
        Poids du profil dans la fusion (0.0 = modèle pur, 1.0 = profil pur).
    
    Retourne
    --------
    list[dict] : [{"Code_barres": int, "Titre": str, "Section": str, "Cote": str, "Score": float}, ...]
    """
    _verifier_chargement()
    
    # =====================================================================
    # DÉTECTION DU RÉGIME
    # =====================================================================
    if not _utilisateur_a_historique(user_id):
        # =================================================================
        # RÉGIME 1 : COLD-START — Nouvel utilisateur
        # =================================================================
        return _recommander_nouvel_utilisateur(user_id, n)
    
    # =====================================================================
    # RÉGIME 2 : COLLABORATIF — Utilisateur avec historique
    # =====================================================================
    if user_id not in _pivot.index:
        # Historique mais pas dans le pivot → fallback cold-start
        return _recommander_nouvel_utilisateur(user_id, n)
    
    user_index = _pivot.index.get_loc(user_id)
    
    # Récupérer les recommandations du nouveau système collaboratif
    recs = _recommander_collaboratif_prioritaire(user_id, n=n * 2)
    
    # Convertir en DataFrame pour la suite du traitement
    if isinstance(recs, list):
        recs = pd.DataFrame(recs)
    
    if recs.empty:
        return _fallback_populaires(n)
    
    # =====================================================================
    # FUSION AVEC LE PROFIL (si user_profile fourni)
    # (Conservé de l'ancienne version)
    # =====================================================================
    if user_profile:
        try:
            # Calculer les scores basés sur le profil
            prof_df = _compute_profile_scores(user_profile, n=n * 2)
            
            if not prof_df.empty:
                # Normaliser les Code_barres pour la fusion
                recs['Code_barres'] = recs['Code_barres'].apply(
                    lambda x: int(x) if pd.notna(x) else None
                )
                prof_df['Code_barres'] = prof_df['Code_barres'].apply(
                    lambda x: int(x) if pd.notna(x) else None
                )
                
                # Fusionner sur Code_barres
                merged = pd.merge(
                    recs, prof_df,
                    on='Code_barres',
                    how='outer',
                    suffixes=('_model', '_prof')
                )
                
                # Remplir les scores manquants par 0
                merged['Score_model'] = merged['Score_model'].fillna(0.0)
                merged['Score_prof'] = merged['Score_prof'].fillna(0.0)
                
                # Combinaison pondérée
                w = float(profile_weight)
                merged['Score'] = (
                    merged['Score_model'] * (1 - w) + 
                    merged['Score_prof'] * w
                )
                
                # Récupérer les métadonnées
                for col in ['Titre', 'Section', 'Cote']:
                    col_model = f'{col}_model'
                    col_prof = f'{col}_prof'
                    if col_model in merged.columns and col_prof in merged.columns:
                        merged[col] = merged[col_model].combine_first(merged[col_prof])
                    elif col_model in merged.columns:
                        merged[col] = merged[col_model]
                    elif col_prof in merged.columns:
                        merged[col] = merged[col_prof]
                
                # Exclure les livres déjà lus
                lus_idx = _pivot.iloc[user_index]
                livres_lus_codes = lus_idx[lus_idx > 0].index.tolist()
                livres_lus_codes_int = [int(c) for c in livres_lus_codes]
                merged = merged[~merged['Code_barres'].isin(livres_lus_codes_int)]
                
                # Trier et limiter
                recs = merged.nlargest(n * 2, 'Score')
                recs = recs[['Code_barres', 'Titre', 'Section', 'Cote', 'Score']].reset_index(drop=True)
                
        except Exception as e:
            warnings.warn(f"Erreur fusion profil pour user_id={user_id}: {e}")
    
    # =====================================================================
    # BOOST POST-FUSION (réajustement selon genres/âge/niveau)
    # (Conservé de l'ancienne version)
    # =====================================================================
    if user_profile:
        try:
            genres_pref = user_profile.get('genres_preferes') or []
            niveau = str(user_profile.get('niveau_etude', '')).lower()
            dob = user_profile.get('date_naissance')
            
            # Calculer la catégorie d'âge
            age_cat = None
            if dob is not None:
                try:
                    from datetime import date
                    today = date.today()
                    if isinstance(dob, str):
                        dob = pd.to_datetime(dob).date()
                    age = today.year - dob.year - (
                        (today.month, today.day) < (dob.month, dob.day)
                    )
                    if age < 13:
                        age_cat = 'enfant'
                    elif age < 18:
                        age_cat = 'ado'
                    else:
                        age_cat = 'adulte'
                except Exception:
                    age_cat = None
            
            # Appliquer le boost à chaque recommandation
            boosted = []
            for _, row in recs.iterrows():
                score = float(row.get('Score', 0) or 0)
                cb = row.get('Code_barres')
                boost = 0.0
                
                # Récupérer les métadonnées du livre
                info = _features_livres[_features_livres['Code_barres'] == cb]
                info_row = info.iloc[0] if not info.empty else None
                
                if info_row is not None:
                    # Boost genre préféré
                    if genres_pref:
                        book_genre = str(info_row.get('genre', '')).lower()
                        if book_genre and any(
                            str(g).lower() == book_genre for g in genres_pref
                        ):
                            boost += 0.30 * score
                    
                    # Boost catégorie d'âge
                    if age_cat:
                        book_age = str(info_row.get('categorie_age', '')).lower()
                        if book_age and age_cat in book_age:
                            boost += 0.20 * score
                    
                    # Boost niveau d'étude
                    if niveau:
                        section = str(info_row.get('Section', '')).lower()
                        cote = str(info_row.get('Cote', '')).lower()
                        if niveau in section or niveau in cote:
                            boost += 0.10 * score
                
                row_dict = row.to_dict()
                row_dict['Score'] = round(score + boost, 4)
                boosted.append(row_dict)
            
            # Trier et limiter
            boosted = sorted(boosted, key=lambda x: x.get('Score', 0), reverse=True)[:n]
            recs = pd.DataFrame(boosted)
            
        except Exception as e:
            warnings.warn(f"Erreur boost pour user_id={user_id}: {e}")
    
    # =====================================================================
    # FORMATAGE FINAL
    # =====================================================================
    records = []
    df_out = recs if isinstance(recs, pd.DataFrame) else pd.DataFrame(recs)
    
    for _, row in df_out.head(n).iterrows():
        records.append({
            "Code_barres": int(row["Code_barres"]) if pd.notna(row.get("Code_barres")) else None,
            "Titre": str(row.get("Titre", "")),
            "Section": str(row.get("Section", "")),
            "Cote": str(row.get("Cote", "")),
            "Score": round(float(row.get("Score", 0)), 4),
        })
    
    return records


# ============================================================================
# FONCTIONS DÉDIÉES AU NOUVEL UTILISATEUR
# ============================================================================

def _recommander_nouvel_utilisateur(user_id: str, n: int = 10) -> list[dict]:
    """
    Recommandations pour un nouvel utilisateur (cold-start).
    
    Méthode :
    1. Construire une chaîne de texte depuis le profil utilisateur (ORM Django)
    2. Nettoyer cette chaîne (stopwords, stemming)
    3. Vectoriser avec le TF-IDF existant
    4. Calculer la similarité cosinus avec tous les livres
    5. Retourner les n livres les plus similaires
    
    Fallback si profil vide : popularité pure
    """
    
    # Étape 1 : Construire les textes profil depuis l'ORM Django
    texte_genres, texte_niveau = _construire_texte_profil_depuis_orm(user_id)
    
    # Étape 2 : Si les deux textes sont vides, fallback popularité
    if not texte_genres.strip() and not texte_niveau.strip():
        return _fallback_populaires(n)
    
    # Étape 3 & 4 : Vectoriser et calculer les similarités séparément
    import numpy as np
    try:
        from sklearn.metrics.pairwise import cosine_similarity
        if _matrice_tfidf is not None:
            # Score Genres (70%)
            if texte_genres.strip():
                vecteur_genres = _vectorizer.transform([texte_genres])
                scores_genres = cosine_similarity(vecteur_genres, _matrice_tfidf).flatten()
            else:
                scores_genres = np.zeros(_matrice_tfidf.shape[0])
                
            # Score Niveau (30%)
            if texte_niveau.strip():
                vecteur_niveau = _vectorizer.transform([texte_niveau])
                scores_niveau = cosine_similarity(vecteur_niveau, _matrice_tfidf).flatten()
            else:
                scores_niveau = np.zeros(_matrice_tfidf.shape[0])
                
            # Application de la pondération
            scores = (0.7 * scores_genres) + (0.3 * scores_niveau)
        else:
            warnings.warn("Matrice TF-IDF non disponible pour calculer la similarité")
            return _fallback_populaires(n)
    except Exception as e:
        warnings.warn(f"Erreur similarité cosinus pour user_id={user_id}: {e}")
        return _fallback_populaires(n)
    
    # Étape 5 : Normaliser les scores entre 0 et 1
    score_max = scores.max()
    if score_max > 0:
        scores = scores / score_max
    
    # Étape 6 : Associer les scores aux livres
    resultats = _features_livres.copy()
    resultats['Score'] = scores
    
    # Étape 7 : Exclure les livres déjà lus (si on a l'info)
    livres_lus = _get_livres_lus_depuis_orm(user_id)
    if livres_lus:
        resultats = resultats[~resultats['Code_barres'].isin(livres_lus)]
    
    # Étape 8 : Trier et prendre les n meilleurs
    top = resultats.nlargest(n, 'Score')
    
    # Étape 9 : Formater la sortie
    records = []
    for _, row in top.iterrows():
        records.append({
            "Code_barres": int(row["Code_barres"]) if pd.notna(row.get("Code_barres")) else None,
            "Titre": str(row.get("Titre", "")),
            "Section": str(row.get("Section", "")),
            "Cote": str(row.get("Cote", "")),
            "Score": round(float(row.get("Score", 0)), 4),
        })
    
    return records


def _construire_texte_profil_depuis_orm(user_id: str) -> tuple[str, str]:
    """
    Construit deux chaînes de caractères à partir du modèle User Django
    en allant chercher directement les informations en base.
    
    Sources utilisées :
    - genres_preferes, sous_genre_prefere, intentions -> texte_genres
    - niveau_etude, date_naissance -> texte_niveau
    
    Args:
        user_id: ID de l'utilisateur (int ou str)
    
    Returns:
        tuple[str, str]: (texte_genres, texte_niveau) prétraités
    """
    from django.contrib.auth import get_user_model
    from datetime import date
    
    User = get_user_model()
    elements_genres = []
    elements_niveau = []
    
    try:
        # Récupérer l'utilisateur directement depuis la base
        user = User.objects.get(id=user_id)
        
        # --- Genres préférés ---
        if hasattr(user, 'genres_preferes') and user.genres_preferes:
            genres = user.genres_preferes
            if isinstance(genres, list):
                elements_genres.extend([str(g).lower().strip() for g in genres if g])
            elif isinstance(genres, str) and genres.strip():
                elements_genres.append(genres.lower().strip())
        
        # --- Sous-genres préférés ---
        if hasattr(user, 'sous_genre_prefere') and user.sous_genre_prefere:
            sous_genres = user.sous_genre_prefere
            if isinstance(sous_genres, list):
                elements_genres.extend([str(sg).lower().strip() for sg in sous_genres if sg])
            elif isinstance(sous_genres, str) and sous_genres.strip():
                elements_genres.append(sous_genres.lower().strip())
        
        # --- Intentions de lecture ---
        if hasattr(user, 'intentions') and user.intentions:
            intentions = user.intentions
            if isinstance(intentions, dict):
                for valeurs in intentions.values():
                    if isinstance(valeurs, list):
                        elements_genres.extend([str(v).lower().strip() for v in valeurs if v])
                    elif valeurs:
                        elements_genres.append(str(valeurs).lower().strip())
        
        # --- Niveau d'étude (enrichi sémantiquement) ---
        if hasattr(user, 'niveau_etude') and user.niveau_etude:
            niveau = str(user.niveau_etude).lower().strip()
            mapping_niveau = {
                'primaire': 'enfant école primaire',
                'college': 'collège adolescent',
                'lycee': 'lycée adolescent',
                'seconde': 'lycée adolescent seconde',
                'premiere': 'lycée adolescent première',
                'terminale': 'lycée adolescent terminale baccalauréat',
                'licence': 'université études supérieures licence',
                'master': 'recherche master université',
                'doctorat': 'recherche doctorat thèse',
            }
            elements_niveau.append(mapping_niveau.get(niveau, niveau))
        
        # --- Date de naissance → catégorie d'âge (enrichie sémantiquement) ---
        if hasattr(user, 'date_naissance') and user.date_naissance:
            today = date.today()
            age = today.year - user.date_naissance.year - (
                (today.month, today.day) < (user.date_naissance.month, user.date_naissance.day)
            )
            
            if age < 13:
                elements_niveau.append('enfant jeunesse album illustré conte')
            elif age < 18:
                elements_niveau.append('adolescent young adult roman ado')
            else:
                elements_niveau.append('adulte littérature générale essai')
        
    except User.DoesNotExist:
        return '', ''
    except Exception as e:
        warnings.warn(f"Erreur construction profil pour user_id={user_id}: {e}")
        return '', ''
    
    # Concaténer tous les éléments séparément
    texte_genres_brut = ' '.join(e for e in elements_genres if e)
    texte_niveau_brut = ' '.join(e for e in elements_niveau if e)
    
    # Appliquer le prétraitement (stopwords, stemming)
    return _nettoyer_texte(texte_genres_brut), _nettoyer_texte(texte_niveau_brut)


def _get_livres_lus_depuis_orm(user_id: str) -> set:
    """
    Récupère les Code_barres des livres déjà lus par l'utilisateur.
    Pour un nouvel utilisateur, retourne un set vide.
    
    Sources :
    - Emprunts
    - Avis postés
    - Interactions (marquage "lu")
    """
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    livres_lus = set()
    
    try:
        user = User.objects.get(id=user_id)
        
        # Emprunts
        if hasattr(user, 'emprunt_set'):
            emprunts = user.emprunt_set.all().values_list('livre__code_barres', flat=True)
            livres_lus.update(e for e in emprunts if e)
        
        # Avis
        if hasattr(user, 'avis_set'):
            avis = user.avis_set.all().values_list('livre__code_barres', flat=True)
            livres_lus.update(a for a in avis if a)
        
        # Interactions (marquage "lu")
        if hasattr(user, 'interaction_set'):
            interactions = user.interaction_set.filter(livre_lu=True).values_list('livre__code_barres', flat=True)
            livres_lus.update(i for i in interactions if i)
        
    except User.DoesNotExist:
        pass
    except Exception as e:
        warnings.warn(f"Erreur récupération livres lus pour user_id={user_id}: {e}")
    
    return livres_lus


def _fallback_populaires(n: int = 10) -> list[dict]:
    """
    Fallback : retourne les livres les plus populaires.
    """
    pop_recs = top_populaires(n)
    records = []
    for _, row in pop_recs.iterrows():
        records.append({
            "Code_barres": int(row.get("Code_barres")) if pd.notna(row.get("Code_barres")) else None,
            "Titre": str(row.get("Titre", "")),
            "Section": str(row.get("Section", "")),
            "Cote": str(row.get("Cote", "")),
            "Score": round(float(row.get("nb_emprunteurs_uniq", 0)), 4),
        })
    return records


def _inferer_genres_depuis_historique(user) -> list:
    """
    Déduit les genres préférés à partir des interactions existantes.
    Même pour un nouvel utilisateur, cela retourne une liste vide.
    """
    from .models import Book, Emprunt, Avis, Interaction
    
    # Récupérer les IDs des livres avec lesquels l'utilisateur a interagi
    livres_ids = set()
    
    # Livres empruntés
    emprunts = Emprunt.objects.filter(user=user).values_list('livre_id', flat=True)
    livres_ids.update(emprunts)
    
    # Livres notés positivement (4+ étoiles)
    avis = Avis.objects.filter(user=user, note__gte=4).values_list('livre_id', flat=True)
    livres_ids.update(avis)
    
    # Livres marqués comme lus
    interactions = Interaction.objects.filter(
        user=user, 
        livre_lu=True
    ).values_list('livre_id', flat=True)
    livres_ids.update(interactions)
    
    if not livres_ids:
        return []
    
    # Compter les genres des livres lus
    genres_count = {}
    for book in Book.objects.filter(id__in=list(livres_ids)):
        if book.genre:
            genre = str(book.genre).lower().strip()
            genres_count[genre] = genres_count.get(genre, 0) + 1
    
    # Retourner les 3 genres les plus fréquents
    sorted_genres = sorted(genres_count.items(), key=lambda x: x[1], reverse=True)
    return [genre for genre, count in sorted_genres[:3] if count >= 1]


def _compute_profile_scores(user_profile: dict, n: int = 50) -> pd.DataFrame:
    """
    Calcule un vecteur de scores (livre -> score) établi uniquement
    à partir du `user_profile` fourni. Utilisé pour compléter ou
    remplacer le signal collaboratif pour les nouveaux utilisateurs
    ou pour fusionner profil+modèle.

    Retourne un DataFrame avec colonnes STANDARD_COLS (Score normalisé).
    """
    if not user_profile or _features_livres is None:
        return pd.DataFrame(columns=STANDARD_COLS)

    # Copie de travail
    cand = _features_livres.copy()

    # Préparer préférences
    genres_pref = [str(g).lower() for g in (user_profile.get('genres_preferes') or [])]
    niveau = (user_profile.get('niveau_etude') or '')
    niveau = str(niveau).lower() if niveau else ''

    dob = user_profile.get('date_naissance')
    age_cat = None
    if dob is not None:
        try:
            if isinstance(dob, str):
                dob = pd.to_datetime(dob).date()
            from datetime import date
            today = date.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            if age < 13:
                age_cat = 'enfant'
            elif age < 18:
                age_cat = 'ado'
            else:
                age_cat = 'adulte'
        except Exception:
            age_cat = None

    # Score heuristique : somme de contributions
    scores = []
    pop_col = None
    if 'nb_emprunteurs_uniq' in cand.columns:
        pop_col = 'nb_emprunteurs_uniq'
    elif 'popularite' in cand.columns:
        pop_col = 'popularite'

    max_pop = cand[pop_col].max() if pop_col and not cand[pop_col].isnull().all() else 1.0

    for _, r in cand.iterrows():
        s = 0.0
        # genre
        try:
            book_genre = str(r.get('genre') or r.get('Genre') or '').lower()
            if genres_pref and book_genre and book_genre in genres_pref:
                s += 1.0
            # mots_cles partial match
            mots = str(r.get('mots_cles') or '').lower()
            if genres_pref and any(g in mots for g in genres_pref):
                s += 0.7
        except Exception:
            pass

        # age
        try:
            if age_cat:
                book_age = str(r.get('categorie_age') or r.get('Categorie_age') or '').lower()
                if book_age and age_cat in book_age:
                    s += 0.8
        except Exception:
            pass

        # niveau / section
        try:
            if niveau:
                section = str(r.get('Section') or r.get('section') or r.get('Cote') or '').lower()
                if section and niveau in section:
                    s += 0.5
        except Exception:
            pass

        # pondération par popularité pour favoriser titres connus
        pop_factor = 1.0
        if pop_col and max_pop > 0:
            pop_val = float(r.get(pop_col) or 0.0)
            pop_factor = 0.4 + 0.6 * (pop_val / max_pop)

        final = s * pop_factor
        if final > 0:
            scores.append({'Code_barres': r.get('Code_barres'), 'Titre': r.get('Titre'), 'Section': r.get('Section'), 'Cote': r.get('Cote'), 'Score': final})

    if not scores:
        return pd.DataFrame(columns=STANDARD_COLS)

    df = pd.DataFrame(scores)
    # Normaliser
    df['Score'] = df['Score'] / df['Score'].max()
    df = df.sort_values('Score', ascending=False).head(n)
    return df[STANDARD_COLS]


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
    global _pivot_pred, _pivot, _features_livres, _co_emprunts, _matrice_tfidf

    _modele_nmf      = composants["modele_nmf"]
    _vectorizer      = composants["vectorizer"]
    _similarite      = composants["similarite"]
    _item_sim_df     = composants["item_sim_df"]
    _pivot_pred      = composants["pivot_pred"]
    _pivot           = composants.get("pivot")
    _features_livres = composants.get("features_livres")
    _co_emprunts     = composants.get("co_emprunts")

    # Recréation de la matrice TF-IDF originelle des livres si possible
    if _vectorizer is not None and _features_livres is not None and "texte_propre" in _features_livres.columns:
        _matrice_tfidf = _vectorizer.transform(_features_livres["texte_propre"])
    else:
        _matrice_tfidf = None

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


def _utilisateur_a_historique(user_id: str) -> bool:
    """
    Vérifie si l'utilisateur a suffisamment d'interactions
    pour basculer en mode collaboratif.
    
    Critère : Présent dans le pivot ET a au moins 1 livre lu
    """
    _verifier_chargement()
    
    if user_id not in _pivot.index:
        return False
    
    user_idx = _pivot.index.get_loc(user_id)
    nb_livres_lus = (_pivot.iloc[user_idx] > 0).sum()
    
    return nb_livres_lus >= 1


# ============================================================================
# RÉGIME 2 : COLLABORATIF (NMF PRIORITAIRE 60% + KNN 25% + Contenu 15%)
# ============================================================================

def _get_nmf_scores(user_idx: int) -> pd.Series:
    """
    Scores NMF (factorisation de matrice) — relations cachées.
    """
    _verifier_chargement()
    
    scores = _pivot_pred.iloc[user_idx].copy()
    scores = scores[scores > 0]
    
    if scores.empty:
        return pd.Series(dtype=float)
    
    score_max = scores.max()
    if score_max > 0:
        scores = scores / score_max
    
    return scores


def _get_knn_scores(user_idx: int, k: int = 20) -> pd.Series:
    """
    Scores KNN user-user — similarité directe entre utilisateurs.
    """
    _verifier_chargement()
    
    from sklearn.metrics.pairwise import cosine_similarity
    
    vecteur_cible = _pivot.iloc[user_idx].values.reshape(1, -1)
    autres = _pivot.drop(_pivot.index[user_idx])
    
    if autres.empty:
        return pd.Series(dtype=float)
    
    similarites = cosine_similarity(vecteur_cible, autres.values).flatten()
    
    k = min(k, len(similarites))
    indices_top_k = np.argsort(similarites)[-k:][::-1]
    
    livres_lus = set(_pivot.columns[_pivot.iloc[user_idx] > 0])
    
    scores = {}
    for voisin_idx in indices_top_k:
        sim = similarites[voisin_idx]
        if sim <= 0:
            continue
        
        livres_voisin = _pivot.iloc[voisin_idx]
        livres_voisin = livres_voisin[livres_voisin > 0]
        
        for code_barres, intensite in livres_voisin.items():
            if code_barres in livres_lus:
                continue
            scores[code_barres] = scores.get(code_barres, 0) + sim * intensite
    
    if not scores:
        return pd.Series(dtype=float)
    
    result = pd.Series(scores)
    score_max = result.max()
    if score_max > 0:
        result = result / score_max
    
    return result


def _get_contenu_scores_from_history(user_idx: int) -> pd.Series:
    """
    Scores contenu — moyenne des similarités cosinus avec les livres déjà lus.
    """
    _verifier_chargement()
    
    livres_lus = _pivot.columns[_pivot.iloc[user_idx] > 0]
    
    if len(livres_lus) == 0:
        return pd.Series(dtype=float)
    
    indices_lus = []
    for code in livres_lus:
        match = _features_livres[_features_livres['Code_barres'] == code]
        if not match.empty:
            indices_lus.append(match.index[0])
    
    if not indices_lus:
        return pd.Series(dtype=float)
    
    scores = np.zeros(len(_features_livres))
    for idx in indices_lus:
        scores += _similarite[idx]
    scores = scores / len(indices_lus)
    
    result = pd.Series(scores, index=_features_livres['Code_barres'])
    
    score_max = result.max()
    if score_max > 0:
        result = result / score_max
    
    return result


def _recommander_collaboratif_prioritaire(user_id: str, n: int = 10) -> list[dict]:
    """
    Recommandations collaboratives avec NMF prioritaire.
    
    Fusion pondérée :
    - NMF  : 60% (prioritaire — factorisation de matrice, relations cachées)
    - KNN  : 25% (similarité directe entre utilisateurs)
    - Contenu : 15% (cohérence thématique)
    """
    _verifier_chargement()
    
    if user_id not in _pivot.index:
        return _recommander_nouvel_utilisateur(user_id, n)
    
    user_idx = _pivot.index.get_loc(user_id)
    
    # Récupérer les scores de chaque méthode
    scores_nmf = _get_nmf_scores(user_idx)
    scores_knn = _get_knn_scores(user_idx)
    scores_contenu = _get_contenu_scores_from_history(user_idx)
    
    # Fusionner avec pondération
    tous_les_codes = set()
    for s in [scores_nmf, scores_knn, scores_contenu]:
        tous_les_codes.update(s.index.tolist())
    
    scores_finaux = {}
    for code in tous_les_codes:
        s_nmf = scores_nmf.get(code, 0)
        s_knn = scores_knn.get(code, 0)
        s_cont = scores_contenu.get(code, 0)
        
        # NMF prioritaire à 60%
        scores_finaux[code] = 0.60 * s_nmf + 0.25 * s_knn + 0.15 * s_cont
    
    result = pd.Series(scores_finaux)
    
    # Enlever les livres déjà lus
    livres_lus = set(_pivot.columns[_pivot.iloc[user_idx] > 0])
    result = result.drop(livres_lus, errors='ignore')
    
    # Top N
    top = result.nlargest(n)
    
    # Formater
    records = []
    for code_barres, score in top.items():
        info = _features_livres[_features_livres['Code_barres'] == code_barres]
        if not info.empty:
            records.append({
                "Code_barres": int(code_barres) if pd.notna(code_barres) else None,
                "Titre": str(info.iloc[0].get("Titre", "")),
                "Section": str(info.iloc[0].get("Section", "")),
                "Cote": str(info.iloc[0].get("Cote", "")),
                "Score": round(float(score), 4),
            })
    
    return records


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
    return livres_tries[["Code_barres", "Titre", "Section", "Cote", "nb_emprunteurs_uniq"]].reset_index(drop=True)


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
        return top_populaires(n)[["Code_barres", "Titre", "Section", "Cote", "nb_emprunteurs_uniq"]].rename(
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