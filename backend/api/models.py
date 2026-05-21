from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    TYPE_COMPTE_CHOICES = [
        ('anonyme', 'Anonyme'),
        ('non_membre', 'Non-membre'),
        ('en_attente', 'En attente'),
        ('membre', 'Membre'),
    ]
    
    id = models.CharField(max_length=40, primary_key=True)
    type_compte = models.CharField(max_length=20, choices=TYPE_COMPTE_CHOICES, default='non_membre')
    date_naissance = models.DateField(null=True, blank=True)
    niveau_etude = models.CharField(max_length=50, null=True, blank=True)
    classe = models.CharField(max_length=100, null=True, blank=True)
    date_inscription = models.DateTimeField(auto_now_add=True)
    favorites = models.JSONField(default=list, blank=True)
    intentions = models.JSONField(default=list, blank=True)
    genres_preferes = models.JSONField(default=list, blank=True)
    sous_genre_prefere = models.JSONField(default=list, blank=True)
    pseudo = models.CharField(max_length=50, null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    avatar = models.CharField(max_length=300, null=True, blank=True)
    telephone = models.CharField(max_length=20, null=True, blank=True)
    
    # Champs surchargés pour éviter les conflits ou correspondre au schéma
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.username})"


class Book(models.Model):
    CATEGORIE_AGE_CHOICES = [
        ('enfant', 'Enfant'),
        ('ado', 'Ado'),
        ('adulte', 'Adulte'),
    ]
    
    id = models.CharField(max_length=20, primary_key=True)
    ol_id = models.CharField(max_length=30, unique=True, null=True, blank=True)
    titre = models.CharField(max_length=300)
    auteur = models.CharField(max_length=200, null=True, blank=True)
    genre = models.CharField(max_length=100, null=True, blank=True)
    sous_genre = models.CharField(max_length=100, null=True, blank=True)
    annee = models.IntegerField(null=True, blank=True)
    nb_pages = models.IntegerField(null=True, blank=True)
    langue = models.CharField(max_length=10, default='fr')
    categorie_age = models.CharField(max_length=10, choices=CATEGORIE_AGE_CHOICES, default='adulte')
    note_moyenne = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    nb_notes = models.IntegerField(default=0)
    exemplaires = models.IntegerField(default=1)
    resume = models.TextField(null=True, blank=True)
    couverture_url = models.CharField(max_length=300, null=True, blank=True)
    # Nouveaux champs enrichis
    mots_cles = models.TextField(null=True, blank=True)        # mots-clés libres
    localisation = models.CharField(max_length=100, null=True, blank=True)  # cote / localisation physique
    section = models.CharField(max_length=200, null=True, blank=True)       # section de la bibliothèque
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titre


class Borrow(models.Model):
    STATUT_CHOICES = [
        ('en_cours', 'En cours'),
        ('rendu', 'Rendu'),
        ('perdu', 'Perdu'),
    ]
    
    id = models.CharField(max_length=20, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='borrows')
    livre = models.ForeignKey(Book, on_delete=models.CASCADE)
    date_emprunt = models.DateField()
    date_prevue = models.DateField()
    date_retour = models.DateField(null=True, blank=True)
    renouvele = models.BooleanField(default=False)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_cours')

class Interaction(models.Model):
    TYPE_ACTION_CHOICES = [
        ('vue', 'Vue'),
        ('note', 'Note'),
        ('like', "J'aime"),
        ('chat_ia', 'Chat IA'),
        ('marquage', 'Marquage'),
    ]
    SOURCE_CHOICES = [
        ('application', 'Application'),
        ('chat_ia', 'Chat IA'),
        ('recherche', 'Recherche'),
    ]
    
    id = models.CharField(max_length=20, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interactions')
    livre = models.ForeignKey(Book, on_delete=models.CASCADE)
    type_action = models.CharField(max_length=20, choices=TYPE_ACTION_CHOICES)
    notation = models.IntegerField(null=True, blank=True)
    duree_secondes = models.IntegerField(null=True, blank=True)
    livre_lu = models.BooleanField(default=False)
    commentaire = models.TextField(null=True, blank=True)
    position = models.IntegerField(null=True, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='application')
    created_at = models.DateTimeField(auto_now_add=True)

class SessionIA(models.Model):
    HUMEUR_CHOICES = [
        ('léger','Léger'),('intense','Intense'),('évasion','Évasion'),('neutre','Neutre'),
        ('triste','Triste'),('aventurier','Aventurier'),('romantique','Romantique'),
        ('curieux','Curieux'),('nostalgique','Nostalgique'),('stressé','Stressé'),
        ('détendu','Détendu')
    ]
    
    id = models.CharField(max_length=20, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    humeur_detectee = models.CharField(max_length=20, choices=HUMEUR_CHOICES, default='neutre')
    vecteur_intention = models.JSONField(null=True, blank=True)
    livres_rejetes = models.JSONField(null=True, blank=True)
    livres_acceptes = models.JSONField(null=True, blank=True)
    debut = models.DateTimeField(auto_now_add=True)
    fin = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True)

class Notification(models.Model):
    TYPE_NOTIF_CHOICES = [
        ('rappel_retour', 'Rappel retour'),
        ('retard', 'Retard'),
        ('livre_disponible', 'Livre disponible'),
        ('demande_adhesion', 'Demande adhésion'),
        ('adhesion_confirmee', 'Adhésion confirmée'),
        ('inscription_evenement', 'Inscription événement'),
    ]
    
    id = models.CharField(max_length=20, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    emprunt = models.ForeignKey(Borrow, on_delete=models.CASCADE, null=True, blank=True)
    livre = models.ForeignKey(Book, on_delete=models.CASCADE, null=True, blank=True)
    type_notif = models.CharField(max_length=30, choices=TYPE_NOTIF_CHOICES)
    message = models.TextField()
    envoyee_le = models.DateTimeField(auto_now_add=True)
    lue = models.BooleanField(default=False)

class ReadingClub(models.Model):
    AUDIENCE_CHOICES = [
        ('children', 'Enfants'),
        ('teen', 'Adolescents'),
        ('adult', 'Adultes'),
        ('all', 'Tout public'),
    ]
    id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=200)
    description = models.TextField()
    image = models.CharField(max_length=300, null=True, blank=True)
    target_audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='all')
    member_count = models.IntegerField(default=0)
    members = models.ManyToManyField(User, related_name='clubs_adherant', blank=True)
    
    # Manager info
    manager_name = models.CharField(max_length=100, null=True, blank=True)
    manager_role = models.CharField(max_length=100, null=True, blank=True)
    manager_email = models.CharField(max_length=100, null=True, blank=True)
    
    def __str__(self):
        return self.name

class Event(models.Model):
    TYPE_CHOICES = [
        ('club', 'Club'),
        ('conference', 'Conférence'),
        ('workshop', 'Atelier'),
    ]
    id = models.CharField(max_length=20, primary_key=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    type_event = models.CharField(max_length=20, choices=TYPE_CHOICES, default='conference')
    date = models.DateField()
    time = models.CharField(max_length=10)
    location = models.CharField(max_length=200)
    participant_count = models.IntegerField(default=0)
    club = models.ForeignKey(ReadingClub, on_delete=models.CASCADE, null=True, blank=True, related_name='events')

    def __str__(self):
        return self.title

class ParticipationEvent(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_participations')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='participants')
    date_inscription = models.DateTimeField(auto_now_add=True)
    nom_complet = models.CharField(max_length=200)
    email = models.EmailField()
    telephone = models.CharField(max_length=20)
    motivations = models.TextField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.nom_complet} - {self.event.title}"

class News(models.Model):
    CATEGORY_CHOICES = [
        ('announcement', 'Annonce'),
        ('event', 'Événement'),
        ('course', 'Cours'),
        ('visit', 'Visite'),
        ('closure', 'Fermeture'),
        ('general', 'Général'),
    ]
    id = models.CharField(max_length=20, primary_key=True)
    title = models.CharField(max_length=200)
    excerpt = models.TextField()
    content = models.TextField(null=True, blank=True)
    image = models.CharField(max_length=300, null=True, blank=True)
    date = models.DateField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    featured = models.BooleanField(default=False)

    def __str__(self):
        return self.title

class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    livre = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reviews')
    note = models.IntegerField()
    commentaire = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Avis de {self.user.username} sur {self.livre.titre}"

class Reservation(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('prete', 'Prête'),
        ('annulee', 'Annulée'),
        ('terminee', 'Terminée'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reservations')
    livre = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reservations')
    date_reservation = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')

    def __str__(self):
        return f"Réservation de {self.user.username} pour {self.livre.titre}"


class ClubContactMessage(models.Model):
    """Message envoyé depuis le formulaire de contact d'un club."""
    club = models.ForeignKey(ReadingClub, on_delete=models.CASCADE, related_name='contact_messages')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='contact_messages')
    nom = models.CharField(max_length=100)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message de {self.nom} pour {self.club.name}"


class ChatSession(models.Model):
    """Session de chat IA liée à un utilisateur."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions')
    titre = models.CharField(max_length=200, default='Nouvelle conversation')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Chat de {self.user.username} — {self.titre}"


class ChatMessage(models.Model):
    """Message individuel dans une session de chat."""
    ROLE_CHOICES = [('user', 'Utilisateur'), ('assistant', 'Assistant')]
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:50]}"


class LabStation(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    specifications = models.TextField(null=True, blank=True)
    isActive = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class LabReservation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lab_reservations')
    station = models.ForeignKey(LabStation, on_delete=models.CASCADE, related_name='reservations')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    purpose = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Réservation de {self.user.username} - {self.station.name} le {self.date}"
