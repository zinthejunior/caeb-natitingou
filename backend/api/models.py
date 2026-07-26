import math
from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
from django.utils.timezone import now
from django.db.models import Avg, Max, Count
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

# ── UTILISATEURS ─────────────────────────────────────────────

class User(AbstractUser):
    """
    Modèle d'utilisateur personnalisé pour la bibliothèque CAEB.
    Hérite de AbstractUser pour conserver les fonctionnalités d'authentification intégrées de Django (JWT, mot de passe).
    """
    TYPE_COMPTE_CHOICES = [
        ('non_membre', 'Non-membre'),
        ('en_attente', 'En attente'),
        ('membre', 'Membre'),
    ]

    import uuid
    id = models.CharField(max_length=40, primary_key=True, default=uuid.uuid4, editable=False)
    
    # type_compte : l'accès à la plateforme nécessite un compte. Pas de type 'anonyme'.
    type_compte = models.CharField(
        max_length=20, 
        choices=TYPE_COMPTE_CHOICES, 
        default='non_membre',
        help_text="Statut du compte : non-membre par défaut, puis membre après validation physique par le bibliothécaire."
    )
    
    # Données démographiques et de scolarité pour l'analyse IA
    date_naissance = models.DateField(null=True, blank=True, help_text="Date de naissance de l'utilisateur.")
    niveau_etude = models.CharField(max_length=50, null=True, blank=True, help_text="Niveau d'étude actuel (Primaire, Secondaire, Supérieur, etc.).")
    classe = models.CharField(max_length=100, null=True, blank=True, help_text="Classe spécifique de l'élève ou de l'étudiant.")
    
    # Informations de contact
    telephone = models.CharField(max_length=20, null=True, blank=True, help_text="Numéro de téléphone de contact (optionnel).")
    
    # Suivi d'inscription et profil
    from django.utils.timezone import now
    date_inscription = models.DateTimeField(default=now, help_text="Date et heure de création du compte sur la plateforme.")
    favorites = models.JSONField(blank=True, default=list, help_text="Liste des identifiants des livres favoris de l'utilisateur.")
    intentions = models.JSONField(blank=True, default=list, help_text="Objectifs/intentions de lecture déclarés à l'inscription.")
    
    # Informations complémentaires
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom de famille")
    avatar = models.CharField(max_length=300, null=True, blank=True, help_text="Lien ou URL de la photo de profil.")
    bio = models.TextField(null=True, blank=True, help_text="Courte biographie rédigée par l'utilisateur.")
    pseudo = models.CharField(max_length=50, null=True, blank=True, help_text="Nom d'affichage public (pseudonyme).")
    
    # Préférences littéraires
    genres_preferes = models.JSONField(blank=True, default=list, help_text="Genres littéraires favoris.")
    sous_genre_prefere = models.JSONField(blank=True, default=list, help_text="Sous-genres littéraires favoris.")

    # Suivi d'adhésion physique
    demande_adhesion = models.BooleanField(default=False, help_text="Indique si l'utilisateur a soumis une demande d'adhésion physique.")

    objects = UserManager()

    def __str__(self):
        return f"{self.username} ({self.get_type_compte_display()})"


# ── LIVRES ────────────────────────────────────────────────────

class Book(models.Model):
    """
    Modèle représentant un ouvrage physique disponible dans la bibliothèque CAEB.
    """
    CATEGORIE_AGE_CHOICES = [
        ('enfant', 'Enfant'),
        ('ado', 'Ado'),
        ('adulte', 'Adulte'),
    ]

    id = models.CharField(max_length=50, primary_key=True)
    titre = models.CharField(max_length=300, help_text="Titre complet de l'ouvrage.")
    auteur = models.CharField(max_length=200, null=True, blank=True, help_text="Nom complet de l'auteur.")
    genre = models.CharField(max_length=100, null=True, blank=True, help_text="Genre principal (ex: Roman, Essai, Bande dessinée).")
    sous_genre = models.CharField(max_length=100, null=True, blank=True, help_text="Sous-genre optionnel pour classification plus fine.")
    annee = models.IntegerField(null=True, blank=True, help_text="Année d'édition ou de publication.")
    nb_pages = models.IntegerField(null=True, blank=True, help_text="Nombre total de pages du livre.")
    langue = models.CharField(max_length=10, default='fr', help_text="Code langue de l'ouvrage (fr par défaut).")
    
    # Public visé
    categorie_age = models.CharField(
        max_length=10, 
        choices=CATEGORIE_AGE_CHOICES, 
        default='adulte',
        help_text="Tranche d'âge cible pour la lecture."
    )
    
    # Notation globale
    note_moyenne = models.DecimalField(max_digits=3, decimal_places=2, default=0.0, help_text="Note moyenne calculée à partir des avis (0 à 5).")
    nb_notes = models.IntegerField(default=0, help_text="Nombre d'avis de notation enregistrés.")
    
    # Gestion physique du stock et localisation
    exemplaires = models.IntegerField(default=1, help_text="Nombre d'exemplaires physiques disponibles pour le prêt.")
    cote = models.CharField(max_length=50, null=True, blank=True, help_text="Cote physique de rangement (texte libre, ex: R-042).")
    section = models.CharField(max_length=200, null=True, blank=True, help_text="Section physique de rangement (texte libre, ex: Roman, Sciences).")
    localisation = models.CharField(max_length=100, null=True, blank=True, help_text="Localisation précise de l'ouvrage dans les rayons.")
    codes_barres = models.TextField(null=True, blank=True, help_text="Codes barres de tous les exemplaires associés (séparés par des virgules).")
    
    # Contenu et descriptif
    resume = models.TextField(null=True, blank=True, help_text="Résumé détaillé de l'œuvre.")
    description = models.TextField(null=True, blank=True, help_text="Description littéraire ou technique additionnelle pour l'IA.")
    couverture_url = models.CharField(default="https://www.cosmopolitan.fr/les-5-plus-beaux-livres-de-colleen-hoover-pour-decouvrir-la-new-romance,2120559.asp", max_length=300, null=True, blank=True, help_text="URL de l'image de couverture.")
    mots_cles = models.TextField(null=True, blank=True, help_text="Mots-clés associés séparés par des virgules.")
    
    # Statistiques d'usage agrégées (mises à jour par signaux)
    created_at = models.DateTimeField(auto_now_add=True)
    nb_emprunts = models.IntegerField(default=0, help_text="Nombre total de prêts de ce livre.")
    popularite = models.FloatField(default=0.0, help_text="Score de popularité globale brute.")
    nb_emprunteurs_uniq = models.IntegerField(default=0, help_text="Nombre d'emprunteurs distincts ayant emprunté ce livre.")
    duree_emprunt_moy = models.FloatField(default=0.0, help_text="Durée moyenne d'emprunt en jours sur l'ensemble des retours.")
    score_lecture_moy = models.FloatField(default=0.0, help_text="Score de lecture moyen des emprunteurs.")
    score_lecture_max = models.FloatField(default=0.0, help_text="Score de lecture maximum observé.")
    popularite_log = models.FloatField(default=0.0, help_text="log(1 + nb_emprunteurs_uniq) — Indice de popularité normalisé pour le NMF / TF-IDF.")

    @property
    def is_new(self):
        """Un livre est considéré comme 'nouveau' s'il a été ajouté depuis moins de 30 jours."""
        from datetime import timedelta
        return self.created_at >= now() - timedelta(days=30)

    @property
    def is_popular(self):
        """Un livre est considéré populaire s'il compte au moins 5 emprunts."""
        return self.nb_emprunts >= 5

    def __str__(self):
        return f"{self.titre} — {self.auteur or 'Auteur Inconnu'}"


# ── EMPRUNTS ──────────────────────────────────────────────────

class Borrow(models.Model):
    """
    Modèle représentant le prêt physique d'un livre à un membre.
    """
    STATUT_CHOICES = [
        ('en_cours', 'En cours'),
        ('rendu', 'Rendu'),
        ('perdu', 'Perdu'),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='borrows', help_text="Membre emprunteur.")
    livre = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='borrows', help_text="Livre emprunté.")
    
    # Dates de cycle de prêt physique
    date_sortie = models.DateField(default=now, help_text="Date à laquelle le livre quitte physiquement la bibliothèque.")
    date_retour_prevue = models.DateField(default=now, help_text="Date limite de retour du livre (date_sortie + 14 jours).")
    date_retour_effective = models.DateField(null=True, blank=True, help_text="Date réelle de retour physique de l'ouvrage.")
    
    renouvele = models.BooleanField(default=False, help_text="Indique si l'emprunt a été prolongé/renouvelé.")
    statut = models.CharField(
        max_length=20, 
        choices=STATUT_CHOICES, 
        default='en_cours',
        help_text="Statut actuel de l'emprunt (en cours, rendu, perdu)."
    )

    @property
    def duree_pret_jours(self):
        """
        Calcule dynamiquement la durée réelle du prêt en jours.
        Si le livre n'est pas encore retourné, calcule la durée par rapport à aujourd'hui.
        """
        if self.date_sortie:
            fin = self.date_retour_effective or now().date()
            return (fin - self.date_sortie).days
        return None

    def __str__(self):
        return f"Emprunt de '{self.livre.titre}' par {self.user.username} (Sorti le {self.date_sortie})"


# ── CLUBS DE LECTURE ──────────────────────────────────────────

class ReadingClub(models.Model):
    """
    Modèle représentant un club de lecture organisé par la bibliothèque CAEB.
    """
    TARGET_AUDIENCE_CHOICES = [
        ('children', 'Enfants'),
        ('teen', 'Adolescents'),
        ('adult', 'Adultes'),
        ('all', 'Tout public'),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=200, help_text="Nom unique du club de lecture.")
    description = models.TextField(help_text="Description des objectifs et thématiques du club.")
    image = models.CharField(max_length=300, null=True, blank=True, help_text="URL de l'image représentative du club.")
    target_audience = models.CharField(
        max_length=20, 
        choices=TARGET_AUDIENCE_CHOICES, 
        default='all',
        help_text="Public visé par le club de lecture."
    )
    member_count = models.IntegerField(default=0, help_text="Nombre de membres adhérents au club.")
    
    # Coordonnées du responsable
    manager_name = models.CharField(max_length=100, null=True, blank=True, help_text="Nom du bibliothécaire/animateur responsable.")
    manager_role = models.CharField(max_length=100, null=True, blank=True, help_text="Rôle du responsable (ex: Animateur principal).")
    manager_email = models.CharField(max_length=100, null=True, blank=True, help_text="Email de contact du responsable.")
    
    # Relation vers les abonnés
    members = models.ManyToManyField(User, blank=True, related_name='clubs_adherant', help_text="Membres adhérents à ce club.")

    def __str__(self):
        return self.name


# ── ÉVÉNEMENTS ────────────────────────────────────────────────

class Event(models.Model):
    """
    Représente un événement de la bibliothèque (conférence, atelier de club de lecture, etc.).
    """
    TYPE_EVENT_CHOICES = [
        ('club', 'Club'),
        ('conference', 'Conférence'),
        ('workshop', 'Atelier'),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    title = models.CharField(max_length=200, help_text="Titre de l'événement.")
    description = models.TextField(help_text="Description de l'événement et de son programme.")
    type_event = models.CharField(
        max_length=20, 
        choices=TYPE_EVENT_CHOICES, 
        default='conference',
        help_text="Type d'événement."
    )
    date = models.DateField(help_text="Date de tenue de l'événement.")
    time = models.CharField(max_length=10, help_text="Créneau horaire de l'événement (ex: 15h-17h).")
    location = models.CharField(max_length=200, help_text="Lieu physique ou salon virtuel.")
    participant_count = models.IntegerField(default=0, help_text="Nombre total de participants enregistrés.")
    club = models.ForeignKey(ReadingClub, on_delete=models.CASCADE, null=True, blank=True, related_name='events', help_text="Club de lecture associé (optionnel).")

    def __str__(self):
        return f"{self.title} (le {self.date})"


class ParticipationEvent(models.Model):
    """
    Représente la participation d'un utilisateur à un événement spécifique.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_participations', help_text="Utilisateur participant.")
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='participants', help_text="Événement concerné.")
    date_inscription = models.DateTimeField(auto_now_add=True, help_text="Date d'inscription à l'événement.")
    nom_complet = models.CharField(max_length=200, help_text="Nom complet du participant saisi lors de l'inscription.")
    email = models.EmailField(help_text="Adresse email pour les informations et confirmations.")
    telephone = models.CharField(max_length=20, help_text="Numéro de téléphone de contact.")
    motivations = models.TextField(null=True, blank=True, help_text="Motivations éventuelles renseignées par le participant.")

    def __str__(self):
        return f"Participation de {self.user.username} à {self.event.title}"


# ── ACTUALITÉS ───────────────────────────────────────────────

class News(models.Model):
    """
    Modèle d'article d'actualité publié sur la plateforme.
    """
    CATEGORY_CHOICES = [
        ('announcement', 'Annonce'),
        ('event',        'Événement'),
        ('course',       'Cours'),
        ('visit',        'Visite'),
        ('closure',      'Fermeture'),
        ('general',      'Général'),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    title = models.CharField(max_length=200, help_text="Titre de l'actualité.")
    excerpt = models.TextField(help_text="Résumé court de l'article affiché sur la liste des actualités.")
    content = models.TextField(null=True, blank=True, help_text="Corps complet de l'article.")
    image = models.CharField(max_length=300, null=True, blank=True, help_text="Lien vers l'image d'illustration.")
    date = models.DateField(help_text="Date de publication de l'article.")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    featured = models.BooleanField(default=False, help_text="Indique si l'article est épinglé en vedette sur l'accueil.")

    def __str__(self):
        return self.title


# ── AVIS / NOTATION ───────────────────────────────────────────

class Review(models.Model):
    """
    Avis et note laissés par un utilisateur sur un livre.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews', help_text="Auteur de l'avis.")
    livre = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reviews', help_text="Livre noté.")
    note = models.IntegerField(help_text="Note attribuée de 1 à 5.")
    commentaire = models.TextField(help_text="Commentaire écrit du lecteur.")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Avis de {self.user.username} sur '{self.livre.titre}' ({self.note}/5)"


# ── RÉSERVATIONS ───────────────────────────────────────────────

class Reservation(models.Model):
    """
    Demande de réservation d'un livre en ligne par un membre avant de venir le chercher physiquement.
    """
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('prete',      'Prête'),
        ('annulee',    'Annulée'),
        ('terminee',   'Terminée'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reservations', help_text="Membre réservataire.")
    livre = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reservations', help_text="Livre réservé.")
    date_reservation = models.DateTimeField(auto_now_add=True, help_text="Date et heure de soumission de la demande.")
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente', help_text="Statut de la demande.")

    def __str__(self):
        return f"Réservation de '{self.livre.titre}' par {self.user.username} ({self.get_statut_display()})"


# ── MESSAGES DE CONTACT (formulaire club) ──────────────────────

class ClubContactMessage(models.Model):
    """
    Message de contact envoyé à un club de lecture.
    """
    club = models.ForeignKey(ReadingClub, on_delete=models.CASCADE, related_name='contact_messages', help_text="Club destinataire.")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='contact_messages', help_text="Utilisateur connecté (si applicable).")
    nom = models.CharField(max_length=100, help_text="Nom complet fourni par l'expéditeur.")
    email = models.EmailField(help_text="Adresse email de l'expéditeur.")
    message = models.TextField(help_text="Contenu du message.")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message de {self.nom} pour le club {self.club.name}"


# ── SESSION DE CHAT (Kossi) ───────────────────────────────────

class ChatSession(models.Model):
    """
    Session de chat enregistrée pour l'historique des discussions avec Kossi.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions', help_text="Utilisateur propriétaire de la conversation.")
    titre = models.CharField(max_length=200, default='Nouvelle conversation', help_text="Titre de la session de chat.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session Chat '{self.titre}' de {self.user.username}"


class ChatMessage(models.Model):
    """
    Message individuel au sein d'une session de chat.
    """
    ROLE_CHOICES = [
        ('user',      'Utilisateur'),
        ('assistant', 'Assistant'),
    ]

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages', help_text="Session de chat associée.")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, help_text="Auteur du message (user ou assistant).")
    content = models.TextField(help_text="Contenu du message.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:50]}..."


# ── INTERACTIONS ──────────────────────────────────────────────

class Interaction(models.Model):
    """
    Trace d'interaction utilisateur-livre.
    Alimente l'algorithme IA Kossi de filtrage collaboratif.
    """
    TYPE_ACTION_CHOICES = [
        ('vue', 'Vue'),
        ('note', 'Note'),
        ('like', "J'aime"),
        ('chat_ia', 'Chat IA'),
        ('marquage', 'Marquage'),
        ('recommandation_impression', 'Impression recommandation'),
        ('recommandation_clic', 'Clic recommandation'),
        ('favori_ajout', 'Ajout favori'),
        ('favori_suppression', 'Suppression favori'),
    ]
    SOURCE_CHOICES = [
        ('application', 'Application'),
        ('chat_ia', 'Chat IA'),
        ('recherche', 'Recherche'),
    ]

    import uuid as _uuid
    id = models.CharField(max_length=40, primary_key=True, default=_uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interactions')
    livre = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='interactions')
    type_action = models.CharField(max_length=30, choices=TYPE_ACTION_CHOICES)
    notation = models.IntegerField(null=True, blank=True, help_text="Note éventuelle de 1 à 5.")
    duree_secondes = models.IntegerField(null=True, blank=True, help_text="Temps passé sur la page du livre.")
    livre_lu = models.BooleanField(default=False, help_text="Indique si le livre a été marqué comme lu.")
    commentaire = models.TextField(null=True, blank=True)
    position = models.IntegerField(null=True, blank=True, help_text="Position dans une liste de recommandations.")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='application')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Interaction {self.type_action} de {self.user.username} sur {self.livre.titre}"


# ── NOTIFICATIONS ────────────────────────────────────────────

class Notification(models.Model):
    """
    Notifications de rappel ou d'information destinées aux utilisateurs.
    """
    TYPE_NOTIF_CHOICES = [
        ('rappel_retour', 'Rappel retour'),
        ('retard', 'Retard'),
        ('livre_disponible', 'Livre disponible'),
        ('demande_adhesion', 'Demande adhésion'),
        ('adhesion_confirmee', 'Adhésion confirmée'),
        ('inscription_evenement', 'Inscription événement'),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', help_text="Destinataire de la notification.")
    type_notif = models.CharField(max_length=30, choices=TYPE_NOTIF_CHOICES, help_text="Type de notification.")
    message = models.TextField(help_text="Contenu textuel de la notification.")
    envoyee_le = models.DateTimeField(auto_now_add=True)
    lue = models.BooleanField(default=False, help_text="Indique si l'utilisateur a lu la notification.")
    
    # Liens optionnels vers les entités associées
    emprunt = models.ForeignKey(Borrow, on_delete=models.CASCADE, null=True, blank=True, help_text="Emprunt concerné (si applicable).")
    livre = models.ForeignKey(Book, on_delete=models.CASCADE, null=True, blank=True, help_text="Livre concerné (si applicable).")

    def __str__(self):
        return f"Notification {self.type_notif} pour {self.user.username} ({'Lue' if self.lue else 'Non lue'})"


# ── SESSIONS IA ──────────────────────────────────────────────

class SessionIA(models.Model):
    """
    Session d'état pour le chatbot Kossi, stockant l'humeur détectée et les intentions.
    """
    HUMEUR_CHOICES = [
        ('léger', 'Léger'),
        ('intense', 'Intense'),
        ('évasion', 'Évasion'),
        ('neutre', 'Neutre'),
        ('triste', 'Triste'),
        ('aventurier', 'Aventurier'),
        ('romantique', 'Romantique'),
        ('curieux', 'Curieux'),
        ('nostalgique', 'Nostalgique'),
        ('stressé', 'Stressé'),
        ('détendu', 'Détendu'),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, help_text="Utilisateur lié à la session.")
    humeur_detectee = models.CharField(max_length=20, choices=HUMEUR_CHOICES, default='neutre', help_text="Humeur détectée par le chatbot.")
    vecteur_intention = models.JSONField(null=True, blank=True, help_text="Vecteur d'intention de lecture calculé.")
    livres_rejetes = models.JSONField(null=True, blank=True, help_text="Liste des livres suggérés mais rejetés par l'utilisateur.")
    livres_acceptes = models.JSONField(null=True, blank=True, help_text="Liste des livres suggérés et acceptés par l'utilisateur.")
    debut = models.DateTimeField(auto_now_add=True)
    fin = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True, help_text="Indique si la session de recommandation est toujours en cours.")

    def __str__(self):
        return f"Session IA {self.id} de {self.user.username}"


# ── SIGNAUX DJANGO POUR LA MISE À JOUR DES STATISTIQUES DES LIVRES ──

@receiver(post_save, sender=Borrow)
def update_book_stats_on_borrow_save(sender, instance, **kwargs):
    """
    Signal déclenché après chaque sauvegarde d'un emprunt (création ou mise à jour).
    Il met à jour de façon synchrone les statistiques de popularité et d'emprunt du livre associé.
    """
    book = instance.livre
    if not book:
        return

    # Nombre total d'emprunts pour ce livre
    book.nb_emprunts = Borrow.objects.filter(livre=book).count()

    # Nombre de lecteurs uniques distincts
    book.nb_emprunteurs_uniq = Borrow.objects.filter(livre=book).values('user').distinct().count()

    # popularite_log = log(1 + nb_emprunteurs_uniq) pour normaliser l'impact
    book.popularite_log = math.log1p(book.nb_emprunteurs_uniq)

    # Durée moyenne d'emprunt (sur les emprunts effectivement rendus) optimisée via SQL
    from django.db.models import F, Avg
    
    stats = Borrow.objects.filter(
        livre=book, 
        statut='rendu', 
        date_retour_effective__isnull=False, 
        date_sortie__isnull=False
    ).annotate(
        duration=F('date_retour_effective') - F('date_sortie')
    ).aggregate(
        avg_duration=Avg('duration')
    )
    
    avg_dur = stats.get('avg_duration')
    if avg_dur is not None:
        # PostgreSQL retourne un timedelta, SQLite peut retourner un nombre
        if hasattr(avg_dur, 'days'):
            book.duree_emprunt_moy = float(avg_dur.days)
        else:
            book.duree_emprunt_moy = float(avg_dur)
    else:
        book.duree_emprunt_moy = 0.0

    # Calcul de la popularité brute basée sur le nombre total d'emprunts
    book.popularite = float(book.nb_emprunts)

    # Sauvegarde des champs statistiques uniquement pour optimiser les performances
    book.save(update_fields=[
        'nb_emprunts', 
        'nb_emprunteurs_uniq', 
        'popularite_log', 
        'duree_emprunt_moy', 
        'popularite'
    ])


@receiver([post_save, post_delete], sender=Review)
def update_book_stats_on_review_change(sender, instance, **kwargs):
    """
    Signal déclenché après chaque ajout, modification ou suppression d'un avis.
    Recalcule la note moyenne, le nombre total d'avis et les scores de lecture associés au livre.
    """
    book = instance.livre
    if not book:
        return

    # Agrégation des notes
    reviews_stats = book.reviews.aggregate(
        avg_note=Avg('note'),
        max_note=Max('note'),
        count_notes=Count('id')
    )
    
    avg_note = float(reviews_stats['avg_note']) if reviews_stats['avg_note'] is not None else 0.0
    
    book.note_moyenne = avg_note
    book.nb_notes = reviews_stats['count_notes'] or 0
    book.score_lecture_moy = avg_note
    book.score_lecture_max = float(reviews_stats['max_note']) if reviews_stats['max_note'] is not None else 0.0
    
    # Sauvegarde des champs d'avis uniquement
    book.save(update_fields=[
        'note_moyenne', 
        'nb_notes', 
        'score_lecture_moy', 
        'score_lecture_max'
    ])
