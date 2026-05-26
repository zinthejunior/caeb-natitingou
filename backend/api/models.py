"""
models.py — Modèles Django de la bibliothèque CAEB Natitingou.
"""

from django.db import models
from django.contrib.auth.models import AbstractUser

  
# ── UTILISATEUR ──────────────────────────────────────────────
class User(AbstractUser):
    """
    Utilisateur de l'application. Trois niveaux :
      - non_membre : inscrit, pas encore validé
      - membre     : accès aux prêts et réservations
      - anonyme    : visiteur sans compte
    Hérite d'AbstractUser pour le système d'authentification Django.
    """
    TYPE_COMPTE_CHOICES = [
        ('anonyme',    'Anonyme'),
        ('non_membre', 'Non-membre'),
        ('membre',     'Membre'),
    ]

    id               = models.CharField(max_length=40, primary_key=True)          # UUID généré à l'inscription
    type_compte      = models.CharField(max_length=20, choices=TYPE_COMPTE_CHOICES, default='non_membre')
    date_naissance   = models.DateField(null=True, blank=True)
    niveau_etude     = models.CharField(max_length=50, null=True, blank=True)     # Ex: "Lycée", "Étudiant"
    classe           = models.CharField(max_length=100, null=True, blank=True)    # Ex: "Terminale S"
    date_inscription = models.DateTimeField(auto_now_add=True)                    # Remplie automatiquement
    favorites        = models.JSONField(default=list, blank=True)                 # Liste d'IDs de livres favoris
    intentions       = models.JSONField(default=list, blank=True)                 # Objectifs déclarés à l'inscription
    followed_clubs   = models.JSONField(default=list, blank=True)                 # Liste d'IDs de clubs suivis
    genre_prefere    = models.CharField(max_length=200, null=True, blank=True)
    sous_genre_prefere = models.CharField(max_length=200, null=True, blank=True)
    telephone        = models.CharField(max_length=20, null=True, blank=True)
    adresse          = models.TextField(null=True, blank=True)
    demande_adhesion = models.BooleanField(default=False, help_text="Vrai si l'utilisateur a soumis une demande d'adhésion")
    is_verified   = models.BooleanField(default=False)                            # Compte confirmé ?
    confirmation_code = models.CharField(max_length=6, null=T rue, blank=True)    # Code de vérification
    confirmation_method = models.CharField(max_length=20, default="email")        # email, sms, whatsapp

    # Surcharge pour éviter les conflits avec AbstractUser
    first_name = models.CharField(max_length=100)
    last_name  = models.CharField(max_length=100)

    class Meta:
        db_table = 'api_user'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.username})"


# ── LIVRE ────────────────────────────────────────────────────
class Book(models.Model):
    """
    Livre du catalogue.
    `exemplaires` remplace l'ancien booléen `disponible` :
      0 = plus d'exemplaire disponible, > 0 = emprunt possible.
    """
    CATEGORIE_AGE_CHOICES = [
        ('enfant', 'Enfant'),
        ('ado',    'Ado'),
        ('adulte', 'Adulte'),
    ]

    id            = models.CharField(max_length=20, primary_key=True)
    ol_id         = models.CharField(max_length=30, unique=True, null=True, blank=True)  # ID OpenLibrary
    titre         = models.CharField(max_length=300)
    auteur        = models.CharField(max_length=200, null=True, blank=True)
    genre         = models.CharField(max_length=100, null=True, blank=True)
    sous_genre    = models.CharField(max_length=100, null=True, blank=True)
    annee         = models.IntegerField(null=True, blank=True)                    # Année de publication
    nb_pages      = models.IntegerField(null=True, blank=True)
    langue        = models.CharField(max_length=10, default='fr')
    categorie_age = models.CharField(max_length=10, choices=CATEGORIE_AGE_CHOICES, default='adulte')
    note_moyenne  = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    nb_notes      = models.IntegerField(default=0)                                # Nombre d'avis
    # db_column='disponible' = nom exact de la colonne dans data.db
    exemplaires   = models.IntegerField(default=1, db_column='disponible',
                                        help_text="Nombre d'exemplaires physiques disponibles")
    resume        = models.TextField(null=True, blank=True)

    resume        = models.TextField(null=True, blank=True)
    couverture_url = models.CharField(max_length=300, null=True, blank=True)     # URL de l'image de couverture
    mots_cles     = models.TextField(null=True, blank=True)                       # Mots-clés pour la recherche
    nb_emprunts   = models.IntegerField(default=0)                                # Stats d'emprunts
    popularite    = models.FloatField(default=0.0)                                # Score pour l'algorithme
    vecteur_livre = models.JSONField(null=True, blank=True)                       # Embeddings pour Kossi AI
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'livres'

    @property
    def est_disponible(self):
        """Propriété calculée : vrai s'il reste au moins 1 exemplaire."""
        return self.exemplaires > 0

    def __str__(self):
        return self.titre


# ── EMPRUNT ──────────────────────────────────────────────────
class Borrow(models.Model):
    """
    Emprunt physique d'un livre par un membre.
    Cycle : en_cours → rendu (ou perdu si jamais retourné).
    """
    STATUT_CHOICES = [
        ('en_cours', 'En cours'),
        ('rendu',    'Rendu'),
        ('perdu',    'Perdu'),
    ]

    id           = models.CharField(max_length=20, primary_key=True)
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='borrows')
    livre        = models.ForeignKey(Book, on_delete=models.CASCADE)
    date_emprunt = models.DateField()
    date_prevue  = models.DateField()                      # Date limite de retour
    date_retour  = models.DateField(null=True, blank=True) # Remplie quand le livre est rendu
    renouvele    = models.BooleanField(default=False)       # Emprunt prolongé ?
    statut       = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_cours')

    class Meta:
        db_table = 'emprunts'


# ── INTERACTION UTILISATEUR ↔ LIVRE ──────────────────────────
class Interaction(models.Model):
    """
    Trace chaque action d'un utilisateur sur un livre
    (vue, note, favori, chat IA...) pour alimenter Kossi.
    """
    TYPE_ACTION_CHOICES = [
        ('vue',      'Vue'),
        ('note',     'Note'),
        ('like',     "J'aime"),
        ('chat_ia',  'Chat IA'),
        ('marquage', 'Marquage'),
    ]
    SOURCE_CHOICES = [
        ('application', 'Application'),
        ('chat_ia',     'Chat IA'),
        ('recherche',   'Recherche'),
    ]

    id             = models.CharField(max_length=20, primary_key=True)
    user           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interactions')
    livre          = models.ForeignKey(Book, on_delete=models.CASCADE)
    type_action    = models.CharField(max_length=20, choices=TYPE_ACTION_CHOICES)
    notation       = models.IntegerField(null=True, blank=True)     # Note donnée (1-5)
    duree_secondes = models.IntegerField(null=True, blank=True)     # Temps passé sur la page
    livre_lu       = models.BooleanField(default=False)             # L'utilisateur déclare avoir lu le livre
    commentaire    = models.TextField(null=True, blank=True)
    position       = models.IntegerField(null=True, blank=True)     # Position dans les recommandations
    source         = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='application')
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interactions'


# ── SESSION IA (Kossi) ────────────────────────────────────────
class SessionIA(models.Model):
    """
    Contexte d'une session de dialogue avec Kossi.
    Conservé pour affiner les recommandations futures.
    """
    HUMEUR_CHOICES = [
        ('léger', 'Léger'), ('intense', 'Intense'), ('évasion', 'Évasion'),
        ('neutre', 'Neutre'), ('triste', 'Triste'), ('aventurier', 'Aventurier'),
        ('romantique', 'Romantique'), ('curieux', 'Curieux'),
        ('nostalgique', 'Nostalgique'), ('stressé', 'Stressé'), ('détendu', 'Détendu'),
    ]

    id                = models.CharField(max_length=20, primary_key=True)
    user              = models.ForeignKey(User, on_delete=models.CASCADE)
    humeur_detectee   = models.CharField(max_length=20, choices=HUMEUR_CHOICES, default='neutre')
    vecteur_intention = models.JSONField(null=True, blank=True)  # Vecteur TF-IDF du profil
    livres_rejetes    = models.JSONField(null=True, blank=True)  # IDs refusés pendant la session
    livres_acceptes   = models.JSONField(null=True, blank=True)  # IDs retenus
    debut             = models.DateTimeField(auto_now_add=True)
    fin               = models.DateTimeField(null=True, blank=True)
    active            = models.BooleanField(default=True)

    class Meta:
        db_table = 'sessions_ia'


# ── NOTIFICATION ─────────────────────────────────────────────
class Notification(models.Model):
    """
    Notification envoyée à un utilisateur.
    Utilisée notamment pour les rappels de retour de livre après 7 jours.
    """
    TYPE_NOTIF_CHOICES = [
        ('rappel_retour',    'Rappel retour'),
        ('retard',           'Retard'),
        ('livre_disponible', 'Livre disponible'),
        ('nouveaute',        'Nouvelle arrivée'),
    ]

    id         = models.CharField(max_length=20, primary_key=True)
    user       = models.ForeignKey(User, on_delete=models.CASCADE)
    emprunt    = models.ForeignKey(Borrow, on_delete=models.CASCADE, null=True, blank=True)
    livre      = models.ForeignKey(Book, on_delete=models.CASCADE, null=True, blank=True)
    type_notif = models.CharField(max_length=30, choices=TYPE_NOTIF_CHOICES)
    message    = models.TextField()
    envoyee_le = models.DateTimeField(auto_now_add=True)
    lue        = models.BooleanField(default=False)  # Passe à True quand l'utilisateur ouvre la notif

    class Meta:
        db_table = 'notifications'


# ── CLUB DE LECTURE ───────────────────────────────────────────
class ReadingClub(models.Model):
    """
    Club de lecture de la bibliothèque.
    Chaque club a un responsable et peut organiser des événements.
    """
    AUDIENCE_CHOICES = [
        ('children', 'Enfants'),
        ('teen',     'Adolescents'),
        ('adult',    'Adultes'),
        ('all',      'Tout public'),
    ]

    id              = models.CharField(max_length=20, primary_key=True)
    name            = models.CharField(max_length=200)
    description     = models.TextField()
    image           = models.CharField(max_length=300, null=True, blank=True)
    target_audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='all')
    member_count    = models.IntegerField(default=0)  # Incrémenté à chaque adhésion

    # Responsable du club
    manager_name  = models.CharField(max_length=100, null=True, blank=True)
    manager_role  = models.CharField(max_length=100, null=True, blank=True)
    manager_email = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.name


# ── ÉVÉNEMENT / AGENDA ────────────────────────────────────────
class Event(models.Model):
    """
    Événement organisé par la bibliothèque.
    Peut être lié à un club via la clé étrangère `club`.
    """
    TYPE_CHOICES = [
        ('club',       'Club'),
        ('conference', 'Conférence'),
        ('workshop',   'Atelier'),
    ]

    id                = models.CharField(max_length=20, primary_key=True)
    title             = models.CharField(max_length=200)
    description       = models.TextField()
    type_event        = models.CharField(max_length=20, choices=TYPE_CHOICES, default='conference')
    date              = models.DateField()
    time              = models.CharField(max_length=10)        # Heure de début, ex: "14:00"
    location          = models.CharField(max_length=200)       # Lieu dans la bibliothèque
    participant_count = models.IntegerField(default=0)         # Incrémenté à chaque inscription
    # Null si l'événement n'est pas lié à un club spécifique
    club = models.ForeignKey(ReadingClub, on_delete=models.CASCADE,
                             null=True, blank=True, related_name='events')

    def __str__(self):
        return self.title


# ── ACTUALITÉS ───────────────────────────────────────────────
class News(models.Model):
    """Article d'actualité publié par la bibliothèque."""
    CATEGORY_CHOICES = [
        ('announcement', 'Annonce'),
        ('event',        'Événement'),
        ('course',       'Cours'),
        ('visit',        'Visite'),
        ('closure',      'Fermeture'),
        ('general',      'Général'),
    ]

    id       = models.CharField(max_length=20, primary_key=True)
    title    = models.CharField(max_length=200)
    excerpt  = models.TextField()                               # Résumé court (affiché dans la liste)
    content  = models.TextField(null=True, blank=True)          # Contenu complet
    image    = models.CharField(max_length=300, null=True, blank=True)
    date     = models.DateField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    featured = models.BooleanField(default=False)               # Mis en avant sur l'accueil ?

    def __str__(self):
        return self.title


# ── AVIS / NOTATION ───────────────────────────────────────────
class Review(models.Model):
    """Avis laissé par un utilisateur sur un livre (note 1-5 + commentaire)."""
    user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    livre       = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reviews')
    note        = models.IntegerField()      # Note de 1 à 5
    commentaire = models.TextField()
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Avis de {self.user.username} sur {self.livre.titre}"


# ── RÉSERVATION ───────────────────────────────────────────────
class Reservation(models.Model):
    """
    Demande de réservation d'un livre par un membre.
    Le bibliothécaire valide ensuite et crée l'emprunt physique.
    Cycle : en_attente → prete → terminee (ou annulee).
    """
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),  # Demande reçue, pas encore traitée
        ('prete',      'Prête'),       # Livre prêt à récupérer à l'accueil
        ('annulee',    'Annulée'),
        ('terminee',   'Terminée'),    # L'emprunt a eu lieu
    ]

    user             = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reservations')
    livre            = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reservations')
    date_reservation = models.DateTimeField(auto_now_add=True)
    statut           = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')

    def __str__(self):
        return f"Réservation de {self.user.username} pour {self.livre.titre}"


# ── MESSAGE DE CONTACT (formulaire club) ──────────────────────
class ClubContactMessage(models.Model):
    """
    Message envoyé depuis le formulaire de contact d'un club.
    Visible uniquement par les administrateurs.
    """
    club       = models.ForeignKey(ReadingClub, on_delete=models.CASCADE, related_name='contact_messages')
    # Null si l'expéditeur n'est pas connecté
    user       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='contact_messages')
    nom        = models.CharField(max_length=100)
    email      = models.EmailField()
    message    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message de {self.nom} pour {self.club.name}"


# ── SESSION DE CHAT (Kossi) ───────────────────────────────────
class ChatSession(models.Model):
    """
    Conversation sauvegardée entre un utilisateur et Kossi.
    Permet de retrouver l'historique de dialogue.
    """
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions')
    titre      = models.CharField(max_length=200, default='Nouvelle conversation')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # Mis à jour automatiquement à chaque message

    def __str__(self):
        return f"Chat de {self.user.username} — {self.titre}"


class ChatMessage(models.Model):
    """
    Message individuel dans une session de chat.
    role='user'      → message de l'utilisateur
    role='assistant' → réponse de Kossi
    """
    ROLE_CHOICES = [
        ('user',      'Utilisateur'),
        ('assistant', 'Assistant'),
    ]

    session    = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role       = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']  # Triés du plus ancien au plus récent

    def __str__(self):
        return f"[{self.role}] {self.content[:50]}"


# ── LABORATOIRE IA ────────────────────────────────────────────
class LabStation(models.Model):
    """
    Poste informatique du Laboratoire IA (Cyberespace CAEB).
    Chaque poste peut être réservé pour des créneaux de 2 heures.
    isActive=False signifie que le poste est en maintenance.
    """
    name           = models.CharField(max_length=100)
    specifications = models.CharField(max_length=300, null=True, blank=True)
    isActive       = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lab_stations'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({'Opérationnel' if self.isActive else 'Maintenance'})"


class LabReservation(models.Model):
    """
    Réservation d'un poste du Laboratoire IA par un membre.
    Un créneau de 2 heures ne peut pas être doublé sur le même poste.
    """
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('confirmee',  'Confirmée'),
        ('annulee',    'Annulée'),
        ('terminee',   'Terminée'),
    ]

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lab_reservations')
    station    = models.ForeignKey(LabStation, on_delete=models.CASCADE, related_name='reservations')
    date       = models.DateField()
    start_time = models.TimeField()
    end_time   = models.TimeField()
    purpose    = models.CharField(max_length=300, null=True, blank=True)
    statut     = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lab_reservations'
        # Un poste ne peut pas être réservé deux fois sur le même créneau/date
        unique_together = [('station', 'date', 'start_time')]

    def __str__(self):
        return f"{self.user.username} → {self.station.name} le {self.date} à {self.start_time}"
