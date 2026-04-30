-- ============================================================
--  Système de Recommandation de Livres — Schéma MySQL COMPLET
--  Conforme au document de recommandation (toutes les tables et
--  tous les champs décrits dans le document sont présents).
--  Exécuter EN PREMIER avant tout scraping ou import.
-- ============================================================

CREATE DATABASE IF NOT EXISTS livre_recommandation
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE livre_recommandation;

-- ═════════════════════════════════════════════════════════════
-- 1. DOMAINE UTILISATEURS
-- ═════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
    id                  VARCHAR(10)   PRIMARY KEY,           -- ex: u-0001
    nom                 VARCHAR(100)  NOT NULL,
    email               VARCHAR(150)  UNIQUE NOT NULL,

    -- Type de compte : détermine le pipeline de recommandation
    type_compte         ENUM('anonyme','non_membre','membre') NOT NULL DEFAULT 'non_membre',

    -- Profil démographique (filtres et affinage des reco)
    date_naissance      DATE,                                -- calcul automatique tranche d'âge
    niveau_etude        ENUM('école','lycée','étudiant','professionnel','autre'),
    classe              VARCHAR(50),                         -- ex: 'MI L2', 'Médecine 5', 'Tle'

    -- Goûts déclarés à l'inscription (point de départ avant accumulation des signaux)
    genre_prefere       VARCHAR(100),
    sous_genre_prefere  VARCHAR(100),

    -- Score de confiance C ∈ [0,1] — recalculé après chaque session
    -- Formule non-membre : 0.20×profil_complet + 0.35×(nb_avis/5) + 0.25×(nb_genres/3) + 0.20×(ancienneté/90j)
    -- Formule membre     : 0.20×profil_complet + 0.40×(nb_emprunts/5) + 0.25×(nb_genres/3) + 0.15×(ancienneté/90j)
    score_confiance     DECIMAL(4,3)  DEFAULT 0.000,

    -- Profil complet = niveau + classe + genre + sous-genre tous renseignés → booste C de 0.20
    profil_complet      TINYINT(1)    DEFAULT 0,

    -- Représentation mathématique des goûts — mise à jour en arrière-plan post-session
    -- Format JSON : {"genres": {"Roman": 0.8, "Policier": 0.5}, "sous_genres": {...},
    --                "mots_cles": {"thriller": 0.7}, "auteurs": {...}}
    vecteur_profil      JSON,

    date_inscription    DATETIME      DEFAULT CURRENT_TIMESTAMP
);

-- ═════════════════════════════════════════════════════════════
-- 2. DOMAINE CATALOGUE
-- ═════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS livres (
    id              VARCHAR(20)   PRIMARY KEY,               -- ex: l-0001
    ol_id           VARCHAR(30)   UNIQUE,                    -- Open Library / Google Books ID
    titre           VARCHAR(300)  NOT NULL,
    auteur          VARCHAR(200),
    genre           VARCHAR(100),
    sous_genre      VARCHAR(100),
    annee           INT,
    nb_pages        INT,
    langue          VARCHAR(10)   DEFAULT 'fr',

    -- Filtrage absolu par âge — un livre adulte n'apparaît JAMAIS pour un enfant
    categorie_age   ENUM('enfant','ado','adulte')  DEFAULT 'adulte',

    -- Tags thématiques enrichissant la comparaison CB (content-based)
    mots_cles       JSON,                                    -- ex: ["guerre","amour","Paris"]

    -- Scores de popularité
    note_moyenne    DECIMAL(3,2)  DEFAULT 0.00,              -- 0.00 à 5.00
    nb_notes        INT           DEFAULT 0,
    nb_emprunts     INT           DEFAULT 0,                 -- nombre total d'emprunts
    popularite      DECIMAL(5,4)  DEFAULT 0.0000,            -- score normalisé log-scale 0-1

    -- Représentation mathématique du contenu — permet comparaison livre vs livre (IB)
    -- Format JSON : {"genre": "Roman", "sous_genre": "Policier", "mots_cles": {"enquête": 1, ...}}
    vecteur_livre   JSON,

    disponible      TINYINT(1)    DEFAULT 1,                 -- 0 = retiré du catalogue
    resume          TEXT,
    couverture_url  VARCHAR(300),
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP
);

-- Similarités précalculées entre livres (moteur IB)
CREATE TABLE IF NOT EXISTS livres_similaires (
    livre_id        VARCHAR(20)   NOT NULL,
    similaire_id    VARCHAR(20)   NOT NULL,
    score           DECIMAL(5,4)  NOT NULL,                  -- similarité cosinus 0-1
    date_calcul     DATETIME      DEFAULT CURRENT_TIMESTAMP, -- détecte les données obsolètes
    PRIMARY KEY (livre_id, similaire_id),
    FOREIGN KEY (livre_id)     REFERENCES livres(id) ON DELETE CASCADE,
    FOREIGN KEY (similaire_id) REFERENCES livres(id) ON DELETE CASCADE
);

-- ═════════════════════════════════════════════════════════════
-- 3. DOMAINE INTERACTIONS
-- ═════════════════════════════════════════════════════════════

-- Emprunts physiques — membres UNIQUEMENT
CREATE TABLE IF NOT EXISTS emprunts (
    id                  VARCHAR(10)   PRIMARY KEY,
    user_id             VARCHAR(10)   NOT NULL,
    livre_id            VARCHAR(20)   NOT NULL,
    date_emprunt        DATE          NOT NULL,
    date_prevue         DATE          NOT NULL,              -- date contractuelle de retour
    date_retour         DATE,                                -- NULL = en cours
    renouvele           TINYINT(1)    DEFAULT 0,             -- prolongation → engagement fort
    duree_emprunt       SMALLINT,                            -- durée effective en jours
    statut              ENUM('en_cours','rendu','perdu')     DEFAULT 'en_cours',
    poids               DECIMAL(3,2)  DEFAULT 1.00,          -- 1.0 normal · 1.3 renouvellement
    FOREIGN KEY (user_id)  REFERENCES users(id),
    FOREIGN KEY (livre_id) REFERENCES livres(id)
);

-- Interactions — non-membres ET membres
CREATE TABLE IF NOT EXISTS interactions (
    id              VARCHAR(10)   PRIMARY KEY,
    user_id         VARCHAR(10)   NOT NULL,
    livre_id        VARCHAR(20)   NOT NULL,
    type_action     ENUM('vue','note','like','chat_ia','marquage') NOT NULL,

    -- Séparation des deux signaux (anciennement fusionnés dans "valeur")
    notation        TINYINT       CHECK (notation BETWEEN 1 AND 5),  -- note /5 (NULL si type ≠ note)
    duree_secondes  SMALLINT,                               -- temps lecture résumé (NULL si type ≠ vue)
                                                            -- > 30s = intérêt réel

    -- Signaux déclaratifs
    livre_lu        TINYINT(1)    DEFAULT 0,                -- l'utilisateur déclare avoir lu ce livre
    commentaire     TEXT,                                   -- texte libre analysé par l'IA

    position        INT,                                    -- position du clic dans la liste de reco
                                                            -- position ≥ 4 → premières suggestions peu pertinentes
    source          ENUM('application','chat_ia','recherche') DEFAULT 'application',
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(id),
    FOREIGN KEY (livre_id) REFERENCES livres(id)
);

-- ═════════════════════════════════════════════════════════════
-- 4. DOMAINE INTELLIGENCE
-- ═════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sessions_ia (
    id                  VARCHAR(10)   PRIMARY KEY,
    user_id             VARCHAR(10)   NOT NULL,

    -- Humeur détectée par l'IA dans les messages
    humeur_detectee     ENUM('léger','intense','évasion','neutre','triste',
                             'aventurier','romantique','curieux','nostalgique',
                             'stressé','détendu')           DEFAULT 'neutre',

    -- Vecteur d'intention : goûts détectés PENDANT la session
    -- Modifie les reco pendant la session uniquement (réinitialisé à closed_at)
    -- Format JSON : {"genres": ["Policier"], "contraintes": ["court"], "humeur": "léger"}
    vecteur_intention   JSON,

    livres_rejetes      JSON,                               -- pénalisés temporairement
    livres_acceptes     JSON,                               -- léger boost post-session

    debut               DATETIME      DEFAULT CURRENT_TIMESTAMP,  -- created_at
    fin                 DATETIME,                           -- closed_at — déclenche réinit intention
    active              TINYINT(1)    DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications — membres UNIQUEMENT
CREATE TABLE IF NOT EXISTS notifications (
    id              VARCHAR(10)   PRIMARY KEY,
    user_id         VARCHAR(10)   NOT NULL,
    -- emprunt_id est NULL pour le type 'nouvelle_recommandation'
    emprunt_id      VARCHAR(10),
    livre_id        VARCHAR(20),                            -- livre concerné (si applicable)
    type_notif      ENUM(
                        'rappel_retour',                    -- date de retour proche
                        'retard',                           -- livre en retard
                        'livre_disponible',                 -- livre réservé de retour
                        'nouvelle_recommandation'           -- nouvelles suggestions dispo
                    ) NOT NULL,
    message         TEXT,
    envoyee_le      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    lue             TINYINT(1)    DEFAULT 0,
    FOREIGN KEY (user_id)    REFERENCES users(id),
    FOREIGN KEY (emprunt_id) REFERENCES emprunts(id),
    FOREIGN KEY (livre_id)   REFERENCES livres(id)
);

-- ═════════════════════════════════════════════════════════════
-- INDEX pour les performances
-- ═════════════════════════════════════════════════════════════

-- ═════════════════════════════════════════════════════════════
-- INDEX pour les performances
-- ═════════════════════════════════════════════════════════════

CREATE INDEX idx_users_type           ON users(type_compte);
CREATE INDEX idx_users_score          ON users(score_confiance);
CREATE INDEX idx_livres_genre         ON livres(genre);
CREATE INDEX idx_livres_age           ON livres(categorie_age);
CREATE INDEX idx_livres_popularite    ON livres(popularite);
CREATE INDEX idx_livres_disponible    ON livres(disponible);
CREATE INDEX idx_emprunts_user        ON emprunts(user_id);
CREATE INDEX idx_emprunts_statut      ON emprunts(statut);
CREATE INDEX idx_interactions_user    ON interactions(user_id);
CREATE INDEX idx_interactions_livre   ON interactions(livre_id);
CREATE INDEX idx_interactions_type    ON interactions(type_action);
CREATE INDEX idx_sessions_user        ON sessions_ia(user_id);
CREATE INDEX idx_sessions_active      ON sessions_ia(active);
CREATE INDEX idx_notifs_user          ON notifications(user_id);
CREATE INDEX idx_notifs_lue           ON notifications(lue);